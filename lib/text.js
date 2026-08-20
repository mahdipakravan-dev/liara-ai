/**
 * Persian-aware text folding shared by intent detection and document search,
 * so both sides agree on what "the same word" means.
 */
export function normalizePersian(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\u064a\u0649]/g, "ی")
    .replace(/\u0643/g, "ک")
    .replace(/[\u200c\u200d\u200e\u200f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
