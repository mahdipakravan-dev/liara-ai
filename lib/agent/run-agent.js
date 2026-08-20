/**
 * Agent orchestration: the single entry point for a Rahyar turn.
 *
 *   user message → UI context → intent → documentation retrieval
 *   → grounded prompt → Liara AI → streamed response
 *
 * Everything here runs on the server; the Liara credentials never leave it.
 * /api/chat only validates the request and hands off to `runAgent`.
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai";

import { estimateTokens, trimHistory } from "../ai/token-budget.js";
import { startRequestLog } from "../observability/logger.js";
import { routeAgentRequest } from "./router.js";
import { buildAgentTools, buildToolApprovals } from "./tools/index.js";

// Debugging turns carry logs plus documentation, so the model deliberates
// noticeably longer than on a plain question.
const REQUEST_TIMEOUT_MS = 90_000;
// One step to call the tools, one to answer with what they returned.
const MAX_TOOL_STEPS = 3;
const STREAM_ERROR_MESSAGE = "ارتباط با رهیار برقرار نشد. کمی بعد دوباره تلاش کنید.";

/** Reads the Liara AI credentials. Returns null when the service is not configured. */
export function getAgentConfig() {
  const baseURL = process.env.LIARA_AI_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.LIARA_AI_API_KEY;
  const model = process.env.LIARA_AI_MODEL;

  if (!baseURL || !apiKey || !model) return null;
  return { baseURL, apiKey, model };
}

/**
 * One entry per document, deduplicated by URL — retrieval can return two
 * chunks of the same page and the user should see one link.
 */
function toSources(documents) {
  const seen = new Map();
  for (const document of documents ?? []) {
    if (!document?.sourceUrl || seen.has(document.sourceUrl)) continue;
    seen.set(document.sourceUrl, {
      sourceId: document.id,
      url: document.sourceUrl,
      title: document.title || document.sourceUrl,
    });
  }
  return [...seen.values()];
}

/**
 * Runs one turn and returns a streaming `Response`.
 *
 * @param {object}  body     Validated request body: `{ messages, context, workflow }`.
 * @param {object}  config   Result of `getAgentConfig()`.
 * @param {object=} options
 * @param {object=} options.log      Request log from `startRequestLog`.
 * @param {object=} options.headers  Extra response headers (rate limit state).
 * @returns {Response} UI message stream: source parts first, then the answer.
 */
export function runAgent(body, config, { log = startRequestLog(), headers = {} } = {}) {
  const { messages, context, intent, confidence, skill, workflow, toolsEnabled, documents, system } = {
    messages: body?.messages ?? [],
    ...routeAgentRequest(body),
  };

  // Only the recent turns go upstream; the rest stays in the browser.
  const history = trimHistory(messages);
  const sources = toSources(documents);
  const toolCalls = [];

  log.set({
    intent,
    confidence,
    skill: skill ?? null,
    workflow: workflow?.active ? workflow.state : null,
    toolsEnabled,
    historyMessages: history.length,
    droppedMessages: messages.length - history.length,
    retrievedDocumentIds: documents.map((document) => document.id),
    promptTokensEstimate: estimateTokens(system),
  });

  const liara = createOpenAICompatible({
    name: "liara",
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Sources are known before generation, so they render as soon as the
      // answer starts instead of waiting for the model to finish.
      writer.write({ type: "start" });
      for (const source of sources) writer.write({ type: "source-url", ...source });

      // The workflow snapshot rides along with the message history: the client
      // renders the step from it and sends it back on the next turn, so the
      // guided flow needs no server-side session.
      if (workflow?.active) {
        writer.write({ type: "data-workflow", id: "workflow", data: workflow });
      }

      const result = streamText({
        model: liara.chatModel(config.model),
        system,
        messages: await convertToModelMessages(history),
        // Read-only tools run on their own; the write tool pauses here and the
        // run resumes only after the user approves in the UI.
        ...(toolsEnabled
          ? {
              tools: buildAgentTools({ context }),
              toolApproval: buildToolApprovals(),
              stopWhen: stepCountIs(MAX_TOOL_STEPS),
            }
          : {}),
        timeout: REQUEST_TIMEOUT_MS,
        maxRetries: 1,
        onStepFinish: ({ toolCalls: calls }) => {
          for (const call of calls ?? []) toolCalls.push(call.toolName);
        },
        onFinish: ({ usage, finishReason }) => {
          log.finish({
            success: true,
            finishReason,
            toolCalls,
            inputTokens: usage?.inputTokens ?? null,
            outputTokens: usage?.outputTokens ?? null,
          });
        },
      });

      writer.merge(result.toUIMessageStream({ sendStart: false }));
    },
    onError: (error) => {
      // The model's own error text can quote the request, so only a category
      // and the redacted message reach the log, and the user sees neither.
      log.finish({ success: false, errorType: "stream_failed", error, toolCalls });
      return STREAM_ERROR_MESSAGE;
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      ...headers,
      "x-request-id": log.requestId,
      "x-agent-intent": intent,
      "x-agent-confidence": confidence,
      "x-agent-skill": skill ?? "none",
      "x-agent-workflow": workflow?.active ? workflow.state : "idle",
      "x-agent-tools": toolsEnabled ? "on" : "off",
      "x-agent-sources": String(sources.length),
    },
  });
}

export { STREAM_ERROR_MESSAGE };
