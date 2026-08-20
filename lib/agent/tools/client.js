/**
 * The seam between Rahyar's tools and whatever actually stores deployments.
 *
 * Tools never import the mock store or call `fetch` themselves; they receive a
 * client that satisfies this interface:
 *
 *   getDeployment(id)          → Deployment | null
 *   getLogs(id, { limit })     → { deploymentId, logs, lineCount, truncated }
 *   retryDeployment(id)        → Deployment   (the new attempt)
 *
 * Today `resolveDeploymentClient()` returns the mock backed by the in-memory
 * store. When the official Liara API is wired up, add a client that implements
 * the same three methods and switch on credentials — no tool changes.
 */

import { resolveDeployment } from "../../deployment.js";
import { findDeployment, latestDeployment, retryStoredDeployment } from "../../deployment-store.js";

export class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

/**
 * The dev server restarts, or the page was loaded with a deployment the store
 * never saw. The UI context still carries the whole deployment, so treat it as
 * a read-only record of last resort rather than failing the lookup.
 */
function deploymentFromContext(context, id) {
  if (!context?.deploymentId) return null;
  if (id && id !== context.deploymentId) return null;

  return resolveDeployment({
    id: context.deploymentId,
    status: context.deploymentStatus,
    applicationName: context.applicationName,
    runtime: context.runtime,
    method: context.deploymentMethod,
    port: context.port,
    zoneLabel: context.zone,
    logs: context.logs,
  });
}

export function createMockDeploymentClient({ context } = {}) {
  function lookup(id) {
    const stored = id ? findDeployment(id) : latestDeployment();
    return stored ?? deploymentFromContext(context, id);
  }

  return {
    name: "mock",

    async getDeployment(id) {
      return lookup(id);
    },

    async getLogs(id, { limit = 40 } = {}) {
      const deployment = lookup(id);
      if (!deployment) return null;

      const logs = deployment.logs ?? [];
      return {
        deploymentId: deployment.id,
        status: deployment.status,
        lineCount: logs.length,
        truncated: logs.length > limit,
        logs: logs.slice(-limit),
      };
    },

    async retryDeployment(id) {
      const previous = lookup(id);
      if (!previous) throw new ToolError("not_found", "استقراری با این شناسه پیدا نشد.");
      if (!previous.id) throw new ToolError("not_found", "این استقرار هنوز ثبت نشده است.");
      return retryStoredDeployment(previous);
    },
  };
}

/** Picks the backend for this request. Mock today, Liara once credentials exist. */
export function resolveDeploymentClient({ context } = {}) {
  return createMockDeploymentClient({ context });
}
