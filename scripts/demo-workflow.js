#!/usr/bin/env node
/**
 * Live walkthrough of the guided deployment workflow against a running dev
 * server. Mirrors exactly what the browser does: send the message plus the last
 * workflow snapshot, read the new snapshot back off the stream.
 *
 *   node scripts/demo-workflow.js [baseUrl]
 */

const base = process.argv[2] ?? "http://localhost:3000";
const context = { currentPage: "dashboard", currentStep: "استقرار جدید" };

const turns = [
  "میخوام فرانت‌اند پروژه‌ام رو روی لیارا deploy کنم",
  "Next.js",
  "GitHub",
  "ریپو رو وصل کردم",
];

const messages = [];
let workflow = null;

for (const text of turns) {
  messages.push({ id: `u${messages.length}`, role: "user", parts: [{ type: "text", text }] });

  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "demo", messages, context, workflow }),
  });

  let answer = "";
  const body = await response.text();
  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    let part;
    try {
      part = JSON.parse(line.slice(6));
    } catch {
      continue;
    }
    if (part.type === "text-delta") answer += part.delta;
    if (part.type === "data-workflow") workflow = part.data;
  }

  messages.push({ id: `a${messages.length}`, role: "assistant", parts: [{ type: "text", text: answer }] });

  const options = workflow?.options?.map((option) => option.label).join(" | ") || "—";
  console.log(`\n${"─".repeat(70)}\nکاربر: ${text}`);
  console.log(
    `[state: ${response.headers.get("x-agent-workflow")} | intent: ${response.headers.get("x-agent-intent")}` +
      ` | منابع: ${response.headers.get("x-agent-sources")} | ${workflow?.progress.done}/${workflow?.progress.total}]`,
  );
  console.log(`تصمیم‌های ثبت‌شده: ${workflow?.decisions.join(" ، ") || "—"}`);
  console.log(`کارت‌های UI: ${options}`);
  console.log(`\nرهیار:\n${answer.trim()}`);
}
