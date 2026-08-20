#!/usr/bin/env node
/**
 * Executable checks for the guided deployment workflow.
 *
 *   node scripts/check-workflow.js          # run assertions
 *   node scripts/check-workflow.js --show   # also print the guided journey
 */

import { routeAgentRequest } from "../lib/agent/router.js";
import { WORKFLOW_STATES } from "../lib/agent/workflows/deployment-workflow.js";

const show = process.argv.includes("--show");
const checks = [];
const check = (name, run) => checks.push({ name, run });

/** Drives the router the way the client does: reply, carry the snapshot forward. */
function conversation(context = {}) {
  const messages = [];
  let workflow = null;
  const turns = [];

  return {
    say(text) {
      messages.push({ role: "user", parts: [{ type: "text", text }] });
      const routed = routeAgentRequest({ messages, context, workflow });
      workflow = routed.workflow;
      messages.push({ role: "assistant", parts: [{ type: "text", text: "(پاسخ رهیار)" }] });
      turns.push({ text, routed });
      return routed;
    },
    get workflow() {
      return workflow;
    },
    turns,
  };
}

// --- the requested journey: frontend deploy, runtime unknown ----------------

const journey = conversation({ currentPage: "dashboard" });
const t1 = journey.say("میخوام فرانت‌اند پروژه‌ام رو روی لیارا deploy کنم");
const t2 = journey.say("Next.js");
const t3 = journey.say("GitHub");
const t4 = journey.say("ریپو رو وصل کردم");
const t5 = journey.say("پورت رو ۳۰۰۰ گذاشتم، انجام شد");
const t6 = journey.say("متغیر محیطی ندارم");

check("starts by asking for the runtime", () =>
  t1.workflow.state === WORKFLOW_STATES.SELECT_RUNTIME ? null : `state is ${t1.workflow.state}`);

check("runtime options are the five requested ones", () => {
  const labels = t1.workflow.options.map((o) => o.label).join(", ");
  return labels === "Next.js, React (Vite), Vue, Static, سایر" ? null : labels;
});

check("moves to the method after the runtime answer", () =>
  t2.workflow.state === WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD
    ? null
    : `state is ${t2.workflow.state}`);

check("offers GitHub / Drag & Drop / Liara CLI", () => {
  const labels = t2.workflow.options.map((o) => o.label).join(", ");
  return labels === "GitHub, Drag & Drop, Liara CLI" ? null : labels;
});

check("GitHub branches into connect_source", () =>
  t3.workflow.state === WORKFLOW_STATES.CONNECT_SOURCE ? null : `state is ${t3.workflow.state}`);

check("confirming the repo moves on to application config", () =>
  t4.workflow.state === WORKFLOW_STATES.CONFIGURE_APPLICATION
    ? null
    : `state is ${t4.workflow.state}`);

check("configured application moves on to environment", () =>
  t5.workflow.state === WORKFLOW_STATES.CONFIGURE_ENVIRONMENT
    ? null
    : `state is ${t5.workflow.state}`);

check("skipping environment reaches ready_to_deploy", () =>
  t6.workflow.state === WORKFLOW_STATES.READY_TO_DEPLOY ? null : `state is ${t6.workflow.state}`);

check("selections are remembered to the end", () => {
  const { runtime, method } = t6.workflow.slots;
  return runtime === "next" && method === "github" ? null : JSON.stringify(t6.workflow.slots);
});

check("never re-asks an answered question", () => {
  const asked = journey.turns
    .map((turn) => turn.routed.workflow.state)
    .filter((state) => state !== WORKFLOW_STATES.READY_TO_DEPLOY);
  const repeated = asked.filter((state, index) => asked.indexOf(state) !== index);
  return repeated.length ? `re-entered: ${repeated.join(", ")}` : null;
});

check("prompt lists prior decisions as settled", () => {
  const system = t4.system;
  if (!system.includes("این‌ها را دوباره نپرس")) return "missing the do-not-re-ask rule";
  if (!system.includes("پلتفرم: Next.js")) return "runtime decision missing";
  return system.includes("روش استقرار: GitHub") ? null : "method decision missing";
});

check("prompt scopes the model to one step", () => {
  const system = t3.system;
  if (!system.includes("فقط همین یک گام را پوشش بده")) return "missing single-step rule";
  if (system.includes("گام‌های بعدی را از قبل نده")) return null;
  return "missing the do-not-run-ahead rule";
});

check("the announced next step matches the following state", () => {
  if (t1.workflow.upcoming !== "انتخاب روش استقرار") return `after runtime: ${t1.workflow.upcoming}`;
  if (t3.workflow.upcoming !== "تنظیمات برنامه") return `after source: ${t3.workflow.upcoming}`;
  if (!t3.system.includes("«گام بعدی: تنظیمات برنامه»")) return "not pinned in the prompt";
  return t6.workflow.upcoming === "در حال استقرار" ? null : `at ready: ${t6.workflow.upcoming}`;
});

check("Drag & Drop announces application config after the method", () => {
  const flow = conversation();
  flow.say("میخوام دیپلوی کنم");
  flow.say("Static");
  const routed = flow.say("Drag & Drop");
  return routed.workflow.upcoming === "متغیرهای محیطی" ? null : routed.workflow.upcoming;
});

check("progress advances monotonically", () => {
  const done = journey.turns.map((turn) => turn.routed.workflow.progress.done);
  const ok = done.every((value, index) => index === 0 || value >= done[index - 1]);
  return ok ? null : `progress went backwards: ${done.join(",")}`;
});

// --- branching --------------------------------------------------------------

check("Drag & Drop skips connect_source", () => {
  const flow = conversation();
  flow.say("میخوام دیپلوی کنم");
  flow.say("React Vite");
  const routed = flow.say("Drag & Drop");
  if (routed.workflow.state !== WORKFLOW_STATES.CONFIGURE_APPLICATION) {
    return `state is ${routed.workflow.state}`;
  }
  return routed.workflow.progress.total === 4 ? null : `total is ${routed.workflow.progress.total}`;
});

check("Liara CLI keeps connect_source with its own goal", () => {
  const flow = conversation();
  flow.say("میخوام دیپلوی کنم");
  flow.say("Vue");
  const routed = flow.say("با CLI");
  if (routed.workflow.state !== WORKFLOW_STATES.CONNECT_SOURCE) {
    return `state is ${routed.workflow.state}`;
  }
  return routed.workflow.goal.includes("liara login") ? null : `goal: ${routed.workflow.goal}`;
});

check("ready_to_deploy instruction differs per method", () => {
  const build = (method) => {
    const flow = conversation();
    flow.say("میخوام دیپلوی کنم");
    flow.say("Next.js");
    flow.say(method);
    flow.say("انجام شد");
    flow.say("انجام شد");
    return flow.say("ندارم").workflow;
  };
  const cli = build("Liara CLI");
  const drop = build("Drag & Drop");
  if (cli.state !== WORKFLOW_STATES.READY_TO_DEPLOY) return `cli state ${cli.state}`;
  if (!cli.goal.includes("liara deploy")) return `cli goal: ${cli.goal}`;
  return drop.goal.includes("Drag & Drop") ? null : `drop goal: ${drop.goal}`;
});

// --- context awareness ------------------------------------------------------

check("known runtime skips the runtime question", () => {
  const flow = conversation({ currentPage: "deploy", runtime: "next" });
  const routed = flow.say("میخوام پروژه‌ام رو deploy کنم");
  if (routed.workflow.state !== WORKFLOW_STATES.SELECT_DEPLOYMENT_METHOD) {
    return `state is ${routed.workflow.state}`;
  }
  return routed.workflow.slots.runtime === "next" ? null : "runtime not detected";
});

check("dashboard tab selection counts as the method answer", () => {
  const flow = conversation({ currentPage: "deploy", runtime: "next", deploymentMethod: "GitHub" });
  const routed = flow.say("میخوام دیپلوی کنم");
  return routed.workflow.state === WORKFLOW_STATES.CONNECT_SOURCE
    ? null
    : `state is ${routed.workflow.state}`;
});

check("deployment status drives the terminal states", () => {
  const deploying = conversation({ deploymentStatus: "deploying" }).say("چه خبر؟");
  const success = conversation({ deploymentStatus: "success" }).say("چه خبر؟");
  const failed = conversation({ deploymentStatus: "error", logs: ["npm error code ETIMEDOUT"] }).say(
    "مشکلش چیه؟",
  );
  if (deploying.workflow.state !== WORKFLOW_STATES.DEPLOYING) return `deploying: ${deploying.workflow.state}`;
  if (success.workflow.state !== WORKFLOW_STATES.SUCCESS) return `success: ${success.workflow.state}`;
  return failed.workflow.state === WORKFLOW_STATES.FAILED ? null : `failed: ${failed.workflow.state}`;
});

check("failed state hands over to the debugging skill", () => {
  const routed = conversation({
    deploymentStatus: "error",
    runtime: "next",
    logs: ["npm error code ETIMEDOUT"],
  }).say("مشکلش چیه؟");
  if (routed.skill !== "debug_deployment") return `skill is ${routed.skill}`;
  return routed.system.includes("سؤال جدیدی درباره‌ی گام‌های قبلی نپرس")
    ? null
    : "workflow did not defer to the skill";
});

// --- staying out of the way -------------------------------------------------

check("a plain question does not start a workflow", () => {
  const routed = conversation({ currentPage: "domains" }).say("چطور دامنه وصل کنم؟");
  if (routed.workflow.active) return `workflow started in ${routed.workflow.state}`;
  return routed.system.includes("گردش کار فعال") ? "workflow prompt leaked" : null;
});

check("workflow survives an unrelated question mid-flow", () => {
  const flow = conversation();
  flow.say("میخوام فرانت‌اندم رو deploy کنم");
  flow.say("Next.js");
  flow.say("GitHub");
  const aside = flow.say("راستی قیمت پلن‌ها چنده؟");
  if (aside.workflow.state !== WORKFLOW_STATES.CONNECT_SOURCE) {
    return `state is ${aside.workflow.state}`;
  }
  const { runtime, method } = aside.workflow.slots;
  return runtime === "next" && method === "github" ? null : "selections lost";
});

check("each step retrieves its own documentation", () => {
  const flow = conversation();
  flow.say("میخوام فرانت‌اندم رو deploy کنم");
  flow.say("Next.js");
  const source = flow.say("GitHub");
  return source.documents.length > 0 ? null : "no docs retrieved for connect_source";
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
  console.log("\n--- guided journey ---");
  for (const { text, routed } of journey.turns) {
    const w = routed.workflow;
    const options = w.options.map((o) => o.label).join(" | ") || "—";
    console.log(
      `\nکاربر: ${text}\n  state: ${w.state} (${w.progress.done}/${w.progress.total})` +
        `\n  گام بعدی: ${w.nextStep}\n  گزینه‌ها: ${options}\n  تصمیم‌ها: ${w.decisions.join(" ، ") || "—"}`,
    );
  }
}

console.log(failures === 0 ? "\nهمه‌ی بررسی‌ها موفق بود." : `\n${failures} بررسی ناموفق بود.`);
process.exitCode = failures === 0 ? 0 : 1;
