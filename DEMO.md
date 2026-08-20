# Rahyar — hackathon demo checklist

Target runtime: **6–8 minutes**. Every step below has been executed against a
production build (`npm run build && npm start`).

---

## Before you present

- [ ] `.env` filled with the three `LIARA_AI_*` values, and the model responds
      (`node scripts/smoke.js --fast` passes in under a second)
- [ ] `npm run build && npm start` — do **not** demo from `npm run dev`; the dev
      server recompiles on first hit and the first answer looks slow
- [ ] `node scripts/smoke.js` passes end to end (takes ~2 minutes, run it once
      before the session, not during)
- [ ] Restart the server right before the demo. The mock deployment store and
      the rate limiter are in-memory; a fresh process guarantees a clean slate
      and a full 20-request budget
- [ ] Browser at ~1440px wide so the docked panel takes half the screen. On a
      narrow window the panel goes full width and covers the console
- [ ] Have `docs.liara.ir` open in a second tab in case a judge clicks a citation
- [ ] Know the two magic inputs: **build zone «آلمان» always fails**, «ایران»
      always succeeds after ~20 seconds

---

## The scenario

### 1–2 · Application and introduction
- [ ] Open `http://localhost:3000`, land on the dashboard for the **assistance** app
- [ ] Rahyar is already docked on the left and introduces itself
- [ ] **Say out loud:** the panel already knows the page, the app, and the runtime
      — nothing has been typed yet

### 3–4 · Asking how to deploy, and being guided
- [ ] Type: **«میخوام فرانت‌اند پروژه‌ام رو روی لیارا deploy کنم»**
- [ ] Rahyar asks for the platform and shows five cards: Next.js / React (Vite) /
      Vue / Static / سایر, with a **گام بعدی** strip and a progress bar
- [ ] Click **Next.js** → it asks for the method and shows **GitHub / Drag & Drop /
      Liara CLI**
- [ ] Click **GitHub** → it explains connecting the repository and branch
- [ ] **Point out:** it never re-asks the platform, and the progress bar advanced.
      The chosen method also switched the dashboard tab

### 5–6 · Deploying, and failing
- [ ] Go to **استقرار جدید**, start a deployment, choose build zone **آلمان**
- [ ] The history page shows **خطا در استقرار** with the real `ETIMEDOUT` build log

### 7–9 · Diagnosis, from context, with citations
- [ ] Type only: **«مشکلش چیه؟»**
- [ ] Rahyar answers without asking for logs: the most likely cause (npm could not
      reach `registry.npmjs.org`), then 2–4 ordered fixes
- [ ] **منابع** appear under the message — real `docs.liara.ir` links; open one
- [ ] **Point out:** it did **not** retry on its own, even though it knows how

### 10 · Confirming the retry
- [ ] Type: **«مشکل شبکه بود، دوباره اجراش کن»**
- [ ] A confirmation card appears with **[استقرار مجدد]**
- [ ] Click it → **«آیا از استقرار مجدد مطمئن هستی؟ [لغو] [تأیید]»**
- [ ] Optional and effective: click **لغو** first, show that nothing happened,
      then ask again and click **تأیید**
- [ ] The tool runs and reports a new deployment id with **نسخه v2**

### 11 · Success
- [ ] Wait ~20 seconds, then ask: **«الان وضعیتش چطوره؟»**
- [ ] Rahyar calls `get_deployment` on its own and reports **success**
- [ ] ⚠️ The history **card** does not refresh by itself — the UI has no polling.
      Confirm success **through Rahyar**, which is the point being demonstrated

---

## If you have extra time

- [ ] **Grounding honesty:** «آیا لیارا سرویس بلاک‌چین داره؟» → it says it found
      nothing in the documentation instead of inventing an answer
- [ ] **Automatic tools:** on a page without logs, «وضعیت آخرین استقرار چیه؟» →
      `get_deployment` and `get_logs` run by themselves
- [ ] **Secret redaction:** show `lib/security/redact.js` and the `[redacted]`
      markers in a log line containing `DATABASE_URL`
- [ ] **Observability:** the server terminal prints one JSON line per turn with
      `requestId`, `intent`, `toolCalls`, `latencyMs` and token counts
- [ ] **Rate limiting:** `for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code} " \
      -X POST localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[]}'; done`
      → 400s then 429s. **Restart the server afterwards** or the demo account is
      rate-limited

---

## Failure recovery during the demo

| Symptom | Cause | Do this |
|---|---|---|
| Answer never appears, panel shows «پاسخ رهیار ناتمام ماند» | Model exceeded the 90 s timeout | Ask again with a shorter question; history is preserved |
| `429` / «تعداد درخواست‌ها بیش از حد» | Rate limit hit during rehearsal | Wait 60 s or restart the server |
| No **منابع** under an answer | Query matched no documentation | Expected for non-Liara questions; ask something platform-specific |
| Confirmation card does not appear | The model answered in prose instead of calling the tool | Be explicit: «استقرار رو دوباره اجرا کن» |
| Deployment stays «در حال دپلوی» in the UI | No polling by design | Ask Rahyar for the status instead |
| Chat returns `503` | Missing `LIARA_AI_*` variables | Check `.env` and restart |
