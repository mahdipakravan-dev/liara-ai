/**
 * Every limit that controls how much text reaches the model, in one place.
 *
 * These numbers used to be scattered across the route, the router and the
 * context module, which made the real cost of a request impossible to reason
 * about. Changing a limit should mean editing this file and nothing else.
 *
 * Rough sizing at the defaults: 8 messages × 4k chars is the hard ceiling on
 * history, plus 4 documentation chunks, plus a context block whose logs are
 * capped at 20 lines × 400 chars. Worst case is a few thousand tokens per turn.
 */

/** Conversation history actually forwarded to the model. */
export const MAX_HISTORY_MESSAGES = 8;

/** Hard cap on a single message before the request is rejected. */
export const MAX_MESSAGE_LENGTH = 4_000;

/** Hard cap on the whole serialized payload before the request is rejected. */
export const MAX_REQUEST_CHARS = 64_000;

/** Documentation chunks injected into the prompt. */
export const MAX_DOCUMENTS = 4;

/** Deployment log lines carried in the agent context. */
export const MAX_LOG_LINES = 20;

/** Characters kept per log line. */
export const MAX_LOG_LENGTH = 400;

/** Characters kept per scalar context field. */
export const MAX_CONTEXT_VALUE_LENGTH = 200;

/** Log lines a tool may return in one call. */
export const MAX_TOOL_LOG_LINES = 60;

/**
 * Crude character-per-token ratio. Persian runs closer to 2.5 chars/token than
 * English's 4, so this deliberately over-estimates rather than under.
 * Only used for observability, never for truncation decisions.
 */
const CHARS_PER_TOKEN = 3;

export function estimateTokens(text) {
  if (typeof text !== "string" || !text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Keeps the most recent turns.
 *
 * Slicing happens on whole messages so a tool call and its approval/result,
 * which live in the parts of one message, are never split apart.
 */
export function trimHistory(messages, limit = MAX_HISTORY_MESSAGES) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-limit);
}

/**
 * Drops empty values and repeated entries from a context object.
 *
 * The UI sends whatever it has, which often includes fields that are blank or
 * identical to another field (zone and zoneLabel, application name repeated as
 * the current step). Paying tokens twice for the same fact is pure waste.
 */
export function compactContext(context) {
  if (!context || typeof context !== "object") return {};

  const seen = new Set();
  const compact = {};

  for (const [key, value] of Object.entries(context)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      compact[key] = value;
      continue;
    }

    const fingerprint = String(value).trim().toLowerCase();
    if (!fingerprint || seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    compact[key] = value;
  }

  return compact;
}

/** Removes duplicate chunks and enforces the document ceiling. */
export function capDocuments(documents, limit = MAX_DOCUMENTS) {
  if (!Array.isArray(documents)) return [];

  const seen = new Set();
  const unique = [];
  for (const document of documents) {
    const key = document?.id ?? document?.sourceUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(document);
    if (unique.length >= limit) break;
  }
  return unique;
}
