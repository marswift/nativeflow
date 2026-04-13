/**
 * Repeat Challenge Evaluator
 *
 * Strict token-level exact-match evaluation for repeat/shadowing challenges.
 * The user must reproduce the exact phrase they heard — word for word.
 * Semantic similarity, conversation naturalness, or partial matches do NOT count.
 * One wrong word = fail.
 */

export type RepeatEvaluationResult = {
  normalizedRawTranscript: string
  normalizedExpectedText: string
  rawTokens: string[]
  expectedTokens: string[]
  exactMatch: boolean
  mismatchIndex: number | null
  wordMatchScore: number | null
  isPass: boolean
}

/**
 * Normalize text for comparison:
 * - lowercase
 * - strip all non-alphanumeric characters
 * - collapse whitespace
 * - trim
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean)
}

/**
 * Evaluate a repeat challenge attempt.
 *
 * Pass requires ALL of:
 * 1. Token-level exact match (same words, same order, same count)
 * 2. wordMatchScore available (not null)
 * 3. wordMatchScore >= 80
 *
 * If any token differs (e.g., "today" vs "yesterday"), isPass = false.
 */
export function evaluateRepeat(
  rawTranscript: string,
  expectedText: string,
  wordMatchScore?: number | null,
): RepeatEvaluationResult {
  const normalizedRawTranscript = normalize(rawTranscript)
  const normalizedExpectedText = normalize(expectedText)
  const rawTokens = tokenize(rawTranscript)
  const expectedTokens = tokenize(expectedText)

  // Token-level exact match
  let exactMatch = rawTokens.length === expectedTokens.length
  let mismatchIndex: number | null = null

  if (exactMatch) {
    for (let i = 0; i < expectedTokens.length; i++) {
      if (rawTokens[i] !== expectedTokens[i]) {
        exactMatch = false
        mismatchIndex = i
        break
      }
    }
  } else {
    // Different token count — find first divergence point
    const minLen = Math.min(rawTokens.length, expectedTokens.length)
    for (let i = 0; i < minLen; i++) {
      if (rawTokens[i] !== expectedTokens[i]) {
        mismatchIndex = i
        break
      }
    }
    if (mismatchIndex === null) mismatchIndex = minLen
  }

  const safeWordMatchScore =
    typeof wordMatchScore === 'number' ? wordMatchScore : null

  // All three must be true:
  // 1. exactMatch (token-level)
  // 2. wordMatchScore is available
  // 3. wordMatchScore >= 80 (audio actually matches)
  const isPass =
    exactMatch &&
    safeWordMatchScore !== null &&
    safeWordMatchScore >= 80

  return {
    normalizedRawTranscript,
    normalizedExpectedText,
    rawTokens,
    expectedTokens,
    exactMatch,
    mismatchIndex,
    wordMatchScore: safeWordMatchScore,
    isPass,
  }
}
