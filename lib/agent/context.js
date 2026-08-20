/**
 * Description of what the user is currently doing in the console.
 * Shared by the client (builds it) and /api/chat (re-validates it and turns it
 * into a prompt section), so this module must stay free of React and Next.
 */

import {
  compactContext,
  MAX_CONTEXT_VALUE_LENGTH,
  MAX_LOG_LENGTH,
  MAX_LOG_LINES,
} from "../ai/token-budget.js";
import { redactSecrets } from "../security/redact.js";

export const AGENT_CONTEXT_FIELDS = [
  "currentPage",
  "scenario",
  "applicationName",
  "runtime",
  "deploymentMethod",
  "deploymentStatus",
  "deploymentId",
  "port",
  "zone",
  "currentStep",
  "logs",
];

const FIELD_LABELS = {
  currentPage: "صفحه‌ی جاری",
  scenario: "سناریوی دستیار",
  currentStep: "مرحله‌ی جاری",
  applicationName: "نام برنامه",
  runtime: "پلتفرم برنامه",
  deploymentMethod: "روش استقرار",
  deploymentStatus: "وضعیت استقرار",
  deploymentId: "شناسه‌ی استقرار",
  port: "پورت",
  zone: "منطقه",
};

function normalizeValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_CONTEXT_VALUE_LENGTH) : undefined;
}

function normalizeLogs(value) {
  const lines = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("\n")
      : [];
  // Redacted here rather than at the call sites so no path can leak a secret
  // from build logs into the model input.
  const normalized = lines
    .map((line) => (typeof line === "string" ? redactSecrets(line.trim()).slice(0, MAX_LOG_LENGTH) : ""))
    .filter(Boolean)
    .slice(-MAX_LOG_LINES);
  return normalized.length ? normalized : undefined;
}

/**
 * Keeps only known fields with usable values, so a partial or malformed
 * context never breaks a chat request.
 */
export function createAgentContext(input) {
  if (!input || typeof input !== "object") return {};

  const context = {};
  for (const field of AGENT_CONTEXT_FIELDS) {
    const value =
      field === "logs" ? normalizeLogs(input[field]) : normalizeValue(input[field]);
    if (value !== undefined) context[field] = value;
  }
  // Empty and duplicate values are dropped before they cost tokens; `logs`
  // survives compaction because it is an array.
  return compactContext(context);
}

export function isAgentContextEmpty(context) {
  return !context || Object.keys(context).length === 0;
}

/** Renders the context as a Persian prompt section, or "" when there is nothing to say. */
export function formatAgentContext(input) {
  const context = createAgentContext(input);
  if (isAgentContextEmpty(context)) return "";

  const lines = Object.entries(FIELD_LABELS)
    .filter(([field]) => context[field] !== undefined)
    .map(([field, label]) => `- ${label}: ${context[field]}`);

  if (context.logs) {
    lines.push(`- آخرین لاگ‌ها:\n${context.logs.map((log) => `    ${log}`).join("\n")}`);
  }

  return [
    "## وضعیت فعلی کاربر در کنسول",
    ...lines,
    "",
    "این اطلاعات مستقیماً از رابط کاربری خوانده شده است. اگر کاربر پرسید «الان کجای فرایند هستم؟» یا سؤالی درباره‌ی وضعیتش داشت، بر همین اساس پاسخ بده و درباره‌ی موارد ذکرنشده حدس نزن.",
  ].join("\n");
}
