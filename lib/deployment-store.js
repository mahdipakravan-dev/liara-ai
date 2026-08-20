/**
 * Stand-in for Liara's deployment backend.
 *
 * An in-memory map that lets /api/deployments behave like a real service for
 * the length of a dev session: create a deployment, look it up by id, retry it.
 * State is per process and resets on restart — that is fine for a mock, and the
 * tool layer never talks to this module directly, it goes through
 * `lib/agent/tools/client.js` so a real API can take its place.
 */

import { createDeployment, retryDeployment, settleDeployment } from "./deployment.js";

const deployments = new Map();
const MAX_TRACKED = 50;

export function saveDeployment(deployment) {
  deployments.set(deployment.id, deployment);
  // Keep the map from growing without bound in a long dev session.
  if (deployments.size > MAX_TRACKED) {
    deployments.delete(deployments.keys().next().value);
  }
  return deployment;
}

/** Reads report the settled outcome; the stored record itself is never rewritten. */
export function findDeployment(id) {
  const deployment = deployments.get(id);
  return deployment ? settleDeployment(deployment) : null;
}

export function latestDeployment() {
  let latest = null;
  for (const deployment of deployments.values()) {
    if (!latest || deployment.createdAt > latest.createdAt) latest = deployment;
  }
  return latest ? settleDeployment(latest) : null;
}

export function startDeployment(payload) {
  return saveDeployment(createDeployment(payload));
}

export function retryStoredDeployment(previous) {
  return saveDeployment(retryDeployment(previous));
}
