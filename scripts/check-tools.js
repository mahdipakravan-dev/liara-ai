#!/usr/bin/env node
/**
 * Executable checks for the tool layer: categories, structured results,
 * graceful failures, redaction, and the approval policy.
 *
 *   node scripts/check-tools.js
 */

import { routeAgentRequest } from "../lib/agent/router.js";
import {
  AGENT_TOOLS,
  buildAgentTools,
  buildToolApprovals,
  READ_ONLY_TOOLS,
  shouldOfferTools,
  WRITE_TOOLS,
} from "../lib/agent/tools/index.js";
import { createMockDeploymentClient } from "../lib/agent/tools/client.js";
import { startDeployment, findDeployment } from "../lib/deployment-store.js";

const checks = [];
const check = (name, run) => checks.push({ name, run });

const failed = startDeployment({
  application: "assistance",
  runtime: "next",
  method: "GitHub",
  port: "3000",
  zone: "germany",
});

const context = {
  currentPage: "deployment-history",
  applicationName: "assistance",
  runtime: "next",
  deploymentStatus: "error",
  deploymentId: failed.id,
  port: "3000",
};

const tools = buildAgentTools({ context });
const call = (name, input) => tools[name].execute(input, { toolCallId: "t", messages: [] });

// --- categories -------------------------------------------------------------

check("three tools in two categories", () => {
  if (AGENT_TOOLS.length !== 3) return `${AGENT_TOOLS.length} tools`;
  if (READ_ONLY_TOOLS.map((t) => t.name).join(",") !== "get_deployment,get_logs") {
    return READ_ONLY_TOOLS.map((t) => t.name).join(",");
  }
  return WRITE_TOOLS.map((t) => t.name).join(",") === "retry_deployment" ? null : "wrong write set";
});

check("only the write tool requires approval", () => {
  const approvals = buildToolApprovals();
  if (approvals.retry_deployment !== "user-approval") return JSON.stringify(approvals);
  const readNeedsApproval = READ_ONLY_TOOLS.some((t) => t.name in approvals);
  return readNeedsApproval ? "a read tool requires approval" : null;
});

check("tools are only offered when a deployment is in play", () => {
  if (!shouldOfferTools({ context })) return "not offered with a deployment";
  if (!shouldOfferTools({ context: {}, intent: "deployment_failed" })) return "not offered on failure intent";
  return shouldOfferTools({ context: {}, intent: "general_question" }) ? "offered for a plain question" : null;
});

// --- structured results -----------------------------------------------------

check("get_deployment returns structured data", async () => {
  const result = await call("get_deployment", { deploymentId: failed.id });
  if (!result.ok) return `not ok: ${JSON.stringify(result.error)}`;
  const { id, status, runtime, method, port, zone, error } = result.data;
  if (id !== failed.id || status !== "error") return JSON.stringify(result.data);
  if (!runtime || !method || !port || !zone) return "missing fields";
  return error ? null : "error message missing";
});

check("get_logs returns the stored logs", async () => {
  const result = await call("get_logs", { deploymentId: failed.id });
  if (!result.ok) return `not ok: ${JSON.stringify(result.error)}`;
  if (result.data.lineCount !== failed.logs.length) return `lineCount ${result.data.lineCount}`;
  return result.data.logs.some((line) => line.includes("ETIMEDOUT")) ? null : "no error line";
});

check("get_logs honours the limit and reports truncation", async () => {
  const result = await call("get_logs", { deploymentId: failed.id, limit: 2 });
  if (result.data.logs.length !== 2) return `${result.data.logs.length} lines`;
  return result.data.truncated === true ? null : "truncated flag not set";
});

check("get_logs redacts secrets", async () => {
  const leaky = startDeployment({ application: "x", runtime: "next", port: "3000", zone: "iran" });
  leaky.logs = [...leaky.logs, "env: LIARA_API_TOKEN=lr_9f3ka02mzQ7xVb31"];
  const result = await buildAgentTools({ context: {} }).get_logs.execute(
    { deploymentId: leaky.id },
    { toolCallId: "t", messages: [] },
  );
  const joined = result.data.logs.join("\n");
  if (joined.includes("lr_9f3ka02mzQ7xVb31")) return "secret leaked through the tool";
  return joined.includes("[redacted]") ? null : "no redaction marker";
});

check("every result carries ok / tool / kind", async () => {
  const result = await call("get_deployment", {});
  return result.tool === "get_deployment" && result.kind === "read" && result.ok === true
    ? null
    : JSON.stringify(result);
});

// --- graceful failure -------------------------------------------------------

check("unknown id resolves to a structured error, never a throw", async () => {
  const result = await call("get_deployment", { deploymentId: "dep_does_not_exist" });
  if (result.ok) return "unexpectedly succeeded";
  if (result.error.code !== "not_found") return JSON.stringify(result.error);
  return typeof result.error.message === "string" && result.error.message.length > 0
    ? null
    : "no message";
});

check("a client that throws is still reported as a result", async () => {
  const broken = {
    async getDeployment() {
      throw new Error("network down");
    },
    async getLogs() {
      throw new Error("network down");
    },
    async retryDeployment() {
      throw new Error("network down");
    },
  };
  const result = await buildAgentTools({ context, client: broken }).get_logs.execute(
    {},
    { toolCallId: "t", messages: [] },
  );
  return result.ok === false && result.error.message === "network down"
    ? null
    : JSON.stringify(result);
});

// --- the write tool ---------------------------------------------------------

check("retry creates a new attempt and leaves the original alone", async () => {
  const result = await call("retry_deployment", {
    deploymentId: failed.id,
    reason: "خطای شبکه‌ی موقت",
  });
  if (!result.ok) return `not ok: ${JSON.stringify(result.error)}`;
  if (result.data.id === failed.id) return "reused the old id";
  if (result.data.retryOf !== failed.id) return `retryOf is ${result.data.retryOf}`;
  if (result.data.status !== "deploying") return `status is ${result.data.status}`;
  if (result.data.version !== "v2") return `version is ${result.data.version}`;
  const original = findDeployment(failed.id);
  return original.status === "error" ? null : "the original was mutated";
});

check("retry keeps the original settings", async () => {
  const result = await call("retry_deployment", { deploymentId: failed.id, reason: "تست" });
  const { runtime, method, port } = result.data;
  return runtime === "next" && method === "GitHub" && port === "3000"
    ? null
    : JSON.stringify(result.data);
});

check("retrying something unknown fails cleanly", async () => {
  const result = await call("retry_deployment", { deploymentId: "dep_nope", reason: "x" });
  return result.ok === false && result.error.code === "not_found" ? null : JSON.stringify(result);
});

// --- context fallback -------------------------------------------------------

check("falls back to the deployment carried in the UI context", async () => {
  const client = createMockDeploymentClient({
    context: {
      deploymentId: "dep_from_context",
      deploymentStatus: "error",
      runtime: "next",
      port: "8080",
      logs: ["2026-08-20 11:00:00 |  ---> npm error code ETIMEDOUT"],
    },
  });
  const deployment = await client.getDeployment("dep_from_context");
  if (!deployment) return "context deployment not found";
  const logs = await client.getLogs("dep_from_context");
  return logs.lineCount === 1 ? null : `lineCount ${logs.lineCount}`;
});

// --- prompt wiring ----------------------------------------------------------

check("the prompt states the no-automatic-retry rule", () => {
  const routed = routeAgentRequest({
    messages: [{ role: "user", parts: [{ type: "text", text: "مشکلش چیه؟" }] }],
    context,
  });
  if (!routed.toolsEnabled) return "tools not enabled";
  if (!routed.system.includes("هرگز فقط به این دلیل که استقرار خطا خورده")) {
    return "missing the no-auto-retry rule";
  }
  return routed.system.includes("فقط با تأیید صریح کاربر") ? null : "missing the approval rule";
});

check("a plain question gets no tool section", () => {
  const routed = routeAgentRequest({
    messages: [{ role: "user", parts: [{ type: "text", text: "چطور دامنه وصل کنم؟" }] }],
    context: { currentPage: "domains" },
  });
  if (routed.toolsEnabled) return "tools enabled for a plain question";
  return routed.system.includes("## ابزارها") ? "tool prompt leaked" : null;
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
