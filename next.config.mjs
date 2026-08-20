/**
 * Next.js configuration.
 *
 * `outputFileTracingRoot` pins the workspace root to this project. Without it
 * Next walks up the filesystem looking for a lockfile, and on a machine with a
 * stray package-lock.json in a parent directory it picks that instead, which
 * changes which files are traced into the deployment bundle.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
