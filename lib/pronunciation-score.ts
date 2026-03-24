function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number): number {
  return Math.round(value)
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:'"()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(input: string): string[] {
  const normalized = normalizeText(input)
  return normalized === '' ? [] : normalized.split(' ')
}

function levenshtein(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length

  if (aLen === 0) return bLen
  if (bLen === 0) return aLen

  const dp = Array.from({ length: aLen + 1 }, () => Array<number>(bLen + 1).fill(0))

  for (let i = 0; i <= aLen; i += 1) dp[i][0] = i
  for (let j = 0; j <= bLen; j += 1) dp[0][j] = j

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }

  return dp[aLen][bLen]
}

function getCharacterSimilarity(expected: string, actual: string): number {
  if (!expected && !actual) return 100
  if (!expected || !actual) return 0

  const distance = levenshtein(expected, actual)
  const base = Math.max(expected.length, actual.length)
  return round(clamp((1 - distance / base) * 100, 0, 100))
}

function getTokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 100

  const distance = levenshtein(a, b)
  const base = Math.max(a.length, b.length)
  return round(clamp((1 - distance / base) * 100, 0, 100))
}

function getBestTokenMatch(
  expectedWord: string,
  actualWords: string[],
  usedIndexes: Set<number>
): { index: number; similarity: number } {
  let bestIndex = -1
  let bestSimilarity = 0

  for (let i = 0; i < actualWords.length; i += 1) {
    if (usedIndexes.has(i)) continue
    const similarity = getTokenSimilarity(expectedWord, actualWords[i])
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestIndex = i
    }
  }

  return { index: bestIndex, similarity: bestSimilarity }
}

function getWordMatchScore(expectedWords: string[], actualWords: string[]) {
  if (expectedWords.length === 0) {
    return {
      score: 0,
      matchedWords: [] as string[],
      missingWords: [] as string[],
    }
  }

  const usedIndexes = new Set<number>()
  const matchedWords: string[] = []
  const missingWords: string[] = []

  let weightedMatch = 0
  let orderedBonus = 0

  for (let i = 0; i < expectedWords.length; i += 1) {
    const expectedWord = expectedWords[i]
    const { index, similarity } = getBestTokenMatch(expectedWord, actualWords, usedIndexes)

    if (index === -1 || similarity < 55) {
      missingWords.push(expectedWord)
      continue
    }

    usedIndexes.add(index)
    matchedWords.push(expectedWord)

    const tokenScore =
      similarity >= 95 ? 1 :
      similarity >= 85 ? 0.9 :
      similarity >= 75 ? 0.75 :
      similarity >= 65 ? 0.55 :
      0.35

    weightedMatch += tokenScore

    if (index === i) {
      orderedBonus += tokenScore
    }
  }

  const coverage = weightedMatch / expectedWords.length
  const order = orderedBonus / expectedWords.length
  const score = round(clamp((coverage * 0.8 + order * 0.2) * 100, 0, 100))

  return {
    score,
    matchedWords,
    missingWords,
  }
}

function getRhythmScore(
  expectedWords: string[],
  actualWords: string[],
  expected: string,
  actual: string
) {
  if (expectedWords.length === 0 || actualWords.length === 0) return 0

  const wordCountRatio =
    Math.min(expectedWords.length, actualWords.length) /
    Math.max(expectedWords.length, actualWords.length)

  const charLengthRatio =
    Math.min(expected.length, actual.length) / Math.max(expected.length, actual.length)

  return round(clamp((wordCountRatio * 0.65 + charLengthRatio * 0.35) * 100, 0, 100))
}

function getCompletenessScore(expectedWords: string[], missingWords: string[]) {
  if (expectedWords.length === 0) return 0
  const keptRatio = 1 - missingWords.length / expectedWords.length
  return round(clamp(keptRatio * 100, 0, 100))
}

function getClarityScore(expected: string, actual: string, averageLogprob: number | null) {
  const charSimilarity = getCharacterSimilarity(expected, actual)

  if (typeof averageLogprob === 'number' && Number.isFinite(averageLogprob)) {
    const normalized = clamp(((averageLogprob + 1.5) / 1.4) * 100, 0, 100)
    return round(charSimilarity * 0.55 + normalized * 0.45)
  }

  return charSimilarity
}

export type PronunciationScoreBreakdown = {
  clarity: number
  wordMatch: number
  rhythm: number
  completeness: number
}

export type PronunciationScoreResult = {
  transcriptText: string
  totalScore: number
  breakdown: PronunciationScoreBreakdown
  matchedWords: string[]
  missingWords: string[]
}

export function scorePronunciation(input: {
  expectedText: string
  transcriptText: string
  averageLogprob?: number | null
}): PronunciationScoreResult {
  const expected = normalizeText(input.expectedText)
  const actual = normalizeText(input.transcriptText)

  const expectedWords = tokenize(expected)
  const actualWords = tokenize(actual)

  const wordMatchResult = getWordMatchScore(expectedWords, actualWords)
  const rawRhythm = getRhythmScore(expectedWords, actualWords, expected, actual)
  const rawClarity = getClarityScore(expected, actual, input.averageLogprob ?? null)
  const completeness = getCompletenessScore(expectedWords, wordMatchResult.missingWords)

  const wordMatch = wordMatchResult.score

  const penalty =
    wordMatch < 20 ? 0.2 :
    wordMatch < 40 ? 0.45 :
    wordMatch < 60 ? 0.7 :
    1

  const clarityCap =
    wordMatch < 20 ? 25 :
    wordMatch < 40 ? 45 :
    wordMatch < 60 ? 70 :
    100

  const rhythmCap =
    wordMatch < 20 ? 30 :
    wordMatch < 40 ? 50 :
    wordMatch < 60 ? 75 :
    100

  const clarity = round(clamp(rawClarity * penalty, 0, clarityCap))
  const rhythm = round(clamp(rawRhythm * penalty, 0, rhythmCap))

  const totalScore = round(
    clarity * 0.2 +
    wordMatch * 0.5 +
    rhythm * 0.1 +
    completeness * 0.2
  )

  return {
    transcriptText: input.transcriptText.trim(),
    totalScore,
    breakdown: {
      clarity,
      wordMatch,
      rhythm,
      completeness,
    },
    matchedWords: wordMatchResult.matchedWords,
    missingWords: wordMatchResult.missingWords,
  }
}
