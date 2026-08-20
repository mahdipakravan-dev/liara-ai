# Liara Cloud Console — with Rahyar

An RTL cloud console built with Next.js App Router, Tailwind CSS v4, and locally owned shadcn/ui components, with **Rahyar** (رهیار) — a contextual deployment assistant — embedded in it.

---

## What Rahyar is

Rahyar is an in-console agent that helps a user deploy an application on Liara and recover when a deployment fails. It is not a general chatbot bolted onto a dashboard:

- **It knows where you are.** Every message carries the current page, application, runtime, deployment method, status, port, zone, and build logs.
- **It answers from official documentation.** Answers about Liara are grounded in a local snapshot of `docs.liara.ir` and cite the pages they came from.
- **It debugs failures on its own.** When a deployment fails it reads the logs already in context, extracts the error codes, and explains the likely cause — it never asks you to paste logs it can already see.
- **It guides multi-step deployments.** A small state machine walks you through runtime → method → source → configuration → deploy, remembering every answer.
- **It can act, with permission.** Read-only actions run automatically; anything that changes state requires an explicit confirmation.

---

## Architecture

```
Browser (client)                        Server (Next.js route handlers)
─────────────────                       ──────────────────────────────────────
AssistantPanel ──── POST /api/chat ───► rate limit ─► validate ─► runAgent
  · builds UI context                                              │
  · renders sources, tool cards,                    ┌──────────────┴──────────────┐
    confirmations, workflow step                    │  routeAgentRequest          │
  · sends back the workflow snapshot                │   1. normalize context      │
                                                    │   2. detect intent          │
                                                    │   3. advance workflow       │
                                                    │   4. run debug skill        │
                                                    │   5. retrieve docs (≤4)     │
                                                    │   6. build system prompt    │
                                                    └──────────────┬──────────────┘
                                                                   ▼
                                                    streamText(model, tools)
                                                      · read tools run inline
                                                      · write tool waits for approval
                                                                   ▼
                                                    stream: sources → workflow → text
```

| Path | Responsibility |
|---|---|
| `lib/agent/context.js` | Normalizes and redacts the UI context; shared by client and server |
| `lib/agent/intent.js` | Deterministic, bilingual intent detection (no model call) |
| `lib/agent/router.js` | Composes context, intent, workflow, skill, retrieval, prompt |
| `lib/agent/run-agent.js` | Owns the model call and the response stream |
| `lib/agent/prompt.js` | Persona + context + intent playbook + workflow + skill + sources |
| `lib/agent/skills/debug-deployment.js` | Failure analysis: error extraction, retrieval steering, answer shape |
| `lib/agent/workflows/deployment-workflow.js` | Guided deployment state machine |
| `lib/agent/tools/` | `get_deployment`, `get_logs`, `retry_deployment` + the swappable client |
| `lib/knowledge/` | Loading, searching and ranking the documentation snapshot |
| `lib/security/` | Redaction, request validation, rate limiting |
| `lib/observability/logger.js` | One structured JSON line per agent turn |
| `lib/ai/token-budget.js` | Every limit that controls what reaches the model |
| `lib/deployment.js` | Single source of truth for a deployment object, including its logs |

---

## Run locally

```bash
npm install
cp .env.example .env      # then fill in the three LIARA_AI_* values
npm run dev
```

Open `http://localhost:3000`.

Production build:

```bash
npm run build
npm start
```

Checks:

```bash
npm test                        # 104 unit checks, no server or network needed
node scripts/smoke.js --fast    # deterministic end-to-end checks against a running server
node scripts/smoke.js           # full run, including real model calls (~2 minutes)
```

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `LIARA_AI_BASE_URL` | yes | OpenAI-compatible endpoint of the Liara AI service |
| `LIARA_AI_API_KEY` | yes | Server-only API key |
| `LIARA_AI_MODEL` | yes | Model identifier, e.g. `z-ai/glm-5.3` |
| `LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error` (default `info`) |

All three required variables are read **only** inside server modules. None is prefixed with `NEXT_PUBLIC_`, and none appears in the client bundle. If any is missing, `/api/chat` returns `503` with a readable message and the rest of the console keeps working.

---

## How documentation grounding works

1. **Ingestion (offline).** `npm run docs:sync` downloads the Markdown that Liara publishes for LLMs, splits it on heading boundaries without breaking code fences, and writes `data/liara-docs.json` — currently 1,998 chunks, each with `{ id, title, content, sourceUrl, category, platform, tags }`.
2. **This file is committed** and read lazily on the first chat request (~80 ms, ~28 MB). The sync script never runs during `build` or `start`; deploying does not require network access to GitHub.
3. **Retrieval.** For each turn, the user's message plus intent, runtime, current page and deployment method are turned into a query. Ranking combines IDF-weighted lexical matching with structural signals (platform, category, tags) and bilingual synonym expansion, so "deploy" also matches "استقرار". At most 4 deduplicated chunks are injected.
4. **Grounding.** Chunks enter the prompt as numbered `SOURCE` blocks with explicit rules: platform behaviour must come from the sources, general advice must be labelled as such, and "I did not find this in the documentation" is a valid answer.
5. **Citation.** The sources are streamed to the browser as `source-url` parts *before* the text, so links render as soon as the answer starts.

---

## How agent actions work

Tools are categorized, and the category decides the safety model.

| Tool | Category | Execution |
|---|---|---|
| `get_deployment` | read-only | runs automatically |
| `get_logs` | read-only | runs automatically, output redacted |
| `retry_deployment` | **write** | proposed only; blocked until the user confirms |

The write tool is registered with `toolApproval: "user-approval"`, so the SDK halts the run and emits an approval request rather than executing. Even if the model decides to call it unprompted, it cannot run. In the UI this surfaces as a two-stage confirmation — **[استقرار مجدد]**, then **«آیا مطمئن هستی؟» [لغو] [تأیید]** — built on the existing `Confirmation` AI element. Approving resumes the paused server run; denying leaves everything untouched.

Every tool returns the same envelope, success or failure:

```js
{ ok: true,  tool, kind, data }
{ ok: false, tool, kind, error: { code, message } }
```

Tools never throw, so a backend outage reads to the model as a result it can explain.

Tools talk to a `DeploymentClient` (`lib/agent/tools/client.js`) with three methods — `getDeployment`, `getLogs`, `retryDeployment`. Today that client is backed by an in-memory mock. Pointing it at the real Liara API means adding one client and switching on credentials in `resolveDeploymentClient()`; no tool, prompt or component changes.

---

## Security controls

| Control | Implementation |
|---|---|
| Keys server-only | Read inside `getAgentConfig()`; verified absent from `.next/static` |
| Request validation | zod schema on shape, roles and parts (`lib/security/validate.js`) → `400` |
| Message size | 4,000 chars per message, 64,000 per payload → `413` |
| History cap | Last 8 messages forwarded to the model |
| Rate limiting | 20 requests/minute/client → `429` with `retry-after` |
| Secret redaction | Applied in context normalization and tool output, so every path is covered |
| Log hygiene | Authorization headers collapse whole; no stack traces in logs or responses |
| Error UX | `{ error, code, requestId }` with a Persian message; the panel shows the sentence |
| Cost control | ≤4 doc chunks, 20 log lines × 400 chars, empty/duplicate context dropped |

Redacted patterns include `API_KEY`, `TOKEN`, `PASSWORD`, `SECRET`, `DATABASE_URL`, connection-string credentials, bearer/basic headers, JWTs, vendor-prefixed tokens (`sk-`, `ghp_`, `AKIA`, …) and PEM private keys.

Observability: every turn logs one JSON line with `requestId`, `intent`, `model`, `latencyMs`, `retrievedDocumentIds`, `toolCalls`, token counts, `success` and `errorType`.

---

## Deploying to Liara

The app is a standard Next.js Node application. `data/liara-docs.json` must be part of the deployed files — it is committed, so a normal deploy includes it.

1. Create a **Next.js** app in the Liara console and note its name.
2. Set the environment variables in the console (App → متغیرهای محیطی): `LIARA_AI_BASE_URL`, `LIARA_AI_API_KEY`, `LIARA_AI_MODEL`. Never commit these.
3. Add a `liara.json` in the project root:

```json
{
  "platform": "next",
  "port": 3000
}
```

4. Deploy:

```bash
npm i -g @liara/cli
liara login
liara deploy --app <your-app-name> --platform next
```

Liara runs `npm install` and `npm run build`, then `npm start`. The documentation sync is **not** part of either script, so the build needs no network access to GitHub.

Notes for a multi-instance deployment: the rate limiter and the mock deployment store are both per-process. See the comments in `lib/security/rate-limit.js` and `lib/deployment-store.js` for what to move to Redis and to the real API.
