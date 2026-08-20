/**
 * Deployment debugging skill.
 *
 * Activates when the deployment failed or the user's intent is
 * `deployment_failed`. It reads the logs already carried in the agent context,
 * pulls out the error signals, steers documentation retrieval toward the
 * matching fix pages, and instructs the model how to answer.
 *
 * Pure functions over plain objects — no React, no I/O — so the same logic
 * works from the chat pipeline, a script, or a test.
 */

import { isFailedDeployment } from "../../deployment.js";
import { containsRedaction, redactSecrets } from "../../security/redact.js";

export const DEBUG_DEPLOYMENT_SKILL = "debug_deployment";

/** Error codes worth feeding into the documentation search. */
const ERROR_CODE_PATTERNS = [
  /\b(E[A-Z]{3,12})\b/g,
  /\bnpm error code ([A-Z_]+)\b/gi,
  /\bexit(?:ed with)? code (\d+)\b/gi,
  /\b(MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|OOMKilled|SIGKILL|SIGTERM)\b/g,
];

const ERROR_LINE = /(error|failed|failure|fatal|exception|cannot|unable|timed out|timeout|refused|denied|not found)/i;

const MAX_ERROR_LINES = 6;
const MAX_CODES = 4;

/** True when this turn should be handled as a deployment failure. */
export function shouldDebugDeployment({ intent, context } = {}) {
  return intent === "deployment_failed" || isFailedDeployment(context?.deploymentStatus);
}

/**
 * Pulls the diagnostic parts out of the build log.
 * @returns {{ errorLines: string[], codes: string[], hasLogs: boolean, redacted: boolean }}
 */
export function extractErrorSignals(context = {}) {
  const logs = Array.isArray(context.logs) ? context.logs.map(redactSecrets) : [];
  const errorLines = logs.filter((line) => ERROR_LINE.test(line)).slice(-MAX_ERROR_LINES);

  const codes = new Set();
  const haystack = [...logs, context.error ?? ""].join("\n");
  for (const pattern of ERROR_CODE_PATTERNS) {
    for (const match of haystack.matchAll(pattern)) codes.add(match[1]);
  }

  return {
    errorLines,
    codes: [...codes].slice(0, MAX_CODES),
    hasLogs: logs.length > 0,
    redacted: logs.some(containsRedaction),
  };
}

/**
 * Retrieval query aimed at the fix pages: the user's words plus the runtime and
 * the actual error codes, since "مشکلش چیه؟" on its own retrieves nothing useful.
 */
export function buildDebugQuery({ query = "", context = {}, signals } = {}) {
  const { codes } = signals ?? extractErrorSignals(context);
  const parts = [query, context.runtime, "خطای استقرار build", ...codes];
  return parts.filter(Boolean).join(" ").trim();
}

function formatSignals(signals) {
  const lines = [];
  if (signals.codes.length) lines.push(`- کدهای خطای شناسایی‌شده: ${signals.codes.join("، ")}`);
  if (signals.errorLines.length) {
    lines.push("- خطوط کلیدی لاگ:", ...signals.errorLines.map((line) => `    ${line}`));
  }
  return lines;
}

/** The instructions appended to the system prompt while the skill is active. */
export function buildDebugPrompt({ context = {}, signals } = {}) {
  const resolved = signals ?? extractErrorSignals(context);

  const rules = [
    "## مهارت فعال: تحلیل خطای استقرار",
    resolved.hasLogs
      ? "لاگ‌های همین استقرار در بخش «وضعیت فعلی کاربر» در اختیار توست. هرگز از کاربر نخواه لاگ را دوباره بفرستد یا کپی کند."
      : "لاگی برای این استقرار در دسترس نیست؛ اگر لازم شد بپرس کاربر چه پیام خطایی می‌بیند.",
    "",
    "پاسخ را دقیقاً به این شکل بده:",
    "۱. محتمل‌ترین علت خطا در یک یا دو جمله، با استناد به همان خط لاگی که آن را نشان می‌دهد.",
    "۲. یک فهرست مرتب و کوتاه (۲ تا ۴ گام) از راه‌حل‌های عملی، از ساده‌ترین به پیچیده‌ترین.",
    "۳. در صورت نیاز فقط یک سؤال کوتاه برای ادامه‌ی بررسی.",
    "",
    "- اگر لاگ برای تشخیص قطعی کافی نیست، صریح بگو («به احتمال زیاد…» یا «مطمئن نیستم، اما…») و بگو چه چیزی برای تشخیص دقیق‌تر لازم است.",
    "- علتی را که در لاگ شواهدی ندارد به‌عنوان واقعیت اعلام نکن.",
    "- کوتاه و مستقیم بنویس؛ کل پاسخ زیر ۱۵۰ کلمه. محتمل‌ترین علت را انتخاب کن و همه‌ی احتمال‌ها را ردیف نکن.",
  ];

  if (resolved.redacted) {
    rules.push(
      "- بخشی از لاگ به‌دلیل وجود اطلاعات محرمانه با [redacted] جایگزین شده است. درباره‌ی مقدار پنهان‌شده حدس نزن و آن را از کاربر نخواه.",
    );
  }

  const signalLines = formatSignals(resolved);
  if (signalLines.length) rules.push("", "### نشانه‌های استخراج‌شده از لاگ", ...signalLines);

  return rules.join("\n");
}

/**
 * Runs the skill for one turn.
 * @returns {{ active: boolean, name?: string, retrievalQuery: string,
 *   promptSection: string, signals?: object }}
 */
export function runDebugDeploymentSkill({ query = "", intent, context = {} } = {}) {
  if (!shouldDebugDeployment({ intent, context })) {
    return { active: false, retrievalQuery: query, promptSection: "" };
  }

  const signals = extractErrorSignals(context);
  return {
    active: true,
    name: DEBUG_DEPLOYMENT_SKILL,
    signals,
    retrievalQuery: buildDebugQuery({ query, context, signals }),
    promptSection: buildDebugPrompt({ context, signals }),
  };
}
