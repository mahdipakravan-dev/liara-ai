/**
 * Single source of truth for a deployment.
 *
 * The API route builds the object here and every consumer — the history view,
 * the assistant context, the debugging skill — reads the same `logs` array.
 * Framework-free on purpose so it can be used on the server, in React, and in
 * scripts.
 *
 * Shape: { id, status, runtime, method, port, zone, logs, error }
 * plus presentation extras (zoneLabel, version, applicationName, createdAt).
 */

export const DEPLOYMENT_DEFAULTS = {
  applicationName: "assistance",
  runtime: "next",
  method: "GitHub",
  port: "3000",
  zone: "iran",
  version: "v1",
};

const ZONE_LABELS = { iran: "ایران", germany: "آلمان" };

export function zoneLabelFor(zone) {
  return ZONE_LABELS[zone] ?? ZONE_LABELS.iran;
}

/** The mock backend reports "error"; the UI context and intents also say "failed". */
export function isFailedDeployment(status) {
  return /^(error|failed|failure|خطا|ناموفق)$/i.test(String(status ?? "").trim());
}

function formatLogLine(startedAt, index, message) {
  const at = new Date(startedAt.getTime() + index * 1000);
  const stamp = at.toISOString().replace("T", " ").slice(0, 19);
  return `${stamp} |  ---> ${message}`;
}

const FAILED_MESSAGES = [
  "Using cache",
  "Installing dependencies",
  "npm warn deprecated inflight@1.0.6: This module is not supported",
  "npm error code ETIMEDOUT",
  "npm error network request to https://registry.npmjs.org/next failed, reason: connect ETIMEDOUT",
  "npm error network This is a problem related to network connectivity.",
  "Build failed: dependency installation timed out.",
];

const RUNNING_MESSAGES = [
  "Using cache",
  "Installing dependencies",
  "Building Next.js application",
  "Uploading image",
  "Deployment queued in build zone",
];

/** Timestamped build log for a deployment. The only place logs are produced. */
export function buildDeploymentLogs({ status, startedAt = new Date() } = {}) {
  const messages = isFailedDeployment(status) ? FAILED_MESSAGES : RUNNING_MESSAGES;
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  return messages.map((message, index) => formatLogLine(start, index, message));
}

/** Builds the deployment the API returns; the mock fails when the zone is Germany. */
export function createDeployment({ application, runtime, method, port, zone, mockScenario } = {}) {
  const createdAt = new Date();
  const streamsFailure = mockScenario === "history-error";
  const failed = zone === "germany" && !streamsFailure;
  const status = failed ? "error" : "deploying";

  return {
    id: `dep_${createdAt.getTime()}`,
    status,
    applicationName: application || DEPLOYMENT_DEFAULTS.applicationName,
    runtime: runtime || DEPLOYMENT_DEFAULTS.runtime,
    method: method || DEPLOYMENT_DEFAULTS.method,
    port: port || DEPLOYMENT_DEFAULTS.port,
    zone: zone || DEPLOYMENT_DEFAULTS.zone,
    zoneLabel: zoneLabelFor(zone),
    version: DEPLOYMENT_DEFAULTS.version,
    logs: streamsFailure ? buildDeploymentLogs({ status: "error", startedAt: createdAt }).slice(0, 1) : buildDeploymentLogs({ status, startedAt: createdAt }),
    error: failed ? "Build failed: dependency installation timed out." : null,
    mockScenario: streamsFailure ? mockScenario : undefined,
    createdAt: createdAt.toISOString(),
  };
}

/** How long the mock backend pretends a build takes before it reports success. */
export const MOCK_BUILD_DURATION_MS = 20_000;
export const MOCK_HISTORY_FAILURE_MS = 4_000;

const SUCCESS_MESSAGES = [
  "Build finished successfully",
  "Starting application",
  "Deployment is live",
];

/**
 * Mock-only: a queued deployment reports success once enough time has passed.
 *
 * The real Liara API tells you when a build finishes; until it is wired up, the
 * outcome is derived from the clock so a retry actually resolves instead of
 * sitting in "deploying" forever. Reads go through here; stored records are not
 * rewritten.
 */
export function settleDeployment(deployment, now = Date.now()) {
  if (deployment?.status !== "deploying") return deployment;

  const startedAt = new Date(deployment.createdAt).getTime();
  if (deployment.mockScenario === "history-error") {
    const elapsed = Math.max(0, now - startedAt);
    const complete = elapsed >= MOCK_HISTORY_FAILURE_MS;
    const allLogs = buildDeploymentLogs({ status: "error", startedAt: deployment.createdAt });
    const visibleCount = complete
      ? allLogs.length
      : Math.max(1, Math.ceil((elapsed / MOCK_HISTORY_FAILURE_MS) * (allLogs.length - 1)));

    return {
      ...deployment,
      status: complete ? "error" : "deploying",
      logs: allLogs.slice(0, visibleCount),
      error: complete ? "Build failed: dependency installation timed out." : null,
    };
  }

  if (!Number.isFinite(startedAt) || now - startedAt < MOCK_BUILD_DURATION_MS) return deployment;

  const finishedAt = new Date(startedAt + MOCK_BUILD_DURATION_MS);
  return {
    ...deployment,
    status: "success",
    logs: [
      ...(deployment.logs ?? []),
      ...SUCCESS_MESSAGES.map((message, index) =>
        formatLogLine(finishedAt, index, message),
      ),
    ],
  };
}

/**
 * A retry is a brand-new attempt derived from a previous one, not a mutation of
 * it — the original stays in the history with its failure intact.
 */
export function retryDeployment(previous) {
  const createdAt = new Date();
  const version = Number.parseInt(String(previous.version ?? "v1").replace(/\D/g, ""), 10) || 1;

  return {
    ...previous,
    id: `dep_${createdAt.getTime()}`,
    status: "deploying",
    version: `v${version + 1}`,
    logs: buildDeploymentLogs({ status: "deploying", startedAt: createdAt }),
    error: null,
    retryOf: previous.id,
    createdAt: createdAt.toISOString(),
  };
}

/**
 * Placeholder shown before any deployment exists. Frozen with fixed timestamps
 * so server and client render identical markup.
 */
export const PLACEHOLDER_DEPLOYMENT = Object.freeze({
  id: null,
  status: "deploying",
  applicationName: DEPLOYMENT_DEFAULTS.applicationName,
  runtime: DEPLOYMENT_DEFAULTS.runtime,
  method: DEPLOYMENT_DEFAULTS.method,
  port: DEPLOYMENT_DEFAULTS.port,
  zone: DEPLOYMENT_DEFAULTS.zone,
  zoneLabel: zoneLabelFor(DEPLOYMENT_DEFAULTS.zone),
  version: DEPLOYMENT_DEFAULTS.version,
  logs: Object.freeze(buildDeploymentLogs({ status: "deploying", startedAt: new Date("2026-08-20T11:34:00Z") })),
  error: null,
  createdAt: "2026-08-20T11:34:00.000Z",
});

/** Fills the gaps of a partial deployment so consumers never juggle fallbacks. */
export function resolveDeployment(deployment) {
  if (!deployment) return PLACEHOLDER_DEPLOYMENT;

  const status = deployment.status ?? PLACEHOLDER_DEPLOYMENT.status;
  return {
    ...PLACEHOLDER_DEPLOYMENT,
    ...deployment,
    status,
    zoneLabel: deployment.zoneLabel ?? zoneLabelFor(deployment.zone),
    logs: Array.isArray(deployment.logs) && deployment.logs.length
      ? deployment.logs
      : buildDeploymentLogs({ status, startedAt: new Date(deployment.createdAt ?? PLACEHOLDER_DEPLOYMENT.createdAt) }),
  };
}
