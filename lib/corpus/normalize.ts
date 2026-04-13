/**
 * Text normalization for corpus pipeline.
 * Consistent lowercased, punctuation-stripped form for deduplication and matching.
 */

/**
 * Normalize text for comparison and deduplication.
 * - lowercase
 * - collapse contractions to canonical form
 * - strip non-alphanumeric (keep apostrophes in contractions)
 * - collapse whitespace
 */
export function normalizeCorpusText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u2019/g, "'") // smart quote → ASCII
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize for deduplication key (stricter — no apostrophes).
 */
export function normalizeForDedupeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
