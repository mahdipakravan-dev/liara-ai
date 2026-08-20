#!/usr/bin/env node
/**
 * Executable checks for the security, budget and observability layer.
 *
 *   node scripts/check-hardening.js
 */

import { createAgentContext } from "../lib/agent/context.js";
import { routeAgentRequest } from "../lib/agent/router.js";
import {
  capDocuments,
  compactContext,
  MAX_DOCUMENTS,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_LENGTH,
  trimHistory,
} from "../lib/ai/token-budget.js";
import { startRequestLog } from "../lib/observability/logger.js";
import { clientKeyFrom, createRateLimiter } from "../lib/security/rate-limit.js";
import { redactHeaders, redactObject, redactSecrets } from "../lib/security/redact.js";
import { validateChatRequest } from "../lib/security/validate.js";

const checks = [];
const check = (name, run) => checks.push({ name, run });

const userMessage = (text) => ({ role: "user", parts: [{ type: "text", text }] });

// --- validation -------------------------------------------------------------

check("accepts a well-formed request", () => {
  const result = validateChatRequest({ messages: [userMessage("سلام")], context: { runtime: "next" } });
  return result.ok ? null : `${result.code}: ${result.error}`;
});

check("rejects a non-object body", () => {
  const result = validateChatRequest(null);
  return result.ok === false && result.status === 400 ? null : JSON.stringify(result);
});

check("rejects a missing or empty message list", () => {
  for (const body of [{}, { messages: [] }, { messages: "hello" }]) {
    const result = validateChatRequest(body);
    if (result.ok || result.status !== 400) return `accepted ${JSON.stringify(body)}`;
  }
  return null;
});

check("rejects an unknown role", () => {
  const result = validateChatRequest({ messages: [{ role: "root", parts: [] }] });
  return result.ok === false && result.code === "invalid_shape" ? null : JSON.stringify(result);
});

check("rejects an oversized single message with 413", () => {
  const result = validateChatRequest({ messages: [userMessage("ب".repeat(MAX_MESSAGE_LENGTH + 1))] });
  if (result.ok) return "accepted an oversized message";
  return result.status === 413 && result.code === "message_too_long" ? null : JSON.stringify(result);
});

check("rejects an oversized payload with 413", () => {
  const messages = Array.from({ length: 40 }, () => userMessage("ب".repeat(3_000)));
  const result = validateChatRequest({ messages });
  if (result.ok) return "accepted an oversized payload";
  return result.status === 413 && result.code === "payload_too_large" ? null : JSON.stringify(result);
});

check("keeps tool and source parts intact", () => {
  const result = validateChatRequest({
    messages: [
      userMessage("سلام"),
      {
        role: "assistant",
        parts: [
          { type: "tool-retry_deployment", toolCallId: "c1", state: "approval-requested", approval: { id: "a1" } },
          { type: "source-url", sourceId: "s1", url: "https://docs.liara.ir" },
        ],
      },
    ],
  });
  if (!result.ok) return `${result.code}: ${result.error}`;
  const part = result.body.messages[1].parts[0];
  return part.approval?.id === "a1" ? null : "tool approval part was stripped";
});

check("validation errors never echo the message body", () => {
  const secret = "LIARA_API_TOKEN=lr_9f3ka02mzQ7xVb31";
  const result = validateChatRequest({ messages: [{ role: "root", parts: [{ type: "text", text: secret }] }] });
  return JSON.stringify(result).includes("lr_9f3ka02mzQ7xVb31") ? "echoed the input" : null;
});

// --- rate limiting ----------------------------------------------------------

check("allows up to the limit then blocks", () => {
  const check20 = createRateLimiter({ limit: 20, windowMs: 60_000 });
  const now = Date.now();
  for (let i = 1; i <= 20; i += 1) {
    const result = check20("client", now);
    if (!result.allowed) return `blocked early at request ${i}`;
  }
  const blocked = check20("client", now);
  if (blocked.allowed) return "21st request was allowed";
  return blocked.retryAfterSeconds > 0 ? null : "no retry-after";
});

check("counts each client separately", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
  const now = Date.now();
  limiter("a", now);
  limiter("a", now);
  if (limiter("a", now).allowed) return "client a not blocked";
  return limiter("b", now).allowed ? null : "client b was blocked by client a";
});

check("the window resets", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });
  const now = Date.now();
  limiter("c", now);
  if (limiter("c", now).allowed) return "not blocked inside the window";
  return limiter("c", now + 1_500).allowed ? null : "still blocked after the window";
});

check("remaining count is reported", () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
  const now = Date.now();
  limiter("d", now);
  const second = limiter("d", now);
  return second.remaining === 1 ? null : `remaining is ${second.remaining}`;
});

check("derives a client key from proxy headers", () => {
  const request = { headers: new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }) };
  return clientKeyFrom(request) === "chat:203.0.113.9" ? null : clientKeyFrom(request);
});

// --- redaction --------------------------------------------------------------

const secrets = [
  ["API_KEY", "API_KEY=abcdef123456", "abcdef123456"],
  ["TOKEN", "GITHUB_TOKEN: ghp_abcdefghijklmnop", "ghp_abcdefghijklmnop"],
  ["PASSWORD", "PASSWORD=hunter2", "hunter2"],
  ["SECRET", "CLIENT_SECRET=s3cr3tvalue", "s3cr3tvalue"],
  ["DATABASE_URL", "DATABASE_URL=postgres://u:p@host:5432/db", "postgres://u:p@host"],
  ["authorization header", "Authorization: Bearer abcdef123456789", "abcdef123456789"],
];

for (const [label, input, secret] of secrets) {
  check(`redacts ${label}`, () => {
    const output = redactSecrets(input);
    return output.includes(secret) ? `survived: ${output}` : null;
  });
}

check("redacts sensitive headers wholesale", () => {
  const safe = redactHeaders(
    new Headers({ authorization: "Bearer abc123def456", cookie: "sid=xyz", "user-agent": "curl/8" }),
  );
  if (safe.authorization !== "[redacted]") return `authorization: ${safe.authorization}`;
  if (safe.cookie !== "[redacted]") return `cookie: ${safe.cookie}`;
  return safe["user-agent"] === "curl/8" ? null : "harmless header was mangled";
});

check("redacts secret-looking object keys", () => {
  const safe = redactObject({ apiKey: "abc", nested: { password: "p" }, port: 3000 });
  if (safe.apiKey !== "[redacted]") return `apiKey: ${safe.apiKey}`;
  if (safe.nested.password !== "[redacted]") return "nested secret survived";
  return safe.port === 3000 ? null : "harmless field was mangled";
});

check("numeric metrics whose names contain 'token' survive", () => {
  const safe = redactObject({ inputTokens: 2310, outputTokens: 288, promptTokensEstimate: 900 });
  return safe.inputTokens === 2310 && safe.outputTokens === 288 && safe.promptTokensEstimate === 900
    ? null
    : JSON.stringify(safe);
});

// --- token budget -----------------------------------------------------------

check(`history is trimmed to ${MAX_HISTORY_MESSAGES} messages`, () => {
  const messages = Array.from({ length: 30 }, (_, index) => userMessage(`m${index}`));
  const trimmed = trimHistory(messages);
  if (trimmed.length !== MAX_HISTORY_MESSAGES) return `${trimmed.length} messages`;
  return trimmed.at(-1).parts[0].text === "m29" ? null : "kept the wrong end";
});

check("documents are capped and deduplicated", () => {
  const documents = [
    { id: "a", sourceUrl: "u1" },
    { id: "a", sourceUrl: "u1" },
    { id: "b", sourceUrl: "u2" },
    { id: "c", sourceUrl: "u3" },
    { id: "d", sourceUrl: "u4" },
    { id: "e", sourceUrl: "u5" },
  ];
  const capped = capDocuments(documents);
  if (capped.length > MAX_DOCUMENTS) return `${capped.length} documents`;
  return new Set(capped.map((d) => d.id)).size === capped.length ? null : "duplicates survived";
});

check("empty and duplicate context values are dropped", () => {
  const compact = compactContext({
    runtime: "next",
    zone: "",
    zoneLabel: null,
    applicationName: "assistance",
    currentStep: "assistance",
    port: "3000",
  });
  if ("zone" in compact || "zoneLabel" in compact) return "empty values survived";
  if ("currentStep" in compact) return "duplicate value survived";
  return compact.runtime === "next" && compact.port === "3000" ? null : JSON.stringify(compact);
});

check("context logs stay within the line and length caps", () => {
  const context = createAgentContext({
    logs: Array.from({ length: 100 }, (_, index) => `line ${index} ${"x".repeat(1_000)}`),
  });
  if (context.logs.length > 20) return `${context.logs.length} lines`;
  return context.logs.every((line) => line.length <= 400) ? null : "a line exceeded the cap";
});

// --- observability ----------------------------------------------------------

function captureLog(run) {
  const original = { log: console.log, warn: console.warn, error: console.error };
  const lines = [];
  const sink = (value) => lines.push(value);
  console.log = sink;
  console.warn = sink;
  console.error = sink;
  try {
    run();
  } finally {
    Object.assign(console, original);
  }
  return lines.map((line) => JSON.parse(line));
}

check("a finished request logs the required fields", () => {
  const [entry] = captureLog(() => {
    const log = startRequestLog({ route: "/api/chat", model: "z-ai/glm-5.3" });
    log.set({ intent: "deployment_failed", retrievedDocumentIds: ["doc-1", "doc-2"] });
    log.finish({ success: true, toolCalls: ["get_logs"] });
  });

  for (const field of ["requestId", "intent", "model", "latencyMs", "retrievedDocumentIds", "toolCalls", "success"]) {
    if (!(field in entry)) return `missing ${field}`;
  }
  if (entry.errorType !== null) return `errorType is ${entry.errorType}`;
  return typeof entry.latencyMs === "number" ? null : "latency is not a number";
});

check("a failed request logs an error type but no stack", () => {
  const [entry] = captureLog(() => {
    const log = startRequestLog({ route: "/api/chat" });
    log.finish({ success: false, errorType: "stream_failed", error: new Error("upstream exploded") });
  });
  if (entry.success !== false || entry.errorType !== "stream_failed") return JSON.stringify(entry);
  if ("stack" in entry) return "a stack trace was logged";
  return entry.errorMessage === "upstream exploded" ? null : entry.errorMessage;
});

check("secrets never reach a log line", () => {
  const [entry] = captureLog(() => {
    const log = startRequestLog({ route: "/api/chat" });
    log.finish({
      success: false,
      errorType: "stream_failed",
      apiKey: "sk-abcdef0123456789ghijk",
      error: new Error("failed with Authorization: Bearer abcdef123456789"),
    });
  });
  const serialized = JSON.stringify(entry);
  for (const secret of ["sk-abcdef0123456789ghijk", "abcdef123456789"]) {
    if (serialized.includes(secret)) return `leaked ${secret}`;
  }
  return null;
});

check("finish is idempotent", () => {
  const lines = captureLog(() => {
    const log = startRequestLog({ route: "/api/chat" });
    log.finish({ success: true });
    log.finish({ success: false, errorType: "double" });
  });
  return lines.length === 1 ? null : `${lines.length} lines written`;
});

// --- end to end through the router -----------------------------------------

check("the routed prompt respects the document cap", () => {
  const routed = routeAgentRequest({
    messages: [userMessage("چطور برنامه‌ی nextjs رو دیپلوی کنم؟")],
    context: { currentPage: "deploy", runtime: "next" },
  });
  return routed.documents.length <= MAX_DOCUMENTS ? null : `${routed.documents.length} documents`;
});

check("secrets in context logs never reach the prompt", () => {
  const routed = routeAgentRequest({
    messages: [userMessage("مشکلش چیه؟")],
    context: {
      deploymentStatus: "error",
      runtime: "next",
      logs: ["npm error code ETIMEDOUT", "env: DATABASE_URL=postgres://u:Sup3rS3cret@db:5432/app"],
    },
  });
  return routed.system.includes("Sup3rS3cret") ? "secret reached the prompt" : null;
});

let failures = 0;
for (const { name, run } of checks) {
  let problem;
  try {
    problem = await run();
  } catch (error) {
    problem = `threw: ${error.message}`;
  }
  if (problem) failures += 1;
  console.log(`${problem ? "FAIL" : "PASS"}  ${name}${problem ? `\n      ${problem}` : ""}`);
}

console.log(failures === 0 ? "\nهمه‌ی بررسی‌ها موفق بود." : `\n${failures} بررسی ناموفق بود.`);
process.exitCode = failures === 0 ? 0 : 1;
