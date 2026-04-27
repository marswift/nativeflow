import 'server-only'
import type { ChatMessage } from './openai-client'
import { buildRegionPromptContext } from './lesson-run-service'
import type { SerializedConversationState } from './ai-conversation-state'
import { matchSceneQuestions } from './ai-conversation-scene-questions'
import type { SceneSlotSchema } from './ai-conversation-scene-questions'
import { detectUniversalSocialIntent } from './universal-conversation-intents'
import { composeNormalReply, ACKS } from './conversation-response-composer'
import type { MeaningType } from './conversation-response-composer'
import { validateAndRepair } from './conversation-slot-filler'
import { advanceScript, createScriptState, hasScript, type ScriptClassification } from './scripted-conversation-engine'
import { ALL_SCRIPTS } from './scripted-conversation-scripts'

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

type V25MeaningType = MeaningType

type V25LlmOutput = {
  intent: 'answer' | 'question_to_ai' | 'greeting' | 'unclear' | 'off_topic' | 'closing'
  meaning: {
    type: V25MeaningType
    value: string | null
    confidence: number
  }
  answerToAi: string | null
}

const MIN_CLOSE_TURN = 3

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
  userMessage?: string | null,
  rank?: number | null,
): string {
  // ── Scripted conversation intercept ──
  // When a script exists for this scene+level, it takes over completely.
  // The LLM classification is mapped to ScriptClassification and the script
  // engine determines the reply. No LLM intent can override the script.
  const levelStr = rank != null ? (rank < 40 ? 'beginner' : rank < 70 ? 'intermediate' : 'advanced') : 'beginner'
  const matchedScript = lessonPhrase ? hasScript(ALL_SCRIPTS, lessonPhrase, levelStr) : null
  // Also try matching by scene ID from the scene question library
  const sceneForScript = lessonPhrase ? matchSceneQuestions(lessonPhrase) : null
  const scriptBySceneId = sceneForScript ? hasScript(ALL_SCRIPTS, sceneForScript.id, levelStr) : null
  const activeScript = matchedScript ?? scriptBySceneId

  if (activeScript) {
    // Build script state from turnIndex (stateless reconstruction — the script
    // is deterministic so we can reconstruct position from turn count)
    const scriptClassification: ScriptClassification = {
      meaningType: llm.meaning.type as ScriptClassification['meaningType'],
      meaningValue: llm.meaning.value,
      confidence: llm.meaning.confidence,
    }
    // Reconstruct script state: turnIndex 0 = answering turn 0 of script
    const scriptState: import('./scripted-conversation-engine').ScriptState = {
      scriptId: activeScript.id,
      currentTurnIndex: Math.min(turnIndex, activeScript.turns.length - 1),
      totalTurns: activeScript.turns.length,
      repairCount: 0,
      completed: turnIndex >= activeScript.turns.length,
    }
    const scriptResult = advanceScript(activeScript, scriptState, scriptClassification)
    return scriptResult.reply
  }

  // ── Legacy LLM-driven path (scenes without scripts) ──

  // Resolve scene slotSchema for slot validation
  const scene = lessonPhrase ? matchSceneQuestions(lessonPhrase) : null
  const slotSchema: SceneSlotSchema | null = scene?.slotSchema ?? null
  // Closing — only allowed on turn MIN_CLOSE_TURN+ to prevent premature goodbye
  // on early turns (e.g. "I'm fine, thank you" misclassified as closing).
  if (turnIndex >= MIN_CLOSE_TURN &&
      (llm.intent === 'closing' || engineAction === 'wrap')) {
    const wrap = wrapPrompts[turnIndex % wrapPrompts.length] ?? 'Nice talking with you. See you next time!'
    if (llm.intent === 'closing') return wrap
    const ack = ACKS[turnIndex % ACKS.length]
    return `${ack} ${wrap}`
  }

  // Early-turn closing misclassification: treat as social answer, continue conversation
  if (turnIndex < MIN_CLOSE_TURN && llm.intent === 'closing') {
    const greeting = llm.answerToAi?.trim() || "Thanks!"
    if (engineQuestion) return `${greeting} ${engineQuestion}`
    return greeting
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

  // Reciprocal / social intent detection using universal layer + LLM classification.
  const universalIntent = userMessage ? detectUniversalSocialIntent(userMessage) : null
  const hasUniversalReciprocal = universalIntent === 'reciprocal_greeting'
  const hasUniversalGreeting = universalIntent === 'greeting'
  const isReciprocal = llm.intent === 'question_to_ai' || llm.intent === 'greeting' ||
    hasUniversalReciprocal || hasUniversalGreeting || (turnIndex <= 1 && llm.meaning.type === 'social')

  // Greeting / reciprocal (turn 0-1): answer briefly + engine question
  if (isReciprocal && turnIndex <= 1) {
    const greeting = llm.answerToAi?.trim() || "I'm good too, thanks!"
    if (engineQuestion) return `${greeting} ${engineQuestion}`
    return greeting
  }

  // Question to AI / reciprocal (turn 2+): answer briefly + engine question
  if (isReciprocal) {
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
  if (llm.intent === 'answer' && engineQuestion) {
    const repair = validateAndRepair(
      llm.meaning.type, llm.meaning.value, engineQuestion,
      engineDimension ?? null, slotSchema, turnIndex,
    )
    if (repair) return repair
  }

  // Normal answer — delegate to ResponseComposer
  return composeNormalReply({
    meaningType: llm.meaning.type,
    meaningValue: llm.meaning.value,
    turnIndex,
    engineQuestion,
    engineDimension: engineDimension ?? null,
    scene,
    rank: rank ?? null,
    userMessage: userMessage ?? null,
  })
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
  /** Raw user message for reciprocal detection. */
  userMessage?: string | null
  /** Numeric rank for level-aware composition. */
  rank?: number | null
  /** Scripted conversation state — when present, script engine takes over. */
  scriptState?: import('./scripted-conversation-engine').ScriptState | null
}

// Re-export for callers that need to manage script state
export { createScriptState, getOpener, hasScript, advanceScript } from './scripted-conversation-engine'
export { ALL_SCRIPTS } from './scripted-conversation-scripts'

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
        ctx?.userMessage ?? null,
        ctx?.rank ?? null,
      )
    } else if (typeof parsed.aiReply === 'string') {
      // V1/V2 fallback: LLM returned old-style aiReply
      aiReply = parsed.aiReply.trim()

      // Guard: if user asked a reciprocal/social question but LLM returned a bare reaction
      // (e.g. "Oh good." without answering "and you?"), override with deterministic answer.
      const v1SocialIntent = ctx?.userMessage ? detectUniversalSocialIntent(ctx.userMessage) : null
      if (v1SocialIntent === 'reciprocal_greeting' || v1SocialIntent === 'greeting') {
        const reciprocalAnswer = turnIndex <= 1 ? "I'm good too, thanks!" : "Yeah, same here!"
        const eq = ctx?.engineQuestion
        aiReply = eq ? `${reciprocalAnswer} ${eq}` : reciprocalAnswer
      }
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
