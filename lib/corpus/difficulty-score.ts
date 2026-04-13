/**
 * Corpus Difficulty Scoring — Deterministic, Explainable
 *
 * Computes a 0–100 difficulty score for conversation turns based on
 * practical language-learning factors. No API calls, fully reproducible.
 *
 * Higher score = harder for learners.
 */

// ── Common word list (top ~400 high-frequency English words) ──

const COMMON_WORDS = new Set([
  'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they',
  'him', 'her', 'his', 'its', 'our', 'their', 'them', 'us',
  'the', 'a', 'an', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'can', 'may', 'might', 'shall', 'must',
  'not', 'no', 'yes', 'yeah', 'yep', 'nope', 'ok', 'okay',
  'go', 'come', 'get', 'make', 'take', 'see', 'know', 'think', 'want',
  'like', 'need', 'use', 'find', 'give', 'tell', 'say', 'ask', 'work',
  'try', 'call', 'feel', 'leave', 'put', 'keep', 'let', 'start', 'help',
  'show', 'hear', 'play', 'run', 'move', 'live', 'bring', 'happen',
  'write', 'sit', 'stand', 'lose', 'pay', 'meet', 'read', 'grow',
  'open', 'close', 'stop', 'buy', 'eat', 'drink', 'sleep', 'walk',
  'talk', 'wait', 'send', 'watch', 'look', 'turn', 'pick', 'hold',
  'cut', 'set', 'pull', 'push', 'carry', 'check', 'fix', 'break',
  'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own',
  'other', 'old', 'right', 'big', 'high', 'small', 'large', 'next',
  'early', 'young', 'bad', 'same', 'able', 'free', 'sure', 'fine',
  'nice', 'late', 'hard', 'real', 'best', 'better', 'ready', 'sorry',
  'happy', 'pretty', 'much', 'many', 'few', 'some', 'any', 'every',
  'all', 'both', 'each', 'more', 'most', 'such', 'even', 'also',
  'time', 'year', 'day', 'week', 'month', 'night', 'morning',
  'people', 'way', 'man', 'woman', 'child', 'kid', 'kids',
  'world', 'life', 'hand', 'part', 'place', 'home', 'house',
  'school', 'water', 'room', 'mother', 'father', 'friend', 'mom', 'dad',
  'money', 'food', 'name', 'city', 'book', 'job', 'car', 'door',
  'thing', 'stuff', 'lot', 'bit', 'kind',
  'about', 'up', 'out', 'into', 'over', 'after', 'with', 'from',
  'down', 'off', 'back', 'away', 'around', 'through',
  'to', 'in', 'on', 'at', 'for', 'by', 'of', 'before',
  'and', 'or', 'but', 'so', 'if', 'when', 'then', 'because',
  'just', 'very', 'too', 'really', 'already', 'still', 'again',
  'here', 'there', 'now', 'today', 'tomorrow', 'yesterday',
  'always', 'never', 'sometimes', 'usually', 'often',
  'please', 'thank', 'thanks', 'hello', 'hi', 'hey', 'bye',
  'how', 'what', 'where', 'who', 'why', 'which',
  'gonna', 'wanna', 'gotta',
  // Extended everyday vocabulary (reduces false rare-word inflation)
  'breakfast', 'lunch', 'dinner', 'coffee', 'tea', 'snack', 'pizza', 'pasta',
  'store', 'shop', 'park', 'street', 'bus', 'train', 'drive', 'ride',
  'phone', 'text', 'email', 'picture', 'photo', 'movie', 'game', 'test',
  'class', 'teacher', 'student', 'doctor', 'dentist', 'nurse',
  'weather', 'rain', 'snow', 'cold', 'hot', 'warm', 'cool', 'outside',
  'inside', 'kitchen', 'bathroom', 'bedroom', 'garden', 'floor',
  'bag', 'key', 'keys', 'wallet', 'clothes', 'shoe', 'shoes',
  'dog', 'cat', 'baby', 'brother', 'sister', 'grandma', 'grandpa',
  'plan', 'plans', 'idea', 'problem', 'mistake', 'question', 'answer',
  'morning', 'afternoon', 'evening', 'tonight', 'weekend',
  'busy', 'tired', 'sick', 'hungry', 'worried', 'scared', 'excited',
  'safe', 'clean', 'quiet', 'loud', 'fast', 'slow', 'easy', 'different',
  'enough', 'maybe', 'probably', 'actually', 'definitely', 'finally',
  'everything', 'everyone', 'nothing', 'nobody', 'someone', 'something',
  'anywhere', 'somewhere', 'together', 'alone',
  'remember', 'forget', 'believe', 'understand', 'explain', 'change',
  'finish', 'wear', 'cook', 'wash', 'clean', 'drive', 'borrow', 'return',
  'worry', 'care', 'miss', 'guess', 'hope', 'wish', 'mean', 'matter',
  'order', 'grab', 'pick', 'drop', 'hang', 'hang',
  'don\'t', 'didn\'t', 'doesn\'t', 'won\'t', 'wouldn\'t', 'can\'t',
  'couldn\'t', 'shouldn\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t',
  'i\'m', 'i\'ve', 'i\'ll', 'i\'d', 'you\'re', 'you\'ve', 'you\'ll',
  'he\'s', 'she\'s', 'it\'s', 'we\'re', 'we\'ve', 'they\'re', 'they\'ve',
  'that\'s', 'there\'s', 'here\'s', 'what\'s', 'who\'s', 'let\'s',
])

// ── Connectors / subordinate markers ──

const CONNECTORS = new Set([
  'because', 'since', 'although', 'though', 'while', 'whereas',
  'unless', 'until', 'whenever', 'wherever', 'whether', 'if',
  'so', 'but', 'and', 'or',
  'however', 'therefore', 'otherwise', 'meanwhile',
])

// ── Feature extraction ──

export type DifficultyFeatures = {
  tokenCount: number
  avgTokenLength: number
  chunkCount: number
  connectorCount: number
  contractionCount: number
  rareWordRatio: number
  sentenceCount: number
  maxClauseLength: number
  hasQuestion: boolean
  avgSyllables: number
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean)
}

function estimateSyllables(word: string): number {
  const clean = word.replace(/[^a-z]/g, '')
  if (clean.length <= 2) return 1
  const vowelGroups = clean.match(/[aeiouy]+/g)
  let count = vowelGroups ? vowelGroups.length : 1
  if (clean.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  return Math.max(1, sentences.length)
}

export function extractFeatures(text: string, chunkCount = 0): DifficultyFeatures {
  const tokens = tokenize(text)
  const tokenCount = tokens.length

  const avgTokenLength = tokenCount > 0
    ? tokens.reduce((sum, t) => sum + t.replace(/'/g, '').length, 0) / tokenCount
    : 0

  let connectorCount = 0
  let contractionCount = 0
  let rareCount = 0
  let contentCount = 0
  let totalSyllables = 0

  for (const token of tokens) {
    if (CONNECTORS.has(token)) connectorCount++
    if (token.includes("'")) contractionCount++
    totalSyllables += estimateSyllables(token)

    // Only count content words (>2 chars) for rare-word ratio
    if (token.replace(/'/g, '').length > 2) {
      contentCount++
      if (!COMMON_WORDS.has(token)) rareCount++
    }
  }

  const rareWordRatio = contentCount > 0 ? rareCount / contentCount : 0
  const sentenceCount = countSentences(text)
  const hasQuestion = text.includes('?')
  const avgSyllables = tokenCount > 0 ? totalSyllables / tokenCount : 1

  // Max clause length: longest stretch between connectors/punctuation
  const clauses = text.split(/[,;.!?]|(?:\b(?:because|although|though|while|but|and|so|if|when|unless|until)\b)/i)
  const maxClauseLength = clauses.reduce((max, c) => {
    const len = c.trim().split(/\s+/).filter(Boolean).length
    return len > max ? len : max
  }, 0)

  return {
    tokenCount,
    avgTokenLength,
    chunkCount,
    connectorCount,
    contractionCount,
    rareWordRatio,
    sentenceCount,
    maxClauseLength,
    hasQuestion,
    avgSyllables,
  }
}

// ── Scoring ──

/**
 * Compute difficulty score 0–100 from features.
 * Higher = harder. Deterministic.
 */
export function computeDifficultyScore(features: DifficultyFeatures): number {
  // Max theoretical raw ≈ 80. Calibrated so beginner ~20-35, intermediate ~40-60, advanced ~65-85.

  let raw = 0

  // Token count: ≤4 words = very easy, 15+ = hard
  // Weight: 8
  raw += Math.min(1, features.tokenCount / 20) * 8

  // Avg token length: ≤3.5 chars = easy, 6+ = hard
  // Weight: 8
  raw += Math.min(1, Math.max(0, (features.avgTokenLength - 3) / 3.5)) * 8

  // Chunk count: 1 = simple, 5+ = complex structure
  // Weight: 8
  raw += Math.min(1, features.chunkCount / 6) * 8

  // Connector count: 0 = simple, 3+ = complex clauses
  // Weight: 8
  raw += Math.min(1, features.connectorCount / 3) * 8

  // Contractions: casual spoken = easier for beginner learners
  // Weight: -10 (strong discount — key differentiator for beginner conversations)
  raw -= Math.min(1, features.contractionCount / 2) * 10

  // Rare word ratio: 0% = common vocab, 45%+ = hard vocab
  // Weight: 14 (strongest positive factor — differentiates advanced)
  raw += Math.min(1, features.rareWordRatio / 0.45) * 14

  // Sentence count: multi-sentence turns are harder
  // Weight: 6
  raw += Math.min(1, (features.sentenceCount - 1) / 2) * 6

  // Max clause length: long unbroken clause = hard to parse
  // Weight: 12 (helps separate advanced from intermediate)
  raw += Math.min(1, features.maxClauseLength / 12) * 12

  // Question form: minor bump
  // Weight: 2
  if (features.hasQuestion) raw += 2

  // Syllable complexity: avg ≤1.3 = easy, 2.5+ = hard
  // Weight: 3
  raw += Math.min(1, Math.max(0, (features.avgSyllables - 1.3) / 1.5)) * 3

  // Short-utterance bonus: very short turns (≤4 tokens) are clearly easy
  // Weight: -8
  if (features.tokenCount <= 4) raw -= 8
  else if (features.tokenCount <= 7) raw -= 3

  // Gentle scale. Raw range after discounts is roughly -15 to 50.
  // Minimal shift so discounts keep beginner scores low.
  const score = Math.max(0, raw) * 2.0

  return Math.round(Math.max(0, Math.min(100, score)))
}

/**
 * Score a single text string.
 */
export function scoreTurnDifficulty(text: string, chunkCount = 0): number {
  return computeDifficultyScore(extractFeatures(text, chunkCount))
}

/**
 * Score a conversation as average of its turns.
 */
export function scoreConversationDifficulty(turnScores: number[]): number {
  if (turnScores.length === 0) return 0
  const sum = turnScores.reduce((a, b) => a + b, 0)
  return Math.round(sum / turnScores.length)
}

/**
 * Map a numeric score to a difficulty band.
 */
export function scoreToBand(score: number): 'beginner' | 'intermediate' | 'advanced' {
  if (score <= 45) return 'beginner'
  if (score <= 70) return 'intermediate'
  return 'advanced'
}
