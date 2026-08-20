/**
 * Loads the generated Liara documentation knowledge base.
 *
 * Server-only: reads from disk with `node:fs`. The file is produced ahead of
 * time by `npm run docs:sync`; a missing or damaged file degrades to an empty
 * knowledge base so chat keeps working without documentation.
 */

import fs from "node:fs";
import path from "node:path";

import { normalizePersian } from "../text.js";

const DATA_PATH = path.join(process.cwd(), "data", "liara-docs.json");

let cached = null;
let warned = false;

function warnOnce(message) {
  if (warned) return;
  warned = true;
  console.warn(`[knowledge] ${message} — رهیار بدون مستندات پاسخ می‌دهد.`);
}

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch (error) {
    const reason = error?.code === "ENOENT" ? "فایل پایگاه دانش پیدا نشد" : "پایگاه دانش خوانده نشد";
    warnOnce(`${reason} (${path.relative(process.cwd(), DATA_PATH)})`);
    return null;
  }
}

function isUsable(chunk) {
  return Boolean(
    chunk &&
      typeof chunk.id === "string" &&
      typeof chunk.content === "string" &&
      chunk.content.trim() &&
      typeof chunk.sourceUrl === "string",
  );
}

/** Pre-folds the searchable fields once so queries only pay for matching. */
function toEntry(chunk) {
  return {
    chunk: {
      id: chunk.id,
      title: typeof chunk.title === "string" ? chunk.title : "",
      heading: typeof chunk.heading === "string" ? chunk.heading : null,
      content: chunk.content,
      sourceUrl: chunk.sourceUrl,
      sourcePath: typeof chunk.sourcePath === "string" ? chunk.sourcePath : "",
      category: typeof chunk.category === "string" ? chunk.category : null,
      platform: typeof chunk.platform === "string" ? chunk.platform : null,
      tags: Array.isArray(chunk.tags) ? chunk.tags.filter((tag) => typeof tag === "string") : [],
      approxTokens:
        Number.isFinite(chunk.approxTokens) && chunk.approxTokens > 0
          ? chunk.approxTokens
          : Math.round(chunk.content.length / 3),
    },
    title: normalizePersian(chunk.title),
    heading: normalizePersian(chunk.heading),
    content: normalizePersian(chunk.content),
  };
}

/** @returns {{ entries: Array, source: object|null, chunkCount: number }} */
export function getKnowledgeBase() {
  if (cached) return cached;

  const payload = readPayload();
  const rawChunks = Array.isArray(payload?.chunks) ? payload.chunks : [];
  if (payload && rawChunks.length === 0) warnOnce("پایگاه دانش خالی است");

  const entries = rawChunks.filter(isUsable).map(toEntry);
  cached = { entries, source: payload?.source ?? null, chunkCount: entries.length };
  return cached;
}

/** Test hook: forces the next read to hit disk again. */
export function resetKnowledgeBase() {
  cached = null;
  warned = false;
}
