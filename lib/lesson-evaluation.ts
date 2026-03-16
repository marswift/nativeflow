/**
 * Lesson answer evaluation for the NativeFlow MVP.
 * Independent from UI; reusable from lesson page or future scoring.
 */

function isExactMatch(a: string, b: string): boolean {
  return a === b
}

export type TypingEvaluationResult = {
  normalizedInput: string
  normalizedAnswer: string
  isCorrect: boolean
}

/**
 * Normalizes text before comparison.
 * MVP: trim leading and trailing spaces only.
 */
export function normalizeAnswerText(text: string): string {
  return text.trim()
}

/**
 * Evaluates a typing answer against the expected answer.
 * Uses exact match after normalization. Returns the normalized values and whether they match.
 */
export function evaluateTypingAnswer(
  input: string,
  answer: string
): TypingEvaluationResult {
  const normalizedInput = normalizeAnswerText(input)
  const normalizedAnswer = normalizeAnswerText(answer)
  const isCorrect = isExactMatch(normalizedInput, normalizedAnswer)
  return {
    normalizedInput,
    normalizedAnswer,
    isCorrect,
  }
}
