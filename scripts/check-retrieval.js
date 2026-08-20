#!/usr/bin/env node
/**
 * Executable checks for the documentation retrieval layer.
 *
 * The project has no test runner, so this doubles as the test suite and as a
 * way to eyeball ranking quality:
 *
 *   node scripts/check-retrieval.js            # run assertions
 *   node scripts/check-retrieval.js --show     # also print the ranked results
 *
 * Exits non-zero when an assertion fails.
 */

import { detectIntent } from "../lib/agent/intent.js";
import { getKnowledgeBase } from "../lib/knowledge/documents.js";
import { retrieveLiaraDocs } from "../lib/knowledge/retrieve.js";

const show = process.argv.includes("--show");

/**
 * Each case runs the real pipeline: message -> intent -> retrieval.
 * `expect` receives the results and returns an error string, or null when fine.
 */
const cases = [
  {
    name: "Next.js deploy",
    query: "پروژه Next.js رو چطور deploy کنم؟",
    context: { runtime: "next", currentPage: "deploy" },
    expect: (results) => {
      if (results.length === 0) return "no results";
      if (results[0].platform !== "nextjs") return `top platform is ${results[0].platform}`;
      const nextish = results.filter((r) => r.platform === "nextjs").length;
      if (nextish < 2) return `only ${nextish} nextjs chunks`;
      return null;
    },
  },
  {
    name: "environment variables",
    query: "متغیر محیطی چطور اضافه کنم؟",
    context: { runtime: "next", currentPage: "settings" },
    expect: (results) => {
      if (results.length === 0) return "no results";
      if (!results[0].tags.includes("environment-variable")) {
        return `top result lacks environment-variable tag (${results[0].tags.join(",")})`;
      }
      return null;
    },
  },
  {
    name: "domains",
    query: "چطور دامنه اختصاصی به برنامه وصل کنم؟",
    context: { applicationName: "assistance" },
    expect: (results) => {
      if (results.length === 0) return "no results";
      if (results[0].category !== "domain") return `top category is ${results[0].category}`;
      return null;
    },
  },
  {
    name: "Liara CLI",
    query: "با Liara CLI چطور دیپلوی کنم؟",
    context: { deploymentMethod: "Liara CLI" },
    expect: (results) => {
      if (results.length === 0) return "no results";
      const cliish = results.filter(
        (r) => r.category === "cli" || r.tags.includes("cli") || /cli/i.test(r.title),
      ).length;
      if (cliish === 0) return "no CLI-related result";
      return null;
    },
  },
  {
    name: "database beats deployment pages",
    query: "چطور به دیتابیس PostgreSQL وصل بشم؟",
    // Runtime is Next.js on purpose: a database question must not be hijacked
    // by the app's runtime.
    context: { runtime: "next", currentPage: "deploy" },
    expect: (results) => {
      if (results.length === 0) return "no results";
      if (results[0].category !== "database") return `top category is ${results[0].category}`;
      if (results[0].platform !== "postgresql") return `top platform is ${results[0].platform}`;
      return null;
    },
  },
  {
    name: "failed build on history page",
    query: "چرا بیلد من fail شد؟",
    context: { currentPage: "deployment-history", deploymentStatus: "failed", runtime: "next" },
    expect: (results) => (results.length === 0 ? "no results" : null),
  },
  {
    name: "greeting returns nothing",
    query: "سلام",
    context: {},
    expect: (results) => (results.length > 0 ? `expected 0 results, got ${results.length}` : null),
  },
  {
    name: "empty query returns nothing",
    query: "",
    context: { runtime: "next" },
    expect: (results) => (results.length > 0 ? `expected 0 results, got ${results.length}` : null),
  },
  {
    name: "every result keeps a source URL",
    query: "استقرار برنامه Node.js با گیت‌هاب",
    context: { deploymentMethod: "GitHub" },
    expect: (results) => {
      if (results.length === 0) return "no results";
      const bad = results.filter((r) => !/^https:\/\/docs\.liara\.ir\//.test(r.sourceUrl));
      return bad.length ? `${bad.length} results without a docs.liara.ir URL` : null;
    },
  },
  {
    name: "respects the limit and token budget",
    query: "استقرار برنامه",
    context: {},
    limit: 3,
    expect: (results) => {
      if (results.length > 3) return `returned ${results.length} results`;
      const tokens = results.reduce((sum, r) => sum + r.approxTokens, 0);
      return tokens > 2000 ? `token budget exceeded: ${tokens}` : null;
    },
  },
  {
    name: "no more than two chunks from one page",
    query: "استقرار برنامه Next.js روی لیارا",
    context: { runtime: "next" },
    limit: 5,
    expect: (results) => {
      const perDoc = new Map();
      for (const result of results) {
        perDoc.set(result.sourcePath, (perDoc.get(result.sourcePath) ?? 0) + 1);
      }
      const over = [...perDoc.entries()].filter(([, count]) => count > 2);
      return over.length ? `${over[0][0]} appeared ${over[0][1]} times` : null;
    },
  },
  {
    name: "malformed input does not throw",
    query: "چطور دیپلوی کنم؟",
    context: { runtime: null, currentPage: 42, deploymentMethod: {} },
    intent: "not_a_real_intent",
    expect: () => null,
  },
];

const { chunkCount, source } = getKnowledgeBase();
if (chunkCount === 0) {
  console.error("پایگاه دانش خالی است. اول `npm run docs:sync` را اجرا کنید.");
  process.exit(1);
}
console.log(`پایگاه دانش: ${chunkCount} قطعه از ${source?.repository ?? "?"}@${source?.ref ?? "?"}\n`);

let failures = 0;
for (const testCase of cases) {
  const intent = testCase.intent ?? detectIntent(testCase.query, testCase.context).intent;
  const started = performance.now();
  let results;
  let thrown = null;
  try {
    results = retrieveLiaraDocs({
      query: testCase.query,
      intent,
      context: testCase.context,
      limit: testCase.limit,
    });
  } catch (error) {
    thrown = error;
    results = [];
  }
  const elapsed = (performance.now() - started).toFixed(1);

  const problem = thrown ? `threw: ${thrown.message}` : testCase.expect(results);
  if (problem) failures += 1;

  console.log(
    `${problem ? "FAIL" : "PASS"}  ${testCase.name.padEnd(36)} intent=${String(intent).padEnd(24)} ${String(results.length).padStart(2)} results  ${elapsed}ms${problem ? `\n      ${problem}` : ""}`,
  );

  if (show && results.length) {
    for (const result of results) {
      console.log(
        `        ${String(result.score).padStart(7)}  [${result.category}/${result.platform ?? "-"}]  ${result.title}${result.heading ? ` › ${result.heading}` : ""}`,
      );
      console.log(`                 ${result.sourceUrl}`);
    }
    console.log();
  }
}

console.log(failures === 0 ? "\nهمه‌ی بررسی‌ها موفق بود." : `\n${failures} بررسی ناموفق بود.`);
process.exitCode = failures === 0 ? 0 : 1;
