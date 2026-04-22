'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getEmmaHint, type EmmaHintStage } from '../../../lib/lesson-copy'
import { trackEvent } from '../../../lib/analytics'
import { evaluateRepeat } from '../../../lib/repeat-evaluator'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonBlock, LessonBlockItem } from '../../../lib/lesson-engine'
import type { SemanticChunk } from '../../../lib/lesson-blueprint-adapter'
import type { LessonProgressState } from '../../../lib/lesson-progress'
import type { LessonStageId } from '../../../lib/lesson-runtime'
import type { CurrentLevel } from '../../../lib/constants'
import { buildFallbackEvaluation, incrementAiCallCount } from '../../../lib/ai-conversation-fallback'
import { getRegionContext } from '../../../lib/daily-timeline'
import { resolveSceneImages, getStepImage, type StepType } from '../../../lib/scene-image-resolver'
import { getLessonContentRepository } from '../../../lib/lesson-content-repository'
import LpIcon from '@/components/lp-icon'
import { buildScenarioLabel } from '../../../lib/lesson-blueprint-service'

// ── Auth helper for API calls ──
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { getSupabaseBrowserClient } = await import('../../../lib/supabase/browser-client')
    const supabase = getSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
  } catch { /* fallback to no auth header */ }
  return {}
}

// ── Display/TTS text model ──
// Display text and TTS text may differ for correct pronunciation.
// Use resolveTtsText() whenever generating audio.

type TextWithTts = {
  displayText: string
  ttsText?: string | null
}

/**
 * Resolve the text to send to TTS.
 * Prefers ttsText if provided, otherwise falls back to displayText.
 */
function resolveTtsText(input: string | TextWithTts): string {
  if (typeof input === 'string') return input
  return input.ttsText?.trim() || input.displayText
}

/**
 * Normalize Japanese text for TTS by replacing common kanji with correct readings.
 * Applied as a fallback when no explicit ttsText is provided.
 */
function normalizeJapaneseTts(text: string): string {
  const readings: [string, string][] = [
    ['朝食', 'ちょうしょく'],
    ['昼食', 'ちゅうしょく'],
    ['夕食', 'ゆうしょく'],
    ['出勤', 'しゅっきん'],
    ['帰宅', 'きたく'],
    ['通勤', 'つうきん'],
    ['洗濯', 'せんたく'],
    ['掃除', 'そうじ'],
    ['準備', 'じゅんび'],
    ['支度', 'したく'],
  ]
  let result = text
  for (const [kanji, reading] of readings) {
    result = result.replace(kanji, reading)
  }
  return result
}

/**
 * Resolve TTS input for any text, applying Japanese normalization if detected.
 */
function prepareTtsInput(input: string | TextWithTts): string {
  const raw = resolveTtsText(input)
  // Auto-detect Japanese and normalize
  if (/[\u3000-\u9FFF]/.test(raw)) return normalizeJapaneseTts(raw)
  return raw
}

// ── Meaning-emerges learning flow components ──

function RationaleHelpButton({ uiText }: { uiText: LessonCopy['activeCard'] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold leading-none text-white">?</span>
        {uiText.rationaleToggle}
      </button>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
            className="relative z-10 mx-4 mb-4 w-full max-w-[400px] overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-b from-[#F0F7FF] to-white shadow-[0_20px_60px_rgba(37,99,235,0.15)] sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title area */}
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-sm text-white">&#x2713;</span>
                <p className="text-sm font-bold text-[#1a1a2e]">{uiText.rationaleTitle}</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="rounded-xl border border-[#E8E4DF] bg-white px-4 py-4 shadow-sm">
                <p className="text-sm leading-6 text-[#5a5a7a]">{uiText.rationaleBody2}</p>
                <p className="mt-3 text-sm leading-6 text-[#5a5a7a]">{uiText.rationaleBody3}</p>
              </div>

              {/* Progression */}
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="whitespace-pre-line text-xs leading-5 text-blue-700">{uiText.rationaleProgression}</p>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 w-full rounded-xl bg-blue-500 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600"
              >
                {uiText.rationaleClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Button class constants (design system) ──
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600'
const ICON_LISTEN = <img src="/images/lp/icons/listen.webp" alt="" className="h-5 w-5" aria-hidden="true" />
const ICON_SPEAK = <img src="/images/lp/icons/speak.webp" alt="" className="h-5 w-5" aria-hidden="true" />
const BTN_STOP = 'rounded-xl bg-gray-400 px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-500'
const BTN_DISABLED = 'rounded-xl bg-gray-300 px-6 py-3 text-sm font-bold text-white cursor-not-allowed'

/** Debug logger — only outputs in development, silent in production */
const debugLog = process.env.NODE_ENV === 'production'
  ? (() => {}) as (...args: unknown[]) => void
  : (tag: string, data?: unknown) => console.log(tag, data)

// ── Challenge audio cache + prefetch (shared across SoundGame / QuickResponseGame) ──
const challengeAudioCache = new Map<string, string>()
const challengeAudioInflight = new Map<string, Promise<string | null>>()

function challengeAudioKey(text: string, speed: number): string {
  return `${text.trim().toLowerCase()}|${speed}`
}

async function ensureChallengeAudioUrl(text: string, speed: number): Promise<string | null> {
  const key = challengeAudioKey(text, speed)
  const cached = challengeAudioCache.get(key)
  if (cached) return cached
  const inflight = challengeAudioInflight.get(key)
  if (inflight) return inflight
  const promise = fetch('/api/audio/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speed }),
  }).then(async (res) => {
    if (res.ok) {
      const data = await res.json()
      const url = data.audio_url as string | undefined
      if (url) { challengeAudioCache.set(key, url); return url }
    }
    return null
  }).catch(() => null).finally(() => {
    challengeAudioInflight.delete(key)
  })
  challengeAudioInflight.set(key, promise)
  return promise
}

/** Flavor context for AI conversation prompts. Matches AiConversationFlavorContext in ai-conversation-prompt.ts. */
type FlavorContext = {
  sceneId?: string
  region?: string
  ageGroup?: string
  topics?: string[]
  references?: string[]
  cultureNotes?: string[]
  setting?: string
  lifestyle?: string[]
}

/** Mirrors AiConversationEvaluation from lib/ai-conversation-prompt.ts (client-safe) */
type ConvEvalDetail = {
  isRelevant: boolean
  isNatural: boolean
  isComplete: boolean
  score: number
  feedback: string
  correction: string | null
  naturalAlternative: string | null
  followUp: string | null
}


/** Reusable scene image block — consistent styling across stages.
 *  Scene assets are 1:1 — same file on desktop and mobile, no _p variant. */
function LessonSceneImage({
  src,
  alt,
  caption,
}: {
  src: string
  alt: string
  caption?: string
}) {
  return (
    <div className="mx-auto w-full max-w-[270px] md:max-w-[324px]">
      <div className="w-full aspect-square flex items-center justify-center overflow-hidden rounded-[18px] border border-[#DBEAFE] bg-[#f8fafc] shadow-[0_4px_16px_rgba(37,99,235,0.06)]">
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
        />
      </div>
      {caption && (
        <p className="mt-1 mb-0.5 text-center text-xs text-[#6b7280]">{caption}</p>
      )}
    </div>
  )
}

/** Paths that should NOT be rendered as lesson images (placeholders only). */
const INVALID_IMAGE_PATHS = [
  '/images/lesson-scene-placeholder',
]

function isValidLessonImage(url: string | null | undefined): url is string {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false
  return !INVALID_IMAGE_PATHS.some((prefix) => trimmed.startsWith(prefix))
}

function getItemAudioUrl(item: LessonBlockItem): string {
  const maybe = item as LessonBlockItem & {
    audio_url?: string | null
    audioUrl?: string | null
  }

  return maybe.audio_url ?? maybe.audioUrl ?? ''
}

function getListenSpeechText(item: LessonBlockItem): string {
  const answer = item.answer?.trim()
  if (answer) return answer

  const prompt = item.prompt?.trim()
  if (prompt) return prompt

  const sceneLabel =
    (item as LessonBlockItem & { sceneLabel?: string | null }).sceneLabel?.trim()
  if (sceneLabel) return sceneLabel

  return ''
}

const SUBJECT_PRONOUNS = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it'])
const TIME_WORDS = new Set([
  'today', 'yesterday', 'tomorrow', 'tonight', 'now',
  'later', 'soon', 'already', 'again', 'everyday',
])
const SPLIT_PREPS = new Set([
  'with', 'to', 'at', 'in', 'on', 'from', 'for', 'about',
  'by', 'into', 'after', 'before', 'through',
])

/** Lightweight tense/form normalization for chunk matching. */
function normalizeForChunkMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    // Past tense → base
    .replace(/\b(talked|talking)\b/g, 'talk')
    .replace(/\b(went|going)\b/g, 'go')
    .replace(/\b(took|taking)\b/g, 'take')
    .replace(/\b(made|making)\b/g, 'make')
    .replace(/\b(got|getting)\b/g, 'get')
    .replace(/\b(had|having)\b/g, 'have')
    .replace(/\b(came|coming)\b/g, 'come')
    .replace(/\b(ran|running)\b/g, 'run')
    .replace(/\b(met|meeting)\b/g, 'meet')
    .replace(/\b(woke|waking)\b/g, 'wake')
    .replace(/\b(ate|eating)\b/g, 'eat')
    .replace(/\b(drank|drinking)\b/g, 'drink')
    .replace(/\b(slept|sleeping)\b/g, 'sleep')
    .replace(/\b(bought|buying)\b/g, 'buy')
    .replace(/\b(said|saying)\b/g, 'say')
    // Common -ed regular verbs → strip -ed
    .replace(/\b(\w{3,})ed\b/g, '$1')
    // Strip articles for looser matching
    .replace(/\b(a|an|the|my|your|his|her)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract semantic (verb-centered) chunks from a sentence.
 *
 * Strategy:
 *  1. Strip leading subject pronoun
 *  2. Strip trailing time word
 *  3. Short core (≤4 words) → 1 chunk
 *  4. Medium core (5–6 words) → split at last prep → 2 chunks
 *  5. Long core (7+ words) → split at first AND last prep → up to 3 chunks
 *  Max 3 semantic chunks + optional time chunk.
 *
 * "I talked with my friend today"
 *   → ["talked with my friend", "today"]
 *
 * "I went to the store with my friend yesterday"
 *   → ["went to the store", "with my friend", "yesterday"]
 *
 * "I am looking for a new apartment in Tokyo"
 *   → ["looking for", "a new apartment", "in Tokyo"]
 */
function extractSemanticChunks(
  sentence: string | null | undefined,
  catalogChunks?: SemanticChunk[] | null
): SemanticChunk[] | null {
  if (!sentence) return null
  const words = sentence.replace(/[.,!?;:]+$/g, '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return null

  let start = 0
  let end = words.length

  // Strip leading subject pronoun
  if (SUBJECT_PRONOUNS.has(words[0].toLowerCase())) {
    start = 1
  }

  // Strip trailing time word
  let timeChunk: string | null = null
  if (end - start > 2 && TIME_WORDS.has(words[end - 1].toLowerCase())) {
    timeChunk = words[end - 1]
    end -= 1
  }

  const core = words.slice(start, end)
  const chunks: SemanticChunk[] = []
  const mkChunk = (text: string) => ({ chunk: text, meaning: '', type: 'phrase' as const })

  if (core.length === 0) {
    // nothing
  } else if (core.length <= 4) {
    // Short → single chunk
    chunks.push(mkChunk(core.join(' ')))
  } else {
    // Find all preposition positions (index ≥ 1 to avoid splitting at start)
    const prepPositions: number[] = []
    for (let i = 1; i < core.length; i++) {
      if (SPLIT_PREPS.has(core[i].toLowerCase())) {
        prepPositions.push(i)
      }
    }

    if (prepPositions.length >= 2 && core.length >= 7) {
      // 3-way split: verb phrase | object | location
      const first = prepPositions[0]
      const last = prepPositions[prepPositions.length - 1]
      if (last > first + 1) {
        chunks.push(mkChunk(core.slice(0, first).join(' ') + ' ' + core[first]))
        chunks.push(mkChunk(core.slice(first + 1, last).join(' ')))
        chunks.push(mkChunk(core.slice(last).join(' ')))
      } else {
        // Preps too close — fall back to 2-way at last prep
        chunks.push(mkChunk(core.slice(0, last).join(' ')))
        chunks.push(mkChunk(core.slice(last).join(' ')))
      }
    } else if (prepPositions.length >= 1) {
      // 2-way split at last preposition
      const splitAt = prepPositions[prepPositions.length - 1]
      if (splitAt >= 2) {
        chunks.push(mkChunk(core.slice(0, splitAt).join(' ')))
        chunks.push(mkChunk(core.slice(splitAt).join(' ')))
      } else {
        chunks.push(mkChunk(core.join(' ')))
      }
    } else {
      // No preposition → single chunk
      chunks.push(mkChunk(core.join(' ')))
    }
  }

  // Trailing time as optional extra chunk
  if (timeChunk) {
    chunks.push({ chunk: timeChunk, meaning: '', type: 'word' })
  }

  // Attach meanings from catalog via tense-normalized includes matching
  if (catalogChunks && catalogChunks.length > 0) {
    for (const c of chunks) {
      if (c.meaning) continue
      const norm = normalizeForChunkMatch(c.chunk)
      const match = catalogChunks.find((cat) => {
        const base = normalizeForChunkMatch(cat.chunk)
        return norm.includes(base) || base.includes(norm)
      })
      if (match?.meaning) {
        c.meaning = match.meaning
      }
    }
  }

  return chunks.length > 0 ? chunks : null
}

function getScaffoldSteps(item: LessonBlockItem): string[] {
  const targetText = item.answer?.trim() || item.prompt?.trim() || ''

  // Extract chunk: remove subject pronoun for a cleaner chunk
  const chunk = targetText.replace(/^(I|We|They|He|She|You)\s+/i, '').replace(/[.!?]+$/, '').trim() || targetText

  // All 3 passes use English audio: Pass 1 = full, Pass 2 = chunk, Pass 3 = full
  return [targetText, chunk, targetText]
}

type RepeatScoreBreakdown = {
  clarity: number
  wordMatch: number
  rhythm: number
  completeness: number
}

type PronunciationScoreApiResponse = {
  ok: boolean
  transcript: string
  totalScore: number
  breakdown: RepeatScoreBreakdown | null
  missingWords: string[]
  matchedWords: string[]
  error?: string
}

/**
 * Returns a single short improvement tip based on score breakdown and missing words.
 * Prioritizes the weakest metric. All text from copy system.
 */
function getRepeatTip(
  breakdown: RepeatScoreBreakdown | null,
  missingWords: string[],
  score: number | null,
  uiText: LessonCopy['activeCard']
): string | null {
  if (score === null) return null

  if (score >= 90) return uiText.repeatTipPerfect

  if (breakdown) {
    const metrics = [
      { key: 'completeness', value: breakdown.completeness },
      { key: 'wordMatch', value: breakdown.wordMatch },
      { key: 'clarity', value: breakdown.clarity },
      { key: 'rhythm', value: breakdown.rhythm },
    ] as const
    const weakest = metrics.reduce((a, b) => (a.value <= b.value ? a : b))

    if (weakest.key === 'completeness' && weakest.value < 70) {
      return missingWords.length > 0
        ? uiText.repeatTipCompletenessMissing.replace('{word}', missingWords[0])
        : uiText.repeatTipCompleteness
    }
    if (weakest.key === 'wordMatch' && weakest.value < 70) {
      return missingWords.length > 0
        ? uiText.repeatTipWordMatchMissing.replace('{word}', missingWords[0])
        : uiText.repeatTipWordMatch
    }
    if (weakest.key === 'clarity' && weakest.value < 70) {
      return uiText.repeatTipClarity
    }
    if (weakest.key === 'rhythm' && weakest.value < 70) {
      return uiText.repeatTipRhythm
    }
  }

  if (score < 70) return uiText.repeatTipGenericLow

  return uiText.repeatTipGenericGood
}

function getStageTone(input: {
  currentStageId: LessonStageId | null
}) {
  switch (input.currentStageId) {
    case 'ai_conversation':
      return {
        badgeClassName:
          'border border-[#E7DBFF] bg-[#F6F0FF] text-[#7C3AED]',
        panelClassName:
          'border-[#E7DBFF] bg-[linear-gradient(180deg,#FBF8FF_0%,#FFFFFF_100%)]',
      }

    case 'scaffold_transition':
      return {
        badgeClassName:
          'border border-[#FDE7C7] bg-[#FFF7E8] text-[#B7791F]',
        panelClassName:
          'border-[#FDE7C7] bg-[linear-gradient(180deg,#FFFAF2_0%,#FFFFFF_100%)]',
      }

    case 'ai_question':
      return {
        badgeClassName:
          'border border-[#E8E4DF] bg-[#FAF7F2] text-[#5A5A7A]',
        panelClassName:
          'border-[#E8E4DF] bg-[linear-gradient(180deg,#FCFBF8_0%,#FFFFFF_100%)]',
      }

    case 'repeat':
    case 'listen':
    default:
      return {
        badgeClassName:
          'border border-[#E8E4DF] bg-[#FAF7F2] text-[#5A5A7A]',
        panelClassName:
          'border-[#E8E4DF] bg-[linear-gradient(180deg,#FCFBF8_0%,#FFFFFF_100%)]',
      }
  }
}

function getStageLabel(stage: LessonStageId | null, uiText: LessonCopy['activeCard']): string {
  switch (stage) {
    case 'listen':
      return uiText.stageListenLabel
    case 'repeat':
      return uiText.stageRepeatLabel
    case 'scaffold_transition':
      return uiText.stageScaffoldLabel
    case 'ai_question':
      return uiText.stageAiQuestionLabel
    case 'ai_conversation':
      return uiText.stageAiConversationLabel
    default:
      return uiText.stageDefaultLabel
  }
}

/** Next stage name for CTA label. Returns null for the final stage. */
const NEXT_STAGE: Record<string, LessonStageId> = {
  listen: 'repeat',
  repeat: 'scaffold_transition',
  scaffold_transition: 'ai_question',
  ai_question: 'ai_conversation',
}

/**
 * Builds the CTA button label for the current stage.
 * Final state: "View results". Otherwise: "{nextStage}へ進む".
 */
function getCtaLabel(
  currentStageId: LessonStageId | null,
  isLastBlock: boolean,
  uiText: LessonCopy['activeCard']
): string {
  // Final state: last block + ai_conversation
  if (isLastBlock && currentStageId === 'ai_conversation') {
    return uiText.ctaViewResults
  }

  // If we're at ai_conversation but not last block, next is "listen" of next block
  if (currentStageId === 'ai_conversation') {
    return uiText.ctaAdvanceTemplate.replace('{stage}', uiText.stageListenLabel)
  }

  // Normal: advance to next stage within block
  const nextId = currentStageId ? NEXT_STAGE[currentStageId] : null
  if (nextId) {
    const nextLabel = getStageLabel(nextId, uiText)
    return uiText.ctaAdvanceTemplate.replace('{stage}', nextLabel)
  }

  return uiText.scaffoldNextButton
}

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .trim()
}

function renderHighlightedText(
  expectedText: string,
  missingWords: string[]
) {
  const missingSet = new Set(missingWords.map(normalizeWord))
  const words = expectedText.split(' ')

  return words.map((word, index) => {
    const isMissing = missingSet.has(normalizeWord(word))

    return (
      <span
        key={`${word}-${index}`}
        className={isMissing ? 'text-red-500 font-bold underline' : 'text-[#1a1a2e]'}
      >
        {word}{' '}
      </span>
    )
  })
}

function formatCopy(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value))
  }, template)
}

/** Map runtime stage to Emma hint stage key. */
function toEmmaStage(stageId: LessonStageId | null): EmmaHintStage | null {
  switch (stageId) {
    case 'listen': return 'listen'
    case 'repeat': return 'repeat'
    case 'scaffold_transition': return 'scaffold'
    case 'ai_question': return 'aiQuestion'
    default: return null
  }
}

function getGuideCharacter(input: {
  currentStageId: LessonStageId | null
  isRecordingRepeat: boolean
  isListenPlaying: boolean
  isCorrect: boolean | null
  uiText: LessonCopy['activeCard']
  level?: string | null
  uiLang?: string | null
}) {
  const { currentStageId, isRecordingRepeat, isListenPlaying, isCorrect: _isCorrect, uiText, level, uiLang } = input
  const emmaStage = toEmmaStage(currentStageId)
  const emmaLevel = (level === 'beginner' || level === 'intermediate' || level === 'advanced') ? level : 'beginner'
  const emmaHint = emmaStage ? getEmmaHint(emmaStage, emmaLevel, uiLang) : ''

  if (currentStageId === 'listen') {
    return {
      name: 'Alex',
      imageSrc: isListenPlaying
        ? '/images/characters/alex/expressions/speaking.png'
        : '/images/characters/alex/expressions/neutral.png',
      title: uiText.guideAlexTitle,
      messagePrimary: uiText.listenPrimary,
      messageSecondary: uiText.listenSecondary,
    }
  }

  if (currentStageId === 'repeat') {
    return {
      name: 'Alex',
      imageSrc: isRecordingRepeat
        ? '/images/characters/alex/expressions/encouraging.png'
        : '/images/characters/alex/expressions/happy.png',
      title: uiText.guideAlexTitle,
      messagePrimary: uiText.repeatPrimary,
      messageSecondary: uiText.repeatSecondary,
    }
  }

  if (currentStageId === 'scaffold_transition') {
    return {
      name: 'Emma',
      imageSrc: '/images/characters/emma/expressions/gentle.png',
      title: uiText.guideEmmaTitle,
      messagePrimary: uiText.scaffoldPrimary,
      messageSecondary: emmaHint || uiText.scaffoldSecondary,
    }
  }

  if (currentStageId === 'ai_question') {
    return {
      name: 'Alex',
      imageSrc: '/images/characters/alex/expressions/neutral.png',
      title: uiText.guideAlexTitle,
      messagePrimary: uiText.aiQuestionPrimary,
      messageSecondary: uiText.aiQuestionSecondary,
    }
  }

  if (currentStageId === 'ai_conversation') {
    return {
      name: 'Alex',
      imageSrc: '/images/characters/alex/expressions/speaking.png',
      title: uiText.guideAlexTitle,
      messagePrimary: uiText.aiConversationPrimary,
      messageSecondary: uiText.aiConversationSecondary,
    }
  }

  return {
    name: 'Alex',
    imageSrc: '/images/characters/alex/expressions/neutral.png',
    title: uiText.guideDefaultTitle,
    messagePrimary: uiText.guideDefaultPrimary,
    messageSecondary: uiText.guideDefaultSecondary,
  }
}

function StageProgressBar({
  currentBlockIndex,
  totalBlocks,
  label,
}: {
  currentBlockIndex: number
  totalBlocks: number
  label: string
}) {
  const safeTotal = Math.max(1, totalBlocks)
  const completedCount = Math.max(0, currentBlockIndex)
  const percent = Math.round((completedCount / safeTotal) * 100)

  return (
    <div className="mb-2">
      <div className="flex items-baseline gap-2 mb-1.5">
        <p className="text-xs font-bold tracking-widest text-[#9c9c9c]">{label}</p>
        <p className="text-sm font-bold text-[#1a1a2e]">{currentBlockIndex + 1} / {safeTotal}</p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#ECE7DE]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#22c55e] via-[#3b82f6] to-[#2563eb] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export type LessonActiveCardProps = {
  block: LessonBlock
  item: LessonBlockItem
  progress: LessonProgressState
  currentQuestionIndex: number
  totalQuestions: number
  inputValue: string
  onInputChange: (value: string) => void
  onCheck: () => void
  onStartRepeatFromListen: () => void
  onRetryListenFromRepeat: () => void
  onRetryListenFromScaffold?: () => void
  onGoBackToStage?: (stageId: 'repeat' | 'scaffold_transition' | 'ai_question' | 'ai_conversation') => void
  repeatAutoStartNonce: number
  listenResetNonce: number
  currentStageId: LessonStageId | null
  copy: LessonCopy
  isLessonComplete: boolean
  targetLanguageLabel: string
  scenarioLabel: string
  previousPhrases?: string[]
  level?: CurrentLevel
  /** Stable lesson session identifier for analytics dedup */
  lessonSessionId?: string
  /** Language-aware response mode (typing vs audio_choice) */
  responseStage?: 'typing' | 'audio_choice'
}

// ——— AI Conversation (4-turn conversation with feedback) ———

type ConvTurn = { aiMessage: string; userReply: string; hint: string | null; nextPrompt: string | null; reaction: string; eval?: ConvTurnScoring | null }

// ── Conversation scoring (invisible during conversation, soft at end) ──

type ConvTurnScoring = {
  semanticScore: number
  continuityScore: number
  languageScore: number
  speechScore: number
  weightedScore: number
}

type ConvSessionResult = {
  finalScore: number
  finalEvaluation: 'good' | 'ok' | 'retry'
  summary: string
  improvementHint: string
}

function scoreTurn(evalDetail: ConvEvalDetail | null, transcript: string, prevReplies: string[] = []): ConvTurnScoring {
  if (!evalDetail || !transcript.trim()) {
    return { semanticScore: 0, continuityScore: 0, languageScore: 0, speechScore: 0, weightedScore: 0 }
  }
  const words = transcript.trim().split(/\s+/).length
  const replyLower = transcript.trim().toLowerCase()

  // semanticScore — unchanged, relies on API relevance judgment
  const semanticScore = evalDetail.isRelevant ? Math.min(evalDetail.score, 100) : Math.min(evalDetail.score * 0.5, 40)

  // continuityScore — prioritize conversational fit over length
  let continuityScore = evalDetail.isRelevant
    ? (words >= 2 ? Math.min(75 + Math.min(words, 6) * 3, 100) : 60)
    : (words >= 3 ? 40 : 20)

  // Repetition penalty: if this reply is near-identical to a recent reply, reduce continuity
  // Only penalize same-pattern spam, not short-but-varied answers
  if (prevReplies.length > 0) {
    const lastReply = prevReplies[prevReplies.length - 1]?.trim().toLowerCase() ?? ''
    const isSameAsLast = replyLower === lastReply
    const isMinimalRepeat = words <= 2 && lastReply.split(/\s+/).length <= 2 && replyLower === lastReply
    if (isSameAsLast || isMinimalRepeat) {
      continuityScore = Math.max(continuityScore - 15, 0)
    }
  }

  // languageScore — unchanged
  const languageScore = evalDetail.isNatural ? Math.min(evalDetail.score + 10, 100) : Math.min(evalDetail.score * 0.7, 50)

  // speechScore — binary usability: empty vs usable vs broken
  // Short but clear answers should not be penalized
  const speechScore = words >= 1 ? (evalDetail.isRelevant ? 80 : 50) : 0

  const weightedScore = Math.round(
    semanticScore * 0.45 + continuityScore * 0.30 + languageScore * 0.15 + speechScore * 0.10
  )
  return { semanticScore, continuityScore, languageScore, speechScore, weightedScore }
}

function summarizeSession(turns: ConvTurn[], isJa: boolean, _lessonPhrase?: string): ConvSessionResult {
  const scored = turns.filter((t) => t.eval && t.eval.weightedScore > 0)
  if (scored.length === 0) {
    return {
      finalScore: 0,
      finalEvaluation: 'retry',
      summary: isJa ? '大丈夫です。次回は一言だけでも声に出してみましょう！' : "No worries — next time, try saying even one word!",
      improvementHint: isJa ? '短くても大丈夫なので、まず一つ答えてみましょう' : 'Even a short answer is great. Try saying just one thing.',
    }
  }

  const finalScore = Math.round(scored.reduce((s, t) => s + (t.eval?.weightedScore ?? 0), 0) / scored.length)
  const finalEvaluation: 'good' | 'ok' | 'retry' = finalScore >= 80 ? 'good' : finalScore >= 55 ? 'ok' : 'retry'

  // Find weakest dimension
  const avgSemantic = scored.reduce((s, t) => s + (t.eval?.semanticScore ?? 0), 0) / scored.length
  const avgContinuity = scored.reduce((s, t) => s + (t.eval?.continuityScore ?? 0), 0) / scored.length
  const avgLanguage = scored.reduce((s, t) => s + (t.eval?.languageScore ?? 0), 0) / scored.length
  const avgSpeech = scored.reduce((s, t) => s + (t.eval?.speechScore ?? 0), 0) / scored.length
  const weakest = Math.min(avgSemantic, avgContinuity, avgLanguage, avgSpeech)

  // Summary — clearly differentiated, all gentle
  let summary: string
  if (finalEvaluation === 'good') {
    summary = isJa
      ? '会話がしっかり続けられていました！相手の話にも自然に返せています。'
      : 'You had a real conversation! Your replies felt natural and connected.'
  } else if (finalEvaluation === 'ok') {
    summary = isJa
      ? '相手の話に答えられていました。この調子で続けていきましょう。'
      : 'You responded well to the conversation. Keep practicing like this.'
  } else {
    summary = isJa
      ? '会話に参加できました。短くても声に出すことが大切です。'
      : 'You joined the conversation. Speaking up, even briefly, is what matters.'
  }

  // Improvement hint — one short line only
  let improvementHint: string
  if (weakest === avgSemantic) {
    improvementHint = isJa ? '相手の質問に一言で答えてみましょう' : 'Try answering the question directly.'
  } else if (weakest === avgContinuity) {
    improvementHint = isJa ? 'もう一言だけ足すと、もっと自然です' : 'Try adding one small detail to your answer.'
  } else if (weakest === avgLanguage) {
    improvementHint = isJa ? '一文で答えてみましょう' : 'Try saying it as a full sentence.'
  } else {
    improvementHint = isJa ? 'もう一言だけ足すと、もっと自然です' : 'Try adding one small detail to your answer.'
  }

  return { finalScore, finalEvaluation, summary, improvementHint }
}

/**
 * Pick a context-aware AI reaction based on the user's reply and the AI question.
 */
function pickReaction(userReply: string, _aiMessage?: string): string {
  const words = userReply.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''

  // Echo back part of the user's reply for a natural feel
  const replyLower = userReply.toLowerCase()
  if (words.length >= 5) {
    if (/usually|always|every/i.test(replyLower)) return 'Oh, that sounds like a good routine!'
    if (/like|love|enjoy/i.test(replyLower)) return "That's great to hear!"
    if (/think|feel|believe/i.test(replyLower)) return 'I see, interesting!'
    return ['Nice!', 'That sounds good!', 'Great answer!'][Math.floor(Math.random() * 3)]
  }
  if (words.length >= 3) {
    return ['Got it!', 'I see!', 'Cool!'][Math.floor(Math.random() * 3)]
  }
  return ['Okay!', 'Sure!', 'Alright!'][Math.floor(Math.random() * 3)]
}

function AiConversationPlayer({
  item,
  uiText,
  previousPhrases = [],
  onInputChange,
  isLastBlock = false,
  flavorContext = null,
  ctaLabel: _ctaLabel,
  level,
  onGuideMessageChange,
  problemNumber = 1,
}: {
  item: LessonBlockItem
  uiText: LessonCopy['activeCard']
  previousPhrases?: string[]
  onInputChange: (value: string) => void
  isLastBlock?: boolean
  flavorContext?: FlavorContext | null
  ctaLabel?: string
  level?: string
  onGuideMessageChange?: (message: string | null) => void
  problemNumber?: number
}) {
  const currentAnswer = item.answer?.trim() || item.prompt?.trim() || ''
  const nativeHintForRecall = (item as LessonBlockItem & { nativeHint?: string | null }).nativeHint?.trim() || null
  const relatedExprs = (item as LessonBlockItem & { related_expressions?: { en: string }[] | null }).related_expressions

  // ── Slot extraction for extended engine ──
  const _convSlots = useMemo(() => {
    const words = currentAnswer.split(/\s+/)
    let personSlot = ''
    for (let i = 0; i < words.length; i++) {
      if (/^(with|to|about)$/i.test(words[i]) && words[i + 1]) {
        personSlot = words.slice(i + 1, i + 3).join(' ').replace(/[.,!?]/g, '')
        break
      }
    }
    const lastWord = words[words.length - 1]?.replace(/[.,!?]/g, '') ?? ''
    const timeSlot = /^(today|yesterday|tomorrow|tonight|now)$/i.test(lastWord) ? lastWord : ''
    const timeAlt = timeSlot.toLowerCase() === 'today' ? 'yesterday' : 'today'
    const personAlts = ['my teacher', 'my boss', 'my coworker', 'my neighbor']
    const personAlt = personSlot
      ? personAlts.find((p) => p.toLowerCase() !== personSlot.toLowerCase()) ?? 'my teacher'
      : ''
    return { personSlot, personAlt, timeSlot, timeAlt }
  }, [currentAnswer])

  // ── Dynamic conversation — opener from engine, rest from AI API ──
  const [openerMessage] = useState(() => {
    const greetings = [
      'Hi! How are you today?',
      'Hey! How\'s your day going?',
      'Hi! Nice to talk with you today.',
    ]
    return greetings[Math.floor(Math.random() * greetings.length)]
  })
  // Current AI message for the active turn
  const [currentAiMessage, setCurrentAiMessage] = useState(openerMessage)

  // Greeting (0) + Main conversation (1-3) + Closing (4)
  const MAX_TURNS = 5

  const [turn, setTurn] = useState(0)
  const [started, setStarted] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const [soundGameDone, setSoundGameDone] = useState(false)
  const [quickResponseDone, setQuickResponseDone] = useState(false)
  const [recallDone, setRecallDone] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [turnAnswered, setTurnAnswered] = useState(false)
  const [turnHint, setTurnHint] = useState<string | null>(null)
  const [turnNextPrompt, setTurnNextPrompt] = useState<string | null>(null)
  const [turnEvalDetail, setTurnEvalDetail] = useState<ConvEvalDetail | null>(null)
  const [history, setHistory] = useState<ConvTurn[]>([])
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const paywallShownRef = useRef(false)
  const [streakCount, setStreakCount] = useState(0)
  const [boostWasActive, setBoostWasActive] = useState(false)
  const [showReviewScreen, setShowReviewScreen] = useState(false)
  const [showChallengeComplete, setShowChallengeComplete] = useState(false)
  const [showConvSilent, setShowConvSilent] = useState(false)
  const [showConvText, setShowConvText] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextAiReplyRef = useRef<string | null>(null)

  // Update guide character message based on current sub-phase
  useEffect(() => {
    if (!onGuideMessageChange) return
    if (showReviewScreen) {
      // Listening phase = SoundGame active, Speaking phase = QuickResponseGame active
      if (!soundGameDone) {
        onGuideMessageChange(uiText.challengeListeningPrimary)
      } else if (!quickResponseDone) {
        onGuideMessageChange(uiText.challengeSpeakingPrimary)
      } else {
        onGuideMessageChange(null) // reset to default
      }
    } else {
      onGuideMessageChange(null) // conversation phase uses default
    }
  }, [showReviewScreen, soundGameDone, quickResponseDone, onGuideMessageChange, uiText])

  const CONV_RECORDING_MAX_MS = 8000

  // Show paywall + fetch streak from DB once when conversation completes
  useEffect(() => {
    if (allDone && !paywallShownRef.current) {
      paywallShownRef.current = true
      setShowPaywall(true)
      // Fetch server-driven streak (not localStorage)
      const sb = getSupabaseBrowserClient()
      sb.auth.getSession().then(({ data: { session } }: { data: { session: { user: { id: string } } | null } }) => {
        if (!session?.user) return
        sb.from('user_profiles')
          .select('current_streak_days, diamond_boost_until')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }: { data: { current_streak_days: number | null; diamond_boost_until: string | null } | null }) => {
            setStreakCount(data?.current_streak_days ?? 0)
            if (data?.diamond_boost_until && new Date(data.diamond_boost_until) > new Date()) {
              setBoostWasActive(true)
            }
          })
          .catch(() => {})
      }).catch(() => {})
    }
  }, [allDone])


  // ── Audio: cache + deduplication + persistent element ──
  const aiAudioCacheRef = useRef<Map<string, string>>(new Map())
  // In-flight fetch promises — prevents duplicate concurrent TTS requests for the same text
  const aiAudioInflightRef = useRef<Map<string, Promise<string | null>>>(new Map())
  const aiAudioRef = useRef<HTMLAudioElement | null>(null)

  const normalizeAudioKey = (text: string) => text.trim()

  /** Resolve audio URL with deduplication: cache → in-flight → fetch */
  const ensureAiAudioUrl = useCallback(async (text: string): Promise<string | null> => {
    const key = normalizeAudioKey(text)

    // 1. Cache hit — instant
    const cached = aiAudioCacheRef.current.get(key)
    if (cached) return cached

    // 2. In-flight request exists — reuse it (no duplicate fetch)
    const inflight = aiAudioInflightRef.current.get(key)
    if (inflight) return inflight

    // 3. New fetch — store the promise for deduplication
    const fetchPromise = fetchAudioUrl(text).then((url) => {
      if (url) aiAudioCacheRef.current.set(key, url)
      aiAudioInflightRef.current.delete(key)
      return url
    }).catch(() => {
      aiAudioInflightRef.current.delete(key)
      return null
    })
    aiAudioInflightRef.current.set(key, fetchPromise)
    return fetchPromise
  }, [])

  /** Play audio for an AI message — non-blocking, plays as soon as URL is ready */
  const playAiMessage = useCallback((text: string) => {
    const ttsStart = performance.now()
    setAiSpeaking(true)

    // Stop previous audio cleanly
    if (aiAudioRef.current) {
      aiAudioRef.current.pause()
      aiAudioRef.current.onended = null
      aiAudioRef.current.onerror = null
    }

    // Ensure persistent Audio element exists
    if (!aiAudioRef.current) {
      aiAudioRef.current = new Audio()
    }

    const playUrl = (url: string) => {
      const audio = aiAudioRef.current!
      console.log(`[AI_LATENCY] segment=tts_to_playback duration=${Math.round(performance.now() - ttsStart)}ms cached=${url === aiAudioCacheRef.current.get(normalizeAudioKey(text))}`)
      audio.onended = () => setAiSpeaking(false)
      audio.onerror = () => setAiSpeaking(false)
      audio.src = url
      audio.currentTime = 0
      audio.play().catch(() => setAiSpeaking(false))
    }

    // Check cache first for instant playback
    const key = normalizeAudioKey(text)
    const cached = aiAudioCacheRef.current.get(key)
    if (cached) {
      playUrl(cached)
      return
    }

    // Not cached — await in-flight or fetch, then play when ready
    ensureAiAudioUrl(text).then((url) => {
      if (url) {
        playUrl(url)
      } else {
        // One retry
        fetchAudioUrl(text).then((retryUrl) => {
          if (retryUrl) {
            aiAudioCacheRef.current.set(key, retryUrl)
            playUrl(retryUrl)
          } else {
            setAiSpeaking(false)
          }
        })
      }
    })
  }, [ensureAiAudioUrl])

  // Preload opener audio on mount for faster start
  useEffect(() => {
    ensureAiAudioUrl(openerMessage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStart = () => {
    setStarted(true)
    playAiMessage(openerMessage)
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
  }

  const handleStartRecording = async () => {
    if (isRecording) return
    try {
      stopStream()
      chunksRef.current = []
      setTranscript('')
      setTurnAnswered(false)
      setShowConvSilent(false)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstart = () => {
        setIsRecording(true)
        // Auto-stop recording after max duration
        recordingTimerRef.current = setTimeout(() => {
          if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop()
          }
        }, CONV_RECORDING_MAX_MS)
      }
      recorder.onstop = async () => {
        const t0 = performance.now() // [1] recording stop
        setIsRecording(false)
        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        stopStream()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        const t1 = performance.now() // [2] blob ready
        console.log(`[AI_LATENCY] turn=${turn} segment=blob_ready duration=${Math.round(t1 - t0)}ms`)

        if (blob.size === 0) {
          setShowConvSilent(true)
          return
        }

        // --- Phase 1: STT ---
        setIsRecognizing(true)
        let recognized = ''
        const t2 = performance.now() // [3] STT request start
        try {
          const formData = new FormData()
          formData.append('file', blob, 'recording.webm')
          formData.append('expectedText', currentAnswer)
          const authHdrs = await getAuthHeaders()
          const res = await fetch('/api/pronunciation/score', { method: 'POST', body: formData, headers: authHdrs })
          if (res.ok) {
            const data = await res.json()
            recognized = data.transcript?.trim() || ''
          }
        } catch {
          // STT failed
        }
        const t3 = performance.now() // [4] STT response received
        console.log(`[AI_LATENCY] turn=${turn} segment=stt duration=${Math.round(t3 - t2)}ms`)
        setTranscript(recognized)
        setIsRecognizing(false)

        if (!recognized) {
          setShowConvSilent(true)
          return
        }

        // --- Final turn guard: skip AI reply, go to completion ---
        if (turn >= MAX_TURNS - 1) {
          nextAiReplyRef.current = null
          setTurnEvalDetail(null)
          setTurnHint(null)
          setTurnNextPrompt(null)
          setTurnAnswered(true)
          return
        }

        // --- Show thinking state ---
        setAiThinking(true)

        // --- Prefetch likely replies for TTS speed ---
        const fallback = buildFallbackEvaluation(turn, recognized, currentAnswer)
        if (fallback.aiReply) ensureAiAudioUrl(fallback.aiReply)

        // --- AI API ---
        const apiHistory = history.map((h) => ({ ai: h.aiMessage, user: h.userReply }))
        apiHistory.push({ ai: currentAiMessage, user: recognized })

        let replied = false
        const t4 = performance.now() // [5] AI request start
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3_000)
          const apiRes = await fetch('/api/ai-conversation/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              turnIndex: turn,
              userMessage: recognized,
              lessonPhrase: currentAnswer,
              conversationHistory: apiHistory,
              flavorContext: flavorContext ?? undefined,
              isClosingTurn: turn === 3,
              rank: level === 'beginner' ? 15 : level === 'intermediate' ? 55 : 85,
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          if (apiRes.ok) {
            const apiData = await apiRes.json()
            if (apiData.ok && apiData.aiReply) {
              incrementAiCallCount()
              replied = true
              nextAiReplyRef.current = apiData.aiReply
              ensureAiAudioUrl(apiData.aiReply)
              setTurnEvalDetail(apiData.evaluationDetail ?? null)
              if (apiData.evaluation === 'retry') {
                setTurnHint(apiData.hint ?? 'Try answering using today\'s expression.')
                setTurnNextPrompt(apiData.nextPrompt ?? null)
              } else {
                setTurnHint(null)
                setTurnNextPrompt(null)
              }
            }
          }
        } catch {
          // API timeout or failure — use fallback
        }
        const t5 = performance.now() // [6] AI response received (or timeout)
        console.log(`[AI_LATENCY] turn=${turn} segment=ai duration=${Math.round(t5 - t4)}ms source=${replied ? 'api' : 'fallback'}`)

        // --- Fallback if API didn't produce a reply ---
        if (!replied) {
          nextAiReplyRef.current = fallback.aiReply
          setTurnEvalDetail(fallback.evaluationDetail)
          setTurnHint(null)
          setTurnNextPrompt(null)
        }

        const t6 = performance.now() // [7] UI message committed
        console.log(`[AI_LATENCY] turn=${turn} segment=ui_commit duration=${Math.round(t6 - t5)}ms`)
        console.log(`[AI_LATENCY] turn=${turn} total_visible_reply=${Math.round(t6 - t0)}ms (stt=${Math.round(t3 - t2)}ms ai=${Math.round(t5 - t4)}ms)`)

        setAiThinking(false)
        setTurnAnswered(true)
      }
      recorder.start(250)
    } catch {
      setIsRecording(false)
    }
  }

  // Keep ref in sync
  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }

  // Advance to the next turn — uses dynamic AI reply
  const advanceToNextTurn = useCallback(() => {
    // Score this turn silently (not shown during conversation)
    const turnScore = scoreTurn(turnEvalDetail, transcript, history.map((h) => h.userReply))

    const newHistory = [...history, {
      aiMessage: currentAiMessage,
      userReply: transcript,
      hint: turnHint,
      nextPrompt: turnNextPrompt,
      reaction: pickReaction(transcript, currentAiMessage),
      eval: turnScore,
    }]
    setHistory(newHistory)

    const next = turn + 1
    if (next >= MAX_TURNS) {
      // Conversation complete
      setAllDone(true)
      onInputChange('[conversation done]')
      trackEvent('conversation_complete', { turns: next })
    } else {
      // Use the AI-generated reply for the next turn — prevent identical consecutive messages
      let nextMsg = nextAiReplyRef.current ?? 'That sounds great! Tell me more.'
      nextAiReplyRef.current = null
      if (nextMsg === currentAiMessage) {
        const alternatives = ['That\'s interesting!', 'I see. Tell me more.', 'Nice! Go on.', 'Really? What happened next?']
        nextMsg = alternatives[Math.floor(Math.random() * alternatives.length)]
      }

      setCurrentAiMessage(nextMsg)
      setTurn(next)
      setTranscript('')
      setTurnAnswered(false)
      setTurnHint(null)
      setTurnNextPrompt(null)
      setTurnEvalDetail(null)
      playAiMessage(nextMsg)
    }
  }, [history, currentAiMessage, turn, transcript, turnHint, turnNextPrompt, turnEvalDetail, onInputChange, playAiMessage])

  // Retry the current turn (reset recording state so user can try again)
  const handleRetryTurn = useCallback(() => {
    setTranscript('')
    setTurnAnswered(false)
    setTurnHint(null)
    setTurnNextPrompt(null)
    setTurnEvalDetail(null)
    setShowConvSilent(false)
  }, [])

  // No auto-advance — always require user to press "next" or "retry"
  // This prevents advice UI from flashing and ensures user reads feedback

  const handleRetryAll = () => {
    setTurn(0)
    setStarted(false)
    setAllDone(false)
    setShowReviewScreen(false)
    setShowChallengeComplete(false)
    setShowConvSilent(false)
    setTranscript('')
    setTurnAnswered(false)
    setTurnHint(null)
    setTurnNextPrompt(null)
    setTurnEvalDetail(null)
    setAiSpeaking(false)
    setAiThinking(false)
    setCurrentAiMessage(openerMessage)
    nextAiReplyRef.current = null
    aiAudioInflightRef.current.clear()
    setHistory([])
    onInputChange('')
  }

  const isJa = /[\u3000-\u9FFF]/.test(uiText.scaffoldNextButton)
  const sessionResult = allDone ? summarizeSession(history, isJa, currentAnswer) : null

  // Auto-advance: after user answers and feedback is shown, advance to next turn automatically
  // Must be ABOVE early returns to maintain stable hook order.
  useEffect(() => {
    if (!started || !turnAnswered || turnHint || allDone) return
    const timer = setTimeout(() => {
      advanceToNextTurn()
    }, 100)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, turnAnswered, turnHint, allDone])

  if (!started) {
    return (
      <div className="mt-4 text-center">
        <p className="text-sm text-[#5a5a7a]">{uiText.aiConversationPrompt}</p>
        <button
          type="button"
          onClick={handleStart}
          className="mt-4 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
        >
          {uiText.aiConversationStartButton}
        </button>
      </div>
    )
  }

  // ── Challenge success screen — shown when last challenge is cleared ──
  if (showChallengeComplete) {
    return (
      <div className="mt-4">
        <div className="mx-auto mt-6 max-w-[460px] text-center">
          <p className="text-2xl font-black text-[#22c55e]">
            🎉 第{problemNumber}問目クリア！
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => { window.dispatchEvent(new Event('next-step')) }}
              className={BTN_PRIMARY}
            >
              {isLastBlock ? uiText.aiConvFinishLesson : `第${problemNumber + 1}問目に進む`}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Review screen — separate from conversation, focused single-task ──
  if (showReviewScreen) {
    const _allReviewDone = soundGameDone && quickResponseDone && (recallDone || !nativeHintForRecall)
    return (
      <div className="mt-4">
        {/* Back to conversation */}
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={() => { setShowReviewScreen(false); setSoundGameDone(false); setQuickResponseDone(false); setRecallDone(false) }}
            className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#4B5563] transition hover:bg-[#F9FAFB]"
          >
            {uiText.backToConversation}
          </button>
        </div>
        {!soundGameDone && (
          <SoundGame uiText={uiText} onComplete={() => setSoundGameDone(true)} />
        )}
        {soundGameDone && !quickResponseDone && (
          <QuickResponseGame
            sentences={(() => {
              const related = relatedExprs?.map(r => r.en.trim()).filter(e => e && e !== currentAnswer) ?? []
              const extras = previousPhrases.length > 0
                ? previousPhrases.slice(-2)
                : related.length > 0
                  ? related.sort(() => Math.random() - 0.5).slice(0, 2)
                  : []
              return [currentAnswer, ...extras.filter(e => e !== currentAnswer)]
            })()}
            uiText={uiText}
            onComplete={() => {
              setQuickResponseDone(true)
              // If no RecallChallenge, this is the last game → show success
              if (!nativeHintForRecall) setShowChallengeComplete(true)
            }}
          />
        )}
        {soundGameDone && quickResponseDone && !recallDone && nativeHintForRecall && (
          <RecallChallenge
            pairs={[{ ja: nativeHintForRecall, en: currentAnswer }]}
            uiText={uiText}
            onComplete={() => {
              setRecallDone(true)
              setShowChallengeComplete(true)
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="mt-4">
      {/* During conversation: chat-style UI — no round labels */}
      {!allDone && (
        <>
          {/* Turn-state center area */}
          <div className="mx-auto mb-4 max-w-[460px]">
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
              {/* Center: turn state only */}
              <div className="flex flex-col items-center">
                {aiSpeaking ? (
                  <p className="text-sm font-semibold text-blue-600">{uiText.aiConvSpeaking}</p>
                ) : aiThinking ? (
                  <p className="text-sm font-semibold text-[#7b7b94] animate-pulse">{uiText.aiConvThinking}</p>
                ) : (
                  <p className="text-sm font-semibold text-[#5a5a7a]">{uiText.aiConvYourTurn}</p>
                )}
              </div>

              {/* Support: conversation flow — bottom-right, secondary */}
              <div className="mt-2 flex justify-end">
                {!showConvText ? (
                  <button
                    type="button"
                    onClick={() => setShowConvText(true)}
                    className="text-[11px] font-medium text-[#9ca3af] transition hover:text-[#7b7b94]"
                  >
                    {uiText.aiConvShowFlow}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConvText(false)}
                    className="text-[11px] font-medium text-[#9ca3af] transition hover:text-[#7b7b94]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Conversation flow — expandable, below status */}
              {showConvText && (
                <div className="mt-2 border-t border-[#E5E7EB] pt-2">
                  <div className="flex flex-col gap-1.5">
                    {history.map((h, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#F0F4FF] px-3 py-1.5 text-xs text-[#1a1a2e]">{h.aiMessage}</div>
                        </div>
                        {h.userReply && (
                          <div className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#FFF8EE] px-3 py-1.5 text-xs text-[#1a1a2e]">{h.userReply}</div>
                          </div>
                        )}
                      </div>
                    ))}
                    {!aiThinking && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#F0F4FF] px-3 py-1.5 text-xs text-[#1a1a2e]">{currentAiMessage}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Silent guidance — shown after empty recording */}
          {showConvSilent && !turnAnswered && !isRecording && !isRecognizing && (
            <div className="mx-auto mt-3 max-w-[320px] rounded-xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-sm text-[#7b7b94]">{uiText.aiQuestionSilent}</p>
            </div>
          )}

          {/* Recording controls — only when not yet answered */}
          {!turnAnswered && !isRecognizing && !aiThinking && !aiSpeaking && (
            <div className="flex justify-center">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className={BTN_PRIMARY}
                >
                  {ICON_SPEAK}{uiText.aiConvRecordButton}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className={BTN_STOP}
                >
                  {uiText.aiConvStopButton}
                </button>
              )}
            </div>
          )}

          {/* Recognizing indicator */}
          {isRecognizing && (
            <p className="mt-2 text-center text-sm text-[#7b7b94]">{uiText.aiConvRecognizing}</p>
          )}

          {/* Retry when answer needs improvement — amber hint card */}
          {turnAnswered && turnHint && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-bold">💡 {uiText.hintLabel}</p>
                <p className="mt-1">{turnHint}</p>
                {turnNextPrompt && (
                  <p className="mt-2 font-mono text-amber-900">
                    {uiText.aiConvExamplePrefix}: &quot;{turnNextPrompt}&quot;
                  </p>
                )}
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleRetryTurn}
                  className={BTN_PRIMARY}
                >
                  {uiText.aiConvRetryButton}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Completion: chat log + result + actions ── */}
      {allDone && (
        <>
          {/* 1. Chat log — clean LINE-style bubbles, no labels */}
          <div className="mx-auto mt-4 max-w-[460px]">
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-5">
              <div className="flex flex-col gap-3">
                {history.map((h, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#F0F4FF] px-3.5 py-2 text-sm text-[#1a1a2e]">
                        {h.reaction
                          ? <p>{h.reaction} {h.aiMessage}</p>
                          : <p>{h.aiMessage}</p>
                        }
                      </div>
                    </div>
                    {h.userReply && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#FFF8EE] px-3.5 py-2 text-sm text-[#1a1a2e]">
                          <p>{h.userReply}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Soft result + hint */}
          {sessionResult && (
            <div className="mx-auto mt-4 max-w-[460px] space-y-3">
              <div className={`rounded-xl px-4 py-3 ${
                sessionResult.finalEvaluation === 'good' ? 'bg-green-50'
                : sessionResult.finalEvaluation === 'ok' ? 'bg-blue-50'
                : 'bg-gray-50'
              }`}>
                <p className={`text-sm font-bold ${
                  sessionResult.finalEvaluation === 'good' ? 'text-green-800'
                  : sessionResult.finalEvaluation === 'ok' ? 'text-blue-800'
                  : 'text-gray-700'
                }`}>{sessionResult.summary}</p>
              </div>
            </div>
          )}

          {/* 3. Main action buttons */}
          <div className="mx-auto mt-5 max-w-[460px] flex gap-3">
            <button
              type="button"
              onClick={handleRetryAll}
              className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-6 py-3 text-sm font-bold text-[#4B5563] transition hover:bg-[#F9FAFB]"
            >
              {uiText.aiConvRetryAll}
            </button>
            <button
              type="button"
              onClick={() => setShowReviewScreen(true)}
              className="flex-1 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
            >
              {isLastBlock ? uiText.aiConvFinishLesson : uiText.aiConvNextProblem}
            </button>
          </div>

          {/* 5. Completion card — shown only when isLastBlock */}
          {isLastBlock && showPaywall && (
            <div className="mx-auto mt-6 max-w-[360px] rounded-2xl border border-[#F5A623]/30 bg-gradient-to-b from-[#FFFDF5] to-[#FFF8EE] px-6 py-5 text-center shadow-sm">
              <p className="text-lg font-black text-[#1a1a2e]">{uiText.paywallTitle}</p>
              <p className="mt-2 text-xs font-bold text-[#F59E0B]">{uiText.paywallValue}</p>
              <p className="mt-3 text-xs text-[#9CA3AF]">{uiText.paywallFreeLimit}</p>
              <button
                type="button"
                onClick={() => { trackEvent('paywall_clicked', { action: 'dismiss' }); setShowPaywall(false) }}
                className="mx-auto mt-3 block cursor-pointer text-xs text-[#9CA3AF] underline underline-offset-2 transition hover:text-[#6B7280]"
              >
                {uiText.paywallCtaSecondary}
              </button>
            </div>
          )}

          {/* 5. Streak celebration */}
          {isLastBlock && streakCount > 0 && (
            <div className="mx-auto mt-5 max-w-[300px] rounded-2xl border border-[#FDE68A] bg-gradient-to-b from-[#FFFBEB] to-[#FEF3C7] px-5 py-4 text-center shadow-sm">
              <p className="text-2xl font-black text-[#F59E0B]">🔥 {streakCount}日連続</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#92400E]">
                {streakCount >= 100 ? '100日達成！あなたは本物の学習者です'
                  : streakCount >= 50 ? '50日！英語が日常になっています'
                  : streakCount >= 30 ? '1ヶ月達成！本当にすごいです'
                  : streakCount >= 14 ? '2週間！すばらしい継続力です'
                  : streakCount >= 7 ? '1週間達成！習慣になってきましたね'
                  : streakCount >= 3 ? 'いい調子です！この勢いで続けましょう'
                  : 'いいスタート！明日も続けましょう'}
              </p>
            </div>
          )}

          {/* Diamond reward feedback */}
          {isLastBlock && (() => {
            const base = 1
            const streakBonus = streakCount >= 3 ? 1 : 0
            const boostBonus = boostWasActive ? 2 : 0
            const total = base + streakBonus + boostBonus
            return (
              <div className="mx-auto mt-3 flex items-center justify-center gap-2">
                <img src="/images/branding/diamond.svg" alt="" className="h-5 w-5" />
                <span className="text-sm font-bold text-[#B45309]">
                  +{total} ダイヤ獲得！{boostWasActive && '（ブーストで+2）'}
                </span>
              </div>
            )
          })()}

        </>
      )}
    </div>
  )
}

// ——— Step-level Mini Review ———

type MiniReviewType = 'recognition' | 'recall' | 'transfer'
type MiniReviewMode = 'audio-first' | 'text' | 'speaking'

type MiniReviewItem = {
  type: MiniReviewType
  mode: MiniReviewMode
  prompt: string
  choices: [string, string]
  correctIndex: 0 | 1
  /** Text to generate audio for in audio-first or speaking mode. */
  audioText?: string
}

type TypeBucket = { attempts: number; errors: number; slowCount: number }

type WeaknessProfile = {
  recognition: TypeBucket
  recall: TypeBucket
  transfer: TypeBucket
  /** Slot dimensions with error counts. */
  person: number
  time: number
  tense: number
  subject: number
}

const weaknessProfile: WeaknessProfile = {
  recognition: { attempts: 0, errors: 0, slowCount: 0 },
  recall: { attempts: 0, errors: 0, slowCount: 0 },
  transfer: { attempts: 0, errors: 0, slowCount: 0 },
  person: 0, time: 0, tense: 0, subject: 0,
}

/** Get error rate for a review type (0–1). */
function getErrorRate(type: MiniReviewType): number {
  const b = weaknessProfile[type]
  return b.attempts > 0 ? b.errors / b.attempts : 0
}

/** True if user is consistently slow across types. */
function isGloballySlow(): boolean {
  const total = weaknessProfile.recognition.attempts + weaknessProfile.recall.attempts + weaknessProfile.transfer.attempts
  const totalSlow = weaknessProfile.recognition.slowCount + weaknessProfile.recall.slowCount + weaknessProfile.transfer.slowCount
  return total >= 4 && totalSlow / total > 0.5
}

/** Get the weakest review type. Priority: slot weakness > type error rate > speed. */
function getWeakestType(): MiniReviewType | null {
  // If globally slow, bias toward recognition (easiest type)
  if (isGloballySlow()) return 'recognition'

  const types: MiniReviewType[] = ['recognition', 'recall', 'transfer']
  let weakest: MiniReviewType | null = null
  let maxRate = -1
  for (const t of types) {
    const rate = getErrorRate(t)
    if (weaknessProfile[t].attempts >= 2 && rate > maxRate) {
      maxRate = rate
      weakest = t
    }
  }
  return maxRate > 0.3 ? weakest : null
}

/** Get the weakest slot dimension. */
function getWeakestSlot(): 'person' | 'time' | 'tense' | 'subject' | null {
  const dims = ['person', 'time', 'tense', 'subject'] as const
  let weakest: typeof dims[number] | null = null
  let max = 0
  for (const d of dims) {
    if (weaknessProfile[d] > max) { max = weaknessProfile[d]; weakest = d }
  }
  return max >= 2 ? weakest : null
}

/** Semantic verb alternatives for plausible distractors. */
const VERB_ALTS: Record<string, string> = {
  talked: 'spoke', spoke: 'talked',
  went: 'walked', walked: 'went',
  ate: 'had', had: 'ate',
  made: 'prepared', prepared: 'made',
  took: 'grabbed', grabbed: 'took',
  watched: 'saw', saw: 'watched',
  met: 'visited', visited: 'met',
  bought: 'got', got: 'bought',
  drank: 'had', read: 'looked at',
}

/** Semantic preposition alternatives. */
const PREP_ALTS: Record<string, string> = {
  with: 'to', to: 'with', at: 'in', in: 'at', for: 'about', about: 'for',
}

/** Tense transformation pairs for structural transfer. */
const TENSE_TRANSFORMS: { match: RegExp; replace: string; timeFrom: string; timeTo: string }[] = [
  { match: /\btalked\b/, replace: 'will talk', timeFrom: 'today', timeTo: 'tomorrow' },
  { match: /\bwent\b/, replace: 'will go', timeFrom: 'today', timeTo: 'tomorrow' },
  { match: /\bate\b/, replace: 'will eat', timeFrom: 'today', timeTo: 'tomorrow' },
  { match: /\bmade\b/, replace: 'will make', timeFrom: 'today', timeTo: 'tomorrow' },
  { match: /\btook\b/, replace: 'will take', timeFrom: 'today', timeTo: 'tomorrow' },
  { match: /\bwatched\b/, replace: 'will watch', timeFrom: 'today', timeTo: 'tomorrow' },
  { match: /\bbought\b/, replace: 'will buy', timeFrom: 'today', timeTo: 'tomorrow' },
]

/** Subject transformation for structural transfer. */
const SUBJECT_ALTS: Record<string, string> = {
  'I': 'We', 'We': 'I', 'He': 'She', 'She': 'He',
}

/**
 * Build a semantic distractor by replacing a verb or preposition.
 * Falls back to word-swap only if no semantic alternative works.
 */
function buildDistractor(sentence: string): string {
  const words = sentence.split(/\s+/)

  // Priority 1: replace a verb with a semantic alternative
  for (let i = 0; i < words.length; i++) {
    const lower = words[i].toLowerCase().replace(/[.,!?]/g, '')
    if (VERB_ALTS[lower]) {
      const copy = [...words]
      copy[i] = VERB_ALTS[lower]
      return copy.join(' ')
    }
  }

  // Priority 2: replace a preposition with a semantic alternative
  for (let i = 0; i < words.length; i++) {
    const lower = words[i].toLowerCase()
    if (PREP_ALTS[lower]) {
      const copy = [...words]
      copy[i] = PREP_ALTS[lower]
      return copy.join(' ')
    }
  }

  // Priority 3: word-swap fallback (last resort)
  if (words.length < 3) return sentence
  const mid = Math.floor(words.length / 2)
  const copy = [...words]
  ;[copy[mid], copy[mid - 1]] = [copy[mid - 1], copy[mid]]
  return copy.join(' ')
}

/**
 * Attempt a structural tense transfer (past → future).
 * Returns null if no clean transformation is possible.
 */
function buildTenseTransfer(sentence: string): { transformed: string; label: string } | null {
  for (const t of TENSE_TRANSFORMS) {
    if (t.match.test(sentence)) {
      let result = sentence.replace(t.match, t.replace)
      // Also swap time word if present
      if (result.includes(t.timeFrom)) {
        result = result.replace(t.timeFrom, t.timeTo)
      }
      if (result !== sentence) return { transformed: result, label: t.timeTo }
    }
  }
  return null
}

/**
 * Attempt a subject transfer (I → We, etc.).
 * Returns null if no clean transformation is possible.
 */
function buildSubjectTransfer(sentence: string): { transformed: string; label: string } | null {
  const firstWord = sentence.split(/\s+/)[0]
  if (!firstWord) return null
  const alt = SUBJECT_ALTS[firstWord]
  if (!alt) return null
  const result = sentence.replace(new RegExp(`^${firstWord}\\b`), alt)
  if (result !== sentence) return { transformed: result, label: alt }
  return null
}

/** Generate one mini-review question from the current sentence + stage. */
function generateMiniReview(
  stage: 'listen' | 'repeat' | 'scaffold' | 'ai_question',
  sentence: string,
  personSlot: string,
  personAlt: string,
  timeSlot: string,
  timeAlt: string,
  uiText: LessonCopy['activeCard'],
  relatedExpressions?: { en: string }[] | null
): MiniReviewItem | null {
  if (!sentence || sentence.split(/\s+/).length < 2) return null

  // Listen prefers speaking mode; repeat prefers audio-first; others text
  const mode: MiniReviewMode = stage === 'listen' ? 'speaking'
    : stage === 'repeat' ? 'audio-first'
    : 'text'
  const audioText = sentence

  /** Helper to build a review item with mode/audioText pre-filled. */
  const mk = (type: MiniReviewType, prompt: string, choices: [string, string], correctIndex: 0 | 1, overrideMode?: MiniReviewMode): MiniReviewItem =>
    ({ type, mode: overrideMode ?? mode, prompt, choices, correctIndex, audioText })

  // ── Adaptive bias: override stage default if weakness detected ──
  const weakestType = getWeakestType()
  const weakestSlot = getWeakestSlot()

  // If user is weak at recall and current stage normally does recognition,
  // try recall first. Vice versa for transfer.
  const stageDefault: Record<string, MiniReviewType> = {
    listen: 'recognition', repeat: 'recall', scaffold: 'recognition', ai_question: 'transfer',
  }
  const shouldBiasType = weakestType && weakestType !== stageDefault[stage]

  // If user is weak at a specific slot dimension, prefer that dimension
  const preferPerson = weakestSlot === 'person' && personSlot
  const preferTime = weakestSlot === 'time' && timeSlot
  const preferTense = weakestSlot === 'tense'
  const preferSubject = weakestSlot === 'subject'

  // Adaptive override: try to generate the weakest type for any stage
  if (shouldBiasType && weakestType === 'recall') {
    const d = personSlot ? sentence.replace(personSlot, personAlt)
      : timeSlot ? sentence.replace(timeSlot, timeAlt)
      : buildDistractor(sentence)
    if (d !== sentence) return mk('recall', uiText.miniReviewRecallPrompt, [sentence, d], 0)
  }
  if (shouldBiasType && weakestType === 'transfer' && stage !== 'ai_question') {
    if (personSlot) {
      const v = sentence.replace(personSlot, personAlt)
      const w = sentence.replace(personSlot, 'someone')
      if (v !== w) return mk('transfer', uiText.miniReviewTransferPick.replace('{value}', personAlt), [v, w], 0)
    }
  }

  switch (stage) {
    // ── LISTEN → recognition ──
    // Test whether the learner caught the meaning from audio
    case 'listen': {
      // Adaptive: prefer weak slot dimension
      if (preferTime && timeSlot) return mk('recognition', uiText.miniReviewWhen, [timeSlot, timeAlt], 0)
      if (preferPerson && personSlot) return mk('recognition', uiText.miniReviewWho, [personSlot, personAlt], 0)
      // Default priority
      if (personSlot) return mk('recognition', uiText.miniReviewWho, [personSlot, personAlt], 0)
      if (timeSlot) return mk('recognition', uiText.miniReviewWhen, [timeSlot, timeAlt], 0)
      const d1 = buildDistractor(sentence)
      if (d1 === sentence) return null
      return mk('recognition', uiText.miniReviewWhichSentence, [sentence, d1], 0)
    }

    case 'repeat': {
      // Prefer a near-variation from related expressions for a real challenge
      const actionExprs = relatedExpressions
        ?.map(r => r.en.trim())
        .filter(e => e && e !== sentence && e.split(/\s+/).length >= 3) ?? []
      if (actionExprs.length > 0) {
        const variation = actionExprs[Math.floor(Math.random() * actionExprs.length)]
        // Challenge: listen to the variation, pick the correct text
        return { type: 'recall', mode: 'audio-first', prompt: uiText.miniReviewRecallPrompt, choices: [variation, sentence], correctIndex: 0, audioText: variation }
      }
      // Fallback: slot-based distractor
      const d2 = personSlot ? sentence.replace(personSlot, personAlt)
        : timeSlot ? sentence.replace(timeSlot, timeAlt)
        : buildDistractor(sentence)
      if (d2 === sentence) return null
      return mk('recall', uiText.miniReviewRecallPrompt, [sentence, d2], 0)
    }

    case 'scaffold': {
      if (personSlot) {
        const verbChunk = sentence.split(/\s+/).slice(0, 2).join(' ')
        if (verbChunk && verbChunk !== personSlot) {
          return mk('recognition', uiText.miniReviewWhichChanges, [personSlot, verbChunk], 0)
        }
      }
      const d3 = personSlot ? sentence.replace(personSlot, personAlt)
        : timeSlot ? sentence.replace(timeSlot, timeAlt)
        : buildDistractor(sentence)
      if (d3 === sentence) return null
      return mk('recall', uiText.miniReviewWhichSentence, [sentence, d3], 0)
    }

    case 'ai_question': {
      // Adaptive: try weakest dimension first
      if (preferTense) {
        const t = buildTenseTransfer(sentence)
        if (t) { const w = buildDistractor(t.transformed); if (w !== t.transformed) return mk('transfer', uiText.miniReviewTenseTransfer.replace('{value}', t.label), [t.transformed, w], 0) }
      }
      if (preferSubject) {
        const s = buildSubjectTransfer(sentence)
        if (s) { const w = buildDistractor(s.transformed); if (w !== s.transformed) return mk('transfer', uiText.miniReviewSubjectTransfer.replace('{value}', s.label), [s.transformed, w], 0) }
      }
      if (preferTime && timeSlot) {
        const v = sentence.replace(timeSlot, timeAlt); const w = sentence.replace(timeSlot, 'sometime')
        if (v !== w) return mk('transfer', uiText.miniReviewTransferPick.replace('{value}', timeAlt), [v, w], 0)
      }
      // Default priority
      if (personSlot) {
        const variation = sentence.replace(personSlot, personAlt)
        const wrong = sentence.replace(personSlot, 'someone')
        if (variation !== wrong) return mk('transfer', uiText.miniReviewTransferPick.replace('{value}', personAlt), [variation, wrong], 0)
      }
      const tense = buildTenseTransfer(sentence)
      if (tense) {
        const wrong = buildDistractor(tense.transformed)
        if (wrong !== tense.transformed) return mk('transfer', uiText.miniReviewTenseTransfer.replace('{value}', tense.label), [tense.transformed, wrong], 0)
      }
      const subject = buildSubjectTransfer(sentence)
      if (subject) {
        const wrong = buildDistractor(subject.transformed)
        if (wrong !== subject.transformed) return mk('transfer', uiText.miniReviewSubjectTransfer.replace('{value}', subject.label), [subject.transformed, wrong], 0)
      }
      if (timeSlot) {
        const variation = sentence.replace(timeSlot, timeAlt)
        const wrong = sentence.replace(timeSlot, 'sometime')
        if (variation !== wrong) return mk('transfer', uiText.miniReviewTransferPick.replace('{value}', timeAlt), [variation, wrong], 0)
      }
      // No clean transfer possible — skip
      return null
    }

    default:
      return null
  }
}

// ——— Sound Discrimination Mini-Game ———

const SOUND_PAIRS: { a: string; b: string }[] = [
  { a: 'right', b: 'light' },
  { a: 'berry', b: 'very' },
  { a: 'think', b: 'sink' },
  { a: 'fan', b: 'han' },
  { a: 'ship', b: 'sheep' },
  { a: 'pen', b: 'pan' },
  { a: 'hot', b: 'hat' },
  { a: 'bet', b: 'bed' },
  { a: 'see', b: 'she' },
  { a: 'rice', b: 'lice' },
]

function SoundGame({ uiText, onComplete }: { uiText: LessonCopy['activeCard']; onComplete: () => void }) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [score, setScore] = useState(0)
  const [gameQuestions] = useState(() => {
    const shuffled = [...SOUND_PAIRS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 5).map((pair) => {
      const correctIsA = Math.random() > 0.5
      return {
        correct: correctIsA ? pair.a : pair.b,
        choiceA: pair.a,
        choiceB: pair.b,
      }
    })
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [showIncorrectHint, setShowIncorrectHint] = useState(false)
  const sgAudioRef = useRef<HTMLAudioElement | null>(null)
  const sgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const done = questionIndex >= gameQuestions.length

  const currentQ = gameQuestions[questionIndex]

  // Cleanup: stop audio + clear timer
  const cleanupSgAudio = useCallback(() => {
    if (sgAudioRef.current) {
      sgAudioRef.current.pause()
      sgAudioRef.current.onended = null
      sgAudioRef.current.onerror = null
      sgAudioRef.current = null
    }
    if (sgTimerRef.current) {
      clearTimeout(sgTimerRef.current)
      sgTimerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => () => cleanupSgAudio(), [cleanupSgAudio])

  // Prefetch current + next round audio
  useEffect(() => {
    if (currentQ) ensureChallengeAudioUrl(currentQ.correct, 0.8)
    const nextQ = gameQuestions[questionIndex + 1]
    if (nextQ) ensureChallengeAudioUrl(nextQ.correct, 0.8)
  }, [questionIndex, currentQ, gameQuestions])

  const playAudio = async () => {
    debugLog('[challenge-listening-play-clicked]', { round: questionIndex, text: currentQ?.correct, isPlaying })
    if (!currentQ || isPlaying) return
    cleanupSgAudio()
    setIsPlaying(true)
    const url = await ensureChallengeAudioUrl(currentQ.correct, 0.8)
    if (url) {
      const audio = new Audio(url)
      sgAudioRef.current = audio
      sgTimerRef.current = setTimeout(() => { setIsPlaying(false); cleanupSgAudio() }, 10000)
      audio.onended = () => { setIsPlaying(false); cleanupSgAudio() }
      audio.onerror = () => { setIsPlaying(false); cleanupSgAudio() }
      audio.play().catch(() => { setIsPlaying(false); cleanupSgAudio() })
    } else {
      setIsPlaying(false)
    }
  }

  const handleChoice = (choice: string) => {
    if (feedback || done) return
    const isCorrect = choice === currentQ?.correct
    setFeedback(isCorrect ? 'correct' : 'incorrect')
    if (isCorrect) {
      setScore((s) => s + 1)
      setShowIncorrectHint(false)
      setTimeout(() => {
        setFeedback(null)
        cleanupSgAudio()
        setIsPlaying(false)
        setQuestionIndex(questionIndex + 1)
      }, 800)
    } else {
      setShowIncorrectHint(true)
      setTimeout(() => {
        setFeedback(null)
      }, 1200)
    }
  }

  if (done) {
    return (
      <div className="mt-4 animate-[fadeInUp_250ms_ease-out] rounded-[16px] border border-[#E8E4DF] bg-[#F0FDF4] px-5 py-4 text-center">
        <p className="text-lg font-black text-[#22c55e]">{uiText.soundGameComplete}</p>
        <p className="mt-1 text-sm text-[#5a5a7a]">{score} / {gameQuestions.length}</p>
        <button
          type="button"
          onClick={onComplete}
          className="mx-auto mt-3 block rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
        >
          次へ
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-[16px] border border-[#E8E4DF] bg-white px-5 py-4 text-center">
      <p className="text-lg font-black text-[#1a1a2e]">
        {uiText.soundGameTitle}
      </p>
      <p className="mt-1 text-xs text-[#7b7b94]">
        ({questionIndex + 1}/{gameQuestions.length})
      </p>

      <p className="mt-3 text-center text-sm text-gray-700">音声と同じ単語を選択してみましょう！</p>

      {/* Status indicator */}
      {isPlaying && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#7b7b94]"><LpIcon emoji="🎧" size={12} /> 再生中…</p>
      )}

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={playAudio}
          disabled={isPlaying || !!feedback}
          className={isPlaying || feedback ? BTN_DISABLED : BTN_PRIMARY}
        >
          {isPlaying ? '再生中...' : '再生する'}
        </button>
      </div>

      {feedback && (
        <p className={`mt-2 animate-[fadeInUp_150ms_ease-out] text-sm font-bold ${feedback === 'correct' ? 'text-[#22c55e]' : 'text-[#F5A623]'}`}>
          {feedback === 'correct' ? uiText.soundGameCorrect : uiText.soundGameIncorrect}
        </p>
      )}
      {showIncorrectHint && !feedback && (
        <p className="mt-1 text-xs text-[#7b7b94]">もう一度音声を聞いて、よく似た発音を聞き分けてみましょう。</p>
      )}

      {!feedback && currentQ && (
        <div className="mt-3 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => handleChoice(currentQ.choiceA)}
            disabled={isPlaying}
            className={`min-w-[100px] rounded-xl border border-[#E8E4DF] px-5 py-3 text-base font-bold transition active:scale-[0.97] ${isPlaying ? 'bg-gray-100 text-gray-400' : 'bg-white text-[#1a1a2e] hover:bg-[#FAF8F5]'}`}
          >
            {currentQ.choiceA}
          </button>
          <button
            type="button"
            onClick={() => handleChoice(currentQ.choiceB)}
            disabled={isPlaying}
            className={`min-w-[100px] rounded-xl border border-[#E8E4DF] px-5 py-3 text-base font-bold transition active:scale-[0.97] ${isPlaying ? 'bg-gray-100 text-gray-400' : 'bg-white text-[#1a1a2e] hover:bg-[#FAF8F5]'}`}
          >
            {currentQ.choiceB}
          </button>
        </div>
      )}
    </div>
  )
}

// ——— Challenge Repeat Feedback ———

type RepeatMismatchDetail = {
  message: string
  expectedWord: string | null
  spokenWord: string | null
  hint: string
}

function buildRepeatFeedback(
  evalResult: { rawTokens: string[]; expectedTokens: string[]; mismatchIndex: number | null; exactMatch: boolean },
  transcript: string,
  variant: 'repeat' | 'recall',
): RepeatMismatchDetail {
  const t = transcript.trim()

  // No speech detected
  if (!t) {
    return { message: '音声が聞き取れませんでした。', expectedWord: null, spokenWord: null, hint: 'もう少しはっきり発音してみましょう。' }
  }

  // Token count mismatch (words missing or extra)
  if (evalResult.rawTokens.length !== evalResult.expectedTokens.length) {
    const diff = evalResult.expectedTokens.length - evalResult.rawTokens.length
    if (diff > 0) {
      const missingIdx = evalResult.mismatchIndex ?? evalResult.rawTokens.length
      const missingWord = evalResult.expectedTokens[missingIdx] ?? null
      return {
        message: '単語が足りません。',
        expectedWord: missingWord,
        spokenWord: null,
        hint: variant === 'repeat' ? 'お手本をもう一度聞いて、全文を話してみましょう。' : '英文全体を思い出して話してみましょう。',
      }
    }
    return { message: '余分な単語があります。', expectedWord: null, spokenWord: null, hint: variant === 'repeat' ? 'お手本と同じ文だけを話しましょう。' : '正しい英文だけを話しましょう。' }
  }

  // Exact word mismatch at specific index
  if (!evalResult.exactMatch && evalResult.mismatchIndex !== null) {
    const idx = evalResult.mismatchIndex
    const expected = evalResult.expectedTokens[idx] ?? null
    const spoken = evalResult.rawTokens[idx] ?? null
    return {
      message: `${idx + 1}語目が違います。`,
      expectedWord: expected,
      spokenWord: spoken,
      hint: variant === 'repeat' ? 'お手本をよく聞いてから話してみましょう。' : '正しい単語を思い出してみましょう。',
    }
  }

  // exactMatch=true but wordMatchScore too low (pronunciation issue)
  return { message: '発音が不明瞭です。', expectedWord: null, spokenWord: null, hint: 'ゆっくり丁寧に話してみましょう。' }
}

// ——— Quick Response Game ———

function QuickResponseGame({
  sentences,
  uiText,
  onComplete,
}: {
  sentences: string[]
  uiText: LessonCopy['activeCard']
  onComplete: () => void
}) {
  const [round, setRound] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isJudging, setIsJudging] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'tryAgain' | null>(null)
  const [mismatch, setMismatch] = useState<RepeatMismatchDetail | null>(null)
  const [score, setScore] = useState(0)
  const qrRecorderRef = useRef<MediaRecorder | null>(null)
  const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = Math.min(sentences.length, 5)
  const done = round >= total
  const busy = isPlaying || isRecording || isJudging

  // Prefetch current + next round audio
  useEffect(() => {
    if (sentences[round]) ensureChallengeAudioUrl(sentences[round], 0.85)
    if (sentences[round + 1]) ensureChallengeAudioUrl(sentences[round + 1], 0.85)
  }, [round, sentences])

  const playCurrent = async () => {
    if (isPlaying || done) return
    setIsPlaying(true)
    const url = await ensureChallengeAudioUrl(sentences[round], 0.85)
    if (url) {
      const audio = new Audio(url)
      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => setIsPlaying(false)
      audio.play().catch(() => setIsPlaying(false))
    } else {
      setIsPlaying(false)
    }
  }

  const handleRecord = async () => {
    if (busy || done) return
    debugLog('[challenge-repeat-clicked]', { expectedText: sentences[round], round })
    setIsRecording(true)
    setMismatch(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      qrRecorderRef.current = recorder
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        qrRecorderRef.current = null
        if (qrTimerRef.current) { clearTimeout(qrTimerRef.current); qrTimerRef.current = null }
        stream.getTracks().forEach((t) => t.stop())
        setIsRecording(false)
        setIsJudging(true)
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        debugLog('[challenge-repeat-recording-stopped]', { blobSize: blob.size })
        const formData = new FormData()
        formData.append('file', new File([blob], 'qr.webm', { type: blob.type }))
        formData.append('expectedText', sentences[round])
        formData.append('language', 'en')
        formData.append('mode', 'repeat')
        debugLog('[challenge-repeat-request]', { expectedText: sentences[round], mode: 'repeat' })
        try {
          const authHdrs = await getAuthHeaders()
          const res = await fetch('/api/pronunciation/score', { method: 'POST', body: formData, headers: authHdrs })
          let isGood = false
          if (res.ok) {
            const data = await res.json()
            debugLog('[challenge-repeat-response]', { transcript: data.transcript, totalScore: data.totalScore, wordMatch: data.breakdown?.wordMatch })
            const evalResult = evaluateRepeat(data.transcript ?? '', sentences[round], data.breakdown?.wordMatch ?? null)
            debugLog('[challenge-repeat-eval]', evalResult)
            isGood = evalResult.isPass
            setFeedback(isGood ? 'correct' : 'tryAgain')
            if (isGood) {
              setScore((s) => s + 1)
            } else {
              setMismatch(buildRepeatFeedback(evalResult, data.transcript ?? '', 'repeat'))
            }
          } else {
            setFeedback('tryAgain')
            setMismatch({ message: '判定できませんでした。', expectedWord: null, spokenWord: null, hint: 'もう一度お試しください。' })
          }
          if (isGood) {
            setTimeout(() => { setFeedback(null); setMismatch(null); setRound((r) => r + 1) }, 800)
          } else {
            setTimeout(() => { setFeedback(null) }, 1200)
          }
        } catch {
          setFeedback('tryAgain')
          setMismatch({ message: '通信エラー', expectedWord: null, spokenWord: null, hint: 'もう一度お試しください。' })
          setTimeout(() => { setFeedback(null) }, 1200)
        } finally {
          setIsJudging(false)
        }
      }
      recorder.start()
      qrTimerRef.current = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, 5000)
    } catch {
      setIsRecording(false)
    }
  }

  const handleStopQrRecording = () => {
    if (qrRecorderRef.current && qrRecorderRef.current.state !== 'inactive') {
      qrRecorderRef.current.stop()
    }
  }

  if (done) {
    return (
      <div className="mt-4 animate-[fadeInUp_250ms_ease-out] rounded-[16px] border border-[#E8E4DF] bg-[#F0FDF4] px-5 py-4 text-center">
        <p className="text-lg font-black text-[#22c55e]">{uiText.quickResponseComplete}</p>
        <p className="mt-1 text-sm text-[#5a5a7a]">{score} / {total}</p>
        <button type="button" onClick={onComplete} className="mx-auto mt-3 block rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600">次へ</button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-[16px] border border-[#E8E4DF] bg-white px-5 py-4 text-center">
      <p className="text-lg font-black text-[#1a1a2e]">{uiText.quickResponseTitle}</p>
      <p className="mt-1 text-xs text-[#7b7b94]">({round + 1}/{total})</p>

      <p className="mt-3 text-center text-sm text-gray-700">{uiText.quickResponseListen}</p>

      {/* Status indicator */}
      {(isPlaying || isRecording || isJudging) && (
        <p className="mt-2 text-xs font-semibold text-[#7b7b94]">
          {isPlaying ? '🔊 再生中…' : isRecording ? '🎙️ 録音中…' : '⏳ 判定中…'}
        </p>
      )}

      <div className="mt-3 flex justify-center gap-3">
        <button
          type="button"
          onClick={playCurrent}
          disabled={busy}
          className={busy && !isPlaying ? BTN_DISABLED : BTN_PRIMARY}
        >
          {isPlaying ? '再生中...' : '再生する'}
        </button>
        <button
          type="button"
          onClick={isRecording ? handleStopQrRecording : handleRecord}
          disabled={busy && !isRecording}
          className={isRecording ? BTN_STOP : busy ? BTN_DISABLED : BTN_PRIMARY}
        >
          {isRecording ? '録音停止' : isJudging ? '判定中...' : '録音する'}
        </button>
      </div>

      {feedback && (
        <p className={`mt-2 animate-[fadeInUp_150ms_ease-out] text-sm font-bold ${feedback === 'correct' ? 'text-[#22c55e]' : 'text-[#F5A623]'}`}>
          {feedback === 'correct' ? uiText.quickResponseCorrect : uiText.quickResponseTryAgain}
        </p>
      )}
      {mismatch && !feedback && (
        <div className="mt-2 animate-[fadeInUp_150ms_ease-out] text-center">
          <p className="text-xs font-bold text-[#F5A623]">{mismatch.message}</p>
          {mismatch.expectedWord && (
            <p className="mt-1 text-sm">
              <span className="text-[#7b7b94]">正解: </span>
              <span className="font-bold text-[#22c55e]">{mismatch.expectedWord}</span>
              {mismatch.spokenWord && (
                <span className="text-[#7b7b94]"> ← あなた: <span className="font-bold text-[#ef4444]">{mismatch.spokenWord}</span></span>
              )}
            </p>
          )}
          <p className="mt-1 text-xs text-[#7b7b94]">{mismatch.hint}</p>
        </div>
      )}
    </div>
  )
}

// ——— Recall Challenge Game ———

function RecallChallenge({
  pairs,
  uiText,
  onComplete,
}: {
  pairs: { ja: string; en: string }[]
  uiText: LessonCopy['activeCard']
  onComplete: () => void
}) {
  const [round, setRound] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isJudging, setIsJudging] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'tryAgain' | null>(null)
  const [mismatch, setMismatch] = useState<RepeatMismatchDetail | null>(null)
  const [score, setScore] = useState(0)
  const rcRecorderRef = useRef<MediaRecorder | null>(null)
  const rcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = Math.min(pairs.length, 5)
  const done = round >= total
  const currentPair = pairs[round]
  const rcBusy = isRecording || isJudging

  const handleRecord = async () => {
    if (rcBusy || done || !currentPair) return
    debugLog('[challenge-speaking-clicked]', { expectedText: currentPair.en, round })
    setIsRecording(true)
    setMismatch(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      rcRecorderRef.current = recorder
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        rcRecorderRef.current = null
        if (rcTimerRef.current) { clearTimeout(rcTimerRef.current); rcTimerRef.current = null }
        stream.getTracks().forEach((t) => t.stop())
        setIsRecording(false)
        setIsJudging(true)
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        debugLog('[challenge-speaking-recording-stopped]', { blobSize: blob.size })
        const formData = new FormData()
        formData.append('file', new File([blob], 'recall.webm', { type: blob.type }))
        formData.append('expectedText', currentPair.en)
        formData.append('language', 'en')
        formData.append('mode', 'repeat')
        debugLog('[challenge-speaking-request]', { expectedText: currentPair.en, mode: 'repeat' })
        try {
          const authHdrs = await getAuthHeaders()
          const res = await fetch('/api/pronunciation/score', { method: 'POST', body: formData, headers: authHdrs })
          let isGood = false
          if (res.ok) {
            const data = await res.json()
            debugLog('[challenge-speaking-response]', { transcript: data.transcript, totalScore: data.totalScore, wordMatch: data.breakdown?.wordMatch })
            const evalResult = evaluateRepeat(data.transcript ?? '', currentPair.en, data.breakdown?.wordMatch ?? null)
            debugLog('[challenge-speaking-eval]', evalResult)
            isGood = evalResult.isPass
            setFeedback(isGood ? 'correct' : 'tryAgain')
            if (isGood) {
              setScore((s) => s + 1)
            } else {
              setMismatch(buildRepeatFeedback(evalResult, data.transcript ?? '', 'recall'))
            }
          } else {
            setFeedback('tryAgain')
            setMismatch({ message: '判定できませんでした。', expectedWord: null, spokenWord: null, hint: 'もう一度お試しください。' })
          }
          if (isGood) {
            setTimeout(() => { setFeedback(null); setMismatch(null); setRound((r) => r + 1) }, 800)
          } else {
            setTimeout(() => { setFeedback(null) }, 1200)
          }
        } catch {
          setFeedback('tryAgain')
          setMismatch({ message: '通信エラー', expectedWord: null, spokenWord: null, hint: 'もう一度お試しください。' })
          setTimeout(() => { setFeedback(null) }, 1200)
        } finally {
          setIsJudging(false)
        }
      }
      recorder.start()
      rcTimerRef.current = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, 5000)
    } catch {
      setIsRecording(false)
    }
  }

  const handleStopRcRecording = () => {
    if (rcRecorderRef.current && rcRecorderRef.current.state !== 'inactive') {
      rcRecorderRef.current.stop()
    }
  }

  if (done) {
    return (
      <div className="mt-4 animate-[fadeInUp_250ms_ease-out] rounded-[16px] border border-[#E8E4DF] bg-[#F0FDF4] px-5 py-4 text-center">
        <p className="text-lg font-black text-[#22c55e]">{uiText.recallComplete}</p>
        <p className="mt-1 text-sm text-[#5a5a7a]">{score} / {total}</p>
        <button type="button" onClick={onComplete} className="mx-auto mt-3 block rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600">次へ</button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-[16px] border border-[#E8E4DF] bg-white px-5 py-4 text-center">
      <p className="text-lg font-black text-[#1a1a2e]">{uiText.recallTitle}</p>
      <p className="mt-1 text-xs text-[#7b7b94]">({round + 1}/{total})</p>

      <p className="mt-3 text-center text-sm text-gray-700">{uiText.recallPrompt}</p>

      {currentPair && (
        <p className="mt-3 text-lg font-black text-[#1a1a2e]">{currentPair.ja}</p>
      )}

      {/* Status indicator */}
      {(isRecording || isJudging) && (
        <p className="mt-2 text-xs font-semibold text-[#7b7b94]">
          {isRecording ? '🎙️ 録音中…' : '⏳ 判定中…'}
        </p>
      )}

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={isRecording ? handleStopRcRecording : handleRecord}
          disabled={isJudging}
          className={isRecording ? BTN_STOP : isJudging ? BTN_DISABLED : BTN_PRIMARY}
        >
          {isRecording ? '録音停止' : isJudging ? '判定中...' : '録音する'}
        </button>
      </div>

      {feedback && (
        <p className={`mt-2 animate-[fadeInUp_150ms_ease-out] text-sm font-bold ${feedback === 'correct' ? 'text-[#22c55e]' : 'text-[#F5A623]'}`}>
          {feedback === 'correct' ? uiText.recallCorrect : uiText.recallTryAgain}
        </p>
      )}
      {mismatch && !feedback && (
        <div className="mt-2 animate-[fadeInUp_150ms_ease-out] text-center">
          <p className="text-xs font-bold text-[#F5A623]">{mismatch.message}</p>
          {mismatch.expectedWord && (
            <p className="mt-1 text-sm">
              <span className="text-[#7b7b94]">正解: </span>
              <span className="font-bold text-[#22c55e]">{mismatch.expectedWord}</span>
              {mismatch.spokenWord && (
                <span className="text-[#7b7b94]"> ← あなた: <span className="font-bold text-[#ef4444]">{mismatch.spokenWord}</span></span>
              )}
            </p>
          )}
          <p className="mt-1 text-xs text-[#7b7b94]">{mismatch.hint}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Evaluate: conversation-first.
 * 'good' = natural response, conversation works
 * 'close' = communicated but a more common phrasing exists
 * 'retry' = answer is semantically unrelated to the question
 * 'silent' = nothing recognizable was said
 */


type AiQuestionChoice = { label: string; isCorrect: boolean }

/**
 * Parse a question into a structured intent, then build 1 correct label + 3 distractors.
 * Correct label is always generated from the parsed question — never from a vague pool.
 */

// ── Dictionaries for locale-aware label rendering ──

// ══════════════════════════════════════════════════════════════════════════════
// AI Question — Sentence classifier, label renderer, and choice builder
// ══════════════════════════════════════════════════════════════════════════════

// ── Dictionaries ──

const NOUN_JA: Record<string, string> = {
  breakfast: '朝ごはん', lunch: 'お昼ごはん', dinner: '夕ごはん', snack: 'おやつ',
  school: '学校', work: '仕事', class: '授業', homework: '宿題', meeting: '会議',
  'class today': '今日の授業', 'work today': '今日の仕事', 'a meeting': '会議', 'plans': '予定', 'time': '時間',
  cooking: '料理', shopping: '買い物', coffee: 'コーヒー', tea: 'お茶',
  'the morning': '朝', 'the evening': '夕方', 'the afternoon': '午後',
  morning: '朝', evening: '夕方', afternoon: '午後', night: '夜', 'the night': '夜',
  today: '今日', tomorrow: '明日', yesterday: '昨日',
  'the weekend': '週末', weekend: '週末',
  math: '算数', english: '英語', science: '理科', music: '音楽',
  tired: '疲れている', hungry: 'お腹が空いている', sleepy: '眠い', happy: '嬉しい',
  home: '家', after: 'のあと', before: 'のまえ', during: 'の間',
  'after school': '放課後', 'after work': '仕事のあと', 'after lunch': '昼食のあと',
}

const VERB_JA: Record<string, string> = {
  'wake up': '起きる', 'get up': '起きる',
  'go': '行く', 'go to': '行く', 'go home': '帰る', 'get home': '帰る',
  'eat': '食べる', 'have': '食べる', 'have breakfast': '朝ごはんを食べる',
  'cook': '料理する', 'make': '作る', 'make breakfast': '朝ごはんを作る',
  'make dinner': '夕ごはんを作る', 'prepare': '準備する',
  'clean up': '片付ける', 'clean up after breakfast': '朝食の片付けをする',
  'wash': '洗う', 'wash the dishes': '食器を洗う', 'tidy': '片付ける',
  'do the laundry': '洗濯する', 'sort the garbage': 'ゴミを分別する',
  'take out the garbage': 'ゴミを出す',
  'study': '勉強する', 'read': '読む', 'read a book': '本を読む',
  'watch': '見る', 'watch videos': '動画を見る', 'play games': 'ゲームをする',
  'walk': '歩く', 'run': '走る', 'exercise': '運動する', 'go for a walk': '散歩する',
  'take a bath': 'お風呂に入る', 'take a shower': 'シャワーを浴びる',
  'sleep': '寝る', 'go to bed': '寝る',
  'talk to': '話す', 'talk with': '話す', 'meet': '会う', 'see': '会う',
  'leave': '出かける', 'come home': '帰る',
  'drink': '飲む', 'buy': '買う',
  'brush my teeth': '歯を磨く', 'brush teeth': '歯を磨く',
  'get dressed': '着替える', 'get ready': '準備する',
  'set my alarm': '目覚ましをセットする', 'set the alarm': '目覚ましをセットする',
  'write': '書く', 'write a diary': '日記を書く',
  'sit down': '座る', 'wash your hands': '手を洗う', 'want to go home': '家に帰りたい',
  'try again': 'もう一度試す', 'try': '試す', 'remember': '覚える',
}

const PREP_JA: Record<string, string> = {
  after: 'のあと', before: 'のまえ', in: 'の', on: 'のとき', at: 'に', during: 'の間', every: '毎',
}

function toJa(word: string): string {
  const lower = word.toLowerCase().trim()
  // Exact match first
  if (NOUN_JA[lower]) return NOUN_JA[lower]
  // Try verb dictionary for phrases like "to go home"
  const stripped = lower.replace(/^to\s+/, '')
  if (VERB_JA[stripped]) return VERB_JA[stripped]
  // Word-by-word: translate each known word, keep unknown ones
  const parts = lower.split(/\s+/)
  if (parts.length > 1) {
    const translated = parts.map(p => NOUN_JA[p] ?? VERB_JA[p] ?? p)
    // If at least one word translated, return combined
    if (translated.some((t, i) => t !== parts[i])) return translated.join('')
  }
  return word
}

function verbToJa(phrase: string): string {
  const lower = phrase.toLowerCase().trim()
  for (const [en, ja] of Object.entries(VERB_JA).sort((a, b) => b[0].length - a[0].length)) {
    if (lower.startsWith(en)) return ja
  }
  return lower
}

function jaVerbSuffix(v: string, suru: string): string {
  return /[るくすむぶつぬうぐ]$/.test(v) ? v : v + suru
}

// ── Sentence type system ──

type SentenceType =
  | 'wh_question'
  | 'yes_no_question'
  | 'declarative_action'
  | 'declarative_state'
  | 'greeting_social'
  | 'request_instruction'

type ClassifiedSentence = {
  sentenceType: SentenceType
  verb?: string
  object?: string
  context?: string
  prep?: string
  whTarget?: 'action' | 'food' | 'place' | 'time' | 'person' | 'general'
}

function classifySentence(sentence: string): ClassifiedSentence {
  const s = sentence.replace(/[.!?]+$/, '').trim()
  const lower = s.toLowerCase()

  // ── Greetings / social ──
  if (/^(thank|thanks)\b/i.test(lower)) return { sentenceType: 'greeting_social', verb: 'thank' }
  if (/^(see you|bye|take care|have a good)\b/i.test(lower)) return { sentenceType: 'greeting_social', verb: 'bye' }
  if (/^(hi|hello|hey|good (morning|afternoon|evening|night)|nice to meet)\b/i.test(lower)) return { sentenceType: 'greeting_social', verb: 'greet' }

  // ── Requests / instructions ──
  if (/^(please |could you |can you |would you |let's |don't forget to )/i.test(lower)) {
    const verb = lower.replace(/^(please |could you |can you |would you |let's |don't forget to )/i, '').trim()
    return { sentenceType: 'request_instruction', verb }
  }
  // Bare imperative: starts with a verb not preceded by a subject
  if (/^(wash |sit |stand |open |close |turn |put |pick |clean |come |stop |wait |hurry |listen |look |try |remember )/i.test(lower)) {
    return { sentenceType: 'request_instruction', verb: lower }
  }

  // ── Wh-questions ──
  const whActionCtx = lower.match(/^what do you (?:usually )?do\s+(after|before|in|on|at|during)\s+(.+)$/)
  if (whActionCtx) return { sentenceType: 'wh_question', whTarget: 'action', prep: whActionCtx[1], context: whActionCtx[2] }

  if (/^what do you (?:usually )?do\b/.test(lower)) return { sentenceType: 'wh_question', whTarget: 'action' }

  if (/^what (?:do you |did you |are you )?(eat|have|cook|make)\b/.test(lower)) {
    const m = lower.match(/(?:eat|have|cook|make)\s*(?:for\s+)?(.+)?$/)
    return { sentenceType: 'wh_question', whTarget: 'food', context: m?.[1]?.trim() }
  }

  if (/^where\b/.test(lower)) {
    const verb = lower.replace(/^where\s+(do|does|did)\s+you\s+/i, '').trim()
    return { sentenceType: 'wh_question', whTarget: 'place', verb }
  }

  if (/^(what time|when)\b/.test(lower)) {
    const verb = lower.replace(/^(what time|when)\s+(do|does|did)\s+you\s+/i, '').trim()
    return { sentenceType: 'wh_question', whTarget: 'time', verb }
  }

  if (/^who\b/.test(lower)) return { sentenceType: 'wh_question', whTarget: 'person' }
  if (/^how (are you|is your|'s your)\b/.test(lower)) return { sentenceType: 'greeting_social' }
  if (/^(what|which|how)\b/.test(lower)) return { sentenceType: 'wh_question', whTarget: 'general' }

  // ── Yes/no questions ──
  if (/^(do |does |did |are |is |can |could |will |would |shall |should |have you |has )/.test(lower)) {
    const body = lower.replace(/^(do|does|did|are|is|can|could|will|would|shall|should|have|has)\s+(you\s+)?/i, '').trim()
    // Sub-classify
    if (/^have\s+/.test(body) || /\b(today|tomorrow|tonight|this)\b/.test(body)) {
      const obj = body.replace(/^have\s+/i, '').trim()
      return { sentenceType: 'yes_no_question', verb: 'have', object: obj }
    }
    if (/^(like|enjoy|love|prefer|want)\b/.test(body)) {
      const m = body.match(/^(like|enjoy|love|prefer|want)\s+(.+)$/)
      return { sentenceType: 'yes_no_question', verb: m?.[1], object: m?.[2] }
    }
    if (/^(feeling|feel|tired|hungry|happy|sleepy|busy)\b/.test(body)) {
      return { sentenceType: 'declarative_state', object: body }
    }
    return { sentenceType: 'yes_no_question', verb: body }
  }

  // ── Declarative: state / feeling ──
  const stateMatch = lower.match(/^i('m|'m feeling| am| feel| like| love| enjoy| prefer| want| need| hope| wish)\s*(.*)$/)
  if (stateMatch) {
    const rawVerb = stateMatch[1].trim().replace(/^'m\s*/, '').replace(/^'m$/, 'am')
    const verb = rawVerb || 'am'
    const obj = stateMatch[2]?.trim() || undefined
    return { sentenceType: 'declarative_state', verb, object: obj }
  }
  if (/^(it's|it is|there's|there is)\b/.test(lower)) {
    return { sentenceType: 'declarative_state', object: lower }
  }

  // ── Declarative: action with time/place context ──
  const routineMatch = lower.match(/^(?:i\s+)(.+?)\s+(at|in|on|every|after|before|during)\s+(.+)$/)
  if (routineMatch) {
    return { sentenceType: 'declarative_action', verb: routineMatch[1], context: routineMatch[3], prep: routineMatch[2] }
  }

  // ── Declarative: general action ──
  const stmtVerb = lower.match(/^(?:i\s+)(.+)$/)
  if (stmtVerb) {
    return { sentenceType: 'declarative_action', verb: stmtVerb[1].trim() }
  }

  // ── Fallback: treat as declarative action ──
  return { sentenceType: 'declarative_action', verb: lower }
}

// ── Per-type label renderers ──

function buildCorrectLabelJa(c: ClassifiedSentence): string {
  switch (c.sentenceType) {
    case 'wh_question': {
      switch (c.whTarget) {
        case 'action': return c.context ? `${toJa(c.context)}${PREP_JA[c.prep!] ?? 'のとき'}に何をするか聞いている` : 'ふだん何をするか聞いている'
        case 'food': return c.context ? `${toJa(c.context)}に何を食べるか聞いている` : '何を食べるか聞いている'
        case 'place': return `どこへ${jaVerbSuffix(verbToJa(c.verb || 'go'), 'する')}か聞いている`
        case 'time': return `いつ${jaVerbSuffix(verbToJa(c.verb || 'do it'), 'する')}か聞いている`
        case 'person': return '誰について聞いている'
        default: return 'この質問の内容について聞いている'
      }
    }
    case 'yes_no_question': {
      if (c.verb === 'have') return `${toJa(c.object || '')}があるか聞いている`
      if (['like', 'enjoy', 'love', 'prefer', 'want'].includes(c.verb || '')) return `${toJa(c.object || '')}が好きか聞いている`
      const v = verbToJa(c.verb || '')
      return `${jaVerbSuffix(v, 'する')}か聞いている`
    }
    case 'declarative_action': {
      const v = verbToJa(c.verb || '')
      if (c.context) {
        const ctx = toJa(c.context)
        const p = PREP_JA[c.prep || ''] ?? 'に'
        return `${ctx}${p}${jaVerbSuffix(v, 'する')}ことを伝えている`
      }
      return `${jaVerbSuffix(v, 'する')}ことを伝えている`
    }
    case 'declarative_state': {
      const verb = c.verb || 'am'
      // Preference: like/love/enjoy/prefer
      if (['like', 'love', 'enjoy', 'prefer'].includes(verb)) {
        const obj = c.object ? toJa(c.object) : ''
        return obj ? `${obj}が好きだと伝えている` : '好きだという気持ちを伝えている'
      }
      // Desire: want/need/hope/wish
      if (['want', 'need', 'hope', 'wish'].includes(verb)) {
        const vObj = c.object ? toJa(c.object) : ''
        // る-verb → りたい, other → したい
        const tai = /る$/.test(vObj) ? vObj.slice(0, -1) + 'りたい'
          : /[くすむぶつぬうぐ]$/.test(vObj) ? vObj + 'たい'
          : vObj ? vObj + 'したい' : ''
        return tai ? `${tai}気持ちを伝えている` : '〜したいという気持ちを伝えている'
      }
      // Feeling/state: feel/am/'m — split time context from adjective using RAW English
      if (c.object) {
        const raw = c.object
        // "tired today" → adj=tired, time=today
        const timeEnd = raw.match(/^(.+?)\s+(today|tomorrow|yesterday|tonight)$/i)
        if (timeEnd) {
          return `${toJa(timeEnd[2].trim())}は${toJa(timeEnd[1].trim())}ことを伝えている`
        }
        // "hungry after school" → adj=hungry, context="after school"
        const prepCtx = raw.match(/^(.+?)\s+(after|before|every|during|at|in)\s+(.+)$/i)
        if (prepCtx) {
          const adj = toJa(prepCtx[1].trim())
          // Try translating "prep + place" as a unit first (e.g., "after school" → "放課後")
          const fullCtx = `${prepCtx[2]} ${prepCtx[3]}`.trim()
          const ctxJa = toJa(fullCtx)
          if (ctxJa !== fullCtx) {
            return `${ctxJa}に${adj}ことを伝えている`
          }
          const p = PREP_JA[prepCtx[2].toLowerCase()] ?? 'に'
          const place = toJa(prepCtx[3].trim())
          return `${place}${p}${adj}ことを伝えている`
        }
        return `${toJa(raw)}ことを伝えている`
      }
      return '自分の気持ちを伝えている'
    }
    case 'greeting_social': {
      if (c.verb === 'thank') return 'お礼を言っている'
      if (c.verb === 'bye') return 'お別れの挨拶をしている'
      return '挨拶をしている'
    }
    case 'request_instruction': {
      const raw = c.verb || ''
      // "let's go" style → invitation
      if (/^(go|do|try|play|eat|start)$/i.test(raw) || /^go\b/.test(raw)) {
        const v = verbToJa(raw)
        return `一緒���${jaVerbSuffix(v, 'する')}ことを誘っている`
      }
      const v = verbToJa(raw)
      return `${jaVerbSuffix(v, 'する')}ようにお願いしている`
    }
  }
}

function buildCorrectLabelEn(c: ClassifiedSentence): string {
  switch (c.sentenceType) {
    case 'wh_question': {
      switch (c.whTarget) {
        case 'action': return c.context ? `Asking what you do ${c.prep} ${c.context}` : 'Asking what you usually do'
        case 'food': return c.context ? `Asking what you eat for ${c.context}` : 'Asking what you eat'
        case 'place': return `Asking where you ${c.verb || 'go'}`
        case 'time': return `Asking when you ${c.verb || 'do it'}`
        case 'person': return 'Asking about who'
        default: return 'Asking about this topic'
      }
    }
    case 'yes_no_question': return `Asking whether you ${c.verb || 'do that'}`
    case 'declarative_action': {
      if (c.context) return `Saying you ${c.verb} ${c.prep} ${c.context}`
      return `Saying you ${c.verb}`
    }
    case 'declarative_state': return c.object ? `Expressing that you ${c.object}` : 'Expressing a feeling or state'
    case 'greeting_social': {
      if (c.verb === 'thank') return 'Saying thank you'
      if (c.verb === 'bye') return 'Saying goodbye'
      return 'Greeting someone'
    }
    case 'request_instruction': return `Asking someone to ${c.verb || 'do something'}`
  }
}

// ── Per-type distractor pools (strict family separation) ──

const QUESTION_DISTRACTORS_JA = [
  'どこに行くか聞いている', '何を食べるか聞いている', '気持ちについて聞いている',
  '時間について聞いている', '誰と一緒か聞いている', 'ふだん何をするか聞いている',
]
const STATEMENT_DISTRACTORS_JA = [
  '朝ごはんを食べることを伝えている', '出かける準備をすることを伝えている',
  '歯を磨くことを伝えている', '夕ごはんを作ることを伝えている',
  '散歩することを伝えている', '本を読むことを伝えている',
  'シャワーを浴びることを伝えている', '寝ることを伝えている',
]
const STATE_DISTRACTORS_JA = [
  '疲れていることを伝えている', '楽しいという気持ちを伝えている',
  'お腹が空いていることを伝えている', '眠いことを伝えている',
  '好きだという気持ちを伝えている', '帰りたいという気持ちを伝えている',
]
const SOCIAL_DISTRACTORS_JA = [
  'お礼を言っている', 'お別れの挨拶をしている', '自己紹介をしている', '声をかけている',
]
const REQUEST_DISTRACTORS_JA = [
  '手伝ってほしいとお願いしている', '静かにするようにお願いしている',
  '一緒に行こうと誘っている', '準備するようにお願いしている',
  '座るようにお願いしている', '手を洗うようにお願いしている',
]

const QUESTION_DISTRACTORS_EN = [
  'Asking where you go', 'Asking what you eat', 'Asking how you feel',
  'Asking about the time', 'Asking who you are with', 'Asking what you usually do',
]
const STATEMENT_DISTRACTORS_EN = [
  'Saying you eat breakfast', 'Saying you get ready to leave',
  'Saying you brush your teeth', 'Saying you make dinner',
  'Saying you go for a walk', 'Saying you read a book',
  'Saying you take a shower', 'Saying you go to bed',
]
const STATE_DISTRACTORS_EN = [
  'Expressing that you are tired', 'Expressing that you are happy',
  'Expressing that you are hungry', 'Expressing that you are sleepy',
  'Expressing that you like something', 'Expressing that you want to go home',
]
const SOCIAL_DISTRACTORS_EN = [
  'Saying thank you', 'Saying goodbye', 'Introducing yourself', 'Greeting someone',
]
const REQUEST_DISTRACTORS_EN = [
  'Requesting help', 'Requesting someone to be quiet',
  'Suggesting to go together', 'Requesting someone to get ready',
  'Instructing to sit down', 'Instructing to wash hands',
]

function getDistractorPool(sentenceType: SentenceType, isJa: boolean): string[] {
  // Strict same-family pools — NO cross-family mixing
  switch (sentenceType) {
    case 'wh_question':
    case 'yes_no_question':
      return isJa ? QUESTION_DISTRACTORS_JA : QUESTION_DISTRACTORS_EN
    case 'declarative_action':
      return isJa ? STATEMENT_DISTRACTORS_JA : STATEMENT_DISTRACTORS_EN
    case 'declarative_state':
      return isJa ? STATE_DISTRACTORS_JA : STATE_DISTRACTORS_EN
    case 'greeting_social':
      return isJa ? SOCIAL_DISTRACTORS_JA : SOCIAL_DISTRACTORS_EN
    case 'request_instruction':
      return isJa ? REQUEST_DISTRACTORS_JA : REQUEST_DISTRACTORS_EN
  }
}

/** Hard rejection: a choice must belong to the same family as the sentence type.
 *  Returns false if ANY cross-family signal is detected. Zero tolerance. */
function isChoiceFamilyValid(label: string, sentenceType: SentenceType): boolean {
  // Detect family signals in the label
  const sigQuestion = /聞いている$/.test(label) || /^Asking /.test(label)
  const sigStatement = /ことを伝えている$/.test(label) || /^Saying you /.test(label)
  const sigState = /気持ち|状態|伝えている$/.test(label) || /^Expressing /.test(label)
  const sigSocial = /挨拶|お礼|お別れ|自己紹介|声をかけ/.test(label) || /^(Saying (thank|goodbye)|Introducing|Greeting)/.test(label)
  const sigRequest = /お願い|誘って/.test(label) || /^(Requesting |Instructing |Suggesting )/.test(label)

  switch (sentenceType) {
    case 'wh_question':
    case 'yes_no_question':
      // Only question-family allowed
      if (sigStatement || sigState || sigSocial || sigRequest) return false
      return true
    case 'declarative_action':
      // Only statement-family allowed
      if (sigQuestion || sigSocial || sigRequest) return false
      return true
    case 'declarative_state':
      // Only state-family allowed
      if (sigQuestion || sigStatement || sigSocial || sigRequest) return false
      return true
    case 'greeting_social':
      // Only social-family allowed
      if (sigQuestion || sigStatement || sigState || sigRequest) return false
      return true
    case 'request_instruction':
      // Only request-family allowed
      if (sigQuestion || sigStatement || sigState || sigSocial) return false
      return true
  }
}

// ── Choice builder ──

function generateAiQuestionChoices(
  sentence: string,
  uiText: LessonCopy['activeCard'],
): AiQuestionChoice[] {
  const isJa = /[\u3000-\u9FFF]/.test(uiText.aiQInstruction)
  const classified = classifySentence(sentence)
  const correctLabel = isJa ? buildCorrectLabelJa(classified) : buildCorrectLabelEn(classified)

  const pool = getDistractorPool(classified.sentenceType, isJa)
  const distractors = pool
    .filter(d => d !== correctLabel && isChoiceFamilyValid(d, classified.sentenceType))
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)

  const meaningChoices: AiQuestionChoice[] = [
    { label: correctLabel, isCorrect: true },
    ...distractors.map(l => ({ label: l, isCorrect: false })),
  ].sort(() => Math.random() - 0.5)

  return [
    ...meaningChoices,
    { label: uiText.aiQChoiceUnsure, isCorrect: false },
  ]
}

function AiQuestionListenStage({
  item,
  uiText,
  onInputChange,
  ctaLabel,
}: {
  item: LessonBlockItem
  uiText: LessonCopy['activeCard']
  onInputChange: (value: string) => void
  ctaLabel?: string
}) {
  const questionText = (item as LessonBlockItem & { aiQuestionText?: string | null }).aiQuestionText
    ?? item.answer?.trim()
    ?? item.prompt?.trim()
    ?? ''

  const authoredChoices = (item as LessonBlockItem & { aiQuestionChoices?: { label: string; isCorrect: boolean }[] | null }).aiQuestionChoices
  const [choices] = useState(() => {
    if (authoredChoices && authoredChoices.length >= 2) {
      const shuffled = [...authoredChoices].sort(() => Math.random() - 0.5)
      return [...shuffled, { label: uiText.aiQChoiceUnsure, isCorrect: false }]
    }
    return generateAiQuestionChoices(questionText, uiText)
  })
  const sentenceType = useMemo(() => classifySentence(questionText).sentenceType, [questionText])
  const isDeclarative = sentenceType === 'declarative_action' || sentenceType === 'declarative_state'
  const [selected, setSelected] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [showHint, setShowHint] = useState(false)
  // Speaking phase (unlocked after correct intent — skipped for declaratives)
  const [speakingUnlocked, setSpeakingUnlocked] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [spokenTranscript, setSpokenTranscript] = useState('')
  const [speakingDone, setSpeakingDone] = useState(false)
  const audioUrlRef = useRef<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const playQuestion = useCallback(async () => {
    if (isPlaying || !questionText) return
    setIsPlaying(true)
    try {
      let url = audioUrlRef.current
      if (!url) {
        const authHdrs = await getAuthHeaders()
        const res = await fetch('/api/audio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHdrs },
          body: JSON.stringify({ text: questionText, speed: 0.85 }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.audio_url) { url = data.audio_url; audioUrlRef.current = url }
        }
      }
      if (url) {
        const audio = new Audio(url)
        audio.onended = () => { setIsPlaying(false); setHasPlayed(true) }
        audio.onerror = () => { setIsPlaying(false); setHasPlayed(true) }
        audio.play().catch(() => { setIsPlaying(false); setHasPlayed(true) })
      } else {
        setIsPlaying(false)
        setHasPlayed(true)
      }
    } catch {
      setIsPlaying(false)
      setHasPlayed(true)
    }
  }, [isPlaying, questionText])

  const handleSelect = (index: number) => {
    if (selected !== null) return
    setSelected(index)
    const choice = choices[index]
    if (choice.isCorrect) {
      if (isDeclarative) {
        // Declarative sentences: complete immediately, no speaking phase
        onInputChange('[ai-question-done]')
        return
      }
      setSpeakingUnlocked(true)
    } else if (choice.label === uiText.aiQChoiceUnsure) {
      setShowHint(true)
      setTimeout(() => { setSelected(null); setShowHint(false) }, 3000)
    } else {
      // Wrong answer — auto-reset after brief feedback
      setTimeout(() => { setSelected(null) }, 1500)
    }
  }

  const isCorrect = selected !== null && choices[selected]?.isCorrect

  // Recording handler
  const handleStartRecording = async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        setIsRecording(false)
        // Score the recording
        try {
          const formData = new FormData()
          formData.append('file', blob, 'recording.webm')
          formData.append('expectedText', questionText)
          const authHdrs = await getAuthHeaders()
          const res = await fetch('/api/pronunciation/score', { method: 'POST', body: formData, headers: authHdrs })
          if (res.ok) {
            const data = await res.json()
            setSpokenTranscript(data.transcript?.trim() || '')
          }
        } catch { /* non-blocking */ }
        setSpeakingDone(true)
        onInputChange('[ai-question-done]')
      }
      recorder.start()
      setIsRecording(true)
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 6000)
    } catch {
      setIsRecording(false)
    }
  }

  const handleStopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  return (
    <div className="mt-4">
      {/* Audio control */}
      <div className="flex flex-col items-center gap-3">
        {isPlaying && (
          <p className="text-sm font-semibold text-blue-600">{uiText.aiConvSpeaking}</p>
        )}
        {!isPlaying && !hasPlayed && (
          <button type="button" onClick={playQuestion} className={BTN_PRIMARY}>
            {ICON_LISTEN}{uiText.aiQPlayButton}
          </button>
        )}
        {!isPlaying && hasPlayed && !speakingUnlocked && (
          <button
            type="button"
            onClick={playQuestion}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
          >
            <img src="/images/lp/icons/listen.webp" alt="" className="h-4 w-4" aria-hidden="true" />{uiText.aiQReplayButton}
          </button>
        )}
      </div>

      {/* Phase 1: Intent selection */}
      {!speakingUnlocked && (
        <>
          {hasPlayed && selected === null && (
            <p className="mt-4 text-center text-sm text-[#5a5a7a]">{uiText.aiQInstruction}</p>
          )}

          {hasPlayed && (
            <div className="mx-auto mt-4 grid max-w-[360px] grid-cols-1 gap-2">
              {choices.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(i)}
                  disabled={selected !== null}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selected === null
                      ? 'border-[#E8E4DF] bg-white text-[#1a1a2e] hover:bg-[#FAF8F5]'
                      : selected === i
                        ? c.isCorrect
                          ? 'border-[#22c55e] bg-[#F0FDF4] text-[#22c55e]'
                          : 'border-[#F5A623] bg-[#FFF9EC] text-[#F5A623]'
                        : c.isCorrect && selected !== null
                          ? 'border-[#22c55e] bg-[#F0FDF4] text-[#22c55e]'
                          : 'border-[#E8E4DF] bg-white text-[#b5b5c3]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Wrong answer — brief feedback then auto-reset */}
          {selected !== null && !isCorrect && !showHint && (
            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-[#F5A623]">{uiText.aiQIncorrect}</p>
            </div>
          )}

          {/* Hint for unsure */}
          {showHint && (
            <div className="mx-auto mt-3 max-w-[360px] rounded-xl bg-blue-50 px-4 py-3">
              <p className="text-xs leading-5 text-blue-700">{uiText.aiQHint}</p>
            </div>
          )}
        </>
      )}

      {/* Phase 2: Speaking response (unlocked after correct intent) */}
      {speakingUnlocked && !speakingDone && (
        <div className="mt-5 text-center">
          <p className="text-sm font-bold text-[#22c55e]">{uiText.aiQCorrect}</p>
          <p className="mt-3 text-sm text-[#5a5a7a]">{uiText.aiQSpeakPrompt}</p>
          <div className="mt-4 flex justify-center gap-3">
            {!isRecording ? (
              <button type="button" onClick={handleStartRecording} className={BTN_PRIMARY}>
                {ICON_SPEAK}{uiText.aiQRecordButton}
              </button>
            ) : (
              <button type="button" onClick={handleStopRecording} className={BTN_STOP}>
                {uiText.aiQStopButton}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={playQuestion}
            disabled={isPlaying}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
          >
            <img src="/images/lp/icons/listen.webp" alt="" className="h-4 w-4" aria-hidden="true" />{uiText.aiQReplayButton}
          </button>
        </div>
      )}

      {/* Phase 3: Done — show feedback + next */}
      {speakingDone && (
        <div className="mt-5 text-center">
          <p className="text-sm font-bold text-[#22c55e]">{uiText.aiQSpokenFeedback}</p>
          {spokenTranscript && (
            <p className="mt-2 rounded-xl bg-[#FAF7F2] px-4 py-2 text-sm text-[#5a5a7a]">{spokenTranscript}</p>
          )}
          <button
            type="button"
            onClick={() => { window.dispatchEvent(new Event('next-step')) }}
            className="mt-4 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
          >
            {ctaLabel ?? uiText.scaffoldNextButton}
          </button>
        </div>
      )}
    </div>
  )
}

async function fetchAudioUrl(text: string, speed?: number): Promise<string | null> {
  if (!text.trim()) return null
  try {
    const baseUrl =
      typeof window !== 'undefined' ? '' : 'http://localhost:3000'
    const body: Record<string, unknown> = { text }
    if (typeof speed === 'number') body.speed = speed
    const res = await fetch(`${baseUrl}/api/audio/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.audio_url ?? null
  } catch {
    return null
  }
}

function AudioCompareCard({
  correctUrl,
  recordedUrl,
  uiText,
}: {
  correctUrl: string
  recordedUrl: string
  uiText: LessonCopy['activeCard']
}) {
  const [playing, setPlaying] = useState<'compare' | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function stopCurrent() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    setPlaying(null)
  }

  function playCompare() {
    stopCurrent()
    setPlaying('compare')

    const correct = new Audio(correctUrl)
    correct.onended = () => {
      setTimeout(() => {
        const user = new Audio(recordedUrl)
        audioRef.current = user
        user.onended = () => setPlaying(null)
        user.onerror = () => setPlaying(null)
        user.play().catch(() => setPlaying(null))
      }, 300)
    }
    correct.onerror = () => setPlaying(null)
    audioRef.current = correct
    correct.play().catch(() => setPlaying(null))
  }

  useEffect(() => {
    return () => stopCurrent()
  }, [])

  const btnBase = 'w-full rounded-xl px-4 py-3 text-sm font-bold transition'

  return (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={() => playing === 'compare' ? stopCurrent() : playCompare()}
        className={playing === 'compare'
          ? `${btnBase} max-w-[280px] border border-[#D6D3D1] bg-[#F3F1EC] text-[#5a5a7a]`
          : `${btnBase} max-w-[280px] border border-[#D6D3D1] bg-white text-[#5a5a7a] hover:bg-[#F3F1EC]`}
      >
        {playing === 'compare' ? uiText.comparingAudioLabel : uiText.compareAudioButton}
      </button>
    </div>
  )
}

function ScaffoldAutoPlay({
  scaffoldSteps,
  semanticChunks: _semanticChunks,
  nativeHint,
  lessonImageUrl,
  dynamicConversationHeading,
  scenarioLabel: _scenarioLabel,
  audioUrl: _audioUrl,
  uiText,
  level,
  itemId: _itemId,
  ctaLabel,
}: {
  scaffoldSteps: string[]
  semanticChunks: SemanticChunk[] | null | undefined
  nativeHint?: string | null
  lessonImageUrl: string | null
  dynamicConversationHeading: string
  scenarioLabel: string
  audioUrl: string
  uiText: LessonCopy['activeCard']
  level?: string
  itemId?: string
  ctaLabel?: string
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [_stepAudioUrls, setStepAudioUrls] = useState<(string | null)[]>([])
  const stepAudioUrlsRef = useRef<(string | null)[]>([])
  const [playRequested, setPlayRequested] = useState(false)
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false)
  const [_hasPlayedMixStep, setHasPlayedMixStep] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)
  /** Guards against duplicate play triggers for the same step. */
  const playingStepRef = useRef<number>(-1)
  const meaningAudioUrlRef = useRef<string | null>(null)
  const totalSteps = Math.max(Math.min(scaffoldSteps.length, 3), 1)
  const stepsKey = scaffoldSteps.slice(0, 3).join('||')


  /** Ref for the current safety timer so cleanup can clear it. */
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Ref for Step 2 text-pause timer. */
  const mixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Stop any in-flight audio/timers and clear all refs. */
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null }
    if (mixTimerRef.current) { clearTimeout(mixTimerRef.current); mixTimerRef.current = null }
    playingStepRef.current = -1
  }, [])

  /**
   * SINGLE SOURCE OF TRUTH for scaffold playback.
   * Directly plays the given step. Called by restart, manual play, and auto-advance.
   */
  const startPlayback = useCallback((stepIndex: number) => {
    cleanup()
    setCurrentStep(stepIndex)
    // Do NOT setIsPlaying(false) here — it causes a one-frame flicker between passes.
    // Each branch sets isPlaying when audio actually starts or stops.
    playingStepRef.current = stepIndex

    // Step 2 (meaning bridge): English chunk audio → native meaning audio → advance
    if (stepIndex === 1) {
      setHasPlayedMixStep(true)
      const engUrl = stepAudioUrlsRef.current[1] // English chunk audio (not full sentence)
      const jpUrl = meaningAudioUrlRef.current

      let mixAdvanced = false
      const advanceFromMix = (_reason: string) => {
        if (mixAdvanced) return
        mixAdvanced = true
        if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null }
        const next = stepIndex + 1
        if (next >= totalSteps) { setIsPlaying(false); setAllDone(true) } else { startPlayback(next) }
      }

      const playMeaningAudio = () => {
        const url = jpUrl
        if (!url) { advanceFromMix('no-jp-url'); return }
        const jp = new Audio(url)
        audioRef.current = jp
        jp.onended = () => advanceFromMix('jp-onended')
        jp.onerror = () => advanceFromMix('jp-onerror')
        safetyTimerRef.current = setTimeout(() => advanceFromMix('jp-timeout'), 8_000)
        jp.play().catch(() => advanceFromMix('jp-play-rejected'))
      }

      if (engUrl) {
        const eng = new Audio(engUrl)
        audioRef.current = eng
        eng.playbackRate = 0.85
        let engEnded = false
        eng.onended = () => { if (!engEnded) { engEnded = true; playMeaningAudio() } }
        eng.onerror = () => { if (!engEnded) { engEnded = true; playMeaningAudio() } }
        safetyTimerRef.current = setTimeout(() => { if (!engEnded) { engEnded = true; playMeaningAudio() } }, 8_000)
        setIsPlaying(true)
        eng.play().catch(() => { engEnded = true; playMeaningAudio() })
      } else {
        playMeaningAudio()
      }
      return
    }

    const url = stepAudioUrlsRef.current[stepIndex]
    if (!url) {
      // No audio URL — skip to next step
      const next = stepIndex + 1
      if (next >= totalSteps) {
        setAllDone(true)
      } else {
        startPlayback(next)
      }
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio
    let ended = false

    const advance = (_reason: string) => {
      if (ended) return
      ended = true
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null }
      const next = stepIndex + 1
      if (next >= totalSteps) {
        setIsPlaying(false)
        setAllDone(true)
      } else {
        // Do not setIsPlaying(false) — next pass will start immediately, avoiding flicker
        startPlayback(next)
      }
    }

    audio.onended = () => advance('onended')
    audio.onerror = () => advance('onerror')
    safetyTimerRef.current = setTimeout(() => advance('timeout'), 8_000)

    audio.play()
      .then(() => {
        setIsPlaying(true)
        setHasPlayedOnce(true)
      })
      .catch(() => {
        if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null }
        ended = true
        setIsPlaying(false)
        // Autoplay blocked — user can tap play
      })
  }, [totalSteps, cleanup])

  // Fetch audio URLs on mount / when steps change, then auto-start
  useEffect(() => {
    cancelledRef.current = false
    cleanup()
    setCurrentStep(0)
    setAllDone(false)
    setIsPlaying(false)
    setLoading(true)
    setPlayRequested(false)
    setHasPlayedOnce(false)
    setHasPlayedMixStep(false)
    setStepAudioUrls([])

    const texts = scaffoldSteps.slice(0, 3)
    if (texts.length === 0) {
      setLoading(false)
      return
    }

    const stepSpeeds: (number | undefined)[] =
      level === 'beginner' ? [0.85, undefined, 1.0] : [undefined, undefined, undefined]

    // Pre-fetch step audio + native meaning audio in parallel
    // prepareTtsInput auto-normalizes Japanese kanji readings as fallback
    const meaningText = prepareTtsInput(nativeHint?.trim() || '')
    const fetchAll = Promise.all([
      Promise.all(texts.map((t, i) => fetchAudioUrl(t, stepSpeeds[i]))),
      meaningText ? fetchAudioUrl(meaningText) : Promise.resolve(null),
    ])
    fetchAll.then(([urls, meaningUrl]) => {
      if (!cancelledRef.current) {
        setStepAudioUrls(urls)
        stepAudioUrlsRef.current = urls
        meaningAudioUrlRef.current = meaningUrl
        setLoading(false)
      }
    })

    return () => { cancelledRef.current = true; cleanup() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsKey])

  // No auto-play — user must press the play button to start

  const handleRestart = () => {
    cleanup()
    setAllDone(false)
    setHasPlayedOnce(false)
    setHasPlayedMixStep(false)
    setPlayRequested(false)
    startPlayback(0)
  }

  const handleManualPlay = () => {
    startPlayback(currentStep)
  }

  const playingLabel = uiText.scaffoldPlayingLabel
    .replace('{current}', String(currentStep + 1))
    .replace('{total}', String(totalSteps))

  // Scaffold is idle when not loading, not playing, not auto-advancing, and not done
  const _isScaffoldIdle = !loading && !isPlaying && !playRequested && !allDone

  return (
    <div className="mt-4 text-center">
      <div className="rounded-[14px] border border-[#E8E4DF] bg-white px-4 py-6">
        {lessonImageUrl && (
          <LessonSceneImage src={lessonImageUrl} alt={dynamicConversationHeading} />
        )}

        {/* Step 2 (meaning bridge): audio-only, no visible text */}

        {/* Hide instruction text during mix step — phrase pair is sufficient */}
        <p className="mt-4 text-sm text-[#5a5a7a]">
          {uiText.scaffoldInstruction}
        </p>

        {loading && (
          <p className="mt-3 text-sm text-[#7b7b94]">{uiText.scaffoldAudioPreparing}</p>
        )}

        {isPlaying && (
          <p className="mt-3 text-sm font-semibold text-blue-600">
            {playingLabel}
          </p>
        )}


        {/* Play button — shown before first play, or restart at step 3/3 */}
        {!loading && !allDone && !isPlaying && (
          <div className="mt-4 flex justify-center">
            {!hasPlayedOnce ? (
              <button
                type="button"
                onClick={handleManualPlay}
                className={BTN_PRIMARY}
              >
                {ICON_LISTEN}{uiText.scaffoldPlayButton}
              </button>
            ) : currentStep === 2 ? (
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
              >
                {uiText.scaffoldRestartButton}
              </button>
            ) : null}
          </div>
        )}

        {allDone && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-green-700">
              {uiText.scaffoldAutoPlayDoneLabel}
            </p>

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-100"
              >
                {uiText.scaffoldRestartButton}
              </button>
            </div>
          </div>
        )}
      </div>

      {allDone && (
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new Event('next-step'))
          }}
          className="mt-6 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
        >
          {ctaLabel ?? uiText.scaffoldNextButton}
        </button>
      )}
    </div>
  )
}

export function LessonActiveCard({
  block,
  item,
  progress,
  currentQuestionIndex,
  totalQuestions,
  inputValue: _inputValue,
  onInputChange,
  onCheck: _onCheck,
  onStartRepeatFromListen,
  onRetryListenFromRepeat,
  onRetryListenFromScaffold: _onRetryListenFromScaffold,
  onGoBackToStage,
  repeatAutoStartNonce,
  listenResetNonce,
  currentStageId,
  copy: _copy,
  isLessonComplete: _isLessonComplete,
  targetLanguageLabel: _targetLanguageLabel,
  scenarioLabel,
  previousPhrases = [],
  level,
  lessonSessionId,
  responseStage: _responseStage = 'typing',
}: LessonActiveCardProps) {
  const repeatResultRef = useRef<HTMLDivElement | null>(null)
  const listenAudioRef = useRef<HTMLAudioElement | null>(null)
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaChunksRef = useRef<Blob[]>([])
  const stopFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAutoStartedNonceRef = useRef(0)
  const previousRecordedAudioUrlRef = useRef<string | null>(null)
  const _resultRef = useRef<HTMLDivElement | null>(null)

  const stageTone = useMemo(() => getStageTone({ currentStageId }), [currentStageId])
  const sceneId = block.sceneId ?? null
  // Heading: prefer scenarioLabel when it is a valid concrete JP scene label.
  // Reject: English text, generic labels, marketing copy, stale meta.
  const _isValidSceneLabel = (s: string) =>
    /[\u3000-\u9FFF]/.test(s) && s !== '英語' && s !== '日常の短いやり取り'
  const dynamicConversationHeading =
    (scenarioLabel && _isValidSceneLabel(scenarioLabel) ? scenarioLabel : null)
    || (sceneId ? buildScenarioLabel(sceneId) : null)
    || block.title
    || _copy.overviewCard.defaultSceneLabel
  // Scene image resolution: prefer centralized resolver, fall back to legacy item.image_url
  const sceneCategory = block.sceneCategory ?? null
  const sceneImages = useMemo(
    () => sceneId && sceneCategory ? resolveSceneImages(sceneCategory, sceneId) : null,
    [sceneCategory, sceneId]
  )
  const stageStep: StepType | null =
    currentStageId === 'listen' ? 'listen'
    : currentStageId === 'repeat' ? 'repeat'
    : currentStageId === 'ai_question' ? 'ai_question'
    : currentStageId === 'ai_conversation' ? 'conversation'
    : currentStageId === 'scaffold_transition' ? 'predict'
    : null
  const resolvedImage = sceneImages && stageStep ? getStepImage(sceneImages, stageStep) : undefined
  // Fall back to legacy image_url only if NOT from deleted /images/backgrounds/
  const legacyUrl = (item as LessonBlockItem & { image_url?: string | null }).image_url?.trim() ?? null
  const legacyIsValid = legacyUrl && !legacyUrl.startsWith('/images/backgrounds/')
  const rawImageUrl = resolvedImage ?? (legacyIsValid ? legacyUrl : null)
  const lessonImageUrl = rawImageUrl && isValidLessonImage(rawImageUrl) ? rawImageUrl : null

  // Resolve conversation flavor for AI conversation prompts
  const conversationFlavorContext: FlavorContext | null = useMemo(() => {
    const blockSceneId = block.sceneId
    const blockRegion = block.region ?? 'en_us_general'
    const blockAge = block.ageGroup ?? '20s'
    if (!blockSceneId || !level) return null

    // Get catalog flavor if available
    const enrichment = getLessonContentRepository().getConversationEnrichment(blockSceneId, blockRegion, blockAge, level)
    const catalogFlavor = enrichment?.flavor

    // Merge region context for richer immersion
    const regionCtx = getRegionContext(blockRegion)

    // Combine: catalog flavor is primary, region context fills gaps
    const cultureNotes = [
      ...(catalogFlavor?.cultureNotes ?? []),
      ...(regionCtx?.cultureNotes ?? []),
    ].filter((v, i, a) => a.indexOf(v) === i) // dedup

    const setting = catalogFlavor?.setting
      ?? (regionCtx ? `${regionCtx.atmosphere} atmosphere` : undefined)

    return {
      sceneId: blockSceneId,
      region: blockRegion,
      ageGroup: blockAge,
      topics: [
        ...(catalogFlavor?.topics ?? []),
        ...(regionCtx?.storeExamples?.slice(0, 2) ?? []),
      ].filter((v, i, a) => a.indexOf(v) === i),
      references: catalogFlavor?.references,
      cultureNotes: cultureNotes.length > 0 ? cultureNotes : undefined,
      setting,
      lifestyle: catalogFlavor?.lifestyle,
    }
  }, [block.sceneId, block.region, block.ageGroup, level])


  const audioUrl = getItemAudioUrl(item)
  const rawAudioStatus = (item as LessonBlockItem & { audio_status?: 'ok' | 'fallback' | 'failed' }).audio_status
  // If audio_status is set (hydration complete), use it. If not set and no URL, pending.
  // Timeout: if pending lasts > 30s, treat as failed.
  const [audioPendingTimedOut, setAudioPendingTimedOut] = useState(false)
  const audioPendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const isPending = !audioUrl && rawAudioStatus == null
    if (isPending && !audioPendingTimedOut) {
      audioPendingTimerRef.current = setTimeout(() => setAudioPendingTimedOut(true), 30_000)
    } else if (audioPendingTimerRef.current) {
      clearTimeout(audioPendingTimerRef.current)
      audioPendingTimerRef.current = null
    }
    if (!isPending) setAudioPendingTimedOut(false)
    return () => { if (audioPendingTimerRef.current) clearTimeout(audioPendingTimerRef.current) }
  }, [audioUrl, rawAudioStatus, audioPendingTimedOut])

  const audioStatus = audioPendingTimedOut ? 'failed' : (rawAudioStatus ?? 'ok')
  const _isAudioPending = !audioUrl && audioStatus !== 'failed'

  const TOTAL_STAGES = 6

  // currentIndex is computed later after guideMessageOverride is declared
  let currentIndex = 0
  const _questionProgressPercent =
    ((currentIndex + 1) / TOTAL_STAGES) * 100

  const [playbackRate, setPlaybackRate] = useState<0.75 | 1.0 | 1.25>(1.0)
  const [isRecordingRepeat, setIsRecordingRepeat] = useState(false)
  const [repeatTranscript, setRepeatTranscript] = useState('')
  const [repeatScore, setRepeatScore] = useState<number | null>(null)
  const [repeatIsPass, setRepeatIsPass] = useState(false)
  const prevRepeatScoreRef = useRef<number | null>(null)
  const [repeatScoreBreakdown, setRepeatScoreBreakdown] = useState<RepeatScoreBreakdown | null>(
    null
  )
  const [missingWords, setMissingWords] = useState<string[]>([])
  const [, setMatchedWords] = useState<string[]>([])
  const [repeatAttemptCount, setRepeatAttemptCount] = useState(0)
  const uiText = _copy.activeCard
  const _AUDIO_PREPARING_LABEL = uiText.audioPreparing

  const scaffoldSteps = useMemo(() => getScaffoldSteps(item), [item])
  // Use the exact target-language text from scaffold steps (same text used for audio)
  const scaffoldTargetText = scaffoldSteps[2] ?? scaffoldSteps[0] ?? ''
  const rawCatalogChunks = (item as LessonBlockItem & { semantic_chunks?: SemanticChunk[] | null }).semantic_chunks ?? null
  const scaffoldSemanticChunks = useMemo(
    () => extractSemanticChunks(scaffoldTargetText, rawCatalogChunks),
    [scaffoldTargetText, rawCatalogChunks]
  )
  const [scaffoldStepIndex, setScaffoldStepIndex] = useState(0)
  
  const stageNames = [
    uiText.timelineListen,
    uiText.timelineRepeat,
    uiText.stageScaffoldLabel,
    uiText.timelineAiQuestion,
    uiText.timelineTyping,
    uiText.timelineAiConversation,
  ]
  const _questionLabelText = `${stageNames[currentIndex] ?? ''} (${currentIndex + 1} / ${TOTAL_STAGES})`
  const _questionProgressLabelText = formatCopy(uiText.questionProgressLabel, {
    current: currentIndex + 1,
  })
  
  const _scaffoldStepLabelText = formatCopy(uiText.scaffoldStepLabel, {
    current: scaffoldStepIndex + 1,
    total: scaffoldSteps.length,
  })
  
  const _repeatAttemptCountLabelText = formatCopy(uiText.repeatAttemptCountLabel, {
    current: repeatAttemptCount,
    max: 3,
  })

  const [repeatRecognitionError, setRepeatRecognitionError] = useState<string | null>(null)
  const [listenPlaybackError, setListenPlaybackError] = useState<string | null>(null)
  const [recordedPlaybackError, setRecordedPlaybackError] = useState<string | null>(null)
  const [isListenPlaying, setIsListenPlaying] = useState(false)
  const isFirstListenPlayRef = useRef(true)
  const wasFirstListenPlayRef = useRef(false)
  const audioPlayLoggedSessionRef = useRef<string | null>(null)
  const audioCompletedLoggedSessionRef = useRef<string | null>(null)
  const [isScoringRepeat, setIsScoringRepeat] = useState(false)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)

  const timelineSteps = [
    uiText.timelineListen,
    uiText.timelineRepeat,
    uiText.stageScaffoldLabel,
    uiText.timelineAiQuestion,
    uiText.timelineAiConversation,
    uiText.challengeTitle,
  ]

  const _typingResultClassName =
    progress.isCorrect == null ? '' : progress.isCorrect ? 'text-green-700' : 'text-amber-700'

  const isJaUi = /[\u3000-\u9FFF]/.test(uiText.scaffoldNextButton)
  const isLastBlock = currentQuestionIndex >= totalQuestions - 1
  const ctaLabel = getCtaLabel(currentStageId, isLastBlock, uiText)

  // Mini review between stages
  const [pendingMiniReview, setPendingMiniReview] = useState<MiniReviewItem | null>(null)
  const miniReviewSentence = item.answer?.trim() || item.prompt?.trim() || ''
  const itemRelatedExpressions = (item as LessonBlockItem & { related_expressions?: { en: string }[] | null }).related_expressions
  const miniSlots = useMemo(() => {
    const words = miniReviewSentence.split(/\s+/)
    let pSlot = ''
    let pAlt = ''
    for (let i = 0; i < words.length; i++) {
      if (/^(with|to|about)$/i.test(words[i]) && words[i + 1]) {
        pSlot = words.slice(i + 1, i + 3).join(' ').replace(/[.,!?]/g, '')
        break
      }
    }
    const last = words[words.length - 1]?.replace(/[.,!?]/g, '') ?? ''
    const tSlot = /^(today|yesterday|tomorrow|tonight)$/i.test(last) ? last : ''
    const tAlt = tSlot.toLowerCase() === 'today' ? 'yesterday' : 'today'
    const pAlts = ['my teacher', 'my boss', 'my coworker']
    pAlt = pSlot ? (pAlts.find((p) => p.toLowerCase() !== pSlot.toLowerCase()) ?? 'my teacher') : ''
    return { personSlot: pSlot, personAlt: pAlt, timeSlot: tSlot, timeAlt: tAlt }
  }, [miniReviewSentence])

  // Stage validation: mini-review must pass before CTA becomes visible
  const [stageValidated, setStageValidated] = useState(false)
  const [_validationAttempted, setValidationAttempted] = useState(false)
  const [_validationView, setValidationView] = useState<'result' | 'challenge'>('result')
  const [_challengeResult, setChallengeResult] = useState<'correct' | 'incorrect' | null>(null)
  const [_challengePhase, setChallengePhase] = useState<'intro' | 'question' | 'result'>('intro')
  const [_challengeAttempt, _setChallengeAttempt] = useState(0)
  const [_preloadedChallengeAudioUrl, setPreloadedChallengeAudioUrl] = useState<string | null>(null)
  const [guideMessageOverride, setGuideMessageOverride] = useState<string | null>(null)
  const [convResetNonce, _setConvResetNonce] = useState(0)

  // Compute currentIndex now that guideMessageOverride is declared
  const isChallengePhase = currentStageId === 'ai_conversation' && guideMessageOverride != null
  currentIndex =
    currentStageId === 'listen' ? 0
    : currentStageId === 'repeat' ? 1
    : currentStageId === 'scaffold_transition' ? 2
    : currentStageId === 'ai_question' ? 3
    : currentStageId === 'ai_conversation' ? (isChallengePhase ? 5 : 4)
    : 0

  // Reset validation when stage changes
  useEffect(() => {
    setStageValidated(false)
    setValidationAttempted(false)
    setValidationView('result')
    setChallengeResult(null)
    setChallengePhase('intro')
    setPendingMiniReview(null)
    setPreloadedChallengeAudioUrl(null)
  }, [currentStageId])

  // Preload challenge audio as soon as pendingMiniReview is set (during intro screen)
  useEffect(() => {
    if (!pendingMiniReview?.audioText) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/audio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pendingMiniReview.audioText, speed: 0.8 }),
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          if (data.audio_url) setPreloadedChallengeAudioUrl(data.audio_url)
        }
      } catch { /* non-blocking */ }
    })()
    return () => { cancelled = true }
  }, [pendingMiniReview])

  // Auto-trigger validation for stages where task completion is tracked by sub-components
  // Sub-components dispatch 'next-step' which now goes through normally (no interceptor)
  // but we want to show validation BEFORE the CTA, so for sub-component stages,
  // we skip mini-review validation and let them advance directly
  // (mini-review only applies to listen/repeat where the CTA is in the main card)
  useEffect(() => {
    if (currentStageId === 'scaffold_transition' || currentStageId === 'ai_question') {
      setStageValidated(true) // Sub-components manage their own flow
    }
  }, [currentStageId])

  // Generate validation challenge for the current stage
  const _triggerValidation = useCallback(() => {
    if (stageValidated || pendingMiniReview) return

    const stageForReview =
      currentStageId === 'listen' ? 'listen' as const
      : currentStageId === 'repeat' ? 'repeat' as const
      : currentStageId === 'scaffold_transition' ? 'scaffold' as const
      : currentStageId === 'ai_question' ? 'ai_question' as const
      : null

    if (!stageForReview) { setStageValidated(true); return }

    const review = generateMiniReview(
      stageForReview,
      miniReviewSentence,
      miniSlots.personSlot,
      miniSlots.personAlt,
      miniSlots.timeSlot,
      miniSlots.timeAlt,
      uiText,
      itemRelatedExpressions
    )

    if (review) {
      setPendingMiniReview(review)
      setValidationAttempted(true)
      setChallengeResult(null)
      setValidationView('challenge')
    } else {
      // No valid review — auto-validate
      setStageValidated(true)
    }
  }, [currentStageId, stageValidated, pendingMiniReview, miniReviewSentence, miniSlots, uiText])
  const guideCharacter = useMemo(() => getGuideCharacter({
    currentStageId,
    isRecordingRepeat,
    isListenPlaying,
    isCorrect: progress.isCorrect,
    uiText,
    level,
    uiLang: isJaUi ? 'ja' : 'en',
  }), [currentStageId, isRecordingRepeat, isListenPlaying, progress.isCorrect, uiText, level, isJaUi])

  const mediaRecordingSupported = useMemo(() => {
    if (typeof window === 'undefined') return false
    return (
      typeof window.MediaRecorder !== 'undefined' &&
      !!window.navigator?.mediaDevices?.getUserMedia
    )
  }, [])

  useEffect(() => {
    setScaffoldStepIndex(0)
  }, [currentStageId, item.id])

  useEffect(() => {
    if (repeatTranscript && repeatResultRef.current) {
      const offset = window.innerWidth >= 1024 ? 200 : window.innerWidth >= 640 ? 120 : 100
      const rect = repeatResultRef.current.getBoundingClientRect()
      const top = rect.top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [repeatTranscript])

  // Reset first-listen flag when block audio changes
  useEffect(() => {
    isFirstListenPlayRef.current = true
  }, [audioUrl])

  const playListenAudio = useCallback(() => {
    if (!audioUrl) {
      setListenPlaybackError(uiText.audioPreparing)
      setTimeout(() => setListenPlaybackError(null), 2000)
      return
    }

    const audio = listenAudioRef.current
    if (!audio || !audio.src) {
      setListenPlaybackError(uiText.audioPreparing)
      setTimeout(() => setListenPlaybackError(null), 2000)
      return
    }

    setListenPlaybackError(null)

    if (audio.readyState < 2) {
      audio.load()
    }

    audio.currentTime = 0

    // First listen: slightly slower (0.9x) for better comprehension
    // Subsequent listens: use user-selected playback rate
    const isFirst = isFirstListenPlayRef.current
    audio.playbackRate = isFirst ? 0.9 : playbackRate

    // Log audio_play_clicked: exactly once per session, first listen stage only
    if (
      currentStageId === 'listen' &&
      isFirst &&
      lessonSessionId &&
      audioPlayLoggedSessionRef.current !== lessonSessionId
    ) {
      audioPlayLoggedSessionRef.current = lessonSessionId
      try {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'audio_play_clicked',
            properties: {
              user_id: null,
              lesson_run_id: null,
              session_id: lessonSessionId,
              stage_id: 'listen',
              block_id: block.id ?? null,
              scene_key: block.sceneId ?? null,
              occurred_at: new Date().toISOString(),
            },
          }),
          keepalive: true,
        }).catch(() => {})
      } catch { /* fire-and-forget */ }
    }

    // Add brief silence before first play for readiness
    const delay = isFirst ? 150 : 0
    wasFirstListenPlayRef.current = isFirst
    if (isFirst) isFirstListenPlayRef.current = false

    setTimeout(() => {
      audio
        .play()
        .then(() => {
          setListenPlaybackError(null)
        })
        .catch((error) => {
          console.error('listen audio play failed', error)
          setListenPlaybackError(uiText.listenAudioNotReady)
        })
    }, delay)
  }, [audioUrl, playbackRate])

  const stopListenAudio = useCallback(() => {
    const audio = listenAudioRef.current
    audio?.pause()
    if (audio) {
      audio.currentTime = 0
    }
    setIsListenPlaying(false)
  }, [])

  const _playRecordedAudio = useCallback(() => {
    if (!recordedAudioUrl) {
      setRecordedPlaybackError(uiText.repeatPlaybackError)
      return
    }

    const audio = recordedAudioRef.current
    if (!audio || !audio.src) {
      setRecordedPlaybackError(uiText.repeatPlaybackError)
      return
    }

    setRecordedPlaybackError(null)
    audio.currentTime = 0

    audio.play().catch((error) => {
      console.error('recorded audio play failed', error)
      setRecordedPlaybackError(uiText.repeatPlaybackError)
    })
  }, [recordedAudioUrl])

  const scoreRepeatRecording = useCallback(
    async (blob: Blob) => {
      if (isScoringRepeat) return
      const expectedText = getListenSpeechText(item)

      if (!expectedText.trim()) {
        setRepeatRecognitionError(uiText.repeatScoreError)
        return
      }

      const file = new File([blob], 'repeat.webm', {
        type: blob.type || 'audio/webm',
      })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('expectedText', expectedText)
      formData.append('language', 'en')
      formData.append('mode', 'repeat')

      try {
        setIsScoringRepeat(true)

        const authHdrs = await getAuthHeaders()
        const response = await fetch('/api/pronunciation/score', {
          method: 'POST',
          body: formData,
          headers: authHdrs,
        })

        const data = (await response.json()) as PronunciationScoreApiResponse

        if (!response.ok || !data.ok) {
          // No speech detected vs API error: check transcript
          const noSpeech = data.transcript != null && data.transcript.trim() === ''
          setRepeatRecognitionError(noSpeech ? uiText.repeatNoRecordingForScore : uiText.repeatScoreError)
          if (noSpeech) {
            // Reset to retryable state so record button reappears
            setRecordedAudioUrl(null)
            ;(window as unknown as { __lastRecordedBlob: Blob | null }).__lastRecordedBlob = null
          }
          return
        }

        setRepeatTranscript(data.transcript)
        onInputChange(data.transcript)
        prevRepeatScoreRef.current = repeatScore

        // Repeat challenge: strict evaluator (single source of truth)
        const evalResult = evaluateRepeat(
          data.transcript ?? '',
          expectedText,
          data.breakdown?.wordMatch ?? null,
        )

        setRepeatIsPass(evalResult.isPass)
        setRepeatScore(data.totalScore as number)
        setRepeatScoreBreakdown(data.breakdown)
        setMissingWords(data.missingWords ?? [])
        setMatchedWords(data.matchedWords ?? [])
        setRepeatAttemptCount((count) => count + 1)
        setRepeatRecognitionError(null)
      } catch (error) {
        console.error(error)
        setRepeatRecognitionError(uiText.repeatScoreError)
      } finally {
        setIsScoringRepeat(false)
      }
    },
    [isScoringRepeat, item, onInputChange]
  )

  const stopRepeatRecognition = useCallback(() => {
    const recorder = mediaRecorderRef.current

    setIsRecordingRepeat(false)

    if (stopFallbackTimeoutRef.current) {
      clearTimeout(stopFallbackTimeoutRef.current)
      stopFallbackTimeoutRef.current = null
    }

    if (!recorder) {
      stopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      return
    }

    if (recorder.state === 'inactive') {
      stopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      return
    }

    stopFallbackTimeoutRef.current = setTimeout(() => {
      stopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      setIsRecordingRepeat(false)
    }, 800)

    try {
      recorder.requestData?.()
      recorder.stop()
    } catch (error) {
      console.error('stop repeat recognition failed', error)
      if (stopFallbackTimeoutRef.current) {
        clearTimeout(stopFallbackTimeoutRef.current)
        stopFallbackTimeoutRef.current = null
      }
      stopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      setIsRecordingRepeat(false)
      setRepeatRecognitionError(uiText.repeatStopError)
    }
  }, [])

  const startRepeatRecognition = useCallback(async () => {
    if (!mediaRecordingSupported) {
      setRepeatRecognitionError(uiText.repeatBrowserUnsupported)
      return
    }

    if (repeatAttemptCount >= 3) {
      setRepeatRecognitionError(uiText.repeatAttemptLimitReachedLabel)
      return
    }

    if (isRecordingRepeat) {
      return
    }

    try {
      if (stopFallbackTimeoutRef.current) {
        clearTimeout(stopFallbackTimeoutRef.current)
        stopFallbackTimeoutRef.current = null
      }

      stopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      mediaChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      setRepeatRecognitionError(null)
      setRecordedPlaybackError(null)
      setRepeatTranscript('')
      setRepeatScore(null)
    setRepeatIsPass(false)
      setRepeatScoreBreakdown(null)
      setMissingWords([])
      setMatchedWords([])
      setRecordedAudioUrl(null)
      setIsScoringRepeat(false)
      ;(window as unknown as { __lastRecordedBlob: Blob | null }).__lastRecordedBlob = null

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data)
        }
      }

      recorder.onstart = () => {
        setIsRecordingRepeat(true)
      }

      recorder.onerror = () => {
        setIsRecordingRepeat(false)
        setRepeatRecognitionError(uiText.repeatScoreError)
        stopMediaStream(mediaStreamRef.current)
        mediaStreamRef.current = null
      }

      recorder.onstop = async () => {
        if (stopFallbackTimeoutRef.current) {
          clearTimeout(stopFallbackTimeoutRef.current)
          stopFallbackTimeoutRef.current = null
        }

        setIsRecordingRepeat(false)

        const chunks = [...mediaChunksRef.current]
        mediaChunksRef.current = []

        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm',
        })
      
        stopMediaStream(mediaStreamRef.current)
        mediaStreamRef.current = null
        mediaRecorderRef.current = null
      
        if (blob.size === 0) {
          setRepeatRecognitionError(uiText.repeatEmptyRecordingError)
          return
        }
      
        const nextUrl = URL.createObjectURL(blob)
        setRecordedAudioUrl(nextUrl)
      
        // ❌ここで採点しない
        setRepeatRecognitionError(null)
      
        // blobをstateで保持
        ;(window as unknown as { __lastRecordedBlob: Blob | null }).__lastRecordedBlob = blob
      }

      mediaChunksRef.current = []
      recorder.start(250)
    } catch (error) {
      console.error(error)
      setRepeatRecognitionError(uiText.repeatMicError)
    }
  }, [isRecordingRepeat, mediaRecordingSupported, repeatAttemptCount, scoreRepeatRecording])

  useEffect(() => {
    if (listenAudioRef.current) {
      listenAudioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop()
      stopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (previousRecordedAudioUrlRef.current) {
      URL.revokeObjectURL(previousRecordedAudioUrlRef.current)
    }

    previousRecordedAudioUrlRef.current = recordedAudioUrl

    return () => {
      if (previousRecordedAudioUrlRef.current) {
        URL.revokeObjectURL(previousRecordedAudioUrlRef.current)
      }
    }
  }, [recordedAudioUrl])

  // Recording auto-start disabled — user must press record button explicitly
  useEffect(() => {
    if (repeatAutoStartNonce > 0) {
      lastAutoStartedNonceRef.current = repeatAutoStartNonce
    }
  }, [repeatAutoStartNonce])

  useEffect(() => {
    if (currentStageId !== 'listen' && currentStageId !== 'repeat') return

    lastAutoStartedNonceRef.current = 0
    stopListenAudio()
    // Clear stale audio src to prevent previous problem's audio from replaying
    if (listenAudioRef.current) {
      listenAudioRef.current.pause()
      listenAudioRef.current.currentTime = 0
    }
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause()
      recordedAudioRef.current.currentTime = 0
    }
    mediaRecorderRef.current?.stop()
    stopMediaStream(mediaStreamRef.current)
    mediaStreamRef.current = null
    mediaRecorderRef.current = null
    mediaChunksRef.current = []
    setIsRecordingRepeat(false)

    setRepeatTranscript('')
    setRepeatScore(null)
    setRepeatIsPass(false)
    prevRepeatScoreRef.current = null
    setRepeatScoreBreakdown(null)
    setMissingWords([])
    setMatchedWords([])
    setRepeatRecognitionError(null)
    setRecordedPlaybackError(null)
    setRecordedAudioUrl(null)
    setRepeatAttemptCount(0)
    setIsScoringRepeat(false)

    if (typeof window !== 'undefined') {
      ;(window as unknown as { __lastRecordedBlob: Blob | null }).__lastRecordedBlob = null
    }
  }, [currentStageId, listenResetNonce, stopListenAudio])

  return (
    <>
      {/* Lesson header — normal flow */}
      <div className="mt-5 rounded-t-[24px] border border-b-0 border-[#E8E4DF] bg-white px-5 pb-4 pt-4 sm:px-6">
        <div className="mb-3 rounded-[18px] border border-[#E8E4DF] bg-[#FCFBF8] px-4 py-4">
          <StageProgressBar currentBlockIndex={currentQuestionIndex} totalBlocks={totalQuestions} label={uiText.blockProgressLabel} />
        </div>

        <div className="relative flex items-start justify-between">
          {timelineSteps.map((label, index) => {
            const isDone = index < currentIndex
            const isCurrent = index === currentIndex

            return (
              <div key={index} className="z-10 flex flex-1 flex-col items-center">
                <div
                  className={[
                    'flex items-center justify-center rounded-full border-2 transition-all',
                    isDone
                      ? 'border-[#22c55e] bg-[#22c55e]'
                      : isCurrent
                        ? 'border-[#2563eb] bg-[#2563eb]'
                        : 'border-[#D6D3D1] bg-white',
                    isCurrent
                      ? 'h-5 w-5 shadow-[0_0_0_4px_rgba(37,99,235,0.18)]'
                      : 'h-3 w-3',
                  ].join(' ')}
                />
                <span
                  className={[
                    'mt-2 text-center text-xs leading-4',
                    isCurrent
                      ? 'font-black text-[#2563eb]'
                      : isDone
                        ? 'font-bold text-[#22c55e]'
                        : 'font-medium text-[#b5b5c3]',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
            )
          })}

          <div className="absolute left-0 right-0 top-[6px] h-[2px] bg-[#F3F1EC]" />
          <div
            className="absolute left-0 top-[6px] h-[2px] bg-gradient-to-r from-[#22c55e] via-[#3b82f6] to-[#2563eb] transition-all"
            style={{
              width: `${((currentIndex + 1) / timelineSteps.length) * 100}%`,
            }}
          />
        </div>

        <p className="mt-3 text-center text-xs font-bold tracking-widest text-[#4a4a6a]">
          STEP {currentIndex + 1} / {timelineSteps.length}
        </p>
      </div>

      <section className="rounded-b-[24px] border border-t-0 border-[#E8E4DF] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      {/* Scrollable lesson content */}
      <div className="px-5 py-3 sm:px-6 sm:py-4">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wider ${stageTone.badgeClassName}`}
          >
            {getStageLabel(currentStageId, uiText)}
          </div>


          <h2 className="mt-3 text-xl font-black tracking-tight text-[#1a1a2e] sm:text-2xl">
            {dynamicConversationHeading}
          </h2>
        </div>

        <div className="w-full rounded-[16px] border border-[#D9E8FF] bg-[#F8FBFF] px-5 py-4 lg:max-w-[520px]" style={{ minHeight: 100 }}>
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 flex-col items-center min-w-[64px]">
              <img
                src={guideCharacter.imageSrc}
                alt={guideCharacter.name}
                className="h-14 w-14 rounded-full border-2 border-[#BFDBFE] bg-white object-cover shadow-sm"
                style={{ contentVisibility: 'auto' }}
                loading="eager"
              />
              <p className="mt-2 text-xs font-bold tracking-wider text-[#2563EB]">
                {guideCharacter.name}
              </p>
            </div>

            <div className="relative min-w-0 flex-1 rounded-2xl border border-[#BFDBFE] bg-white px-4 py-3 shadow-sm overflow-visible">
              <div className="absolute left-0 top-5 -translate-x-[12px] h-0 w-0 border-b-[10px] border-r-[12px] border-t-[10px] border-b-transparent border-r-[#BFDBFE] border-t-transparent" />
              <div className="absolute left-0 top-5 -translate-x-[10px] h-0 w-0 border-b-[8px] border-r-[10px] border-t-[8px] border-b-transparent border-r-[#BFDBFE] border-t-transparent" />
              <p className="text-xs font-bold tracking-wider text-[#2563EB]">
                {uiText.hintLabel}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm font-semibold leading-6 text-[#5a5a7a]">
                {guideMessageOverride ?? guideCharacter.messagePrimary}
              </p>
              <RationaleHelpButton uiText={uiText} />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mt-3 rounded-[20px] px-4 py-3 sm:px-5 sm:py-4 ${stageTone.panelClassName}`}
      >
        <div className="rounded-[20px] px-4 py-2 sm:px-5 sm:py-3">
          {audioUrl ? (
            <audio
              key={audioUrl}
              ref={listenAudioRef}
              src={audioUrl}
              preload="auto"
              onPlay={() => setIsListenPlaying(true)}
              onPause={() => setIsListenPlaying(false)}
              onEnded={() => {
                setIsListenPlaying(false)
                // Log audio_completed: first listen, first session occurrence only
                if (
                  currentStageId === 'listen' &&
                  wasFirstListenPlayRef.current &&
                  lessonSessionId &&
                  audioCompletedLoggedSessionRef.current !== lessonSessionId
                ) {
                  audioCompletedLoggedSessionRef.current = lessonSessionId
                  wasFirstListenPlayRef.current = false
                  try {
                    fetch('/api/track', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'audio_completed',
                        properties: {
                          user_id: null,
                          lesson_run_id: null,
                          session_id: lessonSessionId,
                          stage_id: 'listen',
                          block_id: block.id ?? null,
                          scene_key: block.sceneId ?? null,
                          occurred_at: new Date().toISOString(),
                        },
                      }),
                      keepalive: true,
                    }).catch(() => {})
                  } catch { /* fire-and-forget */ }
                }
              }}
              className="hidden"
            />
          ) : null}

          {recordedAudioUrl ? (
            <audio
              key={recordedAudioUrl}
              ref={recordedAudioRef}
              src={recordedAudioUrl}
              className="hidden"
            />
          ) : null}

          {currentStageId === 'listen' && (
            <div className="mt-2 text-center">
              {lessonImageUrl && (
                <LessonSceneImage src={lessonImageUrl} alt={dynamicConversationHeading} />
              )}

              <p className="mt-2 text-xs font-semibold text-amber-600">
                Just listen and repeat — no translation needed
              </p>
              <p className="mt-1 text-sm leading-6 text-[#5a5a7a]">
                {uiText.listenInstruction}
              </p>

              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={playListenAudio}
                  disabled={isRecordingRepeat}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition ${
                    isRecordingRepeat
                      ? 'cursor-not-allowed bg-gray-300'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {ICON_LISTEN}{uiText.listenPlayButton}
                </button>
                <button
                  type="button"
                  onClick={stopListenAudio}
                  className="rounded-xl bg-gray-400 px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-500"
                >
                  {uiText.listenStopButton}
                </button>
              </div>

              <div className="mt-3 flex items-center justify-center gap-3">
                {([0.75, 1.0, 1.25] as const).map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      playbackRate === rate
                        ? 'bg-blue-500 text-white'
                        : 'bg-[#F3F1EC] text-[#5a5a7a] hover:bg-[#E8E4DF]'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#5a5a7a]">
                {uiText.listenStartRepeatInstruction}
              </p>

              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={onStartRepeatFromListen}
                  disabled={isListenPlaying}
                  className={`w-full max-w-[280px] rounded-xl px-5 py-3 text-sm font-bold text-white transition ${
                    isListenPlaying
                      ? 'cursor-not-allowed bg-gray-300'
                      : 'cursor-pointer bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isListenPlaying ? uiText.listenPlayingLabel : uiText.listenRecordingButton}
                </button>
              </div>

              {listenPlaybackError && (
                <p className="mt-2 text-xs text-[#7b7b94]">{listenPlaybackError}</p>
              )}

              {!audioUrl && (
                <p className="mt-2 text-sm text-amber-700">{uiText.listenAudioNotReady}</p>
              )}

            </div>
          )}

          {currentStageId === 'repeat' && (
            <div className="mt-4 text-center">
              <p className="mt-1 text-sm font-semibold leading-6 text-[#5a5a7a]">
                {recordedAudioUrl && !isRecordingRepeat
                  ? uiText.repeatAfterRecordingInstruction
                  : uiText.repeatSpeakInstruction}
              </p>



              <div className="mt-3 flex flex-col items-center gap-3">
                {/* Recording button: disabled after recording until scoring completes */}
                {(!recordedAudioUrl || repeatTranscript) && (
                  <button
                    type="button"
                    onClick={isRecordingRepeat ? stopRepeatRecognition : startRepeatRecognition}
                    disabled={isScoringRepeat || isListenPlaying}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition ${
                      isScoringRepeat || isListenPlaying
                        ? 'cursor-not-allowed bg-gray-300'
                        : 'cursor-pointer bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {ICON_SPEAK}{isRecordingRepeat
                      ? uiText.repeatStopRecordingButton
                      : repeatTranscript
                        ? uiText.repeatRecordAgainButton
                        : uiText.repeatRecordingButton}
                  </button>
                )}

                {/* Score button: shown after recording, before scoring completes */}
                {recordedAudioUrl && !repeatTranscript && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!recordedAudioUrl) {
                        setRepeatRecognitionError(uiText.repeatNoRecordingForScore)
                        return
                      }
                      const blob = (window as unknown as { __lastRecordedBlob: Blob | null }).__lastRecordedBlob
                      if (!blob) {
                        setRepeatRecognitionError(uiText.repeatNoRecordingForScore)
                        setRecordedAudioUrl(null)
                        return
                      }
                      await scoreRepeatRecording(blob)
                    }}
                    disabled={isRecordingRepeat || isScoringRepeat}
                    className={`mt-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition ${
                      isRecordingRepeat || isScoringRepeat
                        ? 'cursor-not-allowed bg-[#E7C27A]'
                        : 'cursor-pointer bg-[#F5A623] hover:bg-[#D4881A]'
                    }`}
                  >
                    {isScoringRepeat ? uiText.repeatScoringLabel : uiText.repeatScoreButton}
                  </button>
                )}
              </div>

              {/* Secondary: Back to listen (repeat stage only) */}
              {currentStageId === 'repeat' && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      stopListenAudio()
                      onRetryListenFromRepeat()
                    }}
                    className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#4B5563] transition hover:bg-[#F9FAFB]"
                  >
                    {uiText.repeatRetryAudioButton}
                  </button>
                </div>
              )}

              {!mediaRecordingSupported && (
                <p className="mt-3 text-sm text-amber-700">
                  {uiText.repeatBrowserUnsupported}
                </p>
              )}

              {repeatRecognitionError && (
                <p className="mt-3 text-sm text-red-600">{repeatRecognitionError}</p>
              )}


              {repeatTranscript && (
                <div ref={repeatResultRef} className="mt-3 animate-[fadeInUp_250ms_ease-out] rounded-[14px] border border-[#E8E4DF] bg-white px-5 py-5 text-center">
                  {/* Relative improvement feedback (2nd+ attempt only) */}
                  {prevRepeatScoreRef.current !== null && repeatScore !== null && (
                    <p className="mb-1 animate-[fadeInUp_180ms_ease-out] text-xs font-bold text-[#3B82F6]">
                      {repeatScore > prevRepeatScoreRef.current + 5
                        ? uiText.repeatImproved
                        : Math.abs(repeatScore - prevRepeatScoreRef.current) <= 5
                          ? uiText.repeatStable
                          : uiText.repeatSlightDrop}
                    </p>
                  )}
                  {/* Micro weakness hint (1 actionable item, non-perfect only) */}
                  {repeatScore !== null && repeatScore < 90 && missingWords.length > 0 && (
                    <p className="mb-1 animate-[fadeInUp_180ms_ease-out] text-xs text-[#7b7b94]">
                      {uiText.repeatWeaknessMissing.replace('{word}', missingWords[0])}
                    </p>
                  )}
                  {repeatScore !== null && repeatScore < 90 && missingWords.length === 0 && repeatScoreBreakdown && repeatScoreBreakdown.wordMatch < 70 && (
                    <p className="mb-1 animate-[fadeInUp_180ms_ease-out] text-xs text-[#7b7b94]">
                      {uiText.repeatWeaknessSound.replace('{word}', item.answer?.split(/\s+/)[1] ?? '')}
                    </p>
                  )}
                  {/* Success message */}
                  <p className="mb-2 text-sm font-bold text-[#22c55e]">
                    {repeatIsPass
                      ? uiText.repeatSuccessGood
                      : uiText.repeatSuccessOk}
                  </p>
                  {/* 1. Immediate encouragement */}
                  <p className="text-xl font-black text-[#F5A623]">
                    {repeatIsPass
                      ? uiText.repeatScoreExcellent
                      : uiText.repeatScoreGood}
                  </p>
                  <p className={`mt-1 ${repeatIsPass ? 'text-sm font-bold text-[#3B82F6]' : 'text-xs text-[#7b7b94]'}`}>
                    {repeatIsPass
                      ? uiText.repeatScoreExcellentSub
                      : uiText.repeatScoreGoodSub}
                  </p>

                  {/* 2. Score as friendly progress bar */}
                  {repeatScore !== null && (
                    <div className="mx-auto mt-4 max-w-[260px]">
                      <div className="flex items-center justify-between text-xs text-[#7b7b94]">
                        <span>{repeatAttemptCount > 0 ? `${repeatAttemptCount}${uiText.repeatAttemptSuffix}` : ''}</span>
                        <span className="font-bold text-[#1a1a2e]">{repeatScore}{uiText.repeatScoreSuffix}</span>
                      </div>
                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#F0EDE8]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            repeatIsPass ? 'bg-[#22C55E]' : 'bg-[#F5A623]'
                          }`}
                          style={{ width: `${Math.min(repeatScore, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. Recognition result — calm layout */}
                  <div className="mx-auto mt-5 max-w-[320px] text-left">
                    <p className="text-[11px] font-bold tracking-widest text-[#7b7b94]">
                      {uiText.repeatYourSpeechLabel}
                    </p>
                    <p className="mt-1 text-base font-bold text-[#1a1a2e]">{repeatTranscript}</p>

                    <p className="mt-3 text-[11px] font-bold tracking-widest text-[#7b7b94]">
                      {uiText.repeatExpectedSpeechLabel}
                    </p>
                    <p className="mt-1 text-base font-bold">
                      {renderHighlightedText(getListenSpeechText(item), missingWords)}
                    </p>
                  </div>

                  {/* 4. Breakdown — compact, soft */}
                  {repeatScoreBreakdown && (
                    <div className="mx-auto mt-4 grid max-w-[280px] grid-cols-2 gap-1.5 text-[11px] text-[#5a5a7a]">
                      <div className="rounded-lg bg-[#FAF7F2] px-2.5 py-1.5">
                        {uiText.repeatClarityLabel} <span className="font-bold text-[#1a1a2e]">{repeatScoreBreakdown.clarity}%</span>
                      </div>
                      <div className="rounded-lg bg-[#FAF7F2] px-2.5 py-1.5">
                        {uiText.repeatWordMatchLabel} <span className="font-bold text-[#1a1a2e]">{repeatScoreBreakdown.wordMatch}%</span>
                      </div>
                      <div className="rounded-lg bg-[#FAF7F2] px-2.5 py-1.5">
                        {uiText.repeatRhythmLabel} <span className="font-bold text-[#1a1a2e]">{repeatScoreBreakdown.rhythm}%</span>
                      </div>
                      <div className="rounded-lg bg-[#FAF7F2] px-2.5 py-1.5">
                        {uiText.repeatCompletenessLabel} <span className="font-bold text-[#1a1a2e]">{repeatScoreBreakdown.completeness}%</span>
                      </div>
                    </div>
                  )}

                  {/* 5. Pronunciation tip */}
                  {repeatScore !== null && (() => {
                    const tip = getRepeatTip(repeatScoreBreakdown, missingWords, repeatScore, uiText)
                    if (!tip) return null
                    return (
                      <p className="mx-auto mt-4 max-w-[280px] text-center text-xs leading-5 text-[#7b7b94]">
                        {tip}
                      </p>
                    )
                  })()}

                  {/* Compare audio */}
                  {repeatTranscript && audioUrl && recordedAudioUrl && (
                    <AudioCompareCard correctUrl={audioUrl} recordedUrl={recordedAudioUrl} uiText={uiText} />
                  )}

                  {/* 6. Primary action — advance directly */}
                  {repeatIsPass && (
                    <button
                      type="button"
                      onClick={() => { window.dispatchEvent(new Event('next-step')) }}
                      className="mt-3 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
                    >
                      {ctaLabel}
                    </button>
                  )}

                  {/* 6. Attempt limit — gentle skip */}
                  {repeatAttemptCount >= 3 && repeatScore !== null && repeatScore < 80 && (
                    <div className="mt-4">
                      <p className="text-xs text-[#7b7b94]">
                        {uiText.repeatAttemptLimitEncouragement}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new Event('next-step'))
                        }}
                        className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
                      >
                        {uiText.repeatAttemptLimitAdvance}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {recordedPlaybackError && (
                <p className="mt-2 text-sm text-red-600">{recordedPlaybackError}</p>
              )}
            </div>
          )}

          {currentStageId === 'scaffold_transition' && (
            <>
              <ScaffoldAutoPlay
                scaffoldSteps={scaffoldSteps}
                semanticChunks={scaffoldSemanticChunks}
                nativeHint={(item as LessonBlockItem & { nativeHint?: string | null }).nativeHint?.trim() || null}
                lessonImageUrl={lessonImageUrl}
                dynamicConversationHeading={dynamicConversationHeading}
                scenarioLabel={scenarioLabel}
                audioUrl={audioUrl}
                uiText={uiText}
                level={level}
                itemId={item.id}
                ctaLabel={ctaLabel}
              />
              {onGoBackToStage && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => onGoBackToStage('repeat')}
                    className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#4B5563] transition hover:bg-[#F9FAFB]"
                  >
                    {uiText.backToRepeat}
                  </button>
                </div>
              )}
            </>
          )}

          {currentStageId === 'ai_question' && (
            <div>
              {lessonImageUrl && (
                <div className="mb-4">
                  <LessonSceneImage src={lessonImageUrl} alt={dynamicConversationHeading} />
                </div>
              )}
            <AiQuestionListenStage
              key={item.id}
              item={item}
              uiText={uiText}
              onInputChange={onInputChange}
              ctaLabel={ctaLabel}
            />
            {onGoBackToStage && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => onGoBackToStage('scaffold_transition')}
                  className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#4B5563] transition hover:bg-[#F9FAFB]"
                >
                  {uiText.backToScaffold}
                </button>
              </div>
            )}
            </div>
          )}

          {/* typing stage removed from core flow — code preserved in git history */}

          {currentStageId === 'ai_conversation' && (
            <>
              <AiConversationPlayer
                key={`${item.id}-${convResetNonce}`}
                item={item}
                uiText={uiText}
                previousPhrases={previousPhrases}
                onInputChange={onInputChange}
                isLastBlock={isLastBlock}
                flavorContext={conversationFlavorContext}
                level={level}
                ctaLabel={ctaLabel}
                onGuideMessageChange={setGuideMessageOverride}
                problemNumber={currentQuestionIndex + 1}
              />
              {onGoBackToStage && !isChallengePhase && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => onGoBackToStage('ai_question')}
                    className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#4B5563] transition hover:bg-[#F9FAFB]"
                  >
                    {uiText.backToAiQuestion}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </section>
    </>
  )
}