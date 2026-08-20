#!/usr/bin/env node
/**
 * Builds Rahyar's local knowledge base from the official Liara documentation.
 *
 * Source: https://github.com/liara-cloud/docs — specifically the `public/llms`
 * tree, which the docs site publishes as plain Markdown for LLM consumption.
 * Every file there starts with an `Original link:` line holding the canonical
 * docs.liara.ir URL, so citations come straight from the source instead of
 * being reconstructed from file paths.
 *
 * This runs ahead of time, never during a user request.
 *
 * Usage:
 *   node scripts/sync-liara-docs.js [options]
 *
 *   --source=<dir>   Use a local checkout of the docs repo instead of downloading.
 *   --ref=<ref>      Branch or tag to download. Default: master.
 *   --out=<file>     Output path. Default: data/liara-docs.json.
 *   --include=<a,b>  Only ingest paths starting with these prefixes (e.g. paas,dbaas).
 *   --exclude=<a,b>  Skip paths starting with these prefixes (e.g. ai/cookbook).
 */

import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REPO = "liara-cloud/docs";
const DOCS_ROOT = "public/llms";
const DOCS_SITE = "https://docs.liara.ir";

/**
 * ~400-800 tokens. Persian text runs about three characters per token, so the
 * character budget below is the equivalent approximation.
 */
const MAX_CHUNK_CHARS = 2_400;
const MIN_CHUNK_CHARS = 600;
const CHARS_PER_TOKEN = 3;

/** Second path segment that names a technology rather than a topic. */
const PLATFORMS = new Set([
  "angular", "django", "docker", "dotnet", "flask", "go", "laravel", "nextjs",
  "nodejs", "php", "python", "react", "static", "vue",
  "elastic-search", "mariadb", "mongodb", "mssql", "mysql", "postgresql", "rabbitmq", "redis",
  "debian", "ubuntu", "windowsserver",
]);

const SECTION_CATEGORIES = {
  paas: "paas",
  dbaas: "database",
  ai: "ai",
  iaas: "iaas",
  references: "references",
  "email-server": "email",
  "object-storage": "object-storage",
  mirrors: "mirrors",
  "dns-management-system": "dns",
  "one-click-apps": "one-click-apps",
  overview: "overview",
};

/** Narrower category for known sub-trees, checked before the section default. */
const SUBTREE_CATEGORIES = [
  ["paas/domains", "domain"],
  ["paas/cicd", "ci-cd"],
  ["paas/disks", "disks"],
  ["references/cli", "cli"],
  ["references/api", "api"],
];

/**
 * Cross-cutting topics. A passing mention is not enough — nearly every deploy
 * guide says "GitHub" somewhere — so a tag sticks only when the topic shows up
 * in the title, a heading or the path, or repeats at least TAG_THRESHOLD times.
 */
const CONTENT_TAGS = [
  ["environment-variable", /متغیر(های)? محیطی|environment variable|\benvs?\b|\.env\b/gi],
  ["cli", /liara cli|liara deploy|@liara\/cli/gi],
  ["github", /github/gi],
  ["ci-cd", /ci\/cd|github actions|gitlab ci/gi],
  ["docker", /dockerfile|docker build|docker-compose/gi],
  ["domain", /دامنه|subdomain|\bdns\b|\bssl\b/gi],
  ["database", /دیتابیس|database/gi],
  ["deployment", /استقرار|deploy/gi],
  ["port", /\bport\b|پورت/gi],
  ["disk", /\bdisk\b|دیسک/gi],
];

const TAG_THRESHOLD = 4;
const MAX_TAGS = 8;

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    const match = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
    if (!match) continue;
    options[match[1]] = match[2] ?? true;
  }
  return options;
}

function toList(value) {
  return typeof value === "string"
    ? value.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
}

/** Downloads the repo tarball once and extracts it into a temp directory. */
async function downloadDocs(ref) {
  const url = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/${ref}`;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "liara-docs-"));
  const archive = path.join(tempDir, "docs.tar.gz");

  process.stdout.write(`دریافت ${REPO}@${ref} ...\n`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`دانلود مستندات ناموفق بود (HTTP ${response.status}) — ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(archive));
  await execFileAsync("tar", ["-xzf", archive, "-C", tempDir]);

  const entries = await fs.readdir(tempDir, { withFileTypes: true });
  const extracted = entries.find((entry) => entry.isDirectory());
  if (!extracted) throw new Error("محتوای آرشیو مستندات پیدا نشد.");

  return { root: path.join(tempDir, extracted.name), tempDir };
}

/** Every Markdown file under the docs root, sorted for deterministic output. */
async function listMarkdownFiles(root) {
  const found = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        found.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  }
  await walk(root);
  return found.sort();
}

function normalizeMarkdown(raw) {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slugify(value) {
  return value.replace(/\.md$/, "").replace(/[^\w/-]+/g, "-").replace(/\//g, "-");
}

function categoryFor(relativePath) {
  for (const [prefix, category] of SUBTREE_CATEGORIES) {
    if (relativePath === prefix || relativePath.startsWith(`${prefix}/`)) return category;
  }
  const [section, second] = relativePath.split("/");
  if (section === "paas" && PLATFORMS.has(second)) return "deployment";
  return SECTION_CATEGORIES[section] ?? "general";
}

function platformFor(relativePath) {
  const second = relativePath.split("/")[1];
  return second && PLATFORMS.has(second) ? second : null;
}

function tagsFor({ relativePath, category, platform, title, body }) {
  const segments = relativePath.replace(/\.md$/, "").split("/");
  const tags = new Set([segments[0], category]);
  if (platform) tags.add(platform);

  const headings = (body.match(/^#{2,4}\s+.*$/gm) ?? []).join(" ");
  const scope = `${title} ${headings} ${relativePath}`;
  for (const [tag, pattern] of CONTENT_TAGS) {
    const occurrences = (body.match(pattern) ?? []).length;
    const prominent = new RegExp(pattern.source, "i").test(scope);
    if (prominent || occurrences >= TAG_THRESHOLD) tags.add(tag);
  }
  return [...tags].filter(Boolean).sort().slice(0, MAX_TAGS);
}

/**
 * Splits a document on Markdown headings while keeping the heading with its
 * body and tracking the trail of parent headings. Fenced code is never split.
 */
function splitIntoSections(body) {
  const sections = [];
  const trail = [];
  let current = { trail: [], lines: [] };
  let inFence = false;

  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;

    const heading = inFence ? null : /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      if (current.lines.join("\n").trim()) sections.push(current);
      const level = heading[1].length;
      trail.length = Math.max(0, level - 2);
      trail[level - 2] = heading[2].trim();
      current = { trail: trail.filter(Boolean).slice(), lines: [line] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.lines.join("\n").trim()) sections.push(current);

  return sections.map((section) => ({
    trail: section.trail,
    text: section.lines.join("\n").trim(),
  }));
}

/** Last resort for a single line longer than the budget, e.g. an inline data URL. */
function hardSlice(text) {
  if (text.length <= MAX_CHUNK_CHARS * 1.5) return [text];
  const parts = [];
  for (let index = 0; index < text.length; index += MAX_CHUNK_CHARS) {
    parts.push(text.slice(index, index + MAX_CHUNK_CHARS).trim());
  }
  return parts.filter(Boolean);
}

/** Breaks an oversized section on blank lines, then on lines as a last resort. */
function splitOversized(text) {
  const pieces = [];
  let buffer = [];
  let inFence = false;

  const flush = () => {
    const joined = buffer.join("\n").trim();
    if (joined) pieces.push(joined);
    buffer = [];
  };

  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const size = buffer.join("\n").length;
    if (!inFence && !line.trim() && size >= MAX_CHUNK_CHARS) flush();
    else if (size >= MAX_CHUNK_CHARS * 1.5) flush();
    buffer.push(line);
  }
  flush();
  return pieces.flatMap(hardSlice);
}

/** Greedily packs sections up to the chunk budget, keeping headings intact. */
function chunkSections(sections) {
  const chunks = [];
  let buffer = null;

  const flush = () => {
    if (buffer?.text.trim()) chunks.push(buffer);
    buffer = null;
  };

  for (const section of sections) {
    const parts =
      section.text.length > MAX_CHUNK_CHARS ? splitOversized(section.text) : [section.text];

    for (const part of parts) {
      if (!buffer) {
        buffer = { trail: section.trail, text: part };
        continue;
      }
      if (buffer.text.length + part.length + 2 <= MAX_CHUNK_CHARS) {
        buffer.text = `${buffer.text}\n\n${part}`;
        continue;
      }
      flush();
      buffer = { trail: section.trail, text: part };
    }
  }
  flush();

  // A short tail chunk carries little meaning on its own; fold it back in.
  if (chunks.length > 1) {
    const last = chunks[chunks.length - 1];
    const previous = chunks[chunks.length - 2];
    if (last.text.length < MIN_CHUNK_CHARS &&
        previous.text.length + last.text.length + 2 <= MAX_CHUNK_CHARS * 1.25) {
      previous.text = `${previous.text}\n\n${last.text}`;
      chunks.pop();
    }
  }

  return chunks;
}

function buildDocument(relativePath, raw) {
  const normalized = normalizeMarkdown(raw);
  const linkMatch = /^Original link:\s*(\S+)\s*$/m.exec(normalized.split("\n")[0] ?? "");
  const sourceUrl = linkMatch
    ? linkMatch[1].trim()
    : `${DOCS_SITE}/${relativePath.replace(/\.md$/, "").replace(/\/index$/, "")}/`;

  let body = linkMatch ? normalized.slice(normalized.indexOf("\n") + 1).trim() : normalized;

  const titleMatch = /^#\s+(.*)$/m.exec(body);
  const title = titleMatch
    ? titleMatch[1].trim()
    : path.basename(relativePath, ".md").replace(/[-_]/g, " ");
  if (titleMatch && body.startsWith(titleMatch[0])) {
    body = body.slice(titleMatch[0].length).trim();
  }

  return { relativePath, sourceUrl, title, body };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ref = typeof options.ref === "string" ? options.ref : "master";
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const outPath = path.resolve(
    projectRoot,
    typeof options.out === "string" ? options.out : "data/liara-docs.json",
  );
  const include = toList(options.include);
  const exclude = toList(options.exclude);

  let root;
  let tempDir = null;
  if (typeof options.source === "string") {
    root = path.resolve(options.source);
    process.stdout.write(`استفاده از نسخه‌ی محلی مستندات: ${root}\n`);
  } else {
    ({ root, tempDir } = await downloadDocs(ref));
  }

  try {
    const docsRoot = path.join(root, DOCS_ROOT);
    const rootExists = await fs.stat(docsRoot).then(() => true, () => false);
    if (!rootExists) {
      throw new Error(`مسیر ${DOCS_ROOT} در منبع مستندات پیدا نشد: ${docsRoot}`);
    }

    const files = (await listMarkdownFiles(docsRoot)).filter((file) => {
      if (file === "README.md") return false;
      const matches = (prefix) => file === prefix || file.startsWith(`${prefix}/`);
      if (include.length && !include.some(matches)) return false;
      if (exclude.length && exclude.some(matches)) return false;
      return true;
    });

    const chunks = [];
    let skipped = 0;

    for (const file of files) {
      const raw = await fs.readFile(path.join(docsRoot, file), "utf8");
      const document = buildDocument(file, raw);
      if (!document.body) {
        skipped += 1;
        continue;
      }

      const category = categoryFor(file);
      const platform = platformFor(file);
      const tags = tagsFor({
        relativePath: file,
        category,
        platform,
        title: document.title,
        body: document.body,
      });
      const pieces = chunkSections(splitIntoSections(document.body));

      pieces.forEach((piece, index) => {
        chunks.push({
          id: `${slugify(file)}--${index}`,
          title: document.title,
          heading: piece.trail.join(" › ") || null,
          content: piece.text,
          sourceUrl: document.sourceUrl,
          sourcePath: `${DOCS_ROOT}/${file}`,
          category,
          platform,
          tags,
          chunkIndex: index,
          chunkCount: pieces.length,
          charCount: piece.text.length,
          approxTokens: Math.round(piece.text.length / CHARS_PER_TOKEN),
        });
      });
    }

    const payload = {
      source: {
        repository: `https://github.com/${REPO}`,
        ref,
        docsRoot: DOCS_ROOT,
        site: DOCS_SITE,
      },
      chunking: { maxChars: MAX_CHUNK_CHARS, minChars: MIN_CHUNK_CHARS, charsPerToken: CHARS_PER_TOKEN },
      documentCount: files.length - skipped,
      chunkCount: chunks.length,
      chunks,
    };

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    const tempOut = `${outPath}.tmp`;
    await fs.writeFile(tempOut, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await fs.rename(tempOut, outPath);

    const tokens = chunks.reduce((total, chunk) => total + chunk.approxTokens, 0);
    process.stdout.write(
      [
        `\nپایگاه دانش ساخته شد: ${path.relative(projectRoot, outPath)}`,
        `  سند: ${payload.documentCount}${skipped ? ` (${skipped} سند خالی نادیده گرفته شد)` : ""}`,
        `  قطعه: ${payload.chunkCount}`,
        `  میانگین اندازه‌ی قطعه: ~${Math.round(tokens / (chunks.length || 1))} توکن`,
        "",
      ].join("\n"),
    );
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`\nهمگام‌سازی مستندات ناموفق بود: ${error.message}`);
  process.exitCode = 1;
});
