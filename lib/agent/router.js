/**
 * Agent router: turns a raw chat request body into everything the model call
 * needs. /api/chat only handles transport, this module owns the agent logic.
 */

import { capDocuments, MAX_DOCUMENTS } from "../ai/token-budget.js";
import { retrieveLiaraDocs } from "../knowledge/retrieve.js";
import { createAgentContext } from "./context.js";
import { detectIntent } from "./intent.js";
import { buildSystemPrompt } from "./prompt.js";
import { runDebugDeploymentSkill } from "./skills/debug-deployment.js";
import { buildToolsPrompt, shouldOfferTools } from "./tools/index.js";
import {
  advanceDeploymentWorkflow,
  buildWorkflowPrompt,
} from "./workflows/deployment-workflow.js";

/** Retrieval query for a guided step, so each step pulls its own documentation. */
const STEP_QUERIES = {
  connect_source: "اتصال مخزن گیت‌هاب استقرار",
  configure_application: "liara.json تنظیمات پورت برنامه",
  configure_environment: "متغیرهای محیطی environment variables",
  ready_to_deploy: "شروع استقرار deploy",
};

/** Last thing the user typed, flattened from UIMessage text parts. */
export function getLatestUserText(messages) {
  if (!Array.isArray(messages)) return "";

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    if (typeof message.content === "string") return message.content;
    if (!Array.isArray(message.parts)) return "";
    return message.parts
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join(" ")
      .trim();
  }
  return "";
}

export function routeAgentRequest({ messages, context: rawContext, workflow } = {}) {
  const context = createAgentContext(rawContext);
  const message = getLatestUserText(messages);
  const { intent, confidence, source } = detectIntent(message, context);

  const nextWorkflow = advanceDeploymentWorkflow({ workflow, message, context, intent });

  // Skills may rewrite the retrieval query — "مشکلش چیه؟" alone finds nothing,
  // but the same question plus the runtime and error codes finds the fix pages.
  const skill = runDebugDeploymentSkill({ query: message, intent, context });
  const documents = capDocuments(
    retrieveLiaraDocs({
      query: buildRetrievalQuery({ query: skill.retrievalQuery, workflow: nextWorkflow, context }),
      intent,
      context,
      limit: MAX_DOCUMENTS,
    }),
  );

  const toolsEnabled = shouldOfferTools({ context, intent });

  return {
    context,
    intent,
    confidence,
    source,
    skill: skill.active ? skill.name : null,
    workflow: nextWorkflow,
    toolsEnabled,
    documents,
    system: buildSystemPrompt({
      context,
      intent,
      confidence,
      documents,
      skill: skill.promptSection,
      workflow: buildWorkflowPrompt(nextWorkflow),
      tools: toolsEnabled ? buildToolsPrompt() : "",
    }),
  };
}

/**
 * Inside a workflow the user's reply is often just "GitHub" or "بله", which
 * retrieves nothing useful — so search for the current step instead.
 */
function buildRetrievalQuery({ query, workflow, context }) {
  const stepQuery = workflow?.active ? STEP_QUERIES[workflow.state] : null;
  if (!stepQuery) return query;
  const runtime = workflow.slots?.runtime ?? context.runtime ?? "";
  return [query, runtime, stepQuery].filter(Boolean).join(" ");
}
