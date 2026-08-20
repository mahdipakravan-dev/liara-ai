import { NextResponse } from "next/server";

import { logger, newRequestId, startRequestLog } from "@/lib/observability/logger";
import {
  clientKeyFrom,
  createRateLimiter,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { validateChatRequest } from "@/lib/security/validate";
import { getAgentConfig, runAgent, STREAM_ERROR_MESSAGE } from "@/lib/agent/run-agent";

export const runtime = "nodejs";

// Module scope so the window survives between requests. Single-process only —
// see the Redis note in lib/security/rate-limit.js.
const checkRateLimit = createRateLimiter();

/** Error responses carry a code and a readable message, never a stack trace. */
function fail({ status, code, error, requestId, headers }) {
  return NextResponse.json({ error, code, requestId }, { status, headers });
}

export async function POST(request) {
  const requestId = newRequestId();

  const config = getAgentConfig();
  if (!config) {
    logger.error("agent not configured", { requestId });
    return fail({
      status: 503,
      code: "not_configured",
      error: "تنظیمات سرویس هوش مصنوعی لیارا کامل نیست.",
      requestId,
    });
  }

  const clientKey = clientKeyFrom(request);
  const limit = checkRateLimit(clientKey);
  if (!limit.allowed) {
    logger.warn("rate limit exceeded", { requestId, route: "/api/chat", limit: limit.limit });
    return fail({
      status: 429,
      code: "rate_limited",
      error: `تعداد درخواست‌ها بیش از حد مجاز است. ${limit.retryAfterSeconds.toLocaleString("fa-IR")} ثانیه دیگر دوباره تلاش کنید.`,
      requestId,
      headers: { ...rateLimitHeaders(limit), "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  const raw = await request.json().catch(() => null);
  const validation = validateChatRequest(raw);
  if (!validation.ok) {
    logger.warn("invalid chat request", {
      requestId,
      code: validation.code,
      detail: validation.detail,
    });
    return fail({ ...validation, requestId, headers: rateLimitHeaders(limit) });
  }

  const log = startRequestLog({ requestId, route: "/api/chat", model: config.model });

  try {
    return runAgent(validation.body, config, { log, headers: rateLimitHeaders(limit) });
  } catch (error) {
    log.finish({ success: false, errorType: "agent_start_failed", error });
    return fail({
      status: 502,
      code: "agent_failed",
      error: STREAM_ERROR_MESSAGE,
      requestId,
    });
  }
}
