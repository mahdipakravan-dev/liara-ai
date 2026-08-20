/**
 * Shape and size validation for the chat endpoint.
 *
 * The request body is attacker-controlled: it arrives from the browser and
 * carries a `context` object the client assembled and a `workflow` snapshot the
 * server previously issued. Neither can be trusted on the way back in, so
 * everything is re-validated here before the agent sees it.
 *
 * Failures return a code and a Persian message, never an exception trace.
 */

import { z } from "zod";

import { MAX_MESSAGE_LENGTH, MAX_REQUEST_CHARS } from "../ai/token-budget.js";

const textPart = z.object({ type: z.literal("text"), text: z.string() });

/**
 * Tool, source, reasoning and workflow parts are echoed back by the AI SDK and
 * must survive the round trip, so unknown part types pass through by shape
 * rather than being enumerated.
 */
const messagePart = z.union([textPart, z.object({ type: z.string() }).passthrough()]);

const message = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(messagePart).optional(),
  content: z.string().optional(),
});

const chatRequest = z.object({
  id: z.string().optional(),
  messages: z.array(message).min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  workflow: z.object({}).passthrough().nullish(),
  trigger: z.string().optional(),
  messageId: z.string().optional(),
});

function textLengthOf(entry) {
  const fromParts = (entry.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .reduce((total, part) => total + part.text.length, 0);
  return fromParts + (entry.content?.length ?? 0);
}

/**
 * @returns {{ok: true, body: object} | {ok: false, status: number, code: string, error: string}}
 */
export function validateChatRequest(raw) {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, status: 400, code: "invalid_json", error: "بدنه‌ی درخواست معتبر نیست." };
  }

  // Cheap guard first: reject a huge payload before walking it with zod.
  let serializedLength = 0;
  try {
    serializedLength = JSON.stringify(raw).length;
  } catch {
    return { ok: false, status: 400, code: "unserializable", error: "بدنه‌ی درخواست معتبر نیست." };
  }

  if (serializedLength > MAX_REQUEST_CHARS) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      error: "تاریخچه‌ی گفتگو بیش از حد مجاز است. گفتگوی تازه‌ای شروع کنید.",
    };
  }

  const parsed = chatRequest.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "invalid_shape",
      // The zod issue list can echo user input, so only the path is reported.
      error: "ساختار پیام ارسالی معتبر نیست.",
      detail: parsed.error.issues.slice(0, 3).map((issue) => issue.path.join(".")).join(", "),
    };
  }

  const oversized = parsed.data.messages.find((entry) => textLengthOf(entry) > MAX_MESSAGE_LENGTH);
  if (oversized) {
    return {
      ok: false,
      status: 413,
      code: "message_too_long",
      error: `طول پیام بیش از حد مجاز است (حداکثر ${MAX_MESSAGE_LENGTH.toLocaleString("fa-IR")} کاراکتر).`,
    };
  }

  return { ok: true, body: parsed.data };
}
