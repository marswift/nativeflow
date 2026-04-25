import 'server-only'
import type { ChatMessage } from './openai-client'
import { buildRegionPromptContext } from './lesson-run-service'
import type { SerializedConversationState } from './ai-conversation-state'
import { matchSceneQuestions } from './ai-conversation-scene-questions'
import type { SlotDefinition, SceneSlotSchema } from './ai-conversation-scene-questions'

// ——— API contract ———

export type AiConversationFlavorContext = {
  sceneId?: string
  region?: string
  ageGroup?: string
  topics?: string[]
  references?: string[]
  cultureNotes?: string[]
  setting?: string
  lifestyle?: string[]
}

export type AiConversationRequest = {
  turnIndex: number
  userMessage: string
  lessonPhrase: string
  conversationHistory: { ai: string; user: string }[]
  /** Optional flavor context for emotionally natural conversation. */
  flavorContext?: AiConversationFlavorContext | null
  /** Numeric rank for difficulty scaling. 0 = brand new, 100+ = advanced. */
  rank?: number | null
  /** Optional explicit closing-turn signal from UI orchestrator. */
  isClosingTurn?: boolean
  /** Engine-determined next instruction (single source of truth for progression). */
  nextInstruction?: string | null
  /** Engine-determined suggested question for this turn. */
  engineSuggestedQuestion?: string | null
  /** Engine-determined action type for this turn. */
  engineAction?: string | null
  /** Engine-determined current dimension being asked (for slot validation). */
  engineDimension?: string | null
  /** Wrap prompts from conversation plan (for closing assembly). */
  engineWrapPrompts?: string[] | null
  /** Clarification prompts from conversation plan. */
  engineClarificationPrompts?: { fragment: string[]; confusion: string[]; garbled: string[] } | null
  /** Engine conversation state snapshot. */
  engineState?: SerializedConversationState | null
}

export type AiConversationEvaluation = {
  isRelevant: boolean
  isNatural: boolean
  isComplete: boolean
  score: number
  feedback: string
  correction: string | null
  naturalAlternative: string | null
  followUp: string | null
}

export type AiConversationResponse = {
  aiReply: string
  /** Simplified result for UI flow control */
  evaluation: 'good' | 'retry'
  /** Detailed evaluation breakdown */
  evaluationDetail: AiConversationEvaluation
  hint: string | null
  nextPrompt: string | null
}

// ——— Prompt builder (V2.5 — classification only, no reply text) ———

const SYSTEM_PROMPT_V25 = `You are a classification engine for a daily-life English conversation practice app.

SCENE: "{lessonPhrase}"

YOUR JOB: Classify the student's message and evaluate their English. Do NOT generate reply text.

OUTPUT — respond with this exact JSON, no other text:
{
  "intent": "answer | question_to_ai | greeting | unclear | off_topic | closing",
  "meaning": {
    "type": "yes | no | object | person | time | frequency | feeling | social | unclear",
    "value": "extracted keyword or null",
    "confidence": 0.0-1.0
  },
  "answerToAi": "brief answer if intent=question_to_ai, else null",
  "result": "good" or "retry",
  "evaluation": {
    "isRelevant": true/false,
    "isNatural": true/false,
    "isComplete": true/false,
    "score": 0-100,
    "feedback": "one short Japanese feedback sentence",
    "correction": "natural version or null",
    "naturalAlternative": "alternative or null",
    "followUp": "short follow-up question"
  },
  "hint": "Japanese hint if retry, else null",
  "nextPrompt": "example sentence if retry, else null"
}

FIELD RULES:
- "intent": Classify the student's message into exactly one category.
  answer = clear response to your question.
  question_to_ai = student asks YOU something or ends with "and you?", "how about you?", "and u?", "what about you?".
  greeting = hi/hello.
  unclear = broken/garbled/ASR noise/nonsense tokens with no recognizable English words.
  off_topic = unrelated to scene.
  closing = goodbye.
- "meaning.type": What kind of information they gave.
  yes/no for affirmative/negative.
  object/person/time/frequency for specific content.
  feeling for emotional states (bored, tired, happy, sad, excited, stressed).
  social for greetings/pleasantries/small talk ("I'm good", "not bad").
  unclear if garbled/nonsense.
- "meaning.value": Extract the key content word(s). "dishes" from "I clean the dishes". "bored" from "I'm bored today". null if unclear.
- "meaning.confidence": 0.0-1.0. Set below 0.4 if ASR seems broken, words don't make sense, or input is random syllables with no recognizable English.
- "answerToAi": ONLY when intent=question_to_ai. Write a brief, natural, friendly answer (max 8 words). Match the student's tone — if they share a feeling, acknowledge it warmly. Example: "I'm good too, thanks!" / "Oh no, hope you feel better!" / "Same here, a bit tired." Must be null for all other intents.
- "result": "good" if score >= 50, "retry" if score < 50.

EXAMPLES:
- "I'm bored today, and you?" → intent=question_to_ai, meaning.type=feeling, meaning.value="bored", answerToAi="Yeah, me too sometimes!"
- "How are you?" → intent=question_to_ai, meaning.type=social, answerToAi="I'm good, thanks!"
- "mekwinyapalawan" → intent=unclear, meaning.type=unclear, confidence=0.1, answerToAi=null
- "I klina falon" → intent=unclear, meaning.type=unclear, confidence=0.2, answerToAi=null
- "Yes, I do" → intent=answer, meaning.type=yes, confidence=0.95, answerToAi=null
- "The dishes" → intent=answer, meaning.type=object, meaning.value="dishes", confidence=0.9, answerToAi=null`

export function buildSystemPrompt(lessonPhrase: string): string {
  return SYSTEM_PROMPT_V25.replace('{lessonPhrase}', lessonPhrase)
}

/** Builds an optional flavor guidance section for the system prompt. */
function buildFlavorSection(ctx: AiConversationFlavorContext | null | undefined): string {
  if (!ctx) return ''

  const lines: string[] = []
  if (ctx.sceneId) lines.push(`- Scene: ${ctx.sceneId}`)
  if (ctx.region) lines.push(`- Region: ${ctx.region}`)
  if (ctx.ageGroup) lines.push(`- Age group: ${ctx.ageGroup}`)

  const flavorLines: string[] = []
  if (ctx.setting) flavorLines.push(`- Setting: ${ctx.setting}`)
  if (ctx.topics && ctx.topics.length > 0) flavorLines.push(`- Topics: ${ctx.topics.join(', ')}`)
  if (ctx.lifestyle && ctx.lifestyle.length > 0) flavorLines.push(`- Lifestyle: ${ctx.lifestyle.join(', ')}`)
  if (ctx.references && ctx.references.length > 0) flavorLines.push(`- References: ${ctx.references.join(', ')}`)
  if (ctx.cultureNotes && ctx.cultureNotes.length > 0) flavorLines.push(`- Culture notes: ${ctx.cultureNotes.join(', ')}`)

  if (lines.length === 0 && flavorLines.length === 0) return ''

  const parts: string[] = []
  if (lines.length > 0) parts.push(`Context:\n${lines.join('\n')}`)
  if (flavorLines.length > 0) {
    parts.push([
      'Optional flavor guidance:',
      ...flavorLines,
      '',
      'How to use this guidance:',
      '- Setting and lifestyle are IMPLICIT atmosphere — do NOT narrate or describe them. Let them shape your tone and word choice silently.',
      '- Use topics and references ONLY when they fit naturally. Pick at most one per reply.',
      '- Do NOT force all flavor elements into a single reply. Most should be ignored in any given turn.',
      '- Prefer subtle influence: a casual word choice, a small cultural detail, a natural reaction — not a list.',
      '- Keep the reply simple, natural, and appropriate for the learner\'s level. Still under 20 words.',
      '- Prioritize realistic conversation over showing off the flavor data. Less is more.',
    ].join('\n'))
  }

  return '\n\n' + parts.join('\n\n')
}

/** Build rank-based difficulty constraints for the AI prompt. */
function buildRankSection(rank: number | null | undefined): string {
  if (rank == null) return ''
  const r = Math.max(0, rank)

  if (r < 20) {
    return `\n\nDIFFICULTY (rank ${r}, ultra-beginner):
- Reply in EXACTLY 1 short sentence (5-8 words max)
- Use only basic daily words (eat, go, like, have, do, good, nice)
- ONE purpose per turn: either react OR ask — never both
- NO stacked praise. Pick ONE short reaction word only.
- NO "Tell me more" or "What else?" style expansion
- Stay connected to the scene topic
- Good: "Do you like breakfast?" / "That sounds nice." / "What did you eat?"
- Bad: "Cool! Nice! So what did you do?" (too many ideas)`
  }

  if (r < 40) {
    return `\n\nDIFFICULTY (rank ${r}, beginner):
- Reply in 1 sentence (max 10 words)
- Use simple everyday vocabulary
- ONE idea per turn
- One short reaction + one short question is OK if total stays under 10 words
- NO stacked exclamations
- Stay connected to the scene
- Good: "Nice. Do you do that every day?" / "I see. Was it fun?"
- Bad: "Great! That's awesome! Tell me about your morning!" (too much)`
  }

  if (r < 60) {
    return `\n\nDIFFICULTY (rank ${r}, lower-intermediate):
- Up to 2 short sentences (max 15 words total)
- Simple follow-up questions are fine
- Keep vocabulary accessible — no idioms or complex phrases
- React naturally + ask one related question
- Good: "That sounds good. What time do you usually eat?" (10 words)`
  }

  if (r < 80) {
    return `\n\nDIFFICULTY (rank ${r}, intermediate):
- Up to 2 sentences, moderate naturality (max 20 words)
- Follow-up depth allowed
- Can reference scene context
- Light opinions and personal comments are fine`
  }

  return `\n\nDIFFICULTY (rank ${r}, advanced):
- Natural conversational style, up to 2-3 sentences
- Flexible expression, opinions, humor allowed
- Keep it scene-relevant and under 25 words`
}

export function buildChatMessages(
  request: AiConversationRequest,
): ChatMessage[] {
  const flavorSection = buildFlavorSection(request.flavorContext)
  const regionPrompt = buildRegionPromptContext(request.flavorContext?.region ?? null)
  const regionSection = regionPrompt ? `\n\nREGION:\n${regionPrompt}` : ''
  const rankSection = buildRankSection(request.rank)
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(request.lessonPhrase) + rankSection + flavorSection + regionSection },
  ]

  // Replay conversation history (includes the current turn's user message)
  for (const turn of request.conversationHistory) {
    messages.push({ role: 'assistant', content: turn.ai })
    if (turn.user) {
      messages.push({ role: 'user', content: turn.user })
    }
  }

  // Instruction for current turn — V2.5 classification only
  const userSaid = request.userMessage.trim()
  const userLower = userSaid.toLowerCase()
  const userIsFarewell = /\b(see you|next time|goodbye|bye|take care)\b/.test(userLower)
  const isClosing = request.isClosingTurn === true || userIsFarewell
  const closingHint = isClosing ? ' The student is saying goodbye.' : ''

  messages.push({
    role: 'system',
    content: `Turn ${request.turnIndex} of 5. Student said: "${userSaid}".${closingHint}
Classify intent, extract meaning, evaluate English. Do NOT generate reply text.
If the student asked you a question (intent=question_to_ai), provide a brief natural answer in "answerToAi" (max 8 words).
Respond in JSON only.`,
  })

  return messages
}

function parseEvaluationDetail(obj: unknown): AiConversationEvaluation {
  if (typeof obj === 'object' && obj !== null) {
    const e = obj as Record<string, unknown>
    return {
      isRelevant: e.isRelevant === true,
      isNatural: e.isNatural === true,
      isComplete: e.isComplete === true,
      score: typeof e.score === 'number' ? Math.max(0, Math.min(100, e.score)) : 0,
      feedback: typeof e.feedback === 'string' ? e.feedback : '',
      correction: typeof e.correction === 'string' ? e.correction : null,
      naturalAlternative: typeof e.naturalAlternative === 'string' ? e.naturalAlternative : null,
      followUp: typeof e.followUp === 'string' ? e.followUp : null,
    }
  }
  return { isRelevant: false, isNatural: false, isComplete: false, score: 0, feedback: '', correction: null, naturalAlternative: null, followUp: null }
}

// ── Anti-echo runtime guard ──

/** Normalize text for comparison: lowercase, collapse whitespace, strip punctuation. */
function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

/** Split into word tokens. */
function tokenize(s: string): string[] {
  return normalizeForCompare(s).split(' ').filter(Boolean)
}

/** Common filler words that don't count as meaningful echo. */
const FILLER = new Set(['i', 'a', 'the', 'is', 'it', 'do', 'did', 'yes', 'no', 'ok', 'and', 'to', 'my', 'you', 'me', 'we', 'he', 'she', 'so', 'or', 'but', 'in', 'on', 'at', 'of', 'for', 'am', 'are', 'was', 'not', 'its', 'im'])

/** Short acknowledgments that are OK to keep. */
const ACK_PATTERN = /^(nice|got it|i see|oh|right|yeah|sure|cool|hmm|ah|okay|alright)[.!,]?\s*/i

/**
 * Detect and fix AI replies that echo the user's words.
 * Returns the sanitized reply. Only modifies the aiReply field.
 */
/** Strip duplicate acknowledgment prefixes until at most one remains.
 *  "I see. Right. X" → "I see. X"
 *  "Sure. Nice. Got it. X" → "Sure. X"
 *  "I see. I see. X" → "I see. X"
 */
function stripDuplicateAcks(reply: string): string {
  let current = reply
  // Loop: keep stripping the second ack until only one (or zero) remains
  for (let i = 0; i < 5; i++) {
    const first = current.match(ACK_PATTERN)
    if (!first) break
    const afterFirst = current.slice(first[0].length).trim()
    const second = afterFirst.match(ACK_PATTERN)
    if (!second) break
    // Drop the second ack, keep the first + rest
    const rest = afterFirst.slice(second[0].length).trim()
    current = rest ? `${first[0].trim()} ${rest}` : first[0].trim()
  }
  return current
}

export function sanitizeEchoFromReply(aiReply: string, userMessage: string): string {
  if (!aiReply || !userMessage) return aiReply

  // Check 0: strip duplicate acknowledgment prefixes ("Got it. Right." → "Got it.")
  const deduped = stripDuplicateAcks(aiReply)
  if (deduped !== aiReply) {
    // eslint-disable-next-line no-console
    console.log('[anti-echo] duplicate ack stripped', { before: aiReply.slice(0, 40), after: deduped.slice(0, 40) })
  }
  // Continue with deduped reply for echo checks
  const reply = deduped

  const userNorm = normalizeForCompare(userMessage)

  // Extract the non-acknowledgment part of the reply
  const ackMatch = reply.match(ACK_PATTERN)
  const ack = ackMatch ? ackMatch[0].trim() : ''
  const replyBody = ack ? reply.slice(ackMatch![0].length).trim() : reply
  const replyBodyNorm = normalizeForCompare(replyBody)

  // Helper: strip echoed prefix from reply body, return the fresh remainder
  const stripEchoPrefix = (): string | null => {
    if (!replyBodyNorm || !userNorm) return null
    // Reply body starts with user's normalized phrase
    if (replyBodyNorm.startsWith(userNorm) && userNorm.length >= 4) {
      const afterEcho = replyBody.slice(userMessage.length).trim().replace(/^[.,!?\s]+/, '').trim()
      return afterEcho.length > 5 ? afterEcho : null
    }
    // Reply body CONTAINS user's phrase as a substring (catches partial/mid echoes)
    const idx = replyBodyNorm.indexOf(userNorm)
    if (idx >= 0 && userNorm.length >= 4) {
      const before = replyBody.slice(0, idx).trim().replace(/[.,!?\s]+$/, '').trim()
      const after = replyBody.slice(idx + userMessage.length).trim().replace(/^[.,!?\s]+/, '').trim()
      const fresh = [before, after].filter(s => s.length > 3).join(' ')
      return fresh.length > 5 ? fresh : null
    }
    return null
  }

  // Check 1: reply body contains the user's phrase (even short ones like "Yes, I do")
  const strippedBody = stripEchoPrefix()
  if (strippedBody !== null) {
    // eslint-disable-next-line no-console
    console.log('[anti-echo] phrase echo detected, stripping', { userNorm: userNorm.slice(0, 40), replyBody: replyBody.slice(0, 40) })
    return ack ? `${ack} ${strippedBody}` : strippedBody
  }

  // Check 1b: full echo with nothing useful remaining → generic fallback
  if (replyBodyNorm.startsWith(userNorm) && userNorm.length >= 4) {
    // eslint-disable-next-line no-console
    console.log('[anti-echo] full echo with no fresh content', { userNorm: userNorm.slice(0, 40) })
    return ack ? `${ack} Tell me more about that.` : 'I see. Tell me more about that.'
  }

  // Check 2: sentence-level echo — split reply into sentences, remove echoed ones
  const userTokens = tokenize(userMessage)
  const userContentWords = userTokens.filter(w => !FILLER.has(w) && w.length > 2)
  if (userContentWords.length >= 1) {
    const sentences = replyBody.split(/(?<=[.!?])\s+/)
    if (sentences.length >= 2) {
      const freshSentences = sentences.filter(s => {
        const sNorm = normalizeForCompare(s)
        // Reject sentence if it contains the user's full normalized phrase
        if (sNorm.includes(userNorm) && userNorm.length >= 4) return false
        // Reject sentence if >50% content-word overlap
        if (userContentWords.length >= 2) {
          const sTokens = new Set(tokenize(s))
          const matched = userContentWords.filter(w => sTokens.has(w))
          if (matched.length / userContentWords.length > 0.5) return false
        }
        return true
      })
      if (freshSentences.length > 0 && freshSentences.length < sentences.length) {
        // eslint-disable-next-line no-console
        console.log('[anti-echo] sentence-level echo stripped', { kept: freshSentences.length, dropped: sentences.length - freshSentences.length })
        return ack ? `${ack} ${freshSentences.join(' ')}` : freshSentences.join(' ')
      }
    }
  }

  return reply
}

// ——— V2.5 deterministic reply assembly ———

type V25MeaningType = 'yes' | 'no' | 'object' | 'person' | 'time' | 'frequency' | 'feeling' | 'social' | 'unclear'

type V25LlmOutput = {
  intent: 'answer' | 'question_to_ai' | 'greeting' | 'unclear' | 'off_topic' | 'closing'
  meaning: {
    type: V25MeaningType
    value: string | null
    confidence: number
  }
  answerToAi: string | null
}

/** Acknowledgment rotation pool — indexed by turnIndex, 5 items to cover all conversation turns */
const ACKS = ['Got it.', 'I see.', 'Okay.', 'Right.', 'Sure.']

/** Reaction templates by meaning type — must NOT overlap with ACKS pool, 5 items per pool */
const REACTION_BY_MEANING: Record<V25MeaningType, string[]> = {
  yes:       ['That\'s good.', 'Sounds like it.', 'Good to hear.', 'Makes sense.', 'I see, nice.'],
  no:        ['No problem.', 'Fair enough.', 'That\'s fine.', 'No worries.', 'All good.'],
  object:    ['Sounds good.', 'Interesting.', 'Good to know.', 'That helps.', 'Oh, nice.'],
  person:    ['That\'s nice.', 'Thanks for sharing.', 'Good to know.', 'Sounds good.', 'That\'s helpful.'],
  time:      ['Good to know.', 'Oh, around that time.', 'That helps.', 'Makes sense.', 'Sounds about right.'],
  frequency: ['That often?', 'Sounds about right.', 'Good to know.', 'I get that.', 'Interesting.'],
  feeling:   ['I get that.', 'Makes sense.', 'Thanks for sharing.', 'I understand.', 'That\'s fair.'],
  social:    ['', '', '', '', ''],
  unclear:   ['', '', '', '', ''],
}

/** Phrases that count as acknowledgment-like — used for dedup in assembly */
const ACK_LIKE = new Set(['right.', 'got it.', 'i see.', 'okay.', 'oh, okay.', 'alright.', 'sure.', 'cool.', 'oh.', 'hmm.', 'nice.', 'yeah.', 'ah, i see.'])

const MIN_CLOSE_TURN = 3

// ── Slot validation (V2.6) ──

/** Word sets for common question domains — fallback when no scene slotSchema exists */
const DOMAIN_KEYWORDS: Record<string, Set<string>> = {
  clean: new Set(['dish', 'dishes', 'plate', 'plates', 'cup', 'cups', 'table', 'kitchen', 'floor', 'sink', 'counter', 'trash', 'wipe', 'sweep', 'mop', 'wash', 'rinse', 'tidy', 'vacuum', 'dust', 'laundry', 'clothes', 'room', 'bathroom']),
  cook: new Set(['rice', 'egg', 'eggs', 'pasta', 'soup', 'meat', 'fish', 'vegetable', 'vegetables', 'fry', 'boil', 'bake', 'stir', 'pan', 'pot', 'oven', 'stove', 'microwave', 'recipe']),
  eat: new Set(['rice', 'bread', 'toast', 'cereal', 'egg', 'eggs', 'fruit', 'salad', 'soup', 'noodle', 'noodles', 'sandwich', 'yogurt', 'coffee', 'tea', 'milk', 'juice', 'water']),
  people: new Set(['alone', 'myself', 'family', 'mom', 'mother', 'dad', 'father', 'brother', 'sister', 'husband', 'wife', 'friend', 'friends', 'kids', 'children', 'son', 'daughter', 'roommate', 'partner', 'together', 'someone', 'nobody']),
  frequency: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'once', 'twice', 'everyday', 'daily', 'weekly', 'weekday', 'weekend']),
  time: new Set(['morning', 'afternoon', 'evening', 'night', 'early', 'late', 'noon', 'midnight', 'oclock', 'before', 'after', 'minutes', 'hours', 'hour', 'minute', 'quick', 'fast', 'slow', 'long']),
}

/** Common filler words excluded from domain matching */
const SLOT_COMMON = new Set(['i', 'my', 'the', 'a', 'it', 'do', 'is', 'yes', 'no', 'not', 'and', 'or', 'but', 'so', 'very', 'really', 'just', 'like', 'think', 'usually', 'too', 'also'])

type SlotValidationResult = {
  valid: boolean
  reason: 'ok' | 'mismatch' | 'missing'
}

/**
 * Validate whether a user's answer fits the semantic domain of the current question.
 * Uses scene slotSchema when available (V2.6), falls back to generic DOMAIN_KEYWORDS.
 * Tolerant to imperfect English — only flags clear mismatches.
 */
function validateSlot(
  meaningType: string,
  value: string | null,
  engineQuestion: string | null,
  slotDef?: SlotDefinition | null,
): SlotValidationResult {
  // No question context or no value → accept (be tolerant)
  if (!engineQuestion || !value) return { valid: true, reason: 'ok' }

  // ── Scene slotSchema path (V2.6) ──
  if (slotDef) {
    // Yes/no answers accepted if slot allows it
    if ((meaningType === 'yes' || meaningType === 'no') && slotDef.acceptYesNo) {
      return { valid: true, reason: 'ok' }
    }

    const tokens = value.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, ''))
    // Short answers are hard to validate — accept
    if (tokens.length <= 1 && tokens[0].length <= 3) return { valid: true, reason: 'ok' }

    const contentWords = tokens.filter(w => w.length > 2 && !SLOT_COMMON.has(w))
    if (contentWords.length === 0) return { valid: true, reason: 'ok' }

    const hasRelevant = contentWords.some(w => slotDef.accept.has(w))
    if (hasRelevant) return { valid: true, reason: 'ok' }

    // People words are always relevant in any domain
    const hasPeopleWord = contentWords.some(w => DOMAIN_KEYWORDS.people.has(w))
    if (hasPeopleWord) return { valid: true, reason: 'ok' }

    return { valid: false, reason: 'mismatch' }
  }

  // ── Generic fallback path (no slotSchema) ──

  // Only strict-validate object answers in generic mode
  if (meaningType !== 'object') return { valid: true, reason: 'ok' }

  const q = engineQuestion.toLowerCase()
  const words = value.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, ''))

  // Short answers are hard to validate — accept
  if (words.length <= 1 && words[0].length <= 3) return { valid: true, reason: 'ok' }

  // Determine expected domain from question text
  let expectedDomain: Set<string> | null = null
  if (/\bclean|wash|tidy|sweep\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.clean
  else if (/\bcook|make food|prepare\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.cook
  else if (/\beat|food|breakfast|lunch|dinner|meal\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.eat
  else if (/\balone|with someone|who\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.people
  else if (/\bhow often|every day|frequently\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.frequency
  else if (/\bwhat time|how long|when\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.time

  if (!expectedDomain) return { valid: true, reason: 'ok' } // unknown domain — be tolerant

  const contentWords = words.filter(w => w.length > 2 && !SLOT_COMMON.has(w))
  if (contentWords.length === 0) return { valid: true, reason: 'ok' } // only filler — accept

  const hasRelevant = contentWords.some(w => expectedDomain!.has(w))
  if (hasRelevant) return { valid: true, reason: 'ok' }

  // People words are always relevant in any domain
  const hasPeopleWord = contentWords.some(w => DOMAIN_KEYWORDS.people.has(w))
  if (hasPeopleWord) return { valid: true, reason: 'ok' }

  return { valid: false, reason: 'mismatch' }
}

/** Lowercase the first character of a string. */
function lowercaseFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

/**
 * Select a deterministic repair reply when slot validation fails.
 * Uses scene-specific repair templates when available, else generic re-ask.
 */
function selectRepairStrategy(
  result: SlotValidationResult,
  engineQuestion: string,
  turnIndex: number,
  slotDef?: SlotDefinition | null,
): string {
  if (result.reason === 'mismatch') {
    // Prefer scene-specific repair templates
    if (slotDef?.repairTemplates && slotDef.repairTemplates.length > 0) {
      return slotDef.repairTemplates[turnIndex % slotDef.repairTemplates.length]
    }
    return `Sorry, ${lowercaseFirst(engineQuestion)}`
  }
  if (result.reason === 'missing') {
    return 'Could you tell me more?'
  }
  return engineQuestion
}

/**
 * Deterministically assemble a natural reply from V2.5 LLM classification + engine intent.
 * The LLM generates NO reply text — only intent/meaning. All wording comes from templates.
 */
export function assembleReplyV25(
  llm: V25LlmOutput,
  turnIndex: number,
  engineQuestion: string | null,
  engineAction: string | null,
  wrapPrompts: string[],
  clarificationPrompts: { fragment: string[]; confusion: string[]; garbled: string[] } | null,
  lessonPhrase?: string | null,
  engineDimension?: string | null,
): string {
  // Resolve scene slotSchema for slot validation
  const scene = lessonPhrase ? matchSceneQuestions(lessonPhrase) : null
  const slotSchema: SceneSlotSchema | null = scene?.slotSchema ?? null
  // Closing
  if (llm.intent === 'closing' || (engineAction === 'wrap' && turnIndex >= MIN_CLOSE_TURN)) {
    const wrap = wrapPrompts[turnIndex % wrapPrompts.length] ?? 'Nice talking with you. See you next time!'
    // If student said goodbye, just mirror. If engine wrapped, add ack.
    if (llm.intent === 'closing') return wrap
    const ack = ACKS[turnIndex % ACKS.length]
    return `${ack} ${wrap}`
  }

  // Unclear / low confidence → clarification from plan templates
  if (llm.intent === 'unclear' || llm.meaning.confidence < 0.4) {
    if (clarificationPrompts) {
      if (llm.intent === 'unclear' && llm.meaning.type === 'unclear') {
        return clarificationPrompts.garbled[turnIndex % clarificationPrompts.garbled.length]
          ?? 'Sorry, could you say that again?'
      }
      return clarificationPrompts.confusion[turnIndex % clarificationPrompts.confusion.length]
        ?? 'Could you say that one more time?'
    }
    return 'Sorry, could you say that again?'
  }

  // Confusion/clarify override: engine detected confusion or fragment in the raw user text.
  // This must run before question_to_ai to prevent LLM misclassification from bypassing templates.
  if (engineAction === 'simplify') {
    if (clarificationPrompts) {
      return clarificationPrompts.confusion[turnIndex % clarificationPrompts.confusion.length]
        ?? 'No problem. Could you say that one more time?'
    }
    return 'No problem. Could you say that one more time?'
  }
  if (engineAction === 'clarify') {
    if (clarificationPrompts) {
      return clarificationPrompts.garbled[turnIndex % clarificationPrompts.garbled.length]
        ?? 'Sorry, could you say that again?'
    }
    return 'Sorry, could you say that again?'
  }

  // Redirect override: engine detected off-topic input.
  if (engineAction === 'redirect') {
    const ack = turnIndex >= 2 ? ACKS[turnIndex % ACKS.length] : null
    const redirect = engineQuestion ?? 'Tell me about your day.'
    const byTheWay = `By the way, ${redirect.charAt(0).toLowerCase()}${redirect.slice(1)}`
    return ack ? `${ack} ${byTheWay}` : byTheWay
  }

  // Greeting (turn 0-1): answerToAi or default greeting + engine question
  if (llm.intent === 'greeting' || (llm.intent === 'question_to_ai' && turnIndex <= 1)) {
    const greeting = llm.answerToAi?.trim() || "Hey! I'm doing well."
    if (engineQuestion) return `${greeting} ${engineQuestion}`
    return greeting
  }

  // Question to AI (turn 2+): LLM provides brief answer, engine provides next question
  if (llm.intent === 'question_to_ai') {
    const answer = llm.answerToAi?.trim() || "Yeah, same here!"
    if (engineQuestion) return `${answer} ${engineQuestion}`
    return answer
  }

  // Off-topic → soft redirect with engine question
  if (llm.intent === 'off_topic') {
    const ack = ACKS[turnIndex % ACKS.length]
    const redirect = engineQuestion ?? 'Tell me about your day.'
    return `${ack} By the way, ${redirect.charAt(0).toLowerCase()}${redirect.slice(1)}`
  }

  // Slot validation: check if the user's answer fits the question domain.
  // Primary: use engine's selectedDimension (what was actually asked).
  // Fallback: use LLM meaning.type (in case engine dimension not available).
  if (llm.intent === 'answer' && engineQuestion) {
    const dimKey = (engineDimension ?? llm.meaning.type) as keyof SceneSlotSchema
    const slotDef = slotSchema?.[dimKey] ?? null
    const slotResult = validateSlot(llm.meaning.type, llm.meaning.value, engineQuestion, slotDef)
    if (!slotResult.valid) {
      return selectRepairStrategy(slotResult, engineQuestion, turnIndex, slotDef)
    }
  }

  // Normal answer — deterministic assembly
  const segments: string[] = []

  // Ack: only on turn 2+
  const ack = turnIndex >= 2 ? ACKS[turnIndex % ACKS.length] : null

  // Reaction: prefer value-aware bridge template, fall back to generic pool
  let reaction: string | null = null
  const dimForBridge = (engineDimension ?? llm.meaning.type) as Exclude<import('./ai-conversation-state').Dimension, 'action'>
  const bridgePool = scene?.bridgeTemplates?.[dimForBridge]
  if (bridgePool && bridgePool.length > 0 && llm.meaning.value) {
    const template = bridgePool[turnIndex % bridgePool.length]
    reaction = template.replace(/\{value\}/g, llm.meaning.value)
  }
  if (!reaction) {
    const reactionPool = REACTION_BY_MEANING[llm.meaning.type] ?? REACTION_BY_MEANING.yes
    reaction = reactionPool[turnIndex % reactionPool.length] || null
  }

  // Deduplicate: if reaction is also an ack-like phrase, keep only one
  const reactionIsAck = reaction ? ACK_LIKE.has(reaction.toLowerCase()) : false

  if (ack && reaction && reactionIsAck) {
    // Both are ack-like — keep only the ack
    segments.push(ack)
  } else {
    if (ack) segments.push(ack)
    if (reaction) segments.push(reaction)
  }

  // Question: from engine (single source of truth)
  if (engineQuestion) segments.push(engineQuestion)

  if (segments.length === 0) {
    return turnIndex === 0 ? 'Hi! How are you today?' : 'Tell me more about that.'
  }

  return segments.join(' ')
}

/** Engine context needed for V2.5/V2.6 deterministic reply assembly. */
export type V25AssemblyContext = {
  turnIndex: number
  engineQuestion: string | null
  engineAction: string | null
  wrapPrompts: string[]
  clarificationPrompts: { fragment: string[]; confusion: string[]; garbled: string[] } | null
  /** Lesson phrase for scene slotSchema resolution (V2.6). */
  lessonPhrase?: string | null
  /** Engine's current dimension for slot validation (V2.7). */
  engineDimension?: string | null
}

export function parseAiConversationResponse(raw: string, ctx?: V25AssemblyContext): AiConversationResponse | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    const turnIndex = ctx?.turnIndex ?? 0

    // V2.5 path: classification-only {intent, meaning, answerToAi}
    const hasV25 = 'intent' in parsed && 'meaning' in parsed
    let aiReply: string

    if (hasV25) {
      const meaning = typeof parsed.meaning === 'object' && parsed.meaning !== null
        ? parsed.meaning as Record<string, unknown>
        : {}
      const llm: V25LlmOutput = {
        intent: typeof parsed.intent === 'string' ? parsed.intent as V25LlmOutput['intent'] : 'answer',
        meaning: {
          type: (typeof meaning.type === 'string' ? meaning.type : 'unclear') as V25MeaningType,
          value: typeof meaning.value === 'string' ? meaning.value : null,
          confidence: typeof meaning.confidence === 'number' ? meaning.confidence : 0.8,
        },
        answerToAi: typeof parsed.answerToAi === 'string' ? parsed.answerToAi : null,
      }
      aiReply = assembleReplyV25(
        llm,
        turnIndex,
        ctx?.engineQuestion ?? null,
        ctx?.engineAction ?? null,
        ctx?.wrapPrompts ?? ['Nice talking with you. See you next time!'],
        ctx?.clarificationPrompts ?? null,
        ctx?.lessonPhrase ?? null,
        ctx?.engineDimension ?? null,
      )
    } else if (typeof parsed.aiReply === 'string') {
      // V1/V2 fallback: LLM returned old-style aiReply
      aiReply = parsed.aiReply.trim()
    } else {
      return null
    }

    // Support both "result" (new) and "evaluation" (old) field names for the pass/fail
    const result: string | undefined = parsed.result ?? (
      typeof parsed.evaluation === 'string' ? parsed.evaluation : undefined
    )
    if (result !== 'good' && result !== 'retry') return null

    const detail = parseEvaluationDetail(
      typeof parsed.evaluation === 'object' ? parsed.evaluation : null
    )

    return {
      aiReply,
      evaluation: result,
      evaluationDetail: detail,
      hint: typeof parsed.hint === 'string' ? parsed.hint : null,
      nextPrompt: typeof parsed.nextPrompt === 'string' ? parsed.nextPrompt : null,
    }
  } catch {
    return null
  }
}
