#!/usr/bin/env node
/**
 * Executable checks for the deployment debugging skill and secret redaction.
 *
 *   node scripts/check-debug-skill.js          # run assertions
 *   node scripts/check-debug-skill.js --show   # also print the built prompt
 */

import { createAgentContext } from "../lib/agent/context.js";
import { redactSecrets } from "../lib/security/redact.js";
import { routeAgentRequest } from "../lib/agent/router.js";
import {
  extractErrorSignals,
  runDebugDeploymentSkill,
  shouldDebugDeployment,
} from "../lib/agent/skills/debug-deployment.js";
import { createDeployment, resolveDeployment } from "../lib/deployment.js";

const show = process.argv.includes("--show");
const checks = [];
const check = (name, run) => checks.push({ name, run });

const failedDeployment = createDeployment({
  application: "assistance",
  runtime: "next",
  method: "GitHub",
  port: "3000",
  zone: "germany",
});

const leakyLogs = [
  ...failedDeployment.logs,
  "2026-08-20 11:34:07 |  ---> env: LIARA_API_TOKEN=lr_9f3ka02mzQ7xVb31 NODE_ENV=production",
  '2026-08-20 11:34:08 |  ---> config: {"database_password": "hunter2-super-secret"}',
  "2026-08-20 11:34:09 |  ---> retry: curl -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijkl' https://api.liara.ir",
  "2026-08-20 11:34:10 |  ---> DATABASE_URL=postgres://appuser:Sup3rS3cret@db.liara.cloud:5432/app",
];

const failedContext = {
  currentPage: "deployment-history",
  applicationName: "assistance",
  runtime: "next",
  deploymentMethod: "github",
  deploymentStatus: "error",
  deploymentId: failedDeployment.id,
  port: "3000",
  logs: leakyLogs,
};

// --- deployment single source of truth -------------------------------------

check("deployment object carries its own logs", () => {
  if (!Array.isArray(failedDeployment.logs) || failedDeployment.logs.length === 0) {
    return "createDeployment returned no logs";
  }
  if (failedDeployment.status !== "error") return `status is ${failedDeployment.status}`;
  return failedDeployment.error ? null : "no error message";
});

check("resolveDeployment reuses stored logs instead of regenerating", () => {
  const custom = { status: "error", logs: ["custom line"], port: "8080" };
  const resolved = resolveDeployment(custom);
  if (resolved.logs.length !== 1 || resolved.logs[0] !== "custom line") {
    return `logs were replaced: ${JSON.stringify(resolved.logs)}`;
  }
  return resolved.port === "8080" ? null : "port lost";
});

check("resolveDeployment(null) yields a stable placeholder", () => {
  const a = resolveDeployment(null);
  const b = resolveDeployment(undefined);
  return JSON.stringify(a.logs) === JSON.stringify(b.logs) ? null : "placeholder is not stable";
});

// --- redaction --------------------------------------------------------------

const secrets = [
  ["env var", "LIARA_API_TOKEN=lr_9f3ka02mzQ7xVb31", "lr_9f3ka02mzQ7xVb31"],
  ["json field", '{"database_password": "hunter2-super-secret"}', "hunter2-super-secret"],
  ["bearer header", "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefgh", "eyJhbGciOiJIUzI1NiJ9"],
  ["connection string", "postgres://appuser:Sup3rS3cret@db.host:5432/app", "Sup3rS3cret"],
  ["vendor token", "using key sk-abcdef0123456789ghijk", "sk-abcdef0123456789ghijk"],
  ["private key", "-----BEGIN RSA PRIVATE KEY-----\nMIIEow==\n-----END RSA PRIVATE KEY-----", "MIIEow=="],
];

for (const [label, input, secret] of secrets) {
  check(`redacts ${label}`, () => {
    const output = redactSecrets(input);
    if (output.includes(secret)) return `secret survived: ${output}`;
    return output.includes("[redacted]") ? null : `no redaction marker: ${output}`;
  });
}

check("keeps ordinary log lines intact", () => {
  const line = "npm error network request to https://registry.npmjs.org/next failed, reason: connect ETIMEDOUT";
  return redactSecrets(line) === line ? null : `line was altered: ${redactSecrets(line)}`;
});

check("context normalization redacts logs", () => {
  const context = createAgentContext(failedContext);
  const joined = context.logs.join("\n");
  const leaked = ["lr_9f3ka02mzQ7xVb31", "hunter2-super-secret", "Sup3rS3cret"].filter((s) =>
    joined.includes(s),
  );
  return leaked.length ? `leaked: ${leaked.join(", ")}` : null;
});

// --- skill activation and signals ------------------------------------------

check("activates on failed deployment status", () =>
  shouldDebugDeployment({ intent: "general_question", context: { deploymentStatus: "error" } })
    ? null
    : "did not activate");

check("activates on deployment_failed intent", () =>
  shouldDebugDeployment({ intent: "deployment_failed", context: {} }) ? null : "did not activate");

check("stays off for a healthy deployment", () =>
  shouldDebugDeployment({ intent: "deploy_application", context: { deploymentStatus: "deploying" } })
    ? "activated when it should not"
    : null);

check("extracts error codes from the log", () => {
  const signals = extractErrorSignals(createAgentContext(failedContext));
  if (!signals.codes.includes("ETIMEDOUT")) return `codes: ${signals.codes.join(",")}`;
  if (signals.errorLines.length === 0) return "no error lines";
  return signals.redacted ? null : "did not notice the redaction";
});

// --- end-to-end through the router -----------------------------------------

check('"مشکلش چیه؟" produces a full debugging turn', () => {
  const routed = routeAgentRequest({
    messages: [{ role: "user", parts: [{ type: "text", text: "مشکلش چیه؟" }] }],
    context: failedContext,
  });
  if (routed.intent !== "deployment_failed") return `intent is ${routed.intent}`;
  if (routed.skill !== "debug_deployment") return `skill is ${routed.skill}`;
  if (routed.documents.length === 0) return "no documentation retrieved";
  if (!routed.system.includes("مهارت فعال: تحلیل خطای استقرار")) return "skill prompt missing";
  if (!routed.system.includes("هرگز از کاربر نخواه لاگ را دوباره بفرستد")) {
    return "missing the do-not-ask-for-logs rule";
  }
  if (!routed.system.includes("ETIMEDOUT")) return "error code not surfaced in the prompt";
  return null;
});

check("no secret reaches the system prompt", () => {
  const routed = routeAgentRequest({
    messages: [{ role: "user", parts: [{ type: "text", text: "چرا این deploy fail شد؟" }] }],
    context: failedContext,
  });
  const leaked = ["lr_9f3ka02mzQ7xVb31", "hunter2-super-secret", "Sup3rS3cret", "eyJhbGciOiJIUzI1NiJ9"]
    .filter((secret) => routed.system.includes(secret));
  if (leaked.length) return `leaked into prompt: ${leaked.join(", ")}`;
  return routed.system.includes("[redacted]") ? null : "expected redaction markers in the prompt";
});

check("healthy deployment does not trigger the skill in the router", () => {
  const routed = routeAgentRequest({
    messages: [{ role: "user", parts: [{ type: "text", text: "چطور دامنه وصل کنم؟" }] }],
    context: { currentPage: "domains", deploymentStatus: "deploying", runtime: "next" },
  });
  return routed.skill === null ? null : `skill is ${routed.skill}`;
});

check("retrieval query is enriched with runtime and error codes", () => {
  const skill = runDebugDeploymentSkill({
    query: "مشکلش چیه؟",
    intent: "deployment_failed",
    context: createAgentContext(failedContext),
  });
  if (!skill.retrievalQuery.includes("ETIMEDOUT")) return `query: ${skill.retrievalQuery}`;
  return skill.retrievalQuery.includes("next") ? null : "runtime missing from query";
});

let failures = 0;
for (const { name, run } of checks) {
  let problem;
  try {
    problem = run();
  } catch (error) {
    problem = `threw: ${error.message}`;
  }
  if (problem) failures += 1;
  console.log(`${problem ? "FAIL" : "PASS"}  ${name}${problem ? `\n      ${problem}` : ""}`);
}

if (show) {
  const routed = routeAgentRequest({
    messages: [{ role: "user", parts: [{ type: "text", text: "مشکلش چیه؟" }] }],
    context: failedContext,
  });
  console.log("\n--- skill section ---");
  const start = routed.system.indexOf("## مهارت فعال");
  console.log(routed.system.slice(start, routed.system.indexOf("## مستندات لیارا")));
  console.log("--- retrieved sources ---");
  routed.documents.forEach((d) => console.log(` - ${d.title} :: ${d.sourceUrl}`));
}

console.log(failures === 0 ? "\nهمه‌ی بررسی‌ها موفق بود." : `\n${failures} بررسی ناموفق بود.`);
process.exitCode = failures === 0 ? 0 : 1;
