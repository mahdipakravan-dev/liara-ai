/**
 * Tool registry.
 *
 * Descriptors live in one file each and know nothing about the AI SDK, HTTP, or
 * React. This module adapts them: injects the deployment client, wraps every
 * call in a uniform result envelope, and reports which of them need approval.
 *
 *   READ  → get_deployment, get_logs      run automatically
 *   WRITE → retry_deployment              requires explicit user confirmation
 */

import { tool } from "ai";

import { resolveDeploymentClient } from "./client.js";
import { getDeploymentTool } from "./get-deployment.js";
import { getLogsTool } from "./get-logs.js";
import { retryDeploymentTool } from "./retry-deployment.js";

export const AGENT_TOOLS = [getDeploymentTool, getLogsTool, retryDeploymentTool];

export const READ_ONLY_TOOLS = AGENT_TOOLS.filter((item) => item.kind === "read");
export const WRITE_TOOLS = AGENT_TOOLS.filter((item) => item.kind === "write");

/** Intents where deployment tools are worth offering at all. */
const TOOL_INTENTS = new Set([
  "deployment_failed",
  "deployment_status",
  "view_logs",
  "deploy_application",
]);

export function shouldOfferTools({ context, intent } = {}) {
  return Boolean(context?.deploymentId) || TOOL_INTENTS.has(intent);
}

/**
 * Every tool resolves to the same envelope, successful or not, so the model
 * always gets structured data back and a failure reads as a result rather than
 * a broken turn.
 *
 * @returns {{ok: true, tool: string, data: object} | {ok: false, tool: string, error: {code: string, message: string}}}
 */
function wrapExecute(descriptor, dependencies) {
  return async (input) => {
    try {
      const data = await descriptor.execute(input ?? {}, dependencies);
      return { ok: true, tool: descriptor.name, kind: descriptor.kind, data };
    } catch (error) {
      console.error(`tool ${descriptor.name} failed`, error instanceof Error ? error.message : error);
      return {
        ok: false,
        tool: descriptor.name,
        kind: descriptor.kind,
        error: {
          code: error?.code ?? "tool_error",
          message: error?.message ?? "اجرای این ابزار ممکن نشد.",
        },
      };
    }
  };
}

/** Builds the SDK tool set for one request. */
export function buildAgentTools({ context, client } = {}) {
  const dependencies = { context, client: client ?? resolveDeploymentClient({ context }) };

  return Object.fromEntries(
    AGENT_TOOLS.map((descriptor) => [
      descriptor.name,
      tool({
        description: descriptor.description,
        inputSchema: descriptor.inputSchema,
        execute: wrapExecute(descriptor, dependencies),
      }),
    ]),
  );
}

/**
 * Approval policy handed to `streamText`. Read tools are absent, so they run
 * straight away; the write tool pauses for the user.
 */
export function buildToolApprovals() {
  return Object.fromEntries(WRITE_TOOLS.map((descriptor) => [descriptor.name, "user-approval"]));
}

/** The tool section of the system prompt. */
export function buildToolsPrompt() {
  const describe = (descriptor) => `- \`${descriptor.name}\`: ${descriptor.title}`;

  return [
    "## ابزارها",
    "برای دانستن وضعیت یا لاگ استقرار، به‌جای پرسیدن از کاربر، خودت ابزار مناسب را صدا بزن:",
    ...READ_ONLY_TOOLS.map(describe),
    "",
    "ابزار تغییردهنده (فقط با تأیید صریح کاربر اجرا می‌شود):",
    ...WRITE_TOOLS.map(describe),
    "",
    "- پیش از پیشنهاد هر عمل تغییردهنده، با یک جمله‌ی روشن بگو دقیقاً چه کاری قرار است انجام شود و چه اثری دارد.",
    "- هرگز فقط به این دلیل که استقرار خطا خورده، استقرار مجدد را اجرا نکن. اول علت را توضیح بده.",
    "- استقرار مجدد را تنها وقتی پیشنهاد بده که کاربر آن را خواسته یا گفته مشکل را برطرف کرده است.",
    "- پس از اجرای ابزار، نتیجه را به زبان ساده برای کاربر خلاصه کن و داده‌ی خام JSON را نشان نده.",
  ].join("\n");
}
