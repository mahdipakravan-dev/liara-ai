/**
 * Public retrieval API for Rahyar's documentation knowledge base.
 *
 * Server-only (reads the generated JSON from disk). The chat route should call
 * this instead of touching the index or the ranker directly.
 */

import { getKnowledgeBase } from "./documents.js";
import { rankDocuments } from "./search.js";

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 8;
/** Keeps the injected documentation well under the model's context budget. */
const MAX_TOTAL_TOKENS = 2_000;
/** Two chunks from one page is plenty; more crowds out other sources. */
const MAX_PER_DOCUMENT = 2;
/** Below this the match is noise — better to answer with no documentation. */
const MIN_SCORE = 4;
/**
 * One incidental keyword proves little: "سلام" appears in a hello-world sample.
 * A single-term hit needs the intent, platform or tags to agree as well.
 */
const MIN_TERMS_WITHOUT_STRUCTURE = 2;

function clampLimit(limit) {
  const value = Number.isFinite(limit) ? Math.trunc(limit) : DEFAULT_LIMIT;
  return Math.min(Math.max(value, 1), MAX_LIMIT);
}

/**
 * @param {object} options
 * @param {string} options.query        Latest user message.
 * @param {string} [options.intent]     Intent from the agent router.
 * @param {object} [options.context]    UI context (runtime, currentPage, ...).
 * @param {number} [options.limit]      Max chunks to return. Default 4.
 * @returns {Array<object>} Ranked chunks, each keeping its source URL.
 */
export function retrieveLiaraDocs({ query, intent, context, limit } = {}) {
  const { entries } = getKnowledgeBase();
  if (entries.length === 0) return [];

  const text = typeof query === "string" ? query.trim() : "";
  if (!text) return [];

  const ranked = rankDocuments(entries, { query: text, intent, context: context ?? {} });
  const max = clampLimit(limit);

  const results = [];
  const perDocument = new Map();
  let tokens = 0;

  for (const { entry, score, reasons, matchedTerms, structural } of ranked) {
    if (results.length >= max || score < MIN_SCORE) break;
    if (matchedTerms < MIN_TERMS_WITHOUT_STRUCTURE && structural <= 0) continue;

    const { chunk } = entry;
    const seen = perDocument.get(chunk.sourcePath) ?? 0;
    if (seen >= MAX_PER_DOCUMENT) continue;
    if (tokens + chunk.approxTokens > MAX_TOTAL_TOKENS && results.length > 0) continue;

    perDocument.set(chunk.sourcePath, seen + 1);
    tokens += chunk.approxTokens;
    results.push({
      id: chunk.id,
      title: chunk.title,
      heading: chunk.heading,
      content: chunk.content,
      sourceUrl: chunk.sourceUrl,
      sourcePath: chunk.sourcePath,
      category: chunk.category,
      platform: chunk.platform,
      tags: chunk.tags,
      approxTokens: chunk.approxTokens,
      score: Math.round(score * 100) / 100,
      reasons,
    });
  }

  return results;
}
