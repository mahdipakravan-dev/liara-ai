/**
 * READ-ONLY — returns the current state of a deployment.
 *
 * Safe to run without asking: it changes nothing.
 */

import { z } from "zod";

import { isFailedDeployment } from "../../deployment.js";
import { ToolError } from "./client.js";

export const getDeploymentTool = {
  name: "get_deployment",
  kind: "read",
  title: "خواندن وضعیت استقرار",
  description:
    "وضعیت فعلی یک استقرار را می‌خواند: status، runtime، روش استقرار، پورت، منطقه و پیام خطا. " +
    "وقتی کاربر درباره‌ی وضعیت استقرار می‌پرسد یا برای تشخیص خطا به جزئیات نیاز داری از این ابزار استفاده کن. " +
    "اگر شناسه ندهی، آخرین استقرار برگردانده می‌شود. این ابزار هیچ تغییری ایجاد نمی‌کند.",
  inputSchema: z.object({
    deploymentId: z
      .string()
      .optional()
      .describe("شناسه‌ی استقرار، مثل dep_1787233312618. خالی بگذار تا آخرین استقرار خوانده شود."),
  }),

  async execute({ deploymentId }, { client }) {
    const deployment = await client.getDeployment(deploymentId);
    if (!deployment) throw new ToolError("not_found", "استقراری برای این برنامه پیدا نشد.");

    return {
      id: deployment.id,
      status: deployment.status,
      failed: isFailedDeployment(deployment.status),
      applicationName: deployment.applicationName,
      runtime: deployment.runtime,
      method: deployment.method,
      port: deployment.port,
      zone: deployment.zoneLabel ?? deployment.zone,
      version: deployment.version,
      error: deployment.error ?? null,
      retryOf: deployment.retryOf ?? null,
      createdAt: deployment.createdAt,
    };
  },
};
