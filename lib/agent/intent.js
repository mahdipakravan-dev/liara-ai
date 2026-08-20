/**
 * Deterministic intent detection for Rahyar.
 *
 * Scoring instead of first-match-wins: every rule turns keyword hits into a
 * score, UI context adds bonuses, and the highest score wins with the rule
 * order below as the tie-break. That keeps a specific topic ("چرا دامنه‌ام کار
 * نمی‌کنه؟") from being swallowed by a generic failure word.
 */

import { normalizePersian as normalizeText } from "../text.js";

export const AGENT_INTENTS = [
  "deploy_application",
  "deployment_failed",
  "deployment_status",
  "configure_environment",
  "choose_deployment_method",
  "setup_domain",
  "connect_database",
  "view_logs",
  "general_liara_question",
  "general_question",
];

export const FALLBACK_INTENT = "general_question";

const KEYWORDS = {
  smalltalk:
    /^(سلام|درود|های|hi|hello|hey|ممنون|مرسی|تشکر|خداحافظ|بای|thanks|thank you|ok|okay|باشه|چطوری|خوبی)[\s!.،؟?]*$/,
  failure:
    /(fail|failed|failing|failure|error|crash|broken|timeout|time out|خطا|ارور|مشکل|ایراد|شکست|ناموفق|کرش|قطع شد|بالا نمیاد|کار نمی|نمی ?(شه|شود|کنه|کند)|down)/,
  deployment:
    /(deploy|deployment|redeploy|دپلوی|دیپلوی|استقرار|مستقر|منتشر|publish|build|بیلد)/,
  logs: /(\blogs?\b|لاگ|خروجی بیلد|خروجی ساخت|stack ?trace|traceback)/,
  status:
    /(status|وضعیت|کجای فرایند|کجای کار|کجا هستم|چه مرحله|مرحله چندم|چقدر مونده|چقدر طول|تموم شد|تمام شد|آماده شد|پیشرفت|progress)/,
  environment:
    /(\benv\b|\.env|environment|متغیر|محیطی|secret|سکرت|api key|کلید محیطی)/,
  domain:
    /(domain|دامنه|زیردامنه|subdomain|\bdns\b|\bssl\b|\btls\b|https|گواهی|certificate|cname)/,
  database:
    /(database|دیتابیس|بانک اطلاعاتی|\bdb\b|mongo|postgres|mysql|mariadb|redis|elastic)/,
  method:
    /(روش استقرار|روش دپلوی|روش های|کدام روش|کدوم روش|چه روشی|کدوم بهتره|کدام بهتر|github یا|cli یا|drag ?(and|&)? ?drop|فایل زیپ|\bzip\b)/,
  liara:
    /(liara|لیارا|پلن|\bplan\b|قیمت|هزینه|تعرفه|کنسول|منطقه|\bzone\b|منابع|\bram\b|\bcpu\b|دیسک|\bdisk\b)/,
};

/** Rule order doubles as the tie-break order: earlier rules win equal scores. */
const RULES = [
  { intent: "choose_deployment_method", score: (hit) => (hit.method ? 4 : 0) },
  { intent: "configure_environment", score: (hit) => (hit.environment ? 3 : 0) },
  { intent: "setup_domain", score: (hit) => (hit.domain ? 3 : 0) },
  { intent: "connect_database", score: (hit) => (hit.database ? 3 : 0) },
  { intent: "view_logs", score: (hit) => (hit.logs ? 3 : 0) },
  {
    intent: "deployment_failed",
    score: (hit) => (hit.failure ? 3 + (hit.deployment || hit.logs ? 2 : 0) : 0),
  },
  {
    intent: "deployment_status",
    score: (hit) => (hit.status ? 3 + (hit.deployment ? 1 : 0) : 0),
  },
  { intent: "deploy_application", score: (hit) => (hit.deployment ? 3 : 0) },
  { intent: "general_liara_question", score: (hit) => (hit.liara ? 2 : 0) },
];

function matchKeywords(text) {
  const hit = {};
  for (const [name, pattern] of Object.entries(KEYWORDS)) {
    if (name !== "smalltalk" && pattern.test(text)) hit[name] = true;
  }
  return hit;
}

/**
 * What the UI alone suggests. Applied on top of message scores, or on its own
 * when the message carries no usable signal ("مشکلش چیه؟" on a failed build).
 */
function scoreFromContext(context) {
  const safe = context && typeof context === "object" ? context : {};
  const status = normalizeText(safe.deploymentStatus);
  const page = normalizeText(safe.currentPage);
  const scenario = normalizeText(safe.scenario);
  const bonus = {};
  const add = (intent, value) => {
    bonus[intent] = (bonus[intent] ?? 0) + value;
  };

  if (/fail|error|خطا|ناموفق/.test(status) || scenario === "error") add("deployment_failed", 3);
  if (/deploying|in-progress|queued|building|pending|در حال/.test(status)) add("deployment_status", 2);

  if (page === "deployment-history" || page === "history") {
    add("deployment_status", 1);
    add("view_logs", 1);
  } else if (page === "deployment-setup" || page === "deploy") {
    add("deploy_application", 1);
  } else if (page === "logs") {
    add("view_logs", 2);
  } else if (page === "domains") {
    add("setup_domain", 2);
  } else if (page === "settings") {
    add("configure_environment", 1);
  }

  if (Array.isArray(safe.logs) && safe.logs.length > 0) add("view_logs", 1);

  return bonus;
}

function toConfidence(score) {
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

/**
 * @returns {{ intent: string, confidence: "high"|"medium"|"low", score: number,
 *   source: "message"|"context"|"fallback" }}
 */
export function detectIntent(message, context) {
  const text = normalizeText(message);
  if (!text || KEYWORDS.smalltalk.test(text)) {
    return { intent: FALLBACK_INTENT, confidence: "low", score: 0, source: "fallback" };
  }

  const hit = matchKeywords(text);
  const contextBonus = scoreFromContext(context);
  const messageScores = RULES.map((rule) => rule.score(hit));
  const hasMessageSignal = messageScores.some((score) => score > 0);

  let best = null;
  RULES.forEach((rule, index) => {
    const base = messageScores[index];
    // Context only reinforces intents the message already hints at; otherwise a
    // failed deployment in the background would hijack "چطور دامنه وصل کنم؟".
    const total = hasMessageSignal
      ? base > 0
        ? base + (contextBonus[rule.intent] ?? 0)
        : 0
      : (contextBonus[rule.intent] ?? 0);
    if (total > 0 && (!best || total > best.score)) best = { intent: rule.intent, score: total };
  });

  if (!best) return { intent: FALLBACK_INTENT, confidence: "low", score: 0, source: "fallback" };

  return {
    intent: best.intent,
    confidence: toConfidence(best.score),
    score: best.score,
    source: hasMessageSignal ? "message" : "context",
  };
}
