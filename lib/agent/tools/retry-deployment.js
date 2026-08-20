/**
 * WRITE — starts a new deployment attempt.
 *
 * This is the only tool that changes anything, so it is gated behind an explicit
 * user approval (`toolApproval` in `run-agent.js`). The model may *propose* it;
 * nothing runs until the user confirms in the UI. A failed deployment on its own
 * is never a reason to call it — that rule is stated in the tool description as
 * well as the system prompt, because the description is what the model reads at
 * call time.
 */

import { z } from "zod";

export const retryDeploymentTool = {
  name: "retry_deployment",
  kind: "write",
  title: "اجرای دوباره‌ی استقرار",
  description:
    "یک تلاش تازه برای استقرار شروع می‌کند. این عمل تغییر ایجاد می‌کند و فقط پس از تأیید صریح کاربر اجرا می‌شود. " +
    "صرفاً به این دلیل که استقرار قبلی خطا خورده این ابزار را صدا نزن؛ اول علت خطا را توضیح بده و راه‌حل بده، " +
    "و تنها وقتی این ابزار را پیشنهاد بده که کاربر خواسته باشد دوباره استقرار انجام شود یا مشکل را برطرف کرده باشد.",
  inputSchema: z.object({
    deploymentId: z
      .string()
      .optional()
      .describe("شناسه‌ی استقراری که باید دوباره اجرا شود. خالی بگذار تا آخرین استقرار انتخاب شود."),
    reason: z
      .string()
      .describe("توضیح کوتاه و قابل نمایش به کاربر که چرا اجرای دوباره لازم است، مثلاً «خطای شبکه‌ی موقت»."),
  }),

  async execute({ deploymentId, reason }, { client }) {
    const deployment = await client.retryDeployment(deploymentId);

    return {
      id: deployment.id,
      status: deployment.status,
      retryOf: deployment.retryOf,
      version: deployment.version,
      runtime: deployment.runtime,
      method: deployment.method,
      port: deployment.port,
      zone: deployment.zoneLabel ?? deployment.zone,
      reason: reason ?? null,
      createdAt: deployment.createdAt,
    };
  },
};
