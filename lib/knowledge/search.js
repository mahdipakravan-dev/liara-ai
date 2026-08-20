/**
 * Deterministic keyword ranking over the documentation chunks.
 *
 * Two signal families are combined:
 *   - lexical: query terms matched against title / heading / content, weighted
 *     by inverse document frequency so rare words carry the ranking;
 *   - structural: platform, category and tag agreement derived from the
 *     detected intent and the live UI context.
 *
 * No embeddings and no vector store — everything here is a pure function of
 * the query, the context and the indexed chunks.
 */

import { normalizePersian } from "../text.js";

const STOPWORDS = new Set([
  "از", "به", "در", "که", "را", "با", "برای", "این", "آن", "های", "ها", "می", "یک", "و", "یا",
  "است", "هست", "شود", "شده", "کنم", "کنید", "کنیم", "کرد", "دارم", "دارد", "باید", "چطور",
  "چگونه", "چیست", "چیه", "رو", "تا", "هم", "بر", "روی", "اگر", "الان", "من", "ما", "شما",
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "is", "are", "do", "does",
  "how", "what", "why", "can", "i", "my", "me", "we", "you", "it", "with", "at", "by",
]);

/**
 * Users type "deploy"; the docs say "استقرار". Without bridging the two
 * vocabularies the actual deployment guides rank below incidental pages.
 */
const SYNONYMS = {
  deploy: ["استقرار", "دیپلوی"],
  deployment: ["استقرار", "دیپلوی"],
  استقرار: ["deploy"],
  دیپلوی: ["deploy", "استقرار"],
  دپلوی: ["deploy", "استقرار"],
  database: ["دیتابیس"],
  دیتابیس: ["database"],
  domain: ["دامنه"],
  دامنه: ["domain"],
  log: ["لاگ"],
  logs: ["لاگ"],
  لاگ: ["log"],
  environment: ["متغیر"],
  env: ["متغیر", "environment"],
  envs: ["متغیر", "environment"],
  متغیر: ["environment"],
  port: ["پورت"],
  پورت: ["port"],
  error: ["خطا"],
  خطا: ["error"],
  build: ["بیلد"],
  بیلد: ["build"],
};

/** Free-text spellings mapped onto the `platform` values used in the corpus. */
const PLATFORM_ALIASES = {
  next: "nextjs", nextjs: "nextjs", "next.js": "nextjs",
  node: "nodejs", nodejs: "nodejs", "node.js": "nodejs",
  react: "react", vue: "vue", vuejs: "vue", angular: "angular",
  php: "php", laravel: "laravel", python: "python", django: "django", flask: "flask",
  go: "go", golang: "go", docker: "docker", static: "static", استاتیک: "static",
  dotnet: "dotnet", ".net": "dotnet", net: "dotnet", "c#": "dotnet",
  postgres: "postgresql", postgresql: "postgresql", پستگرس: "postgresql",
  mysql: "mysql", mariadb: "mariadb",
  mongo: "mongodb", mongodb: "mongodb", مانگو: "mongodb",
  redis: "redis", ردیس: "redis", mssql: "mssql", sqlserver: "mssql",
  rabbitmq: "rabbitmq", elastic: "elastic-search", elasticsearch: "elastic-search",
  ubuntu: "ubuntu", debian: "debian",
};

/** What each intent expects to find, and whether a miss should be punished. */
const INTENT_PROFILES = {
  deploy_application: { categories: ["deployment", "paas"], tags: ["deployment"] },
  deployment_failed: { categories: ["deployment", "paas"], tags: ["deployment"] },
  deployment_status: { categories: ["deployment", "paas"], tags: ["deployment"] },
  configure_environment: {
    categories: ["paas", "deployment"],
    tags: ["environment-variable"],
    strict: true,
  },
  choose_deployment_method: {
    categories: ["deployment", "cli", "ci-cd", "paas"],
    tags: ["cli", "github", "ci-cd", "deployment"],
  },
  setup_domain: { categories: ["domain", "dns"], tags: ["domain"], strict: true },
  connect_database: { categories: ["database"], tags: ["database"], strict: true },
  view_logs: { categories: ["deployment", "paas"], tags: ["deployment"] },
  general_liara_question: { categories: [], tags: [] },
  general_question: { categories: [], tags: [] },
};

const PAGE_CATEGORIES = {
  "deployment-history": "deployment",
  "deployment-setup": "deployment",
  history: "deployment",
  deploy: "deployment",
  logs: "deployment",
  domains: "domain",
  disks: "disks",
  settings: "paas",
};

const WEIGHTS = {
  title: 6,
  heading: 3,
  content: 1.5,
  queryPlatform: 10,
  queryPlatformMismatch: -8,
  contextPlatform: 4,
  category: 5,
  tag: 4,
  tagCap: 8,
  method: 3,
  page: 2,
  strictMiss: -5,
  leadChunk: 1,
};

export function tokenize(value) {
  const tokens = normalizePersian(value)
    .split(/[^\p{L}\p{N}#+]+/u)
    .filter((token) => token.length >= 2);

  const meaningful = tokens.filter((token) => !STOPWORDS.has(token));
  return [...new Set(meaningful.length ? meaningful : tokens)];
}

/** Query terms plus their cross-language equivalents. */
export function expandTerms(terms) {
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const synonym of SYNONYMS[term] ?? []) expanded.add(synonym);
  }
  return [...expanded];
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/**
 * Word-boundary match. A plain `includes` would score "سلام" against "سلامت",
 * so both edges must land on a boundary. Longer Latin terms may match as a
 * prefix ("deploy" finding "deployment"); Persian stays exact because its
 * suffixes are short enough to merge unrelated words.
 */
export function matchesTerm(haystack, term) {
  if (!haystack || !term) return false;
  const allowPrefix = term.length >= 5 && /^[a-z0-9#+]+$/.test(term);

  let from = 0;
  for (;;) {
    const at = haystack.indexOf(term, from);
    if (at === -1) return false;
    const end = at + term.length;
    const startsWord = at === 0 || !WORD_CHAR.test(haystack[at - 1]);
    const endsWord = end >= haystack.length || !WORD_CHAR.test(haystack[end]);
    if (startsWord && (endsWord || allowPrefix)) return true;
    from = at + 1;
  }
}

/** Finds a platform named directly in free text, longest alias first. */
export function detectPlatform(value) {
  const text = normalizePersian(value);
  if (!text) return null;

  const aliases = Object.keys(PLATFORM_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "u").test(text)) {
      return PLATFORM_ALIASES[alias];
    }
  }
  return null;
}

function methodTags(deploymentMethod) {
  const method = normalizePersian(deploymentMethod);
  if (!method) return [];
  if (method.includes("github")) return ["github", "ci-cd"];
  if (method.includes("cli")) return ["cli"];
  return [];
}

/**
 * Scores every indexed chunk and returns them sorted by descending score.
 * `matchedTerms` and `structural` let the caller tell a well-supported hit from
 * a lone incidental keyword.
 * @returns {Array<{ entry: object, score: number, reasons: string[],
 *   matchedTerms: number, structural: number }>}
 */
export function rankDocuments(entries, { query = "", intent, context = {} } = {}) {
  const terms = expandTerms(tokenize(query));
  const profile = INTENT_PROFILES[intent] ?? INTENT_PROFILES.general_question;
  const queryPlatform = detectPlatform(query);
  const contextPlatform = detectPlatform(context.runtime);
  const wantedTags = new Set([...profile.tags, ...methodTags(context.deploymentMethod)]);
  const pageCategory = PAGE_CATEGORIES[normalizePersian(context.currentPage)] ?? null;

  // Pass one: which query terms each chunk matches, plus their document frequency.
  const hits = new Array(entries.length);
  const documentFrequency = new Map(terms.map((term) => [term, 0]));

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const matched = [];
    for (const term of terms) {
      const inTitle = matchesTerm(entry.title, term);
      const inHeading = matchesTerm(entry.heading, term);
      const inContent = matchesTerm(entry.content, term);
      if (!inTitle && !inHeading && !inContent) continue;
      matched.push({ term, inTitle, inHeading, inContent });
      documentFrequency.set(term, documentFrequency.get(term) + 1);
    }
    hits[index] = matched;
  }

  const total = entries.length || 1;
  const idf = new Map(
    terms.map((term) => [term, Math.log(1 + total / (1 + documentFrequency.get(term)))]),
  );

  // Pass two: lexical score weighted by IDF, then structural adjustments.
  const ranked = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const { chunk } = entry;
    const reasons = [];
    let lexical = 0;
    let structural = 0;

    for (const match of hits[index]) {
      const weight = idf.get(match.term);
      if (match.inTitle) lexical += weight * WEIGHTS.title;
      if (match.inHeading) lexical += weight * WEIGHTS.heading;
      if (match.inContent) lexical += weight * WEIGHTS.content;
    }
    if (hits[index].length) reasons.push(`terms:${hits[index].map((m) => m.term).join(",")}`);

    if (queryPlatform) {
      if (chunk.platform === queryPlatform) {
        structural += WEIGHTS.queryPlatform;
        reasons.push(`platform:${queryPlatform}`);
      } else if (chunk.platform) {
        structural += WEIGHTS.queryPlatformMismatch;
      }
    }
    // Context platform only ever helps: the user may ask about a database while
    // their app happens to be Next.js.
    if (contextPlatform && chunk.platform === contextPlatform && contextPlatform !== queryPlatform) {
      structural += WEIGHTS.contextPlatform;
      reasons.push(`runtime:${contextPlatform}`);
    }

    const categoryHit = profile.categories.includes(chunk.category);
    if (categoryHit) {
      structural += WEIGHTS.category;
      reasons.push(`category:${chunk.category}`);
    }

    const tagHits = chunk.tags.filter((tag) => wantedTags.has(tag));
    if (tagHits.length) {
      structural += Math.min(tagHits.length * WEIGHTS.tag, WEIGHTS.tagCap);
      reasons.push(`tags:${tagHits.join(",")}`);
    }

    if (pageCategory && chunk.category === pageCategory) structural += WEIGHTS.page;
    if (profile.strict && !categoryHit && tagHits.length === 0) structural += WEIGHTS.strictMiss;
    if (chunk.chunkIndex === 0) structural += WEIGHTS.leadChunk;

    const score = lexical + structural;
    if (score > 0) {
      ranked.push({ entry, score, reasons, matchedTerms: hits[index].length, structural });
    }
  }

  // Ties break on id to keep results stable across runs.
  ranked.sort((a, b) => b.score - a.score || a.entry.chunk.id.localeCompare(b.entry.chunk.id));
  return ranked;
}
