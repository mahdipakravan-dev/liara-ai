#!/usr/bin/env node
/**
 * Live walkthrough of the tool layer against a running dev server.
 *
 * 1. creates a failing deployment through the mock API
 * 2. asks Rahyar what went wrong  → read-only tools run automatically
 * 3. asks to redeploy             → write tool stops for approval
 * 4. answers the approval         → the retry executes
 *
 *   node scripts/demo-tools.js [baseUrl]
 */

const base = process.argv[2] ?? "http://localhost:3000";

const created = await fetch(`${base}/api/deployments`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    application: "assistance",
    runtime: "next",
    method: "GitHub",
    port: "3000",
    zone: "germany",
  }),
}).then((response) => response.json());

console.log(`استقرار ساخته شد: ${created.id} | وضعیت: ${created.status}`);

const context = {
  currentPage: "deployment-history",
  applicationName: "assistance",
  runtime: "next",
  deploymentMethod: "GitHub",
  deploymentStatus: created.status,
  deploymentId: created.id,
  port: created.port,
  zone: created.zoneLabel,
};

const messages = [];

async function turn(label, { text, approval } = {}) {
  if (text) messages.push({ id: `u${messages.length}`, role: "user", parts: [{ type: "text", text }] });
  if (approval) {
    // Mirrors addToolApprovalResponse: the answer rides on the same message.
    const part = messages.at(-1).parts.find((item) => item.type === "tool-retry_deployment");
    part.state = "approval-responded";
    part.approval = { ...part.approval, approved: approval.approved };
  }

  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "tools-demo", messages, context }),
  });

  // Rebuild the assistant message the way useChat does on the client. A resumed
  // run only streams the output, so the tool name comes from the earlier part.
  const known = new Map(
    messages
      .flatMap((message) => message.parts)
      .filter((part) => part.toolCallId)
      .map((part) => [part.toolCallId, part.type]),
  );
  const toolParts = new Map();
  const update = (id, patch) =>
    toolParts.set(id, { type: known.get(id), toolCallId: id, ...toolParts.get(id), ...patch });
  let answer = "";

  for (const line of (await response.text()).split("\n")) {
    if (!line.startsWith("data: ")) continue;
    let event;
    try {
      event = JSON.parse(line.slice(6));
    } catch {
      continue;
    }

    if (event.type === "text-delta") answer += event.delta;
    if (event.type === "tool-input-available") {
      update(event.toolCallId, {
        type: `tool-${event.toolName}`,
        toolCallId: event.toolCallId,
        state: "input-available",
        input: event.input,
      });
    }
    if (event.type === "tool-output-available") {
      update(event.toolCallId, { state: "output-available", output: event.output });
    }
    if (event.type === "tool-approval-request") {
      update(event.toolCallId, {
        state: "approval-requested",
        approval: { id: event.approvalId },
      });
    }
  }

  const assistant = {
    id: `a${messages.length}`,
    role: "assistant",
    parts: [...(answer ? [{ type: "text", text: answer }] : []), ...toolParts.values()],
  };
  messages.push(assistant);

  console.log(`\n${"─".repeat(72)}\n${label}`);
  console.log(`[tools: ${response.headers.get("x-agent-tools")} | intent: ${response.headers.get("x-agent-intent")}]`);
  for (const part of toolParts.values()) {
    const summary = part.output
      ? part.output.ok
        ? `ok → ${JSON.stringify(part.output.data).slice(0, 110)}`
        : `error → ${part.output.error.message}`
      : JSON.stringify(part.input ?? {});
    console.log(`  ابزار ${part.type.replace("tool-", "")} [${part.state}] ${summary}`);
  }
  if (answer) console.log(`\nرهیار:\n${answer.trim()}`);
  return { assistant, response };
}

await turn("۱) کاربر: چرا این استقرار fail شد؟", { text: "چرا این استقرار fail شد؟" });
const proposal = await turn("۲) کاربر: مشکل شبکه بود، دوباره اجراش کن", {
  text: "مشکل شبکه بود، لطفاً دوباره استقرار رو اجرا کن",
});

const pending = proposal.assistant.parts.find(
  (part) => part.type === "tool-retry_deployment" && part.state === "approval-requested",
);

if (!pending) {
  console.log("\n⚠️  رهیار درخواست تأیید نساخت؛ ابزار نوشتنی صدا زده نشد.");
} else {
  console.log(`\n✋ اجرا متوقف شد و منتظر تأیید کاربر است (approvalId: ${pending.approval.id})`);
  await turn("۳) کاربر روی «تأیید» کلیک می‌کند", { approval: { approved: true } });
}
