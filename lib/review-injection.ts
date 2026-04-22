/**
 * Review block injection into lesson sessions.
 * Fetches due review items, converts them to LessonBlocks,
 * and injects them into the lesson block array.
 *
 * BOUNDARY: This module bridges review-domain and lesson-domain.
 * It must NOT import from lesson-runtime-engine or UI components.
 * Future social/gamification features must NOT be added here.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LessonBlock, LessonSession } from './lesson-engine'
import { getDueReviewItems, type ReviewItemRow } from './review-items-repository'
import { lookupSceneByAnswer } from './lesson-blueprint-adapter'
import { buildScenarioLabel } from './lesson-blueprint-service'

const MAX_REVIEW_BLOCKS = 3
const INJECT_AFTER_INDEX = 1 // inject after the first 2 normal blocks (index 0 and 1)
const DEFAULT_REVIEW_LIMIT = 5

export type ReviewItemWithContent = {
  reviewItem: ReviewItemRow
  promptText: string
  expectedAnswer: string | null
}

/**
 * Fetches due review items and joins with lesson_run_items to get content.
 * Returns items that have valid content (prompt text).
 */
export async function fetchReviewItemsWithContent(
  supabase: SupabaseClient,
  userId: string,
  limit = DEFAULT_REVIEW_LIMIT
): Promise<ReviewItemWithContent[]> {
  const { data: reviewItems, error } = await getDueReviewItems(supabase, userId, limit)

  if (error || !reviewItems || reviewItems.length === 0) {
    return []
  }

  const lessonItemIds = reviewItems.map((r) => r.lesson_item_id)

  const { data: runItems, error: runItemsError } = await supabase
    .from('lesson_run_items')
    .select('id, prompt_text, expected_answer_text')
    .in('id', lessonItemIds)

  if (runItemsError || !runItems) {
    return []
  }

  const contentMap = new Map<string, { prompt_text: string; expected_answer_text: string | null }>(
    runItems.map((item: { id: string; prompt_text: string; expected_answer_text: string | null }) => [
      item.id,
      item,
    ])
  )

  return reviewItems
    .map((reviewItem) => {
      const content = contentMap.get(reviewItem.lesson_item_id)
      if (!content || !content.prompt_text) return null

      return {
        reviewItem,
        promptText: content.prompt_text,
        expectedAnswer: content.expected_answer_text,
      }
    })
    .filter((r): r is ReviewItemWithContent => r !== null)
}

// ── Phase 7.4: Best display text selection for review blocks ──

/**
 * Extract a meaningful phrase from a fallback-like string.
 * e.g. "This is about wash the dishes." → "wash the dishes"
 * e.g. "Review a simple English expression for go to bed." → "go to bed"
 * Returns null if extraction fails or result is too short.
 */
function extractPhraseFromFallback(text: string): string | null {
  try {
    const trimmed = text.trim().replace(/\.$/, '')
    // "This is about X" / "Talk to the AI about X" / "Review ... for X"
    const aboutMatch = trimmed.match(/\babout\s+(.+)$/i)
    if (aboutMatch && aboutMatch[1].length >= 3) return aboutMatch[1].trim()
    const forMatch = trimmed.match(/\bfor\s+(.+)$/i)
    if (forMatch && forMatch[1].length >= 3) return forMatch[1].trim()
  } catch { /* ignore */ }
  return null
}

function isMeaningful(text: string | null | undefined): boolean {
  if (!text || text.trim().length < 3) return false
  return !FALLBACK_PATTERNS.some((p) => p.test(text.trim()))
}

/**
 * Select the best display text for a review block.
 *
 * Priority:
 * 1. expectedAnswer if meaningful
 * 2. promptText if meaningful
 * 3. phrase extracted from fallback text (e.g. "about X" → "X")
 * 4. original expectedAnswer (never make it worse)
 */
function selectBestReviewDisplayText(source: ReviewItemWithContent): {
  displayAnswer: string | null
  displayPrompt: string
  sourceUsed: string
} {
  const origAnswer = source.expectedAnswer ?? null
  const origPrompt = source.promptText

  try {
    // 1. expectedAnswer is already good
    if (isMeaningful(origAnswer)) {
      return { displayAnswer: origAnswer, displayPrompt: origPrompt, sourceUsed: 'expectedAnswer' }
    }

    // 2. promptText is meaningful (answer is fallback or empty)
    if (isMeaningful(origPrompt)) {
      return { displayAnswer: origPrompt, displayPrompt: origPrompt, sourceUsed: 'promptText' }
    }

    // 3. Extract phrase from fallback text
    const fromAnswer = extractPhraseFromFallback(origAnswer ?? '')
    if (fromAnswer && fromAnswer.length >= 3) {
      return { displayAnswer: fromAnswer, displayPrompt: fromAnswer, sourceUsed: 'extractedPhrase' }
    }
    const fromPrompt = extractPhraseFromFallback(origPrompt)
    if (fromPrompt && fromPrompt.length >= 3) {
      return { displayAnswer: fromPrompt, displayPrompt: fromPrompt, sourceUsed: 'extractedPhrase' }
    }

    // 4. Keep original
    return { displayAnswer: origAnswer, displayPrompt: origPrompt, sourceUsed: 'originalFallback' }
  } catch {
    return { displayAnswer: origAnswer, displayPrompt: origPrompt, sourceUsed: 'originalFallback' }
  }
}

/**
 * Converts a review item with content into a LessonBlock.
 * Block id encodes the review_item id for downstream scoring.
 *
 * Phase 7.4: selects best available display text for legacy fallback items.
 */
function reviewItemToBlock(source: ReviewItemWithContent): LessonBlock {
  const { displayAnswer, displayPrompt, sourceUsed } = selectBestReviewDisplayText(source)

  if (sourceUsed !== 'expectedAnswer') {
    try {
      // eslint-disable-next-line no-console
      console.log('[Phase7.4][legacy-display-upgrade]', {
        originalExpectedAnswer: (source.expectedAnswer ?? '').slice(0, 50),
        selectedDisplayText: (displayAnswer ?? '').slice(0, 50),
        sourceUsed,
      })
    } catch { /* ignore */ }
  }

  // Reverse-lookup source scene from catalog so heading shows scene label and pass 2 gets JP audio
  const sourceScene = lookupSceneByAnswer(displayAnswer ?? '')
  const sceneId = sourceScene?.sceneKey ?? null
  const nativeHint = sourceScene?.nativeHint ?? null

  return {
    id: `review-${source.reviewItem.id}`,
    type: 'review',
    title: sceneId ? buildScenarioLabel(sceneId) : '復習',
    description: sceneId ? buildScenarioLabel(sceneId) : displayPrompt,
    estimatedMinutes: 1,
    sceneId,
    sceneCategory: sceneId ? 'daily-flow' : null,
    items: [
      {
        id: `review-${source.reviewItem.id}`,
        prompt: displayPrompt,
        answer: displayAnswer,
        nativeHint,
      },
    ],
  }
}

// ── Phase 6.2: Memory summary (log only, no behavior change) ──

function computeMemoryStrength(item: ReviewItemRow): number | null {
  try {
    const correct = item.correct_count ?? 0
    const wrong = item.wrong_count ?? 0
    const total = correct + wrong
    if (total === 0) return null

    // Base: correct ratio scaled to 100
    const base = Math.round((correct / total) * 100)

    // Penalty: each wrong answer reduces strength by 15, floor at 0
    const penalty = wrong * 15
    return Math.max(0, Math.min(100, base - penalty))
  } catch {
    return null
  }
}

function logMemorySummary(sources: ReviewItemWithContent[]): void {
  try {
    if (sources.length === 0) return

    const entries = sources.map((s) => ({
      phrase: (s.expectedAnswer ?? s.promptText).slice(0, 50),
      wrongCount: s.reviewItem.wrong_count ?? 0,
      correctCount: s.reviewItem.correct_count ?? 0,
      nextReviewAt: s.reviewItem.next_review_at ?? 'unscheduled',
      memoryStrength: computeMemoryStrength(s.reviewItem),
    }))

    // eslint-disable-next-line no-console
    console.log('[Phase6.2][memory-summary]', {
      reviewCount: entries.length,
      avgStrength: entries.reduce((s, e) => s + (e.memoryStrength ?? 0), 0) / entries.length | 0,
      items: entries,
    })
  } catch {
    // Non-blocking — never break injection
  }
}

// ── Phase 6.3: Light review priority bias (local ordering only) ──

function getReviewPriorityBucket(item: ReviewItemRow): number {
  const strength = computeMemoryStrength(item)
  if (strength === null) return 2
  if (strength <= 30) return 0 // highest priority — weakest memory
  if (strength <= 50) return 1 // medium priority
  return 2                     // no extra priority
}

function applyReviewPriorityBias(sources: ReviewItemWithContent[]): ReviewItemWithContent[] {
  try {
    if (sources.length <= 1) return sources

    // Stable sort: lower bucket = earlier, original index breaks ties
    // Phase 7.6: fallback-heavy content gets +1 bucket penalty
    const indexed = sources.map((s, i) => {
      let bucket = getReviewPriorityBucket(s.reviewItem)
      const quality = classifyContentQuality(s)
      if (quality.contentQualityBucket === 'fallback-heavy') {
        bucket = Math.min(bucket + 1, 3) // demote but keep in pool
      }
      return { source: s, bucket, originalIndex: i }
    })

    indexed.sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket - b.bucket
      return a.originalIndex - b.originalIndex
    })

    // eslint-disable-next-line no-console
    console.log('[Phase6.3][review-priority-bias]',
      indexed.map((e) => ({
        phrase: (e.source.expectedAnswer ?? e.source.promptText).slice(0, 40),
        memoryStrength: computeMemoryStrength(e.source.reviewItem),
        bucket: e.bucket,
      }))
    )

    return indexed.map((e) => e.source)
  } catch {
    // Fallback: preserve original order
    return sources
  }
}

// ── Phase 6.3-observe: Pre-Phase-6.4 observation logging ──

type BucketLabel = 'null' | 'weak' | 'medium' | 'strong'

function toBucketLabel(item: ReviewItemRow): BucketLabel {
  const s = computeMemoryStrength(item)
  if (s === null) return 'null'
  if (s <= 30) return 'weak'
  if (s <= 50) return 'medium'
  return 'strong'
}

function computeOverdueHours(nextReviewAt: string | null): number | null {
  if (!nextReviewAt) return null
  try {
    const due = new Date(nextReviewAt).getTime()
    if (!Number.isFinite(due)) return null
    const diff = Date.now() - due
    if (diff <= 0) return 0
    return Math.round(diff / 3_600_000)
  } catch {
    return null
  }
}

function logReviewObservation(prioritized: ReviewItemWithContent[]): void {
  try {
    if (prioritized.length === 0) return

    const selectedSet = new Set(
      prioritized.slice(0, MAX_REVIEW_BLOCKS).map((s) => s.reviewItem.id),
    )

    const items = prioritized.map((s) => {
      const ri = s.reviewItem
      const strength = computeMemoryStrength(ri)
      const bucket = toBucketLabel(ri)
      const overdueHours = computeOverdueHours(ri.next_review_at)
      return {
        phrase: (s.expectedAnswer ?? s.promptText).slice(0, 40),
        memoryStrength: strength,
        bucket,
        correctCount: ri.correct_count ?? 0,
        wrongCount: ri.wrong_count ?? 0,
        totalAttempts: (ri.correct_count ?? 0) + (ri.wrong_count ?? 0),
        nextReviewAt: ri.next_review_at ?? null,
        overdueHours,
        selectedForInjection: selectedSet.has(ri.id),
      }
    })

    // eslint-disable-next-line no-console
    console.log('[Phase6.3-observe][review-memory]', items)

    // Aggregate summary
    const bucketCounts: Record<BucketLabel, number> = { null: 0, weak: 0, medium: 0, strong: 0 }
    const selectedBucketCounts: Record<BucketLabel, number> = { null: 0, weak: 0, medium: 0, strong: 0 }
    let nullCount = 0
    let strengthSum = 0
    let strengthCount = 0
    let overdueSum = 0
    let overdueCount = 0

    for (const it of items) {
      bucketCounts[it.bucket]++
      if (it.selectedForInjection) selectedBucketCounts[it.bucket]++
      if (it.memoryStrength === null) {
        nullCount++
      } else {
        strengthSum += it.memoryStrength
        strengthCount++
      }
      if (it.overdueHours !== null && it.overdueHours > 0) {
        overdueSum += it.overdueHours
        overdueCount++
      }
    }

    // eslint-disable-next-line no-console
    console.log('[Phase6.3-observe][summary]', {
      dueItemCount: items.length,
      selectedCount: items.filter((i) => i.selectedForInjection).length,
      bucketCounts,
      selectedBucketCounts,
      nullStrengthCount: nullCount,
      avgMemoryStrength: strengthCount > 0 ? Math.round(strengthSum / strengthCount) : null,
      avgOverdueHours: overdueCount > 0 ? Math.round(overdueSum / overdueCount) : null,
    })
  } catch {
    // Non-blocking — never break injection
  }
}

// ── Phase 7.1: Review content quality audit (read-only) ──

const FALLBACK_PATTERNS = [
  /^this is about\b/i,
  /^let's talk about\b/i,
  /^practice\b/i,
  /^listen to the english\b/i,
  /^type the english\b/i,
  /^review a simple\b/i,
  /^talk to the ai\b/i,
]

type ContentQualityBucket = 'strong' | 'usable' | 'weak' | 'fallback-heavy'

function classifyContentQuality(source: ReviewItemWithContent): {
  hasPhrase: boolean
  hasExpectedAnswer: boolean
  expectedAnswerLooksFallback: boolean
  contentQualityBucket: ContentQualityBucket
} {
  const phrase = source.promptText?.trim() ?? ''
  const answer = source.expectedAnswer?.trim() ?? ''

  const hasPhrase = phrase.length > 0
  const hasExpectedAnswer = answer.length > 0

  const expectedAnswerLooksFallback = hasExpectedAnswer &&
    FALLBACK_PATTERNS.some((p) => p.test(answer))

  const phraseLooksFallback = hasPhrase &&
    FALLBACK_PATTERNS.some((p) => p.test(phrase))

  let bucket: ContentQualityBucket = 'usable'

  if (!hasPhrase && !hasExpectedAnswer) {
    bucket = 'weak'
  } else if (expectedAnswerLooksFallback && phraseLooksFallback) {
    bucket = 'fallback-heavy'
  } else if (expectedAnswerLooksFallback || !hasExpectedAnswer) {
    bucket = 'weak'
  } else if (hasPhrase && hasExpectedAnswer && !expectedAnswerLooksFallback) {
    bucket = answer.length >= 10 ? 'strong' : 'usable'
  }

  return { hasPhrase, hasExpectedAnswer, expectedAnswerLooksFallback, contentQualityBucket: bucket }
}

function auditReviewContentQuality(sources: ReviewItemWithContent[]): void {
  try {
    if (sources.length === 0) return

    const items = sources.map((s) => {
      const quality = classifyContentQuality(s)
      return {
        phrase: s.promptText.slice(0, 50),
        ...quality,
      }
    })

    // eslint-disable-next-line no-console
    console.log('[Phase7.1][review-content-audit]', items)

    // Aggregate summary
    let strongCount = 0
    let usableCount = 0
    let weakCount = 0
    let fallbackHeavyCount = 0
    let missingExpectedAnswer = 0
    let fallbackLikeCount = 0

    for (const it of items) {
      if (it.contentQualityBucket === 'strong') strongCount++
      else if (it.contentQualityBucket === 'usable') usableCount++
      else if (it.contentQualityBucket === 'weak') weakCount++
      else if (it.contentQualityBucket === 'fallback-heavy') fallbackHeavyCount++
      if (!it.hasExpectedAnswer) missingExpectedAnswer++
      if (it.expectedAnswerLooksFallback) fallbackLikeCount++
    }

    // eslint-disable-next-line no-console
    console.log('[Phase7.1][summary]', {
      itemCount: items.length,
      strongCount,
      usableCount,
      weakCount,
      fallbackHeavyCount,
      missingExpectedAnswerCount: missingExpectedAnswer,
      fallbackLikeCount,
    })
  } catch {
    // Non-blocking
  }
}

// ── Phase 7.5: End-to-end consistency audit ──

type ConsistencyBucket = 'highPriorityLowQuality' | 'highPriorityUsable' | 'lowPriorityStrong' | 'unresolvedLegacy' | 'neutral'

function deriveConsistencyBucket(
  contentBucket: ContentQualityBucket,
  memStrength: number | null,
  sourceUsed: string,
): ConsistencyBucket {
  const isHighPriority = memStrength !== null && memStrength <= 30
  const isLowPriority = memStrength !== null && memStrength > 50

  if (isHighPriority && (contentBucket === 'weak' || contentBucket === 'fallback-heavy')) return 'highPriorityLowQuality'
  if (isHighPriority && (contentBucket === 'usable' || contentBucket === 'strong')) return 'highPriorityUsable'
  if (isLowPriority && contentBucket === 'strong') return 'lowPriorityStrong'
  if (sourceUsed === 'originalFallback') return 'unresolvedLegacy'
  return 'neutral'
}

function auditReviewConsistency(prioritized: ReviewItemWithContent[]): void {
  try {
    if (prioritized.length === 0) return

    const selectedSet = new Set(prioritized.slice(0, MAX_REVIEW_BLOCKS).map((s) => s.reviewItem.id))

    const items = prioritized.map((s) => {
      const ri = s.reviewItem
      const content = classifyContentQuality(s)
      const display = selectBestReviewDisplayText(s)
      const strength = computeMemoryStrength(ri)
      const memBucket = toBucketLabel(ri)
      const overdueHrs = computeOverdueHours(ri.next_review_at)
      const consistency = deriveConsistencyBucket(content.contentQualityBucket, strength, display.sourceUsed)

      return {
        phrase: s.promptText.slice(0, 40),
        originalExpectedAnswer: (s.expectedAnswer ?? '').slice(0, 40),
        selectedDisplayText: (display.displayAnswer ?? '').slice(0, 40),
        sourceUsed: display.sourceUsed,
        contentQualityBucket: content.contentQualityBucket,
        correctCount: ri.correct_count ?? 0,
        wrongCount: ri.wrong_count ?? 0,
        totalAttempts: (ri.correct_count ?? 0) + (ri.wrong_count ?? 0),
        overdueHours: overdueHrs,
        memoryStrengthBucket: memBucket,
        consistencyBucket: consistency,
        selected: selectedSet.has(ri.id),
      }
    })

    // eslint-disable-next-line no-console
    console.log('[Phase7.5][review-consistency]', items.filter((i) => i.selected))

    // Aggregate
    const selected = items.filter((i) => i.selected)
    const counts = {
      selectedCount: selected.length,
      strongContentCount: selected.filter((i) => i.contentQualityBucket === 'strong').length,
      usableContentCount: selected.filter((i) => i.contentQualityBucket === 'usable').length,
      weakContentCount: selected.filter((i) => i.contentQualityBucket === 'weak').length,
      fallbackHeavyCount: selected.filter((i) => i.contentQualityBucket === 'fallback-heavy').length,
      extractedPhraseCount: selected.filter((i) => i.sourceUsed === 'extractedPhrase').length,
      promptTextRescueCount: selected.filter((i) => i.sourceUsed === 'promptText').length,
      unresolvedLegacyCount: selected.filter((i) => i.consistencyBucket === 'unresolvedLegacy').length,
      highPriorityLowQualityCount: selected.filter((i) => i.consistencyBucket === 'highPriorityLowQuality').length,
      highPriorityUsableCount: selected.filter((i) => i.consistencyBucket === 'highPriorityUsable').length,
      lowPriorityStrongCount: selected.filter((i) => i.consistencyBucket === 'lowPriorityStrong').length,
    }

    // eslint-disable-next-line no-console
    console.log('[Phase7.5][summary]', counts)
  } catch {
    // Non-blocking
  }
}

/**
 * Injects review blocks into a lesson session's block array.
 *
 * Rules:
 * - Max 3 review blocks per lesson
 * - Inserted after the first 2 normal blocks, interleaved with remaining
 * - No injection if sources is empty
 * - Malformed items are silently skipped
 */
export function injectReviewBlocks(
  session: LessonSession,
  sources: ReviewItemWithContent[]
): LessonSession {
  // Phase 6.2: log memory summary (read-only)
  logMemorySummary(sources)

  if (sources.length === 0) return session

  // Phase 6.3: light priority bias — prefer weaker-memory items
  const prioritized = applyReviewPriorityBias(sources)

  // Phase 6.3-observe: observation logging before injection
  logReviewObservation(prioritized)

  // Phase 7.1: content quality audit (read-only)
  auditReviewContentQuality(prioritized)

  // Phase 7.5: end-to-end consistency audit (read-only)
  auditReviewConsistency(prioritized)

  const selected = prioritized.slice(0, MAX_REVIEW_BLOCKS)
  const reviewBlocks = selected.map(reviewItemToBlock)

  // Playtest: review injection observation
  try {
    const qualities = selected.map((s) => classifyContentQuality(s).contentQualityBucket)
    // eslint-disable-next-line no-console
    console.log('[Playtest][review]', {
      injectedReviewCount: selected.length,
      strongCount: qualities.filter((q) => q === 'strong').length,
      usableCount: qualities.filter((q) => q === 'usable').length,
      weakCount: qualities.filter((q) => q === 'weak').length,
      fallbackHeavyCount: qualities.filter((q) => q === 'fallback-heavy').length,
    })
  } catch { /* non-blocking */ }

  if (reviewBlocks.length === 0) return session

  const blocks = [...session.blocks]
  const result: LessonBlock[] = []
  let reviewIdx = 0

  for (let i = 0; i < blocks.length; i++) {
    result.push(blocks[i])

    if (i >= INJECT_AFTER_INDEX && reviewIdx < reviewBlocks.length) {
      result.push(reviewBlocks[reviewIdx++])
    }
  }

  // Append remaining review blocks if fewer normal blocks than expected
  while (reviewIdx < reviewBlocks.length) {
    result.push(reviewBlocks[reviewIdx++])
  }

  return { ...session, blocks: result }
}

/**
 * Extracts the review_item id from a review block's id.
 * Returns null if the block is not a review block.
 */
export function extractReviewItemId(blockId: string): string | null {
  if (!blockId.startsWith('review-')) return null
  const id = blockId.slice('review-'.length)
  return id || null
}

/**
 * Returns true if a runtime block id belongs to a review block.
 */
export function isReviewBlock(blockId: string): boolean {
  return blockId.startsWith('review-')
}
