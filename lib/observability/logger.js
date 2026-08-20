/**
 * Structured request logging for agent turns.
 *
 * One JSON line per request, emitted when the turn finishes, so the logs can be
 * grepped or shipped without a parser. Everything passes through the redaction
 * filter on the way out.
 *
 * ┌─ PRODUCTION NOTE ──────────────────────────────────────────────────────┐
 * │ `console` is the transport here because it is what Liara's log viewer  │
 * │ collects. In production this should become:                            │
 * │                                                                        │
 * │  - OpenTelemetry spans (the AI SDK emits telemetry natively via        │
 * │    `experimental_telemetry`) so a turn's model call, tool calls and    │
 * │    retrieval show up as child spans with real timings;                 │
 * │  - an error tracker (Sentry) fed from `finish({ error })` for stack    │
 * │    traces and alerting, which are deliberately not logged here;        │
 * │  - counters/histograms for latency, token usage and rate-limit hits.   │
 * │                                                                        │
 * │ Keep `requestId` as the correlation id across all three.               │
 * └────────────────────────────────────────────────────────────────────────┘
 */

import { randomUUID } from "node:crypto";

import { redactObject, redactSecrets } from "../security/redact.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function emit(level, payload) {
  if (LEVELS[level] < threshold) return;

  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "rahyar",
    ...redactObject(payload),
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function newRequestId() {
  return randomUUID();
}

/**
 * Starts a request log. Facts accumulate as the turn progresses and a single
 * line is written by `finish()`.
 *
 * @example
 *   const log = startRequestLog({ requestId, route: "/api/chat" });
 *   log.set({ intent: "deployment_failed", model });
 *   log.finish({ success: true });
 */
export function startRequestLog(initial = {}) {
  const startedAt = Date.now();
  const record = { requestId: newRequestId(), ...initial };
  let finished = false;

  return {
    get requestId() {
      return record.requestId;
    },

    /** Merge more facts into the pending log line. */
    set(fields) {
      Object.assign(record, fields);
      return this;
    },

    /** Note something mid-turn without closing the record. */
    event(message, fields = {}) {
      emit("debug", { requestId: record.requestId, message, ...fields });
    },

    /**
     * Writes the line. Safe to call once; later calls are ignored so an error
     * path that also runs a finally block cannot double-log.
     *
     * @param {object}  outcome
     * @param {boolean} outcome.success
     * @param {string=} outcome.errorType  Category, not a stack trace.
     * @param {Error=}  outcome.error      Message only is logged.
     */
    finish({ success = true, errorType, error, ...fields } = {}) {
      if (finished) return record;
      finished = true;

      Object.assign(record, fields, {
        latencyMs: Date.now() - startedAt,
        success,
        errorType: errorType ?? (success ? null : "unknown"),
      });

      if (error) {
        // Message only. Stack traces belong in the error tracker, not in a log
        // line that may be shipped to a shared collector.
        record.errorMessage = redactSecrets(
          error instanceof Error ? error.message : String(error),
        ).slice(0, 300);
      }

      emit(success ? "info" : "error", record);
      return record;
    },
  };
}

/** Standalone structured events (rate limiting, validation rejects). */
export const logger = {
  debug: (message, fields) => emit("debug", { message, ...fields }),
  info: (message, fields) => emit("info", { message, ...fields }),
  warn: (message, fields) => emit("warn", { message, ...fields }),
  error: (message, fields) => emit("error", { message, ...fields }),
};
