/**
 * Daily lesson generation engine for NativeFlow.
 * Produces a deterministic, explainable lesson plan from user profile, review state, and candidates.
 * Selection is phase-based: overdue reviews → due reviews → new content.
 * Architecture is ready for future AI ranking and 10+ learning languages.
 */

// ─── Scoring weights (tunable; used for ordering within each phase) ─────────
const WEIGHT_GOAL_MATCH = 50
const WEIGHT_WEAKNESS_MATCH = 40
const WEIGHT_LEVEL_FIT = 35
const WEIGHT_TIME_FIT = 30
const WEIGHT_REGION_MATCH = 25
const WEIGHT_NOVELTY = 20
const WEIGHT_REVIEW_BALANCE = 15

/** Diversity penalty per tag overlap with already-selected items. */
const DIVERSITY_PENALTY_PER_OVERLAP = 8

/** Overage tolerance in minutes when filling the daily budget. */
const OVERAGE_TOLERANCE_MINUTES = 5

/** Session length presets (minutes) for recommendedSessionCount. */
const SESSION_SHORT_MIN = 5
const SESSION_SHORT_MAX = 12
const SESSION_STANDARD_MIN = 12
const SESSION_STANDARD_MAX = 25
const SESSION_DEEP_MIN = 25
const SESSION_DEEP_MAX = 45

const DAYS_PER_MONTH = 30
const DAYS_PER_YEAR = 365

// ─── Exported types ───────────────────────────────────────────────────────

export type LessonSkillTag =
  | 'speaking'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'grammar'
  | 'vocabulary'
  | 'pronunciation'
  | 'review'

export type DailyLessonReasonCode =
  | 'due_review'
  | 'overdue_review'
  | 'goal_match'
  | 'weakness_match'
  | 'region_match'
  | 'level_fit'
  | 'novelty'
  | 'time_fit'
  | 'review_balance'

export interface LessonCandidate {
  id: string
  title: string
  estimatedMinutes: number
  difficulty: number
  skillTags: readonly LessonSkillTag[]
  goalTags: readonly string[]
  isReview: boolean
  dueAt?: string | null
  lastStudiedAt?: string | null
  successRate?: number | null
  timesCompleted?: number
  regionCode?: string | null
  languageCode: string
}

export interface LearnerWeaknessProfile {
  weakSkillTags: readonly LessonSkillTag[]
  weakGoalTags: readonly string[]
  averageSuccessRate?: number | null
}

export type CurrentLevel = 'beginner' | 'intermediate' | 'advanced'
export type PreferredSessionLength = 'short' | 'standard' | 'deep'

export interface DailyLessonGeneratorInput {
  nowIso: string
  targetLanguageCode: string
  targetCountryCode?: string | null
  targetRegionSlug?: string | null
  currentLevel: CurrentLevel
  dailyStudyMinutesGoal: number
  preferredSessionLength?: PreferredSessionLength | null
  speakByDeadlineText?: string | null
  targetOutcomeText?: string | null
  lessonCandidates: readonly LessonCandidate[]
  weaknessProfile?: LearnerWeaknessProfile | null
}

export interface DailyLessonItem {
  candidateId: string
  title: string
  estimatedMinutes: number
  reasonCodes: readonly DailyLessonReasonCode[]
  score: number
}

export interface DailyLessonPlan {
  generatedAt: string
  totalEstimatedMinutes: number
  recommendedSessionCount: number
  items: readonly DailyLessonItem[]
  summary: {
    /** Number of selected items that are due/overdue reviews. */
    dueReviewCount: number
    /** Number of selected items that are new (non-review) content. */
    newContentCount: number
    totalCandidateCount: number
  }
}

// ─── Internal: date / due parsing ─────────────────────────────────────────

function parseIsoDate(iso: string | null | undefined): number {
  if (iso == null || iso === '') return 0
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

/**
 * Returns 'overdue_review' | 'due_review' | null.
 * Overdue = due date before start of today; due = due today (before end of today).
 */
function getReviewDueStatus(
  dueAt: string | null | undefined,
  nowIso: string,
  isReview: boolean
): 'overdue_review' | 'due_review' | null {
  if (!isReview) return null
  const due = parseIsoDate(dueAt)
  const now = parseIsoDate(nowIso)
  if (due <= 0) return null
  const startOfToday = new Date(now)
  startOfToday.setUTCHours(0, 0, 0, 0)
  const startOfTodayMs = startOfToday.getTime()
  if (due < startOfTodayMs) return 'overdue_review'
  const endOfToday = new Date(startOfTodayMs)
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1)
  if (due < endOfToday.getTime()) return 'due_review'
  return null
}

// ─── Internal: deadline urgency (speakByDeadlineText) ──────────────────────

/** Parses Japanese-style deadline text to approximate remaining days from now. */
function parseDeadlineTextToRemainingDays(text: string | null | undefined): number | null {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return null

  const yearMonthMatch = trimmed.match(/^(\d+)\s*年\s*(\d+)\s*ヶ?月/)
  if (yearMonthMatch) {
    const days =
      Number(yearMonthMatch[1]) * DAYS_PER_YEAR + Number(yearMonthMatch[2]) * DAYS_PER_MONTH
    return days > 0 ? days : null
  }

  const monthsMatch = trimmed.match(/^(\d+)\s*ヶ?月/)
  if (monthsMatch) {
    const days = Number(monthsMatch[1]) * DAYS_PER_MONTH
    return days > 0 ? days : null
  }

  const jpYearMatch = trimmed.match(/^(\d+)\s*年/)
  if (jpYearMatch) {
    const days = Number(jpYearMatch[1]) * DAYS_PER_YEAR
    return days > 0 ? days : null
  }

  const enMonthsMatch = trimmed.match(/^(\d+)\s*months?$/i)
  if (enMonthsMatch) {
    const days = Number(enMonthsMatch[1]) * DAYS_PER_MONTH
    return days > 0 ? days : null
  }

  const enYearMatch = trimmed.match(/^(\d+)\s*years?$/i)
  if (enYearMatch) {
    const days = Number(enYearMatch[1]) * DAYS_PER_YEAR
    return days > 0 ? days : null
  }

  return null
}

/**
 * Urgency from deadline: 0 = long deadline (prioritize review stability), 1 = near (allow more new content).
 * Used to cap how much of the daily budget is reserved for reviews before filling with new content.
 */
export function getDeadlineUrgency(speakByDeadlineText: string | null | undefined): number {
  const remaining = parseDeadlineTextToRemainingDays(speakByDeadlineText)
  if (remaining == null || remaining <= 0) return 0.5
  const maxDays = 3 * DAYS_PER_YEAR
  const clamped = Math.min(remaining, maxDays)
  return 1 - clamped / maxDays
}

// ─── Internal: level and session helpers ───────────────────────────────────

/** Target difficulty range by level (inclusive). Difficulty is 1–10. */
function getDifficultyRange(level: CurrentLevel): { min: number; max: number } {
  switch (level) {
    case 'beginner':
      return { min: 1, max: 4 }
    case 'intermediate':
      return { min: 3, max: 7 }
    case 'advanced':
      return { min: 5, max: 10 }
    default:
      return { min: 1, max: 10 }
  }
}

/** Ideal minutes per session by preference. */
function getSessionMinutesRange(
  preferredSessionLength?: PreferredSessionLength | null
): { min: number; max: number } {
  switch (preferredSessionLength) {
    case 'short':
      return { min: SESSION_SHORT_MIN, max: SESSION_SHORT_MAX }
    case 'deep':
      return { min: SESSION_DEEP_MIN, max: SESSION_DEEP_MAX }
    case 'standard':
    default:
      return { min: SESSION_STANDARD_MIN, max: SESSION_STANDARD_MAX }
  }
}

/** Recommended number of sessions from daily goal and preferred length. */
export function getRecommendedSessionCount(
  dailyStudyMinutesGoal: number,
  preferredSessionLength?: PreferredSessionLength | null
): number {
  const goal = Math.max(0, Math.floor(dailyStudyMinutesGoal))
  if (goal === 0) return 1
  const { min, max } = getSessionMinutesRange(preferredSessionLength)
  const avg = (min + max) / 2
  const count = Math.round(goal / avg)
  return Math.max(1, count)
}

// ─── Internal: Japanese goal mapping and keyword extraction ─────────────────

/** Canonical goal tags for matching. Japanese phrases map to these. */
const JAPANESE_GOAL_PHRASE_MAP: Readonly<Record<string, string>> = {
  日常会話: 'daily-conversation',
  旅行: 'travel',
  仕事: 'work',
  メール: 'business-email',
  会議: 'meetings',
  英会話: 'speaking',
  ビジネス: 'work',
  ビジネスメール: 'business-email',
}

/** Normalizes Japanese text for matching: full-width to half-width, trim, collapse space. */
function normalizeJapaneseForGoals(text: string): string {
  return text
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[、。！？\s]+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Extracts canonical goal tags from targetOutcomeText.
 * Uses phrase mapping first (Japanese → canonical), then token overlap with goalTags.
 */
function extractGoalTagsForMatching(
  targetOutcomeText: string | null | undefined
): string[] {
  if (targetOutcomeText == null || targetOutcomeText.trim() === '') return []
  const normalized = normalizeJapaneseForGoals(targetOutcomeText)
  if (!normalized) return []

  const out = new Set<string>()

  for (const [phrase, canonical] of Object.entries(JAPANESE_GOAL_PHRASE_MAP)) {
    const normPhrase = normalizeJapaneseForGoals(phrase)
    if (normPhrase && normalized.includes(normPhrase)) out.add(canonical)
  }

  const words = normalized.split(/\s+/).filter((w) => w.length >= 2)
  for (const w of words) {
    if (out.has(w)) continue
    out.add(w)
  }

  return Array.from(out)
}

// ─── Internal: matching and scoring components ──────────────────────────────

function clampMinutes(m: number): number {
  if (typeof m !== 'number' || Number.isNaN(m)) return 10
  return Math.max(1, Math.min(120, Math.round(m)))
}

function clampDifficulty(d: number): number {
  if (typeof d !== 'number' || Number.isNaN(d)) return 5
  return Math.max(1, Math.min(10, d))
}

function goalMatchScore(
  candidate: LessonCandidate,
  canonicalGoalTags: string[]
): { score: number; matched: boolean } {
  if (canonicalGoalTags.length === 0 || !candidate.goalTags?.length) return { score: 0, matched: false }
  const tags = candidate.goalTags.map((t) => t.toLowerCase())
  for (const canonical of canonicalGoalTags) {
    if (tags.some((t) => t.includes(canonical) || canonical.includes(t))) {
      return { score: 1, matched: true }
    }
  }
  return { score: 0, matched: false }
}

function weaknessMatchScore(
  candidate: LessonCandidate,
  weakness: LearnerWeaknessProfile | null | undefined
): { score: number; matched: boolean } {
  if (weakness == null) return { score: 0, matched: false }
  let score = 0
  let matched = false
  if (weakness.weakSkillTags?.length && candidate.skillTags?.length) {
    const weakSet = new Set(weakness.weakSkillTags)
    for (const t of candidate.skillTags) {
      if (weakSet.has(t)) {
        score += 0.5
        matched = true
      }
    }
  }
  if (weakness.weakGoalTags?.length && candidate.goalTags?.length) {
    const weakSet = new Set(weakness.weakGoalTags.map((t) => t.toLowerCase()))
    for (const t of candidate.goalTags) {
      if (weakSet.has(t.toLowerCase())) {
        score += 0.5
        matched = true
      }
    }
  }
  return { score: Math.min(1, score), matched }
}

function regionMatchScore(
  candidate: LessonCandidate,
  targetCountryCode?: string | null,
  targetRegionSlug?: string | null
): { score: number; matched: boolean } {
  if (targetCountryCode == null && targetRegionSlug == null) return { score: 0, matched: false }
  const candidateRegion = (candidate.regionCode ?? '').trim().toLowerCase()
  if (candidateRegion === '') return { score: 0, matched: false }
  const country = (targetCountryCode ?? '').trim().toLowerCase()
  const region = (targetRegionSlug ?? '').trim().toLowerCase()
  if (country && candidateRegion === country) return { score: 1, matched: true }
  if (region && candidateRegion.includes(region)) return { score: 0.8, matched: true }
  return { score: 0, matched: false }
}

function levelFitScore(candidate: LessonCandidate, level: CurrentLevel): number {
  const d = clampDifficulty(candidate.difficulty)
  const { min, max } = getDifficultyRange(level)
  if (d >= min && d <= max) return 1
  const dist = d < min ? min - d : d - max
  return Math.max(0, 1 - dist * 0.25)
}

function noveltyScore(candidate: LessonCandidate): number {
  if (candidate.isReview) return 0
  const times = candidate.timesCompleted ?? 0
  if (times === 0) return 1
  if (times >= 5) return 0.1
  return Math.max(0.1, 1 - times * 0.2)
}

function timeFitScore(
  candidate: LessonCandidate,
  preferredSessionLength?: PreferredSessionLength | null
): number {
  const mins = clampMinutes(candidate.estimatedMinutes)
  const { min, max } = getSessionMinutesRange(preferredSessionLength)
  if (mins >= min && mins <= max) return 1
  if (mins < min) return Math.max(0, mins / min)
  return Math.max(0, 1 - (mins - max) / (max * 2))
}

/** How well candidate duration fits remaining budget (1 = fits exactly or under). */
function timeFitToRemaining(estimatedMinutes: number, remainingMinutes: number): number {
  const mins = clampMinutes(estimatedMinutes)
  if (remainingMinutes <= 0) return 0
  if (mins <= remainingMinutes) return 1
  const over = mins - remainingMinutes
  return Math.max(0, 1 - over / (remainingMinutes + 1))
}

function reviewBalanceScore(candidate: LessonCandidate): number {
  if (!candidate.isReview) return 0.5
  const rate = candidate.successRate
  if (rate == null) return 0.7
  const r = Math.max(0, Math.min(1, rate))
  return 0.3 + r * 0.7
}

// ─── Combined scoring (no due/overdue weights; phase handles order) ───────────

interface ScoredCandidate {
  candidate: LessonCandidate
  score: number
  reasonCodes: DailyLessonReasonCode[]
}

function scoreCandidate(
  candidate: LessonCandidate,
  input: DailyLessonGeneratorInput,
  canonicalGoalTags: string[]
): ScoredCandidate {
  const reasonCodes: DailyLessonReasonCode[] = []
  let total = 0

  const dueStatus = getReviewDueStatus(candidate.dueAt, input.nowIso, candidate.isReview)
  if (dueStatus === 'overdue_review') reasonCodes.push('overdue_review')
  else if (dueStatus === 'due_review') reasonCodes.push('due_review')

  const goal = goalMatchScore(candidate, canonicalGoalTags)
  if (goal.matched) {
    reasonCodes.push('goal_match')
    total += WEIGHT_GOAL_MATCH * goal.score
  }

  const weak = weaknessMatchScore(candidate, input.weaknessProfile)
  if (weak.matched) {
    reasonCodes.push('weakness_match')
    total += WEIGHT_WEAKNESS_MATCH * weak.score
  }

  const region = regionMatchScore(
    candidate,
    input.targetCountryCode,
    input.targetRegionSlug
  )
  if (region.matched) {
    reasonCodes.push('region_match')
    total += WEIGHT_REGION_MATCH * region.score
  }

  const levelScore = levelFitScore(candidate, input.currentLevel)
  if (levelScore > 0) {
    reasonCodes.push('level_fit')
    total += WEIGHT_LEVEL_FIT * levelScore
  }

  const nov = noveltyScore(candidate)
  if (nov > 0 && !candidate.isReview) {
    reasonCodes.push('novelty')
    total += WEIGHT_NOVELTY * nov
  }

  reasonCodes.push('time_fit')
  total += WEIGHT_TIME_FIT * timeFitScore(candidate, input.preferredSessionLength)

  reasonCodes.push('review_balance')
  total += WEIGHT_REVIEW_BALANCE * reviewBalanceScore(candidate)

  return { candidate, score: total, reasonCodes }
}

/** Count of tag overlaps between candidate and selected tag sets. */
function diversityOverlap(
  candidate: LessonCandidate,
  selectedSkillTags: Set<string>,
  selectedGoalTags: Set<string>
): number {
  let n = 0
  for (const t of candidate.skillTags ?? []) {
    if (selectedSkillTags.has(t)) n++
  }
  for (const t of candidate.goalTags ?? []) {
    if (selectedGoalTags.has(t.toLowerCase())) n++
  }
  return n
}

/** Select items from a list of scored candidates until budget is filled. Prefers time fit to remaining; applies diversity penalty against already-selected tags. */
function selectWithinBudget(
  scored: ScoredCandidate[],
  budgetMinutes: number,
  preferredSessionLength: PreferredSessionLength | null | undefined,
  initialSelectedSkills: Set<string>,
  initialSelectedGoals: Set<string>
): { items: DailyLessonItem[]; totalMinutes: number; selectedSkills: Set<string>; selectedGoals: Set<string> } {
  const items: DailyLessonItem[] = []
  let totalMinutes = 0
  const selectedSkillTags = new Set(initialSelectedSkills)
  const selectedGoalTags = new Set(initialSelectedGoals)
  const usedIds = new Set<string>()

  while (totalMinutes < budgetMinutes) {
    let best: ScoredCandidate | null = null
    let bestEffectiveScore = -1
    let bestTimeFit = -1

    for (const sc of scored) {
      if (usedIds.has(sc.candidate.id)) continue
      const mins = clampMinutes(sc.candidate.estimatedMinutes)
      const remaining = budgetMinutes - totalMinutes
      const timeFit = timeFitToRemaining(mins, remaining)
      const overlap = diversityOverlap(sc.candidate, selectedSkillTags, selectedGoalTags)
      const effectiveScore = sc.score - overlap * DIVERSITY_PENALTY_PER_OVERLAP

      const preferred =
        effectiveScore > bestEffectiveScore ||
        (effectiveScore === bestEffectiveScore && timeFit > bestTimeFit)
      if (preferred) {
        best = sc
        bestEffectiveScore = effectiveScore
        bestTimeFit = timeFit
      }
    }

    if (best == null) break
    const mins = clampMinutes(best.candidate.estimatedMinutes)
    if (totalMinutes + mins > budgetMinutes && totalMinutes > 0) break

    usedIds.add(best.candidate.id)
    totalMinutes += mins
    items.push({
      candidateId: best.candidate.id,
      title: best.candidate.title,
      estimatedMinutes: mins,
      reasonCodes: best.reasonCodes,
      score: best.score,
    })
    for (const t of best.candidate.skillTags ?? []) selectedSkillTags.add(t)
    for (const t of best.candidate.goalTags ?? []) selectedGoalTags.add(t.toLowerCase())
  }

  return { items, totalMinutes, selectedSkills: selectedSkillTags, selectedGoals: selectedGoalTags }
}

// ─── Main export: generate daily lesson plan (phase-based) ─────────────────

export function generateDailyLessonPlan(input: DailyLessonGeneratorInput): DailyLessonPlan {
  const generatedAt = input.nowIso
  const goal = Math.max(0, Math.floor(input.dailyStudyMinutesGoal))
  const tolerance = Math.min(OVERAGE_TOLERANCE_MINUTES, Math.max(0, goal * 0.2))
  const budget = goal + tolerance

  const filtered = input.lessonCandidates.filter(
    (c) =>
      (c.languageCode || '').trim().toLowerCase() ===
      (input.targetLanguageCode || '').trim().toLowerCase()
  )

  const urgency = getDeadlineUrgency(input.speakByDeadlineText)
  const reviewBudgetMinutes = Math.round(budget * (1 - urgency * 0.5))
  const canonicalGoalTags = extractGoalTagsForMatching(input.targetOutcomeText)

  const overdue: LessonCandidate[] = []
  const due: LessonCandidate[] = []
  const newContent: LessonCandidate[] = []

  for (const c of filtered) {
    const status = getReviewDueStatus(c.dueAt, input.nowIso, c.isReview)
    if (status === 'overdue_review') overdue.push(c)
    else if (status === 'due_review') due.push(c)
    else newContent.push(c)
  }

  const scoreInput = (c: LessonCandidate): ScoredCandidate =>
    scoreCandidate(c, input, canonicalGoalTags)

  const allItems: DailyLessonItem[] = []
  let totalMinutes = 0
  let dueReviewCount = 0
  let selectedSkills = new Set<string>()
  let selectedGoals = new Set<string>()

  const phases: readonly { list: LessonCandidate[]; isReview: boolean }[] = [
    { list: overdue, isReview: true },
    { list: due, isReview: true },
    { list: newContent, isReview: false },
  ]

  for (const phase of phases) {
    const remaining = budget - totalMinutes
    if (remaining <= 0) break
    if (phase.isReview && totalMinutes >= reviewBudgetMinutes) continue

    const scored = phase.list.map(scoreInput).sort((a, b) => b.score - a.score)
    const result = selectWithinBudget(
      scored,
      remaining,
      input.preferredSessionLength,
      selectedSkills,
      selectedGoals
    )

    for (const it of result.items) {
      allItems.push(it)
      totalMinutes += it.estimatedMinutes
      if (phase.isReview) dueReviewCount++
    }
    selectedSkills = result.selectedSkills
    selectedGoals = result.selectedGoals
  }

  const newContentCount = allItems.length - dueReviewCount
  const recommendedSessionCount = getRecommendedSessionCount(
    goal || totalMinutes,
    input.preferredSessionLength
  )

  return {
    generatedAt,
    totalEstimatedMinutes: totalMinutes,
    recommendedSessionCount,
    items: allItems,
    summary: {
      dueReviewCount,
      newContentCount,
      totalCandidateCount: filtered.length,
    },
  }
}

// ─── Explain why a candidate was (or would be) selected ─────────────────────

export function explainCandidateSelection(
  candidate: LessonCandidate,
  input: DailyLessonGeneratorInput
): DailyLessonReasonCode[] {
  const canonicalGoalTags = extractGoalTagsForMatching(input.targetOutcomeText)
  const { reasonCodes } = scoreCandidate(candidate, input, canonicalGoalTags)
  return reasonCodes
}
