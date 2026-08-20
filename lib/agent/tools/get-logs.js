/**
 * READ-ONLY — returns build logs for a deployment.
 *
 * Logs are redacted on the way out: whatever this returns lands in the model's
 * context, so it goes through the same filter as the logs carried in the UI
 * context.
 */

import { z } from "zod";

import { MAX_TOOL_LOG_LINES } from "../../ai/token-budget.js";
import { redactSecrets } from "../../security/redact.js";
import { ToolError } from "./client.js";

const MAX_LIMIT = MAX_TOOL_LOG_LINES;

export const getLogsTool = {
  name: "get_logs",
  kind: "read",
  title: "خواندن لاگ‌های استقرار",
  description:
    "لاگ‌های ساخت و استقرار را می‌خواند. وقتی برای تشخیص علت خطا به متن لاگ نیاز داری از این ابزار استفاده کن " +
    "و هرگز از کاربر نخواه لاگ را دستی کپی کند. این ابزار هیچ تغییری ایجاد نمی‌کند.",
  inputSchema: z.object({
    deploymentId: z
      .string()
      .optional()
      .describe("شناسه‌ی استقرار. خالی بگذار تا لاگ آخرین استقرار خوانده شود."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .optional()
      .describe(`حداکثر تعداد خطوط انتهایی لاگ (پیش‌فرض ۴۰، سقف ${MAX_LIMIT}).`),
  }),

  async execute({ deploymentId, limit }, { client }) {
    const result = await client.getLogs(deploymentId, { limit: Math.min(limit ?? 40, MAX_LIMIT) });
    if (!result) throw new ToolError("not_found", "لاگی برای این استقرار پیدا نشد.");

    return { ...result, logs: result.logs.map(redactSecrets) };
  },
};
