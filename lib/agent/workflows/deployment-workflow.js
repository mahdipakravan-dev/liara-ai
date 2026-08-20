/**
 * Guided deployment workflow.
 *
 * A small state machine, not a framework: one snapshot object in, one snapshot
 * object out. The snapshot travels with the conversation (the server streams it
 * as a `data-workflow` part, the client sends it back), so selections survive
 * across turns without any server-side session store.
 *
 * The state is *derived* from the filled slots rather than pushed around by
 * transition calls, which is what stops Rahyar re-asking a question the user
 * already answered: once a slot has a value its step can never come back.
 *
 * States: idle → select_runtime → select_deployment_method → connect_source
 *         → configure_application → configure_environment → ready_to_deploy
 *         → deploying → success | failed
 */

import { isFailedDeployment } from "../../deployment.js";
import { normalizePersian } from "../../text.js";

export const WORKFLOW_STATES = Object.freeze({
  IDLE: "idle",
  SELECT_RUNTIME: "select_runtime",
  SELECT_DEPLOYMENT_METHOD: "select_deployment_method",
  CONNECT_SOURCE: "connect_source",
  CONFIGURE_APPLICATION: "configure_application",
  CONFIGURE_ENVIRONMENT: "configure_environment",
  READY_TO_DEPLOY: "ready_to_deploy",
  DEPLOYING: "deploying",
  SUCCESS: "success",
  FAILED: "failed",
});

export const RUNTIME_OPTIONS = Object.freeze([
  { id: "next", label: "Next.js", hint: "SSR و SSG" },
  { id: "react", label: "React (Vite)", hint: "خروجی استاتیک" },
  { id: "vue", label: "Vue", hint: "Vite یا Nuxt" },
  { id: "static", label: "Static", hint: "HTML/CSS/JS" },
  { id: "other", label: "سایر", hint: "چیز دیگری است" },
]);

/** Mirrors the three cards the assistant and the dashboard tabs already show. */
export const METHOD_OPTIONS = Object.freeze([
  { id: "github", label: "GitHub", hint: "اتصال ریپو و استقرار" },
  { id: "drag-drop", label: "Drag & Drop", hint: "آپلود و استقرار" },
  { id: "cli", label: "Liara CLI", hint: "استقرار با CLI" },
]);

const RUNTIME_PATTERNS = [
  ["next", /(next|نکست)/],
  ["react", /(react|vite|ری ?اکت|ویت)/],
  ["vue", /(vue|nuxt|ویو|ناکست)/],
  ["static", /(static|استاتیک|html)/],
  ["other", /(other|سایر|دیگه|دیگر)/],
];

const METHOD_PATTERNS = [
  ["github", /(github|گیت ?هاب|repo|ریپو|مخزن)/],
  ["drag-drop", /(drag|drop|آپلود|اپلود|درگ|کشیدن)/],
  ["cli", /(cli|ترمینال|terminal|command ?line|سی ?ال ?آی)/],
];

/**
 * Confirmations and skips are matched on whole words: "نه" must not fire inside
 * "نهایی", and a past-tense verb like "کردم" only counts while the workflow is
 * actually waiting on that step.
 */
const AFFIRM_WORDS = [
  "بله", "آره", "اره", "باشه", "ok", "okay", "yes", "بریم", "done", "تمام", "درسته",
  "انجام", "کردم", "کردیم", "دادم", "زدم", "ساختم", "گذاشتم", "شد", "آماده", "اوکی",
];

const SKIP_WORDS = [
  "ندارم", "نداریم", "نمیخوام", "نیاز", "رد", "skip", "بعدا", "خالی", "هیچی", "no", "نه", "لازم",
];

function hasWord(text, words) {
  return words.some((word) =>
    new RegExp(`(?:^|[^\\p{L}\\p{N}])${word}(?:$|[^\\p{L}\\p{N}])`, "u").test(text),
  );
}

/** Which steps a method requires. Drag & Drop has no source to connect. */
const METHOD_STEPS = {
  github: ["runtime", "method", "source", "application", "environment"],
  "drag-drop": ["runtime", "method", "application", "environment"],
  cli: ["runtime", "method", "source", "application", "environment"],
  unknown: ["runtime", "method"],
};

const SLOT_STATE = {
  runtime: WORKFLOW_STATES.SELECT_RUNTIME,
  method: WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD,
  source: WORKFLOW_STATES.CONNECT_SOURCE,
  application: WORKFLOW_STATES.CONFIGURE_APPLICATION,
  environment: WORKFLOW_STATES.CONFIGURE_ENVIRONMENT,
};

const STEP_LABELS = {
  [WORKFLOW_STATES.SELECT_RUNTIME]: "انتخاب پلتفرم برنامه",
  [WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD]: "انتخاب روش استقرار",
  [WORKFLOW_STATES.CONNECT_SOURCE]: "اتصال سورس برنامه",
  [WORKFLOW_STATES.CONFIGURE_APPLICATION]: "تنظیمات برنامه",
  [WORKFLOW_STATES.CONFIGURE_ENVIRONMENT]: "متغیرهای محیطی",
  [WORKFLOW_STATES.READY_TO_DEPLOY]: "آماده‌ی استقرار",
  [WORKFLOW_STATES.DEPLOYING]: "در حال استقرار",
  [WORKFLOW_STATES.SUCCESS]: "استقرار موفق",
  [WORKFLOW_STATES.FAILED]: "استقرار ناموفق",
};

/** What Rahyar must accomplish in each step, per deployment method where it differs. */
const STEP_GOALS = {
  [WORKFLOW_STATES.SELECT_RUNTIME]:
    "بپرس برنامه‌ی فرانت‌اند کاربر روی کدام پلتفرم است و دقیقاً همین گزینه‌ها را پیشنهاد بده: Next.js، React (Vite)، Vue، Static، سایر.",
  [WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD]:
    "بپرس کدام روش استقرار را می‌خواهد و هر سه گزینه را با یک توضیح کوتاه معرفی کن: GitHub، Drag & Drop، Liara CLI.",
  [WORKFLOW_STATES.CONNECT_SOURCE]: {
    github:
      "راهنمایی کن ریپازیتوری گیت‌هاب را به برنامه وصل کند و شاخه‌ی مورد نظر برای استقرار را انتخاب کند.",
    cli: "راهنمایی کن Liara CLI را نصب کند و با `liara login` وارد حساب شود. دستور دقیق نصب را از مستندات بیاور.",
  },
  [WORKFLOW_STATES.CONFIGURE_APPLICATION]:
    "راهنمایی کن نام برنامه و پورت را تنظیم کند و در صورت نیاز فایل liara.json را بسازد. برای پلتفرم انتخاب‌شده مقدار پیش‌فرض پورت را بگو.",
  [WORKFLOW_STATES.CONFIGURE_ENVIRONMENT]:
    "بپرس آیا متغیر محیطی لازم دارد و اگر دارد راهنمایی کن کجا واردشان کند. اگر ندارد بگو می‌تواند این مرحله را رد کند.",
  [WORKFLOW_STATES.READY_TO_DEPLOY]: {
    github: "بگو همه‌چیز آماده است و استقرار با push یا دکمه‌ی استقرار از ریپو شروع می‌شود.",
    "drag-drop": "بگو همه‌چیز آماده است و می‌تواند پوشه‌ی build را در بخش Drag & Drop رها کند.",
    cli: "بگو همه‌چیز آماده است و با اجرای `liara deploy` استقرار شروع می‌شود.",
  },
  [WORKFLOW_STATES.DEPLOYING]:
    "بگو استقرار در جریان است، چه چیزی در لاگ‌ها باید ببیند و چقدر طول می‌کشد. سؤال جدید نپرس.",
  [WORKFLOW_STATES.SUCCESS]:
    "استقرار موفق را تبریک بگو و گام‌های بعدی را پیشنهاد بده: اتصال دامنه، تنظیم متغیرهای محیطی، مشاهده‌ی لاگ‌ها.",
  [WORKFLOW_STATES.FAILED]:
    "استقرار شکست خورده است؛ طبق مهارت تحلیل خطا پاسخ بده و سؤال جدیدی درباره‌ی گام‌های قبلی نپرس.",
};

/** The one-line hint the UI shows above the composer. */
const NEXT_STEP_HINTS = {
  [WORKFLOW_STATES.SELECT_RUNTIME]: "پلتفرم برنامه‌ات را انتخاب کن",
  [WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD]: "روش استقرار را انتخاب کن",
  [WORKFLOW_STATES.CONNECT_SOURCE]: "سورس برنامه را وصل کن",
  [WORKFLOW_STATES.CONFIGURE_APPLICATION]: "نام و پورت برنامه را تنظیم کن",
  [WORKFLOW_STATES.CONFIGURE_ENVIRONMENT]: "متغیرهای محیطی را بررسی کن",
  [WORKFLOW_STATES.READY_TO_DEPLOY]: "همه‌چیز آماده است؛ استقرار را شروع کن",
  [WORKFLOW_STATES.DEPLOYING]: "استقرار در جریان است",
  [WORKFLOW_STATES.SUCCESS]: "استقرار کامل شد",
  [WORKFLOW_STATES.FAILED]: "بررسی خطای استقرار",
};

const START_INTENTS = new Set(["deploy_application", "choose_deployment_method"]);

export function createWorkflow(slots = {}) {
  return { state: WORKFLOW_STATES.IDLE, slots: { ...slots } };
}

function labelOf(options, id) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function matchFirst(patterns, text) {
  return patterns.find(([, pattern]) => pattern.test(text))?.[0];
}

/** Normalizes runtimes/methods coming from UI state, which use their own spellings. */
function normalizeRuntime(value) {
  if (!value) return undefined;
  return matchFirst(RUNTIME_PATTERNS, normalizePersian(String(value)));
}

function normalizeMethod(value) {
  if (!value) return undefined;
  return matchFirst(METHOD_PATTERNS, normalizePersian(String(value)));
}

/**
 * Slots the UI already answers for us: the user picking the "GitHub" tab is the
 * same decision as typing "GitHub", so the workflow should not ask again.
 */
function slotsFromContext(context = {}) {
  const slots = {};
  const runtime = normalizeRuntime(context.runtime);
  const method = normalizeMethod(context.deploymentMethod);
  if (runtime) slots.runtime = runtime;
  if (method) slots.method = method;
  if (context.applicationName && context.port) slots.application = "ui";
  return slots;
}

const CONFIRMABLE = {
  [WORKFLOW_STATES.CONNECT_SOURCE]: "source",
  [WORKFLOW_STATES.CONFIGURE_APPLICATION]: "application",
  [WORKFLOW_STATES.CONFIGURE_ENVIRONMENT]: "environment",
};

/**
 * Reads an answer to the question the workflow is currently asking.
 *
 * A slot is only filled while it is empty or is the open question, so mentioning
 * "ریپو" three steps later cannot silently rewrite an earlier choice.
 */
function slotsFromMessage(state, text, filled) {
  if (!text) return {};
  const folded = normalizePersian(text);
  const slots = {};

  if (!filled.runtime || state === WORKFLOW_STATES.SELECT_RUNTIME) {
    const runtime = matchFirst(RUNTIME_PATTERNS, folded);
    if (runtime) slots.runtime = runtime;
  }
  if (!filled.method || state === WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD) {
    const method = matchFirst(METHOD_PATTERNS, folded);
    if (method) slots.method = method;
  }

  // Steps without options are settled by the user saying they did it, or by
  // skipping. Only the step being asked about can be confirmed this way.
  const confirmable = CONFIRMABLE[state];
  if (confirmable && !filled[confirmable]) {
    if (hasWord(folded, SKIP_WORDS)) slots[confirmable] = "skipped";
    else if (hasWord(folded, AFFIRM_WORDS)) slots[confirmable] = "done";
  }

  return slots;
}

function terminalStateFrom(context = {}, intent) {
  const status = String(context.deploymentStatus ?? "").trim();
  if (isFailedDeployment(status) || intent === "deployment_failed") return WORKFLOW_STATES.FAILED;
  if (/^(deploying|in-progress|building|queued)$/i.test(status)) return WORKFLOW_STATES.DEPLOYING;
  if (/^(success|succeeded|ready|running|live)$/i.test(status)) return WORKFLOW_STATES.SUCCESS;
  return null;
}

/** First unanswered step in the sequence the chosen method requires. */
function deriveState(slots) {
  const steps = stepsFor(slots.method);
  const pending = steps.find((step) => !slots[step]);
  return pending ? SLOT_STATE[pending] : WORKFLOW_STATES.READY_TO_DEPLOY;
}

function stepsFor(method) {
  return METHOD_STEPS[method] ?? METHOD_STEPS.unknown;
}

/**
 * The step that follows the current one, assuming this one gets answered.
 * Without it the model invents its own "گام بعدی" line and contradicts the UI.
 */
function upcomingStateFor(state, slots) {
  // What comes after the method question depends on which method is picked, so
  // there is nothing honest to announce yet.
  if (state === WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD) return null;

  const slotName = Object.keys(SLOT_STATE).find((key) => SLOT_STATE[key] === state);
  if (slotName) return deriveState({ ...slots, [slotName]: "assumed" });
  if (state === WORKFLOW_STATES.READY_TO_DEPLOY) return WORKFLOW_STATES.DEPLOYING;
  if (state === WORKFLOW_STATES.DEPLOYING) return WORKFLOW_STATES.SUCCESS;
  return null;
}

function optionsFor(state) {
  if (state === WORKFLOW_STATES.SELECT_RUNTIME) return { kind: "runtime", items: RUNTIME_OPTIONS };
  if (state === WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD) {
    return { kind: "method", items: METHOD_OPTIONS };
  }
  return { kind: null, items: [] };
}

function goalFor(state, method) {
  const goal = STEP_GOALS[state];
  if (!goal) return "";
  return typeof goal === "string" ? goal : (goal[method] ?? Object.values(goal)[0]);
}

/** Human-readable list of what is already decided, so the model never re-asks. */
export function describeDecisions(slots = {}) {
  const decided = [];
  if (slots.runtime) decided.push(`پلتفرم: ${labelOf(RUNTIME_OPTIONS, slots.runtime)}`);
  if (slots.method) decided.push(`روش استقرار: ${labelOf(METHOD_OPTIONS, slots.method)}`);
  if (slots.source) decided.push(slots.source === "skipped" ? "اتصال سورس: رد شد" : "اتصال سورس: انجام شد");
  if (slots.application) decided.push("تنظیمات برنامه: انجام شد");
  if (slots.environment) {
    decided.push(slots.environment === "skipped" ? "متغیرهای محیطی: لازم نبود" : "متغیرهای محیطی: تنظیم شد");
  }
  return decided;
}

/**
 * Advances the workflow by one turn.
 *
 * @param {object}  input
 * @param {object=} input.workflow  Snapshot from the previous turn.
 * @param {string=} input.message   Latest user message.
 * @param {object=} input.context   Agent context (UI state).
 * @param {string=} input.intent    Detected intent.
 * @returns {object} The next snapshot; `active: false` when no workflow is running.
 */
export function advanceDeploymentWorkflow({ workflow, message = "", context = {}, intent } = {}) {
  const previous = workflow?.slots ?? {};
  const wasRunning = Boolean(workflow?.active) || (workflow?.state && workflow.state !== WORKFLOW_STATES.IDLE);
  const starting = START_INTENTS.has(intent);
  const terminal = terminalStateFrom(context, intent);

  if (!wasRunning && !starting && !terminal) {
    return { active: false, state: WORKFLOW_STATES.IDLE, slots: previous, options: [] };
  }

  // UI first, then the message, so an explicit answer always wins over a stale tab.
  const slots = { ...slotsFromContext(context), ...previous };
  const asking = workflow?.state ?? deriveState(slots);
  Object.assign(slots, slotsFromMessage(asking, message, slots));

  const state = terminal ?? deriveState(slots);
  const { kind, items } = optionsFor(state);
  const steps = stepsFor(slots.method);
  const done = steps.filter((step) => slots[step]).length;
  const upcoming = upcomingStateFor(state, slots);

  return {
    active: true,
    state,
    slots,
    decisions: describeDecisions(slots),
    goal: goalFor(state, slots.method),
    label: STEP_LABELS[state],
    nextStep: NEXT_STEP_HINTS[state],
    upcoming: upcoming ? STEP_LABELS[upcoming] : null,
    optionKind: kind,
    options: items,
    progress: { done: Math.min(done, steps.length), total: steps.length },
  };
}

/** The workflow section injected into the system prompt. */
export function buildWorkflowPrompt(snapshot) {
  if (!snapshot?.active) return "";

  const lines = [
    "## گردش کار فعال: استقرار گام‌به‌گام",
    `گام فعلی: ${snapshot.label} (${snapshot.progress.done} از ${snapshot.progress.total})`,
  ];

  if (snapshot.decisions.length) {
    lines.push(
      "",
      "تصمیم‌های نهایی‌شده‌ی کاربر (این‌ها را دوباره نپرس و تأییدشان را نخواه):",
      ...snapshot.decisions.map((decision) => `- ${decision}`),
    );
  }

  lines.push(
    "",
    `وظیفه‌ی تو در این پیام: ${snapshot.goal}`,
    "",
    "- فقط همین یک گام را پوشش بده. دستورالعمل گام‌های بعدی را از قبل نده و کل فرایند را یک‌جا توضیح نده.",
    "- کوتاه بنویس؛ حداکثر ۱۲۰ کلمه.",
    "- اگر گزینه‌ای برای انتخاب هست، همان گزینه‌ها را نام ببر؛ گزینه‌ی جدید از خودت اضافه نکن.",
  );

  if (snapshot.upcoming && snapshot.state !== WORKFLOW_STATES.FAILED) {
    lines.push(
      `- پاسخ را دقیقاً با همین خط تمام کن و متنش را عوض نکن: «گام بعدی: ${snapshot.upcoming}».`,
    );
  }

  return lines.join("\n");
}
