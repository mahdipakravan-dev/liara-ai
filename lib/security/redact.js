/**
 * Strips obvious credentials out of text before it reaches the model.
 *
 * Build logs echo environment variables and registry URLs, so anything sent
 * upstream passes through here first. This is a best-effort filter for the
 * common shapes, not a guarantee — it is deliberately conservative so it does
 * not shred genuinely useful log lines.
 */

export const REDACTED = "[redacted]";

const SECRET_KEY = String.raw`[\w.-]*(?:token|secret|password|passwd|pwd|api[_-]?key|apikey|access[_-]?key|private[_-]?key|credential|auth|database[_-]?url|db[_-]?url|conn(?:ection)?[_-]?string|session[_-]?id|cookie)[\w.-]*`;

const RULES = [
  // Authorization headers first and greedily: the generic key/value rule below
  // would otherwise match `Authorization: Bearer <token>`, redact the word
  // "Bearer", and leave the credential itself in place.
  [/\b(authorization|proxy-authorization|x-api-key|x-auth-token|cookie)(\s*[:=]\s*).+/gi, `$1$2${REDACTED}`],
  // KEY=value / KEY: value in logs and env dumps
  [new RegExp(String.raw`\b(${SECRET_KEY})(\s*[:=]\s*)(?!\s)("[^"]*"|'[^']*'|\S+)`, "gi"), `$1$2${REDACTED}`],
  // "password": "value" in JSON payloads
  [new RegExp(String.raw`("(?:${SECRET_KEY})"\s*:\s*)"[^"]*"`, "gi"), `$1"${REDACTED}"`],
  // Authorization headers
  [/\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, `$1 ${REDACTED}`],
  // Credentials embedded in a connection string
  [/\b([a-z][a-z0-9+.-]*:\/\/)([^\s:/@]+):([^\s@]+)@/gi, `$1$2:${REDACTED}@`],
  // Vendor-prefixed tokens
  [/\b(sk-|ghp_|gho_|ghu_|ghs_|github_pat_|xoxb-|xoxp-|AKIA)[A-Za-z0-9_-]{10,}/g, REDACTED],
  // JSON Web Tokens
  [/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g, REDACTED],
  // PEM blocks
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, REDACTED],
];

/** @returns {string} the input with detected credentials replaced by `[redacted]`. */
export function redactSecrets(value) {
  if (typeof value !== "string" || !value) return value ?? "";
  return RULES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function containsRedaction(value) {
  return typeof value === "string" && value.includes(REDACTED);
}

/** Header names that must never be written to a log, in full or in part. */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

/**
 * Header snapshot safe to log: sensitive headers collapse to `[redacted]`
 * rather than being truncated, since even a prefix of a bearer token is a
 * credential fragment.
 */
export function redactHeaders(headers) {
  const safe = {};
  if (!headers) return safe;

  const entries = typeof headers.entries === "function" ? headers.entries() : Object.entries(headers);
  for (const [rawName, value] of entries) {
    const name = String(rawName).toLowerCase();
    safe[name] = SENSITIVE_HEADERS.has(name) ? REDACTED : redactSecrets(String(value));
  }
  return safe;
}

const SECRET_KEY_PATTERN = new RegExp(SECRET_KEY, "i");

/**
 * Recursively redacts an object destined for a log line: string values under a
 * secret-looking key are dropped wholesale, other strings are filtered.
 *
 * Only string values are considered. A credential is always a string, whereas
 * key names like `inputTokens` or `retryAfterSeconds` legitimately contain
 * "token"/"auth" substrings and carry numbers we need for observability —
 * blanking those would cost real signal to guard against a case that does not
 * occur.
 */
export function redactObject(value, depth = 0) {
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map((item) => redactObject(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) =>
      typeof item === "string" && SECRET_KEY_PATTERN.test(key)
        ? [key, REDACTED]
        : [key, redactObject(item, depth + 1)],
    ),
  );
}
