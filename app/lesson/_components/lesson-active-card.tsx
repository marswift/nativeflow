'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonBlock, LessonBlockItem } from '../../../lib/lesson-engine'
import type { SemanticChunk } from '../../../lib/lesson-blueprint-adapter'
import type { LessonProgressState } from '../../../lib/lesson-progress'
import type { LessonStageId } from '../../../lib/lesson-runtime'
import type { CurrentLevel } from '../../../lib/constants'

/** Mirrors AiConversationEvaluation from lib/ai-conversation-prompt.ts (client-safe) */
type ConvEvalDetail = {
  isRelevant: boolean
  isNatural: boolean
  isComplete: boolean
  score: number
  feedback: string
  correction: string | null
}

const LESSON_STAGE_ORDER: LessonStageId[] = [
  'listen',
  'scaffold_transition',
  'ai_question',
  'typing',
  'ai_conversation',
]

/** Reusable scene image block — consistent styling across stages. */
function LessonSceneImage({
  src,
  alt,
  caption,
}: {
  src: string
  alt: string
  caption?: string
}) {
  const mobileSrc = src.endsWith('.webp')
    ? src.replace('.webp', '_p.webp')
    : src

  return (
    <div>
      <div className="overflow-hidden rounded-[18px] border border-[#DBEAFE] bg-white shadow-[0_4px_16px_rgba(37,99,235,0.06)]">
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet={mobileSrc}
          />
          <img
            src={src}
            alt={alt}
            className="h-[200px] w-full object-cover"
          />
        </picture>
      </div>
      {caption && (
        <p className="mt-2 mb-2 text-center text-sm text-[#6b7280]">{caption}</p>
      )}
    </div>
  )
}

function getSceneCaption(input: { scenarioLabel: string; dynamicConversationHeading: string }): string {
  const s = input.scenarioLabel.trim()
  return s || input.dynamicConversationHeading
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

function getFallbackTranslation(item: LessonBlockItem): string {
  const maybe = item as LessonBlockItem & {
    translation_ja?: string | null
    translation?: string | null
  }

  // Only return actual native-language translations; never fall back to
  // English prompt/answer — that would defeat the purpose of scaffolding.
  return (
    maybe.translation_ja?.trim() ||
    maybe.translation?.trim() ||
    ''
  )
}

/**
 * Builds a mixed sentence: subject in target language + rest in native language.
 * e.g. target="I take a bath before bed", native="寝る前にお風呂に入ります"
 *   → "I ... 寝る前にお風呂に入ります"
 */
function buildMixedText(nativeText: string, targetText: string): string {
  const firstWord = targetText.split(/\s+/)[0] ?? ''
  return `${firstWord} ... ${nativeText}`
}

function getScaffoldSteps(item: LessonBlockItem): string[] {
  const customSteps = Array.isArray(item.scaffold_steps)
    ? item.scaffold_steps.map((step) => step.trim()).filter(Boolean)
    : []

  if (customSteps.length >= 3) {
    return customSteps
  }

  const maybe = item as LessonBlockItem & { nativeHint?: string | null; mixHint?: string | null }
  const nativeText = maybe.nativeHint?.trim() || getFallbackTranslation(item)
  const targetText = item.answer?.trim() || item.prompt?.trim() || ''

  // If no native-language text is available, show only the target text
  if (!nativeText) {
    return [targetText, targetText, targetText]
  }

  const mixText = maybe.mixHint?.trim() || buildMixedText(nativeText, targetText)

  return [nativeText, mixText, targetText]
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
 * Prioritizes the weakest metric. Always encouraging, never harsh.
 */
function getRepeatTip(
  breakdown: RepeatScoreBreakdown | null,
  missingWords: string[],
  score: number | null
): string | null {
  if (score === null) return null

  // Perfect or near-perfect → pure encouragement
  if (score >= 90) return 'リズムは良いです。この調子です'

  if (breakdown) {
    // Find weakest metric
    const metrics = [
      { key: 'completeness', value: breakdown.completeness },
      { key: 'wordMatch', value: breakdown.wordMatch },
      { key: 'clarity', value: breakdown.clarity },
      { key: 'rhythm', value: breakdown.rhythm },
    ] as const
    const weakest = metrics.reduce((a, b) => (a.value <= b.value ? a : b))

    if (weakest.key === 'completeness' && weakest.value < 70) {
      return missingWords.length > 0
        ? `「${missingWords[0]}」を意識して最後まで言い切ると良くなります`
        : '最後まで言い切ると伝わりやすくなります'
    }
    if (weakest.key === 'wordMatch' && weakest.value < 70) {
      return missingWords.length > 0
        ? `「${missingWords[0]}」の音をもう少し意識してみましょう`
        : 'もう一度聞いて音の違いを確認してみましょう'
    }
    if (weakest.key === 'clarity' && weakest.value < 70) {
      return 'もう少しゆっくり話すと伝わりやすいです'
    }
    if (weakest.key === 'rhythm' && weakest.value < 70) {
      return '語尾を少しはっきり言うともっと良くなります'
    }
  }

  // Generic tip for moderate scores
  if (score < 70) return 'もう一度聞いてから真似するとさらに良くなります'

  return 'いい感じです。繰り返すほど自然になります'
}

function getStageTone(input: {
  currentStageId: LessonStageId | null
}) {
  switch (input.currentStageId) {
    case 'typing':
      return {
        badgeClassName:
          'border border-[#D9E8FF] bg-[#EEF6FF] text-[#2563EB]',
        panelClassName:
          'border-[#D9E8FF] bg-[linear-gradient(180deg,#F8FBFF_0%,#FFFFFF_100%)]',
      }

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
    case 'repeat':
      return uiText.stageListenRepeatLabel
    case 'scaffold_transition':
      return uiText.stageScaffoldLabel
    case 'ai_question':
      return uiText.stageAiQuestionLabel
    case 'typing':
      return uiText.stageTypingLabel
    case 'ai_conversation':
      return uiText.stageAiConversationLabel
    default:
      return uiText.stageDefaultLabel
  }
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

function getGuideCharacter(input: {
  currentStageId: LessonStageId | null
  isRecordingRepeat: boolean
  isListenPlaying: boolean
  isCorrect: boolean | null
  uiText: LessonCopy['activeCard']
}) {
  const { currentStageId, isRecordingRepeat, isListenPlaying, isCorrect, uiText } = input

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
      messageSecondary: uiText.scaffoldSecondary,
    }
  }

  if (currentStageId === 'ai_question') {
    return {
      name: 'Emma',
      imageSrc: '/images/characters/emma/expressions/gentle.png',
      title: uiText.guideEmmaTitle,
      messagePrimary: uiText.aiQuestionPrimary,
      messageSecondary: uiText.aiQuestionSecondary,
    }
  }

  if (currentStageId === 'typing') {
    return {
      name: 'Emma',
      imageSrc:
        isCorrect === true
          ? '/images/characters/emma/expressions/happy.png'
          : isCorrect === false
            ? '/images/characters/emma/expressions/thinking.png'
            : '/images/characters/emma/expressions/neutral.png',
      title: uiText.guideEmmaTitle,
      messagePrimary:
        isCorrect === true
          ? uiText.typingCorrectPrimary
          : isCorrect === false
            ? uiText.typingIncorrectPrimary
            : uiText.typingNeutralPrimary,
      messageSecondary: uiText.typingSecondary,
    }
  }

  if (currentStageId === 'ai_conversation') {
    return {
      name: 'Emma',
      imageSrc: '/images/characters/emma/expressions/happy.png',
      title: uiText.guideEmmaTitle,
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

function getCurrentActionLabel(
  stage: LessonStageId | null,
  uiText: LessonCopy['activeCard']
): string {
  switch (stage) {
    case 'listen':
      return uiText.listenAction
    case 'repeat':
      return uiText.repeatAction
    case 'scaffold_transition':
      return uiText.scaffoldAction
    case 'ai_question':
      return uiText.aiQuestionAction
    case 'typing':
      return uiText.typingAction
    case 'ai_conversation':
      return uiText.aiConversationAction
    default:
      return ''
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
  const percent = Math.round(((currentBlockIndex + 1) / safeTotal) * 100)

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-bold tracking-widest text-[#9c9c9c]">
        {label}
      </p>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-[#1a1a2e]">
          {currentBlockIndex + 1} / {safeTotal}
        </p>
        <p className="text-xs text-[#7b7b94]">{percent}%</p>
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
  repeatAutoStartNonce: number
  listenResetNonce: number
  currentStageId: LessonStageId | null
  copy: LessonCopy
  isLessonComplete: boolean
  targetLanguageLabel: string
  scenarioLabel: string
  previousPhrases?: string[]
  level?: CurrentLevel
}

// ——— AI Conversation (4-turn conversation with feedback) ———

type ConvTurn = { aiMessage: string; userReply: string; hint: string | null; nextPrompt: string | null; reaction: string }

function buildConversationTurns(currentAnswer: string, _previousPhrases: string[]): ConvTurn[] {
  const messages = [
    'Hey! How are you doing today?',
    `So today you learned: ${currentAnswer}. When do you usually do that?`,
    'How was today\'s lesson for you?',
    'Great talking with you! See you next time!',
  ]
  return messages.map((msg) => ({
    aiMessage: msg,
    userReply: '',
    hint: null,
    nextPrompt: null,
    reaction: '',
  }))
}

/**
 * Extract content keywords from an AI message (skip stop words).
 */
const STOP_WORDS = new Set([
  'i', 'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'to', 'in', 'at', 'on', 'of', 'for', 'and', 'but',
  'or', 'so', 'if', 'it', 'its', 'my', 'me', 'you', 'your', 'we', 'our',
  'that', 'this', 'with', 'from', 'by', 'as', 'not', 'no', 'can', 'will',
  'would', 'should', 'could', 'have', 'has', 'had', 'just', 'about',
])

function extractKeywords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

/**
 * Pick a context-aware AI reaction based on the user's reply and the AI question.
 */
function pickReaction(userReply: string, aiMessage?: string): string {
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

/**
 * Generate a per-turn hint and optional next prompt to guide the user's response.
 * Returns { hint, nextPrompt } — both null when the reply is good.
 */
function buildTurnHint(
  userReply: string,
  turnIndex: number,
  uiLanguageIsJa: boolean,
  aiMessage?: string,
): { hint: string | null; nextPrompt: string | null } {
  const words = userReply.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const replyLower = words.join(' ')

  const HINT_JA = '今日の表現を使って、英語で1文で答えてみましょう'
  const HINT_EN = 'Try answering in one English sentence using today\'s expression.'
  const hint = uiLanguageIsJa ? HINT_JA : HINT_EN

  const turnPrompts: Record<number, string> = {
    0: "I'm good, thanks!",
    1: 'I usually...',
    2: 'It was great!',
    3: 'See you next time!',
  }
  const fallbackPrompt = turnPrompts[turnIndex] ?? 'Good!'

  // Empty
  if (words.length === 0) {
    return { hint, nextPrompt: fallbackPrompt }
  }

  // --- Per-turn relevance checks ---
  const ai = aiMessage?.toLowerCase() ?? ''

  // Turn 0: greeting — must respond to "How are you?"
  if (turnIndex === 0) {
    const validResponses = [
      'good', 'fine', 'great', 'okay', 'ok', 'well', 'thanks', 'thank',
      'doing', 'not bad', 'pretty', 'tired', 'sleepy', 'busy', 'happy',
      'excited', 'wonderful', 'fantastic', 'alright',
    ]
    const hasValidResponse = validResponses.some((r) => replyLower.includes(r))
    const hasImPattern = /^i(?:m| am)\b/.test(replyLower)
    if (!hasValidResponse && !hasImPattern) {
      return { hint, nextPrompt: "I'm doing great!" }
    }
    return { hint: null, nextPrompt: null }
  }

  // Turn 3: goodbye
  if (turnIndex === 3) {
    const farewellPatterns = ['bye', 'goodbye', 'see you', 'later', 'thank', 'thanks', 'nice', 'fun', 'great time', 'next time', 'take care']
    const hasFarewell = farewellPatterns.some((p) => replyLower.includes(p))
    if (!hasFarewell) {
      return { hint, nextPrompt: 'Thanks! See you next time!' }
    }
    return { hint: null, nextPrompt: null }
  }

  // --- Content turns (1, 2) ---

  // Reject generic / filler-only replies
  const GENERIC_REPLIES = new Set([
    'yes', 'no', 'ok', 'okay', 'good', 'fine', 'sure', 'yeah', 'yep',
    'nope', 'right', 'great', 'nice', 'cool', 'thanks', 'thank you',
    'hi', 'hello', 'hey', 'good morning', 'good night', 'good evening',
    'good afternoon', 'bye', 'goodbye', 'see you',
  ])
  if (GENERIC_REPLIES.has(replyLower)) {
    return { hint, nextPrompt: fallbackPrompt }
  }

  // Very short reply (less than 3 words)
  if (words.length < 3) {
    return { hint, nextPrompt: fallbackPrompt }
  }

  // Relevance check: require at least 1 keyword overlap with AI message
  if (aiMessage) {
    const aiKeywords = extractKeywords(ai)
    const replyKeywords = new Set(extractKeywords(replyLower))
    const overlap = aiKeywords.filter((k) => replyKeywords.has(k)).length

    if (overlap === 0 && aiKeywords.length > 0) {
      return { hint, nextPrompt: fallbackPrompt }
    }
  }

  // Require "I ..." pattern or a clear verb-containing sentence
  const hasIPattern = /\bi\s+(am|was|do|did|have|had|go|went|like|think|feel|need|want|try|usually|sometimes|always|never)\b/.test(replyLower)
  const hasVerb = /\b(is|am|are|was|were|do|does|did|have|has|had|go|goes|went|like|liked|think|thought|feel|felt|usually|always|sometimes|try|tried|need|want|get|got|take|took|make|made|use|used|come|came)\b/.test(replyLower)
  if (!hasIPattern && !hasVerb) {
    return { hint, nextPrompt: fallbackPrompt }
  }

  // Good reply
  return { hint: null, nextPrompt: null }
}

function buildFeedback(turns: ConvTurn[], isJa: boolean): { feedback: string; advice: string } {
  const totalWords = turns.reduce((sum, t) => sum + t.userReply.split(/\s+/).filter(Boolean).length, 0)
  const replied = turns.filter((t) => t.userReply.trim().length > 0).length

  let feedback: string
  if (replied >= 4 && totalWords >= 10) {
    feedback = isJa
      ? '4回とも返答できました！会話を続ける力がついてきています。'
      : 'All 4 replies — great job keeping the conversation going!'
  } else if (replied >= 3) {
    feedback = isJa
      ? 'ほとんどの質問に答えられました。いい調子です！'
      : 'You replied to most of the conversation. Nice effort!'
  } else if (replied >= 1) {
    feedback = isJa
      ? '声に出せました！一言でも大きな一歩です。'
      : 'You gave it a try! Every word counts.'
  } else {
    feedback = isJa
      ? '大丈夫です。次回は一言だけでも声に出してみましょう！'
      : 'No worries — next time, try saying even one word!'
  }

  let advice: string
  if (totalWords < 5) {
    advice = isJa
      ? '今日習った文をそのまま使ってみましょう。短くてもOKです。'
      : 'Try using full sentences like the ones you learned today.'
  } else if (totalWords < 15) {
    advice = isJa
      ? 'いいスタートです！次は「いつ」「なぜ」などの詳細を加えてみましょう。'
      : 'Good start! Try adding more details next time, like when or why.'
  } else {
    advice = isJa
      ? 'たくさん話せています！次は新しい単語も混ぜてみましょう。'
      : 'You spoke a lot — keep it up! Try mixing in new words each time.'
  }

  return { feedback, advice }
}

function AiConversationPlayer({
  item,
  uiText,
  previousPhrases = [],
  onInputChange,
  isLastBlock = false,
}: {
  item: LessonBlockItem
  uiText: LessonCopy['activeCard']
  previousPhrases?: string[]
  onInputChange: (value: string) => void
  isLastBlock?: boolean
}) {
  const currentAnswer = item.answer?.trim() || item.prompt?.trim() || ''
  const turnTemplates = useMemo(
    () => buildConversationTurns(currentAnswer, previousPhrases),
    [currentAnswer, previousPhrases]
  )
  const aiMessages = useMemo(() => turnTemplates.map((t) => t.aiMessage), [turnTemplates])

  const [turn, setTurn] = useState(0)
  const [started, setStarted] = useState(false)
  const [allDone, setAllDone] = useState(false)
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
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stores the API-generated AI reply for the next turn
  const nextAiReplyRef = useRef<string | null>(null)
  // Tracks the displayed AI message per turn (fixed for turn 0, API-generated for 1-3)
  const displayedAiMessagesRef = useRef<string[]>([...aiMessages])

  const CONV_RECORDING_MAX_MS = 8000

  const totalTurns = aiMessages.length

  const playAiText = useCallback(async (text: string) => {
    setAiSpeaking(true)
    const url = await fetchAudioUrl(text)
    if (url) {
      const audio = new Audio(url)
      audio.onended = () => setAiSpeaking(false)
      audio.onerror = () => setAiSpeaking(false)
      audio.play().catch(() => setAiSpeaking(false))
    } else {
      setAiSpeaking(false)
    }
  }, [])

  const handleStart = () => {
    setStarted(true)
    playAiText(aiMessages[0])
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
        setIsRecording(false)
        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        stopStream()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size === 0) return

        // --- Phase 1: STT — show transcript immediately ---
        setIsRecognizing(true)
        let recognized = ''
        try {
          const formData = new FormData()
          formData.append('file', blob, 'recording.webm')
          formData.append('expectedText', currentAnswer)
          const res = await fetch('/api/pronunciation/score', { method: 'POST', body: formData })
          if (res.ok) {
            const data = await res.json()
            recognized = data.transcript?.trim() || ''
          }
        } catch {
          // STT failed — recognized stays empty
        }
        setTranscript(recognized)
        setIsRecognizing(false)

        // Empty transcript — skip API, go straight to fallback
        if (!recognized) {
          const currentAiMsg = displayedAiMessagesRef.current[turn] ?? aiMessages[turn]
          const h = buildTurnHint('', turn, true, currentAiMsg)
          setTurnHint(h.hint)
          setTurnNextPrompt(h.nextPrompt)
          setTurnAnswered(true)
          return
        }

        // --- Phase 2: AI evaluation — show "thinking" while waiting ---
        setAiThinking(true)
        nextAiReplyRef.current = null

        // Build conversation history for API
        const apiHistory = history.map((h) => ({
          ai: h.aiMessage,
          user: h.userReply,
        }))
        // Add current turn's AI message
        const currentAiMsg = displayedAiMessagesRef.current[turn] ?? aiMessages[turn]
        apiHistory.push({ ai: currentAiMsg, user: recognized })

        try {
          const apiRes = await fetch('/api/ai-conversation/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              turnIndex: turn,
              userMessage: recognized,
              lessonPhrase: currentAnswer,
              conversationHistory: apiHistory,
            }),
          })

          if (apiRes.ok) {
            const apiData = await apiRes.json()
            if (apiData.ok) {
              // Store AI reply for next turn
              nextAiReplyRef.current = apiData.aiReply
              // Store evaluation detail (may be undefined for old API format)
              setTurnEvalDetail(apiData.evaluationDetail ?? null)
              // Use API evaluation
              if (apiData.evaluation === 'retry') {
                setTurnHint(apiData.hint ?? '今日の表現を使って、英語で1文で答えてみましょう')
                setTurnNextPrompt(apiData.nextPrompt ?? null)
              } else {
                setTurnHint(null)
                setTurnNextPrompt(null)
              }
              setAiThinking(false)
              setTurnAnswered(true)
              return
            }
          }
        } catch {
          // API failed — fall through to fallback
        }

        // --- Fallback: use rule-based evaluation ---
        nextAiReplyRef.current = null
        setTurnEvalDetail(null)
        const h = buildTurnHint(recognized, turn, true, currentAiMsg)
        setTurnHint(h.hint)
        setTurnNextPrompt(h.nextPrompt)
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

  // Advance to the next turn (called automatically or via manual "next" button)
  const advanceToNextTurn = useCallback(() => {
    const currentAiMsg = displayedAiMessagesRef.current[turn] ?? aiMessages[turn]
    const newHistory = [...history, {
      aiMessage: currentAiMsg,
      userReply: transcript,
      hint: turnHint,
      nextPrompt: turnNextPrompt,
      reaction: pickReaction(transcript, currentAiMsg),
    }]
    setHistory(newHistory)

    const next = turn + 1
    if (next >= totalTurns) {
      setAllDone(true)
      onInputChange('[conversation done]')
    } else {
      // Use API-generated reply if available, else fall back to fixed message
      const nextMsg = nextAiReplyRef.current ?? aiMessages[next]
      displayedAiMessagesRef.current[next] = nextMsg
      nextAiReplyRef.current = null

      setTurn(next)
      setTranscript('')
      setTurnAnswered(false)
      setTurnHint(null)
      setTurnNextPrompt(null)
      setTurnEvalDetail(null)
      playAiText(nextMsg)
    }
  }, [history, aiMessages, turn, transcript, turnHint, turnNextPrompt, totalTurns, onInputChange, playAiText])

  // Retry the current turn (reset recording state so user can try again)
  const handleRetryTurn = useCallback(() => {
    setTranscript('')
    setTurnAnswered(false)
    setTurnHint(null)
    setTurnNextPrompt(null)
    setTurnEvalDetail(null)
  }, [])

  // Auto-advance: only for strong answers (no hint + score >= 70)
  // Low scores or hints → user must manually press "next" or "retry"
  const shouldAutoAdvance = !turnHint && (!turnEvalDetail || turnEvalDetail.score >= 70)

  useEffect(() => {
    if (!turnAnswered || allDone) return
    if (!shouldAutoAdvance) return

    const timer = setTimeout(() => {
      advanceToNextTurn()
    }, 1500)

    return () => clearTimeout(timer)
  }, [turnAnswered, allDone, shouldAutoAdvance, advanceToNextTurn])

  const handleRetryAll = () => {
    setTurn(0)
    setStarted(false)
    setAllDone(false)
    setTranscript('')
    setTurnAnswered(false)
    setTurnHint(null)
    setTurnNextPrompt(null)
    setTurnEvalDetail(null)
    setAiSpeaking(false)
    setAiThinking(false)
    nextAiReplyRef.current = null
    displayedAiMessagesRef.current = [...aiMessages]
    setHistory([])
    onInputChange('')
  }

  const isJa = /[\u3000-\u9FFF]/.test(uiText.scaffoldNextButton)
  const result = allDone ? buildFeedback(history, isJa) : null

  if (!started) {
    return (
      <div className="mt-4 text-center">
        <p className="text-sm text-[#5a5a7a]">{uiText.aiConversationPrompt}</p>
        <button
          type="button"
          onClick={handleStart}
          className="mt-4 rounded-xl bg-purple-500 px-6 py-3 font-bold text-white transition hover:bg-purple-600"
        >
          {uiText.aiConversationStartButton}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {/* During conversation: minimal UI, auto-flow */}
      {!allDone && (
        <>
          <p className="mb-3 text-center text-sm text-[#7b7b94]">
            {uiText.aiQuestionRoundLabel
              .replace('{current}', String(turn + 1))
              .replace('{total}', String(totalTurns))}
          </p>

          {isRecognizing && (
            <p className="text-center text-sm text-[#7b7b94]">{uiText.aiConvRecognizing}</p>
          )}

          {/* Show transcript immediately after STT, before API response */}
          {transcript && !turnAnswered && (aiThinking || isRecognizing) && (
            <p className="mt-2 text-center text-sm text-gray-500">あなた: {transcript}</p>
          )}

          {aiThinking && (
            <p className="mt-2 text-center text-sm font-semibold text-purple-500">AIが考え中...</p>
          )}

          {!turnAnswered && !isRecognizing && !aiThinking && (
            <div className="mt-3 flex justify-center">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="w-full max-w-[320px] rounded-xl bg-green-500 px-6 py-3 font-bold text-white transition hover:bg-green-600"
                >
                  {uiText.aiConvRecordButton}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-full max-w-[320px] rounded-xl bg-red-500 px-6 py-3 font-bold text-white transition hover:bg-red-600"
                >
                  {uiText.aiConvStopButton}
                </button>
              )}
            </div>
          )}

          {/* Feedback for good replies (with or without auto-advance) */}
          {turnAnswered && !turnHint && turnEvalDetail && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                <p className="font-bold">
                  スコア: {turnEvalDetail.score}点 —{' '}
                  {turnEvalDetail.score >= 80
                    ? 'かなり自然です'
                    : turnEvalDetail.score >= 60
                      ? 'あと少しでより自然です'
                      : 'もう一度試すともっと良くなります'}
                </p>
                {turnEvalDetail.feedback && <p className="mt-1">{turnEvalDetail.feedback}</p>}
                {turnEvalDetail.correction && (
                  <p className="mt-1 text-green-700">✏️ {turnEvalDetail.correction}</p>
                )}
              </div>
              {!shouldAutoAdvance && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleRetryTurn}
                    className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
                  >
                    もう一度話す
                  </button>
                  <button
                    type="button"
                    onClick={advanceToNextTurn}
                    className="flex-1 rounded-xl bg-gray-300 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-400"
                  >
                    次へ進む
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Advice panel when reply needs improvement */}
          {turnAnswered && turnHint && (
            <div className="mt-3 space-y-3">
              {transcript && (
                <p className="text-center text-sm text-gray-500">あなた: {transcript}</p>
              )}
              {turnEvalDetail && (
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <p className="font-bold">
                    スコア: {turnEvalDetail.score}点 —{' '}
                    {turnEvalDetail.score >= 80
                      ? 'かなり自然です'
                      : turnEvalDetail.score >= 60
                        ? 'あと少しでより自然です'
                        : 'もう一度試すともっと良くなります'}
                  </p>
                  {turnEvalDetail.feedback && <p className="mt-1">{turnEvalDetail.feedback}</p>}
                  {turnEvalDetail.correction && (
                    <p className="mt-1 font-semibold text-blue-700">✏️ {turnEvalDetail.correction}</p>
                  )}
                </div>
              )}
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-bold">💡 アドバイス</p>
                <p className="mt-1">{turnHint}</p>
                {turnNextPrompt && (
                  <p className="mt-2 font-mono text-amber-900">
                    💬 例: &quot;{turnNextPrompt}&quot;
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRetryTurn}
                  className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
                >
                  もう一度話す
                </button>
                <button
                  type="button"
                  onClick={advanceToNextTurn}
                  className="flex-1 rounded-xl bg-gray-300 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-400"
                >
                  次へ進む
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Feedback after conversation */}
      {/* Show full conversation transcript after completion */}
      {allDone && (
        <div className="mt-4 space-y-2">
          {history.map((h, i) => (
            <div key={i}>
              <div className="rounded-xl bg-purple-50 px-4 py-2 text-sm text-purple-800">
                <span className="font-bold">AI:</span> {h.aiMessage}
              </div>
              {h.userReply && (
                <div className="mt-1 rounded-xl bg-gray-50 px-4 py-2 text-sm text-gray-800 text-right">
                  <span className="font-bold">{uiText.aiConvYourReply}:</span> {h.userReply}
                </div>
              )}
              {h.reaction && (
                <div className="mt-1 rounded-xl bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700">
                  AI: {h.reaction}
                </div>
              )}
              {h.hint && (
                <div className="mt-1 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  💡 {h.hint}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {allDone && result && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-green-50 px-5 py-4">
            <p className="text-sm font-bold text-green-800">{uiText.aiConvFeedbackTitle}</p>
            <p className="mt-1 text-sm text-green-700">{result.feedback}</p>
          </div>

          <div className="rounded-xl bg-blue-50 px-5 py-4">
            <p className="text-sm font-bold text-blue-800">{uiText.aiConvAdviceTitle}</p>
            <p className="mt-1 text-sm text-blue-700">{result.advice}</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleRetryAll}
              className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
            >
              {uiText.aiConvRetryAll}
            </button>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event('next-step'))
              }}
              className="w-full rounded-xl bg-[#F5A623] py-4 text-base font-bold text-white transition hover:bg-[#D4881A]"
            >
              {isLastBlock ? uiText.aiConvFinishLesson : uiText.scaffoldNextButton}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ——— Typing Multi-Round ———

const TYPING_ROUNDS = 3

function buildTypingPrompts(currentAnswer: string, previousPhrases: string[]): string[] {
  // Always use currentAnswer 3 times for reinforcement when no previous phrases
  // When previous phrases exist, mix them in for review
  const unique = previousPhrases.filter((p) => p.trim() !== currentAnswer.trim())

  const prompts = [currentAnswer]

  // Q2: most recent previous phrase, or current again
  prompts.push(unique.length > 0 ? unique[unique.length - 1] : currentAnswer)

  // Q3: second previous phrase, or current again
  prompts.push(unique.length > 1 ? unique[unique.length - 2] : currentAnswer)

  return prompts.slice(0, TYPING_ROUNDS)
}

function TypingMultiRound({
  item,
  uiText,
  copy,
  previousPhrases = [],
  onInputChange,
  playAudio,
  level,
}: {
  item: LessonBlockItem
  uiText: LessonCopy['activeCard']
  copy: LessonCopy
  previousPhrases?: string[]
  onInputChange: (value: string) => void
  playAudio: () => void
  level?: CurrentLevel
}) {
  const [round, setRound] = useState(0)
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [allDone, setAllDone] = useState(false)

  const currentAnswer = item.answer?.trim() || item.prompt?.trim() || ''
  const prompts = useMemo(
    () => buildTypingPrompts(currentAnswer, previousPhrases),
    [currentAnswer, previousPhrases]
  )

  const currentPrompt = prompts[round] ?? currentAnswer

  const handleCheck = () => {
    if (!input.trim()) return
    const isAdvanced = level === 'advanced'
    const normalize = isAdvanced
      ? (s: string) => s.replace(/\s+/g, ' ').trim()
      : (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
    const correct = normalize(input) === normalize(currentPrompt)
    setIsCorrect(correct)
    setChecked(true)
  }

  const handleNext = () => {
    const next = round + 1
    if (next >= TYPING_ROUNDS) {
      setAllDone(true)
      onInputChange(input || '[typed]')
    } else {
      setRound(next)
      setInput('')
      setChecked(false)
      setIsCorrect(null)
    }
  }

  const roundLabel = uiText.aiQuestionRoundLabel
    .replace('{current}', String(round + 1))
    .replace('{total}', String(TYPING_ROUNDS))

  return (
    <div className="mt-4">
      <p className="text-center text-xs font-bold tracking-widest text-[#7b7b94]">
        {roundLabel}
      </p>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={playAudio}
          className="rounded-xl bg-blue-500 px-6 py-3 text-white transition hover:bg-blue-600"
        >
          {uiText.typingPlayButton}
        </button>
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mt-3 w-full rounded-xl border px-4 py-3 text-base"
        placeholder={currentPrompt.split(/\s+/).slice(0, 2).join(' ') + '...'}
      />

      {!checked && (
        <button
          type="button"
          onClick={handleCheck}
          className="mt-3 w-full rounded-xl bg-[#F5A623] py-3 text-white font-bold transition hover:bg-[#D4881A]"
        >
          {uiText.typingCheckButton}
        </button>
      )}

      {checked && (
        <div className="mt-3 space-y-2">
          <div className={`rounded-xl px-4 py-3 ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
            <p className="text-sm font-bold">
              {isCorrect ? copy.typing.correct : copy.typing.incorrect}
            </p>
            {!isCorrect && (
              <p className="mt-1 text-sm">
                {uiText.aiQuestionBetterWay}
                <span className="font-bold">{currentPrompt}</span>
              </p>
            )}
          </div>

          {round < TYPING_ROUNDS - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="w-full rounded-xl bg-blue-500 py-3 text-white font-bold transition hover:bg-blue-600"
            >
              {uiText.aiQuestionNextQuestion}
            </button>
          )}
        </div>
      )}

      {(allDone || (checked && round >= TYPING_ROUNDS - 1)) && (
        <button
          type="button"
          onClick={() => {
            if (!allDone) {
              setAllDone(true)
              onInputChange(input || '[typed]')
            }
            window.dispatchEvent(new Event('next-step'))
          }}
          className="mt-6 w-full rounded-xl bg-[#F5A623] py-4 text-base font-bold text-white transition hover:bg-[#D4881A]"
        >
          {uiText.scaffoldNextButton}
        </button>
      )}
    </div>
  )
}

/**
 * Evaluate: conversation-first.
 * 'good' = natural response, conversation works
 * 'close' = communicated but a more common phrasing exists
 * 'silent' = nothing recognizable was said
 */
function evaluateAnswer(transcript: string, expected: string): 'good' | 'close' | 'silent' {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const userWords = new Set(normalize(transcript))

  // Detect silent / noise-only recordings
  const noiseWords = new Set(['no', 'um', 'uh', 'hmm', 'ah', 'oh'])
  const meaningfulWords = [...userWords].filter((w) => !noiseWords.has(w))
  if (meaningfulWords.length === 0) return 'silent'

  // Check keyword overlap — if decent match, fully good
  const skipWords = new Set(['i', 'a', 'the', 'is', 'am', 'are', 'do', 'does', 'did', 'to', 'in', 'at', 'on', 'my', 'it', 'and', 'but', 'so', 'because', 'that', 'this', 'for', 'of'])
  const contentWords = normalize(expected).filter((w) => !skipWords.has(w))
  if (contentWords.length === 0) return 'good'

  const matched = contentWords.filter((w) => userWords.has(w)).length
  const ratio = matched / contentWords.length
  if (ratio >= 0.2) return 'good'

  // User said something different — still OK, just show the native phrasing
  return 'close'
}

const TOTAL_ROUNDS = 3

/**
 * Builds a natural follow-up question that encourages reuse of a previous phrase.
 * Uses sequence/routine patterns so the question feels like a real conversation.
 */
function buildReuseQuestion(phrase: string): string {
  const lower = phrase.toLowerCase()

  // Sequence questions — "what do you do after/before that?"
  if (/before bed|before sleep|at night|every night/i.test(lower))
    return 'And what do you do after that?'
  if (/in the morning|every morning|when.*wake/i.test(lower))
    return 'What do you do next?'
  if (/after work|after school|come home|came home/i.test(lower))
    return 'And then what do you do?'
  if (/after dinner|after breakfast|after lunch/i.test(lower))
    return 'What do you usually do next?'
  if (/before leaving|before going out/i.test(lower))
    return 'What do you do right before that?'

  // Routine questions — "how about on weekends?"
  if (/every day|every morning|every night|usually/i.test(lower))
    return 'How about on weekends?'

  // Location questions
  if (/at home|at the office|at work/i.test(lower))
    return 'What else do you do there?'
  if (/to work|to school|to the station/i.test(lower))
    return 'How long does that take?'

  // Generic conversational follow-up
  return 'What do you usually do after that?'
}

function AiQuestionPlayer({
  item,
  uiText,
  inputValue,
  onInputChange,
  previousPhrases = [],
}: {
  item: LessonBlockItem
  uiText: LessonCopy['activeCard']
  inputValue: string
  onInputChange: (value: string) => void
  previousPhrases?: string[]
}) {
  const [round, setRound] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [evaluation, setEvaluation] = useState<'good' | 'close' | 'silent' | null>(null)
  const [roundAnswered, setRoundAnswered] = useState(false)
  const questionAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map())
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const currentAnswer = item.answer?.trim() || item.prompt?.trim() || ''
  const aiQuestion = (item as LessonBlockItem & { aiQuestionText?: string | null }).aiQuestionText?.trim() || ''
  const lastPhrase = previousPhrases.length > 0
    ? previousPhrases[previousPhrases.length - 1]
    : null

  // Build 3 questions in the TARGET language (not UI language)
  // Q1 = scene-specific (with variation), Q2 = reuse previous phrase, Q3 = full sentence practice
  const questions = useMemo(() => {
    const q1Variants = aiQuestion
      ? [
          aiQuestion,
          `Tell me, ${aiQuestion.replace(/^\w/, (c) => c.toLowerCase())}`,
          `So, ${aiQuestion.replace(/^\w/, (c) => c.toLowerCase())}`,
        ]
      : ['Can you tell me about that?', 'What can you tell me?', 'Tell me more about this.']
    const q1 = q1Variants[Math.floor(Math.random() * q1Variants.length)]

    const q2Fallbacks = [
      'Can you tell me more about that?',
      'Could you explain a bit more?',
      'What else can you say about that?',
    ]
    const q2 = lastPhrase
      ? buildReuseQuestion(lastPhrase)
      : q2Fallbacks[Math.floor(Math.random() * q2Fallbacks.length)]

    const q3Variants = [
      'Say the full sentence one more time.',
      'Try saying it again from the beginning.',
      'One more time — say the whole thing.',
    ]
    const q3 = q3Variants[Math.floor(Math.random() * q3Variants.length)]

    return [q1, q2, q3]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiQuestion, lastPhrase])

  // Each round has its own expected answer for evaluation
  const expectedAnswers = useMemo(() => [
    currentAnswer,                           // Q1: current sentence
    lastPhrase ? `${lastPhrase} ${currentAnswer}` : currentAnswer, // Q2: accept both phrases
    currentAnswer,                           // Q3: current sentence again
  ], [currentAnswer, lastPhrase])

  const currentQuestion = questions[round] ?? questions[0]
  const expectedAnswer = expectedAnswers[round] ?? currentAnswer

  const roundLabel = uiText.aiQuestionRoundLabel
    .replace('{current}', String(round + 1))
    .replace('{total}', String(TOTAL_ROUNDS))

  const handlePlayQuestion = async () => {
    questionAudioRef.current?.pause()

    const cached = audioUrlCacheRef.current.get(currentQuestion)
    if (cached) {
      const audio = new Audio(cached)
      questionAudioRef.current = audio
      audio.play().catch(() => {})
      return
    }

    if (!currentQuestion) return
    setLoadingQuestion(true)
    const url = await fetchAudioUrl(currentQuestion)
    setLoadingQuestion(false)

    if (url) {
      audioUrlCacheRef.current.set(currentQuestion, url)
      const audio = new Audio(url)
      questionAudioRef.current = audio
      audio.play().catch(() => {})
    }
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
      setEvaluation(null)
      setRoundAnswered(false)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstart = () => setIsRecording(true)

      recorder.onstop = async () => {
        setIsRecording(false)
        stopStream()

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size === 0) return

        setIsRecognizing(true)
        try {
          const formData = new FormData()
          formData.append('file', blob, 'recording.webm')
          formData.append('expectedText', expectedAnswer)

          const res = await fetch('/api/pronunciation/score', { method: 'POST', body: formData })

          if (res.ok) {
            const data = await res.json()
            const recognized = data.transcript?.trim() || ''
            setTranscript(recognized)
            const result = evaluateAnswer(recognized, expectedAnswer)
            setEvaluation(result)
            // silent = could not hear, let user retry (don't mark as answered)
            if (result !== 'silent') {
              setRoundAnswered(true)
              if (round >= TOTAL_ROUNDS - 1) {
                setAllDone(true)
                onInputChange(recognized || '[answered]')
              }
            }
          } else {
            const text = await res.text()
            console.error('[AiQuestion] score API error', res.status, text)
            setTranscript('')
            setEvaluation('silent')
            // Don't mark as answered — let user retry
          }
        } catch (err) {
          console.error('[AiQuestion] fetch error', err)
          setTranscript('')
          setEvaluation('silent')
        }
        setIsRecognizing(false)
      }

      recorder.start(250)
    } catch {
      setIsRecording(false)
    }
  }

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }

  const handleNextQuestion = () => {
    const next = round + 1
    if (next >= TOTAL_ROUNDS) {
      setAllDone(true)
      onInputChange(transcript || '[answered]')
    } else {
      setRound(next)
      setTranscript('')
      setEvaluation(null)
      setRoundAnswered(false)
      setIsRecognizing(false)
      setIsRecording(false)
    }
  }

  const handleRetryAll = () => {
    setRound(0)
    setAllDone(false)
    setTranscript('')
    setEvaluation(null)
    setRoundAnswered(false)
    onInputChange('')
  }

  const feedbackMessage =
    evaluation === 'good' ? uiText.aiQuestionGood
    : evaluation === 'close' ? uiText.aiQuestionClose
    : evaluation === 'silent' ? uiText.aiQuestionSilent
    : null

  const feedbackColor =
    evaluation === 'good' ? 'text-green-700 bg-green-50'
    : evaluation === 'silent' ? 'text-gray-700 bg-gray-50'
    : 'text-blue-700 bg-blue-50'

  return (
    <div className="mt-4">
      <p className="text-center text-xs font-bold tracking-widest text-[#7b7b94]">
        {roundLabel}
      </p>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={handlePlayQuestion}
          disabled={loadingQuestion}
          className="rounded-xl bg-blue-500 px-6 py-3 text-white transition hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loadingQuestion ? '...' : uiText.aiQuestionPlayButton}
        </button>
      </div>

      <p className="mt-3 text-sm text-[#5a5a7a] text-center">
        {uiText.aiQuestionInstruction}
      </p>

      {!roundAnswered && (
        <div className="mt-4 flex justify-center">
          {!isRecording ? (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={isRecognizing}
              className="w-full max-w-[320px] rounded-xl bg-green-500 px-6 py-3 font-bold text-white transition hover:bg-green-600 disabled:bg-gray-300"
            >
              {isRecognizing ? uiText.aiQuestionRecognizing : uiText.aiQuestionRecordButton}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecording}
              className="w-full max-w-[320px] rounded-xl bg-red-500 px-6 py-3 font-bold text-white transition hover:bg-red-600"
            >
              {uiText.aiQuestionStopButton}
            </button>
          )}
        </div>
      )}

      {(transcript || evaluation === 'silent') && (
        <div className="mt-4 rounded-[14px] border border-[#E8E4DF] bg-white px-5 py-4">
          {transcript && evaluation !== 'silent' && (
            <>
              <p className="text-sm text-[#7b7b94] text-center">{uiText.aiQuestionYourAnswer}</p>
              <p className="mt-1 text-lg font-bold text-[#1a1a2e] text-center">{transcript}</p>
            </>
          )}

          {feedbackMessage && (
            <div className={`mt-3 rounded-xl px-4 py-3 ${feedbackColor}`}>
              <p className="text-sm font-bold">{feedbackMessage}</p>
              {evaluation === 'close' && expectedAnswer && (
                <p className="mt-1 text-sm">
                  {uiText.aiQuestionBetterWay}
                  <span className="font-bold">{expectedAnswer}</span>
                </p>
              )}
            </div>
          )}

          {roundAnswered && !allDone && round < TOTAL_ROUNDS - 1 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleNextQuestion}
                className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
              >
                {uiText.aiQuestionNextQuestion}
              </button>
            </div>
          )}
        </div>
      )}

      {(allDone || (roundAnswered && round >= TOTAL_ROUNDS - 1)) && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleRetryAll}
            className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
          >
            {uiText.aiQuestionRetryAll}
          </button>

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event('next-step'))
            }}
            className="w-full rounded-xl bg-[#F5A623] py-4 text-base font-bold text-white transition hover:bg-[#D4881A]"
          >
            {uiText.scaffoldNextButton}
          </button>
        </div>
      )}
    </div>
  )
}

async function fetchAudioUrl(text: string): Promise<string | null> {
  if (!text.trim()) return null
  try {
    const baseUrl =
      typeof window !== 'undefined' ? '' : 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/audio/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
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
}: {
  correctUrl: string
  recordedUrl: string
}) {
  const [playing, setPlaying] = useState<'correct' | 'recorded' | 'compare' | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function stopCurrent() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    setPlaying(null)
  }

  function playUrl(url: string, label: 'correct' | 'recorded') {
    stopCurrent()
    const audio = new Audio(url)
    audioRef.current = audio
    setPlaying(label)
    audio.onended = () => setPlaying(null)
    audio.onerror = () => setPlaying(null)
    audio.play().catch(() => setPlaying(null))
  }

  function playCompare() {
    stopCurrent()
    setPlaying('compare')

    const correct1 = new Audio(correctUrl)
    correct1.onended = () => {
      setTimeout(() => {
        const user = new Audio(recordedUrl)
        audioRef.current = user
        user.onended = () => {
          setTimeout(() => {
            const correct2 = new Audio(correctUrl)
            audioRef.current = correct2
            correct2.onended = () => setPlaying(null)
            correct2.onerror = () => setPlaying(null)
            correct2.play().catch(() => setPlaying(null))
          }, 300)
        }
        user.onerror = () => setPlaying(null)
        user.play().catch(() => setPlaying(null))
      }, 300)
    }
    correct1.onerror = () => setPlaying(null)
    audioRef.current = correct1
    correct1.play().catch(() => setPlaying(null))
  }

  useEffect(() => {
    return () => stopCurrent()
  }, [])

  const btnBase = 'w-full rounded-xl px-4 py-3 text-sm font-bold transition'
  const btnIdle = `${btnBase} border border-[#E8E4DF] bg-white text-[#1a1a2e] hover:bg-[#FAF7F2]`
  const btnActive = `${btnBase} border border-[#F5A623] bg-[#FFF9EC] text-[#D4881A]`

  return (
    <div className="mt-4 rounded-[14px] border border-[#E8E4DF] bg-[#FFFDF8] px-5 py-4">
      <p className="mb-3 text-center text-sm font-bold text-[#5a5a7a]">
        発音を聞き比べてみましょう
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => playing === 'correct' ? stopCurrent() : playUrl(correctUrl, 'correct')}
          className={playing === 'correct' ? btnActive : btnIdle}
        >
          {playing === 'correct' ? '再生中…' : '正しい発音を聞く'}
        </button>
        <button
          type="button"
          onClick={() => playing === 'recorded' ? stopCurrent() : playUrl(recordedUrl, 'recorded')}
          className={playing === 'recorded' ? btnActive : btnIdle}
        >
          {playing === 'recorded' ? '再生中…' : 'あなたの発音を聞く'}
        </button>
        <button
          type="button"
          onClick={() => playing === 'compare' ? stopCurrent() : playCompare()}
          className={playing === 'compare'
            ? `${btnBase} border border-[#F5A623] bg-[#F5A623] text-white`
            : `${btnBase} border border-[#F5A623] bg-white text-[#F5A623] hover:bg-[#FFF9EC]`}
        >
          {playing === 'compare' ? '聞き比べ中…' : '聞き比べる'}
        </button>
      </div>
    </div>
  )
}

function SemanticChunkList({ chunks }: { chunks: SemanticChunk[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-left">
      {chunks.map((c, i) => (
        <li key={`${c.chunk}-${i}`} className="text-xs leading-5 text-gray-500">
          <span className="font-semibold text-gray-600">{c.chunk}</span>
          <span className="mx-1.5">→</span>
          <span>{c.meaning}</span>
        </li>
      ))}
    </ul>
  )
}

function ScaffoldAutoPlay({
  scaffoldSteps,
  semanticChunks,
  lessonImageUrl,
  dynamicConversationHeading,
  scenarioLabel,
  audioUrl,
  uiText,
}: {
  scaffoldSteps: string[]
  semanticChunks: SemanticChunk[] | null | undefined
  lessonImageUrl: string
  dynamicConversationHeading: string
  scenarioLabel: string
  audioUrl: string
  uiText: LessonCopy['activeCard']
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stepAudioUrls, setStepAudioUrls] = useState<(string | null)[]>([])
  const [playRequested, setPlayRequested] = useState(false)
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false)
  const [hasPlayedMixStep, setHasPlayedMixStep] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)
  const totalSteps = Math.max(Math.min(scaffoldSteps.length, 3), 1)
  const stepsKey = scaffoldSteps.slice(0, 3).join('||')

  // Fetch audio URLs on mount / when steps change
  useEffect(() => {
    cancelledRef.current = false
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

    Promise.all(texts.map(fetchAudioUrl)).then((urls) => {
      if (!cancelledRef.current) {
        setStepAudioUrls(urls)
        setLoading(false)
        setPlayRequested(true)
      }
    })

    return () => { cancelledRef.current = true }
  }, [stepsKey])

  // Play current step audio
  useEffect(() => {
    if (!playRequested || allDone || stepAudioUrls.length === 0) return

    const url = stepAudioUrls[currentStep]
    if (!url) {
      const next = currentStep + 1
      if (next >= totalSteps) {
        setAllDone(true)
        setPlayRequested(false)
      } else {
        setCurrentStep(next)
      }
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio

    audio.onended = () => {
      const next = currentStep + 1
      if (next >= totalSteps) {
        setAllDone(true)
        setIsPlaying(false)
        setPlayRequested(false)
      } else {
        setCurrentStep(next)
      }
    }

    audio.onerror = () => {
      setIsPlaying(false)
      const next = currentStep + 1
      if (next >= totalSteps) {
        setAllDone(true)
        setPlayRequested(false)
      } else {
        setCurrentStep(next)
      }
    }

    audio.play()
      .then(() => {
        setIsPlaying(true)
        setHasPlayedOnce(true)
        if (currentStep === 1) setHasPlayedMixStep(true)
      })
      .catch(() => {
        // Autoplay blocked — let user tap play
        setIsPlaying(false)
        setPlayRequested(false)
      })

    return () => {
      audio.pause()
      audio.onended = null
      audio.onerror = null
    }
  }, [currentStep, playRequested, allDone, stepAudioUrls, totalSteps])

  const handleRestart = () => {
    setCurrentStep(0)
    setAllDone(false)
    setPlayRequested(true)
  }

  const handleManualPlay = () => {
    setPlayRequested(true)
  }

  const playingLabel = uiText.scaffoldPlayingLabel
    .replace('{current}', String(currentStep + 1))
    .replace('{total}', String(totalSteps))

  const showPlayButton = !loading && !isPlaying && !allDone && !playRequested

  return (
    <div className="mt-4 text-center">
      <div className="rounded-[14px] border border-[#E8E4DF] bg-white px-4 py-6">
        <LessonSceneImage src={lessonImageUrl} alt={dynamicConversationHeading} caption={getSceneCaption({ scenarioLabel, dynamicConversationHeading })} />

        <p className="mt-4 text-sm text-[#5a5a7a]">
          {uiText.scaffoldInstruction}
        </p>

        {loading && (
          <p className="mt-3 text-sm text-[#7b7b94]">音声を準備中...</p>
        )}

        {isPlaying && (
          <p className="mt-3 text-sm font-semibold text-blue-600">
            {playingLabel}
          </p>
        )}

        {currentStep === 1 && hasPlayedMixStep && semanticChunks != null && semanticChunks.length > 0 && (
          <div className="mx-auto mt-4 max-w-[280px]">
            <SemanticChunkList chunks={semanticChunks} />
          </div>
        )}

        {showPlayButton && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleManualPlay}
              className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
            >
              {hasPlayedOnce ? uiText.scaffoldRestartButton : '音声を聞く'}
            </button>
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
                className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
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
          className="mt-6 w-full rounded-xl bg-[#F5A623] py-4 text-base font-bold text-white transition hover:bg-[#D4881A]"
        >
          {uiText.scaffoldNextButton}
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
  inputValue,
  onInputChange,
  onCheck,
  onStartRepeatFromListen,
  onRetryListenFromRepeat,
  repeatAutoStartNonce,
  listenResetNonce,
  currentStageId,
  copy: _copy,
  isLessonComplete: _isLessonComplete,
  targetLanguageLabel,
  scenarioLabel,
  previousPhrases = [],
  level,
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
  const resultRef = useRef<HTMLDivElement | null>(null)

  const stageTone = getStageTone({ currentStageId })
  const dynamicConversationHeading = _copy.activeCard.lessonHeadingTemplate
    .replace('{scene}', scenarioLabel || targetLanguageLabel)
    .replace('{language}', targetLanguageLabel)
  const lessonImageUrl =
    (item as LessonBlockItem & { image_url?: string | null }).image_url?.trim() ||
    '/images/backgrounds/home_01.webp'
  const audioUrl = getItemAudioUrl(item)

  const currentIndex =
    currentStageId === 'listen' || currentStageId === 'repeat'
      ? 0
      : currentStageId === 'scaffold_transition'
        ? 1
        : currentStageId === 'ai_question'
          ? 2
          : currentStageId === 'typing'
            ? 3
            : currentStageId === 'ai_conversation'
              ? 4
              : 0

  const TOTAL_STAGES = 5
  const questionProgressPercent =
    ((currentIndex + 1) / TOTAL_STAGES) * 100

  const [playbackRate, setPlaybackRate] = useState<0.75 | 1.0 | 1.25>(1.0)
  const [isRecordingRepeat, setIsRecordingRepeat] = useState(false)
  const [repeatTranscript, setRepeatTranscript] = useState('')
  const [repeatScore, setRepeatScore] = useState<number | null>(null)
  const [repeatScoreBreakdown, setRepeatScoreBreakdown] = useState<RepeatScoreBreakdown | null>(
    null
  )
  const [missingWords, setMissingWords] = useState<string[]>([])
  const [, setMatchedWords] = useState<string[]>([])
  const [repeatAttemptCount, setRepeatAttemptCount] = useState(0)
  const uiText = _copy.activeCard

  const scaffoldSteps = useMemo(() => getScaffoldSteps(item), [item])
  const [scaffoldStepIndex, setScaffoldStepIndex] = useState(0)
  
  const stageNames = [
    uiText.timelineListenRepeat,
    uiText.stageScaffoldLabel,
    uiText.timelineAiQuestion,
    uiText.timelineTyping,
    uiText.timelineAiConversation,
  ]
  const questionLabelText = `${stageNames[currentIndex] ?? ''} (${currentIndex + 1} / ${TOTAL_STAGES})`
  const questionProgressLabelText = formatCopy(uiText.questionProgressLabel, {
    current: currentIndex + 1,
  })
  
  const scaffoldStepLabelText = formatCopy(uiText.scaffoldStepLabel, {
    current: scaffoldStepIndex + 1,
    total: scaffoldSteps.length,
  })
  
  const repeatAttemptCountLabelText = formatCopy(uiText.repeatAttemptCountLabel, {
    current: repeatAttemptCount,
    max: 3,
  })

  const [repeatRecognitionError, setRepeatRecognitionError] = useState<string | null>(null)
  const [listenPlaybackError, setListenPlaybackError] = useState<string | null>(null)
  const [recordedPlaybackError, setRecordedPlaybackError] = useState<string | null>(null)
  const [isListenPlaying, setIsListenPlaying] = useState(false)
  const [isScoringRepeat, setIsScoringRepeat] = useState(false)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)

  const timelineSteps = [
    uiText.timelineListenRepeat,
    uiText.stageScaffoldLabel,
    uiText.timelineAiQuestion,
    uiText.timelineTyping,
    uiText.timelineAiConversation,
  ]

  const typingResultClassName =
    progress.isCorrect == null ? '' : progress.isCorrect ? 'text-green-700' : 'text-amber-700'

  const guideCharacter = getGuideCharacter({
    currentStageId,
    isRecordingRepeat,
    isListenPlaying,
    isCorrect: progress.isCorrect,
    uiText,
  })

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
      repeatResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [repeatTranscript])

  const playListenAudio = useCallback(() => {
    if (!audioUrl) {
      setListenPlaybackError(uiText.listenAudioNotReady)
      return
    }

    const audio = listenAudioRef.current
    if (!audio || !audio.src) {
      setListenPlaybackError(uiText.listenAudioNotReady)
      return
    }

    setListenPlaybackError(null)

    if (audio.readyState < 2) {
      audio.load()
    }

    audio.currentTime = 0
    audio.playbackRate = playbackRate

    audio
      .play()
      .then(() => {
        setListenPlaybackError(null)
      })
      .catch((error) => {
        console.error('listen audio play failed', error)
        setListenPlaybackError(uiText.listenAudioNotReady)
      })
  }, [audioUrl, playbackRate])

  const stopListenAudio = useCallback(() => {
    const audio = listenAudioRef.current
    audio?.pause()
    if (audio) {
      audio.currentTime = 0
    }
    setIsListenPlaying(false)
  }, [])

  const playRecordedAudio = useCallback(() => {
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

      try {
        setIsScoringRepeat(true)

        const response = await fetch('/api/pronunciation/score', {
          method: 'POST',
          body: formData,
        })

        const data = (await response.json()) as PronunciationScoreApiResponse

        if (!response.ok || !data.ok) {
          setRepeatRecognitionError(uiText.repeatScoreError)
          return
        }

        setRepeatTranscript(data.transcript)
        onInputChange(data.transcript)
        setRepeatScore(data.totalScore)
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
      setRepeatScoreBreakdown(null)
      setMissingWords([])
      setMatchedWords([])
      setRecordedAudioUrl(null)
      setIsScoringRepeat(false)
      ;(window as any).__lastRecordedBlob = null

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
        ;(window as any).__lastRecordedBlob = blob
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

  useEffect(() => {
    if (currentStageId !== 'repeat') return
    if (repeatAutoStartNonce === 0) return
    if (lastAutoStartedNonceRef.current === repeatAutoStartNonce) return

    lastAutoStartedNonceRef.current = repeatAutoStartNonce
    void startRepeatRecognition()
  }, [currentStageId, repeatAutoStartNonce, startRepeatRecognition])

  useEffect(() => {
    if (currentStageId !== 'listen') return

    lastAutoStartedNonceRef.current = 0
    stopListenAudio()
    mediaRecorderRef.current?.stop()
    stopMediaStream(mediaStreamRef.current)
    mediaStreamRef.current = null
    mediaRecorderRef.current = null
    mediaChunksRef.current = []
    setIsRecordingRepeat(false)

    setRepeatTranscript('')
    setRepeatScore(null)
    setRepeatScoreBreakdown(null)
    setMissingWords([])
    setMatchedWords([])
    setRepeatRecognitionError(null)
    setRecordedPlaybackError(null)
    setRecordedAudioUrl(null)
    setRepeatAttemptCount(0)
    setIsScoringRepeat(false)

    if (typeof window !== 'undefined') {
      ;(window as any).__lastRecordedBlob = null
    }
  }, [currentStageId, listenResetNonce, stopListenAudio])

  return (
    <section className="mt-5 rounded-[24px] border border-[#E8E4DF] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:px-6 sm:py-6">
      <div className="mb-5 rounded-[18px] border border-[#E8E4DF] bg-[#FCFBF8] px-4 py-4">
        <StageProgressBar currentBlockIndex={currentQuestionIndex} totalBlocks={totalQuestions} label={uiText.blockProgressLabel} />
      </div>

      <div className="mb-5">
        <div className="relative flex items-start justify-between">
          {timelineSteps.map((label, index) => {
            const isDone = index < currentIndex
            const isCurrent = index === currentIndex

            return (
              <div key={index} className="z-10 flex flex-1 flex-col items-center">
                <div
                  className={[
                    'flex items-center justify-center rounded-full border-2 transition-all',
                    isDone ? 'border-[#22c55e] bg-[#22c55e]' : 'border-[#D6D3D1] bg-white',
                    isCurrent
                      ? 'h-4 w-4 scale-125 shadow-[0_0_0_3px_rgba(34,197,94,0.18)]'
                      : 'h-3 w-3',
                  ].join(' ')}
                />
                <span className="mt-2 text-center text-xs font-bold leading-4 text-[#7b7b94]">
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
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#9c9c9c]">
            STEP {currentIndex + 1} / {timelineSteps.length}
          </p>

          <div
            className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wider ${stageTone.badgeClassName}`}
          >
            {getStageLabel(currentStageId, uiText)}
          </div>

          <p className="text-sm text-gray-500 mb-2">
            {uiText.nowDoingLabel}：{getCurrentActionLabel(currentStageId, uiText)}
          </p>

          <h2 className="mt-3 text-xl font-black tracking-tight text-[#1a1a2e] sm:text-2xl">
            {dynamicConversationHeading}
          </h2>
        </div>

        <div className="w-full rounded-[16px] border border-[#D9E8FF] bg-[#F8FBFF] px-5 py-4 lg:max-w-[520px]">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 flex-col items-center min-w-[64px]">
              <img
                src={guideCharacter.imageSrc}
                alt={guideCharacter.name}
                className="h-14 w-14 rounded-full border-2 border-[#BFDBFE] bg-white object-cover shadow-sm"
              />
              <p className="mt-2 text-xs font-bold tracking-wider text-[#2563EB]">
                {guideCharacter.name}
              </p>
            </div>

            <div className="relative min-w-0 flex-1 rounded-2xl border border-[#BFDBFE] bg-white px-4 py-3 shadow-sm overflow-visible">
              <div className="absolute left-0 top-5 -translate-x-[12px] h-0 w-0 border-b-[10px] border-r-[12px] border-t-[10px] border-b-transparent border-r-[#BFDBFE] border-t-transparent" />
              <div className="absolute left-0 top-5 -translate-x-[10px] h-0 w-0 border-b-[8px] border-r-[10px] border-t-[8px] border-b-transparent border-r-[#BFDBFE] border-t-transparent" />
              <p className="text-xs font-bold tracking-wider text-[#2563EB]">
                {guideCharacter.title}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#2563EB]">
                {guideCharacter.messagePrimary}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#5a5a7a]">
                {guideCharacter.messageSecondary}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mt-5 rounded-[20px] px-4 py-4 sm:px-5 sm:py-5 ${stageTone.panelClassName}`}
      >
        <div className="rounded-[20px] px-4 py-4 sm:px-5 sm:py-5">
          {audioUrl ? (
            <audio
              key={audioUrl}
              ref={listenAudioRef}
              src={audioUrl}
              onPlay={() => setIsListenPlaying(true)}
              onPause={() => setIsListenPlaying(false)}
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
            <div className="mt-4 text-center">
              <LessonSceneImage src={lessonImageUrl} alt={dynamicConversationHeading} caption={getSceneCaption({ scenarioLabel, dynamicConversationHeading })} />

              <p className="mt-4 text-sm leading-6 text-[#5a5a7a]">
                {uiText.listenInstruction}
              </p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={playListenAudio}
                  className="cursor-pointer rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600"
                >
                  {uiText.listenPlayButton}
                </button>
                <button
                  type="button"
                  onClick={stopListenAudio}
                  className="cursor-pointer rounded-xl bg-gray-400 px-5 py-3 text-sm font-bold text-white hover:bg-gray-500"
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

              <p className="mt-8 whitespace-pre-line text-sm leading-6 text-[#5a5a7a]">
                {uiText.listenStartRepeatInstruction}
              </p>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onStartRepeatFromListen}
                  disabled={isListenPlaying}
                  className={`w-full max-w-[280px] rounded-xl px-5 py-3 text-sm font-bold text-white transition ${
                    isListenPlaying
                      ? 'cursor-not-allowed bg-gray-300'
                      : 'cursor-pointer bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isListenPlaying ? uiText.listenPlayingLabel : uiText.listenRecordingButton}
                </button>
              </div>

              {listenPlaybackError && (
                <p className="mt-2 text-sm text-red-600">{listenPlaybackError}</p>
              )}

              {!audioUrl && (
                <p className="mt-2 text-sm text-amber-700">{uiText.listenAudioNotReady}</p>
              )}
            </div>
          )}

          {currentStageId === 'repeat' && (
            <div className="mt-4 text-center">
              <p className="text-sm text-[#5a5a7a]">
                {isRecordingRepeat ? uiText.repeatPrimary : uiText.repeatSpeakInstruction}
              </p>

              <div className="mt-3 rounded-[14px] border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-3">
                <p className="text-xs font-bold tracking-widest text-[#16A34A]">
                  {uiText.stageListenRepeatLabel}
                </p>
              </div>

              <div className="mt-3 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    stopListenAudio()
                    onRetryListenFromRepeat()
                  }}
                  className="w-full max-w-[280px] cursor-pointer rounded-xl bg-blue-500 px-4 py-3 text-white transition hover:bg-blue-600"
                >
                  {uiText.repeatRetryAudioButton}
                </button>

                <button
                  type="button"
                  onClick={isRecordingRepeat ? stopRepeatRecognition : startRepeatRecognition}
                  disabled={isScoringRepeat}
                  className={`w-full max-w-[280px] rounded-xl px-4 py-3 text-white transition ${
                    isScoringRepeat
                      ? 'cursor-not-allowed bg-gray-300'
                      : 'cursor-pointer bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isRecordingRepeat ? uiText.repeatStopRecordingButton : uiText.repeatRecordingButton}
                </button>

                {recordedAudioUrl && (
                  <button
                    type="button"
                    onClick={playRecordedAudio}
                    className="w-full max-w-[280px] cursor-pointer rounded-xl bg-purple-500 px-4 py-3 text-white transition hover:bg-purple-600"
                  >
                    {uiText.repeatPlayRecordedButton}
                  </button>
                )}

                {recordedAudioUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      const blob = (window as any).__lastRecordedBlob
                      if (!blob) {
                        setRepeatRecognitionError(uiText.repeatEmptyRecordingError)
                        return
                      }
                      await scoreRepeatRecording(blob)
                    }}
                    disabled={isRecordingRepeat || isScoringRepeat}
                    className={`mt-2 w-full max-w-[280px] rounded-xl px-6 py-4 text-lg font-bold text-white transition ${
                      isRecordingRepeat || isScoringRepeat
                        ? 'cursor-not-allowed bg-[#E7C27A]'
                        : 'cursor-pointer bg-[#F5A623] hover:bg-[#D4881A]'
                    }`}
                  >
                    {isScoringRepeat ? uiText.repeatScoringLabel : uiText.repeatScoreButton}
                  </button>
                )}
              </div>

              {!mediaRecordingSupported && (
                <p className="mt-3 text-sm text-amber-700">
                  {uiText.repeatBrowserUnsupported}
                </p>
              )}

              {repeatRecognitionError && (
                <p className="mt-3 text-sm text-red-600">{repeatRecognitionError}</p>
              )}

              {recordedAudioUrl && (
                <p className="mt-3 text-xs text-[#7b7b94]">
                  {uiText.repeatRecordedReady}
                </p>
              )}

              {repeatTranscript && (
                <div ref={repeatResultRef} className="mt-3 rounded-[14px] border border-[#E8E4DF] bg-white px-5 py-5 text-center">
                  {/* 1. Immediate encouragement */}
                  <p className="text-xl font-black text-[#F5A623]">
                    {repeatScore !== null && repeatScore >= 70
                      ? 'すごい！上手に言えました'
                      : 'いい調子です！'}
                  </p>
                  <p className="mt-1 text-xs text-[#7b7b94]">
                    {repeatScore !== null && repeatScore >= 70
                      ? '次に進みましょう'
                      : 'もう少しで完璧です — もう一度聞いて真似してみましょう'}
                  </p>

                  {/* 2. Score as friendly progress bar */}
                  {repeatScore !== null && (
                    <div className="mx-auto mt-4 max-w-[260px]">
                      <div className="flex items-center justify-between text-xs text-[#7b7b94]">
                        <span>{repeatAttemptCount > 0 ? `${repeatAttemptCount}回目` : ''}</span>
                        <span className="font-bold text-[#1a1a2e]">{repeatScore}点</span>
                      </div>
                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#F0EDE8]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            repeatScore >= 70 ? 'bg-[#22C55E]' : 'bg-[#F5A623]'
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
                    const tip = getRepeatTip(repeatScoreBreakdown, missingWords, repeatScore)
                    if (!tip) return null
                    return (
                      <p className="mx-auto mt-4 max-w-[280px] text-center text-xs leading-5 text-[#7b7b94]">
                        {tip}
                      </p>
                    )
                  })()}

                  {/* 6. Primary action */}
                  {repeatScore !== null && repeatScore >= 70 && (
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new Event('next-step'))
                      }}
                      className="mx-auto mt-5 block w-full max-w-[280px] cursor-pointer rounded-xl bg-[#F5A623] py-3.5 text-sm font-black text-white transition hover:-translate-y-px hover:bg-[#D4881A] active:scale-[0.99]"
                    >
                      {uiText.repeatNextQuestionButton}
                    </button>
                  )}

                  {/* 6. Attempt limit — gentle skip */}
                  {repeatAttemptCount >= 3 && repeatScore !== null && repeatScore < 80 && (
                    <div className="mt-4">
                      <p className="text-xs text-[#7b7b94]">
                        大丈夫！何度も聞くうちに自然と言えるようになります
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new Event('next-step'))
                        }}
                        className="mx-auto mt-3 block w-full max-w-[280px] rounded-xl bg-[#F5A623] py-3.5 text-sm font-bold text-white transition hover:bg-[#D4881A]"
                      >
                        次に進む
                      </button>
                    </div>
                  )}
                </div>
              )}

              {repeatTranscript && audioUrl && recordedAudioUrl && (
                <AudioCompareCard correctUrl={audioUrl} recordedUrl={recordedAudioUrl} />
              )}

              {recordedPlaybackError && (
                <p className="mt-2 text-sm text-red-600">{recordedPlaybackError}</p>
              )}
            </div>
          )}

          {currentStageId === 'scaffold_transition' && (
            <ScaffoldAutoPlay
              scaffoldSteps={scaffoldSteps}
              semanticChunks={(item as LessonBlockItem & { semantic_chunks?: SemanticChunk[] | null }).semantic_chunks}
              lessonImageUrl={lessonImageUrl}
              dynamicConversationHeading={dynamicConversationHeading}
              scenarioLabel={scenarioLabel}
              audioUrl={audioUrl}
              uiText={uiText}
            />
          )}

          {currentStageId === 'ai_question' && (
            <div>
              <div className="mb-4">
                <LessonSceneImage src={lessonImageUrl} alt={dynamicConversationHeading} caption={getSceneCaption({ scenarioLabel, dynamicConversationHeading })} />
              </div>
            <AiQuestionPlayer
              key={item.id}
              item={item}
              uiText={uiText}
              inputValue={inputValue}
              onInputChange={onInputChange}
              previousPhrases={previousPhrases}
            />
            </div>
          )}

          {currentStageId === 'typing' && (
            <TypingMultiRound
              key={item.id}
              item={item}
              uiText={uiText}
              copy={_copy}
              previousPhrases={previousPhrases}
              onInputChange={onInputChange}
              playAudio={playListenAudio}
              level={level}
            />
          )}

          {currentStageId === 'ai_conversation' && (
            <AiConversationPlayer
              key={item.id}
              item={item}
              uiText={uiText}
              previousPhrases={previousPhrases}
              onInputChange={onInputChange}
              isLastBlock={currentQuestionIndex >= totalQuestions - 1}
            />
          )}
        </div>
      </div>
    </section>
  )
}