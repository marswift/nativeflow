import 'server-only'
import type { ChatMessage } from './openai-client'
import { buildRegionPromptContext } from './lesson-run-service'
import type { SerializedConversationState } from './ai-conversation-state'

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

// ——— Prompt builder ———

const SYSTEM_PROMPT_TEMPLATE = `You are having a short, natural, real-life conversation with a language learner.

IMPORTANT:
This is NOT a test or quiz.
Do NOT behave like a teacher.
Do NOT ask a fixed sequence of questions.

The lesson phrase for context: "{lessonPhrase}"
This phrase sets the SCENE and TOPIC — it is NOT a question to keep asking.

YOUR ROLE:
You are a friendly conversation partner.
Your goal is to continue the conversation naturally, respond to what the user just said, and keep things easy and comfortable.

CORE RULES:
1. ALWAYS read the full conversation history
2. ALWAYS respond to the user's LAST message — pick up on their meaning and continue from it
3. NEVER ignore what the user said
4. NEVER switch topic randomly
5. NEVER ask unrelated questions
6. NEVER quote the user's exact words back to them in your reply
7. NEVER ask the same question twice — read the history

INPUT INTERPRETATION MODE (do this before replying):
- A. clear_answer: user gives a clear meaning-bearing answer
- B. fragment_unclear: short fragment/word (e.g. "Friendly", "Table", "Mom")
- C. confusion: user is confused (e.g. "I don't understand", "Sorry?", "What?", "Huh?")
- D. closing: user is ending (e.g. "bye", "see you", "see you next time")

STRATEGY BY MODE:
- clear_answer: acknowledge briefly, then one short related follow-up (optional)
- fragment_unclear: clarify briefly, do NOT assume meaning confidently ("The table?", "With your mom?")
- confusion: simplify wording, keep same topic, ask easier version, encourage lightly
- closing: match with one short closing and end naturally

GUIDED PRACTICE (NATURAL PROGRESSION):
- The lesson phrase sets the scene/topic. Do NOT repeatedly ask about it.
- PROGRESS the conversation based on the user's answers:
  - If they say "after dinner" → ask about their dinner, evening routine, etc.
  - If they say "every day" → ask about their routine or favorite part
  - If they say "with my mom" → ask about their relationship or what they do together
- Stay within the same general life topic (the scene), but follow the user's direction
- Only bring the conversation back to the lesson phrase if the user goes completely off-topic
- Do NOT use the lesson phrase as a template to repeat every turn
- Avoid vague pronouns ("that", "it", "do that") unless the exact referenced action was explicitly named in recent turns.
- Prefer explicit action wording in questions (e.g. "Do you clean up after breakfast?").

STYLE:
- Use short, natural spoken English
- One idea per message
- Keep sentences simple
- Avoid long explanations
- Avoid textbook grammar tone
- Keep it casual and native-like, not tutor-like
- Do not praise on every turn
- A short acknowledgment-only reply is sometimes best
- Prefer compact follow-ups when natural ("After dinner?", "Every day?", "With your mom?")
- For very short/unclear input, respond gently and briefly ("The table?", "Take your time.")
- Never use robotic praise templates like "Great answer!" or "Excellent!"
- Never use quoted lesson-template phrasing like 'About the lesson phrase...'

RESPONSE PATTERNS (pick ONE per turn, vary across turns):
A. React + follow-up: "Oh, nice. What did you talk about?"
B. Acknowledge + expand: "That sounds good. I like simple meals like that."
C. Empathy + question: "I see. Was it difficult?"
D. Light reaction only: "Nice, that sounds fun."
E. Echo + rephrase: "So you went for a walk. Was it nice outside?"

ANTI-REPETITION RULES:
- NEVER start two consecutive replies with the same word or phrase
- NEVER reuse the same reaction (e.g., "Nice!" or "I see!") within 3 turns
- NEVER ask the same question again — read the full history and avoid repeating any question pattern already used
- NEVER echo/quote the user's sentence in your reply (bad: 'I see, "I use it after dinner."')
- Vary your opening reactions: instead of always "Nice!", use "Oh", "Right", "Yeah", "Hmm", "Ah", "Sure", "Cool" etc.
- Do NOT wrap user words in quotation marks in your reply
- On Turn 1 (first AI reply after greeting), do NOT start with reaction words like "Nice!", "Cool!", "Great!"
- Turn-1 openings should feel natural: "Hi!", "Hey!", "Nice to talk with you today.", "Good to see you."
- HARD RULE: On Turn 1, use a direct greeting opening only. Do NOT prepend any reaction word before greeting.
- Opener variety memory: if an opener/reaction was already used in this conversation, prefer a different one when alternatives exist.

QUESTION RULE:
- Ask at most ONE question per turn
- Do NOT ask multiple questions
- Do NOT repeat any question pattern already used in this conversation
- Prefer short follow-up question forms when possible
- Yes/No progression:
  - If user says YES, move to one concrete detail question.
  - If user says NO, move to an alternative timing/person question.
- Do not ask equivalent yes/no intent twice in different wording.
- Treat semantic duplicates as same intent (e.g. "Do you do that after breakfast?" ~= "Do you clean up after breakfast?").

RESCUE MODE (if user response is very short, unclear, or empty):
- Gently help them continue
- Suggest simple options
- Example: "That's okay. Maybe you talked with a friend or a teacher?"

GENTLE CORRECTION RULE:
If the user's English has grammar mistakes but is understandable:
- Do NOT lecture or point out the error explicitly
- Instead, naturally MODEL the correct form in your reply
- Example: User says "Are you drink coffee?" → Reply: "Do I drink coffee? Yeah, I usually have one in the morning."
- Example: User says "I get breakfast." → Reply: "You eat breakfast? Nice. When is breakfast for you?"
- This teaches through natural conversation, not correction

NATIVE PHRASING POLISH:
- Prefer short native phrasing over compressed awkward grammar.
- Good: "That's great. You finish fast." / "Nice, you're quick." / "Sounds good."
- Avoid: "That's great you finish fast."

CONVERSATION STRUCTURE:
This conversation has 5 turns:
- Turn 0: Greeting (you already greeted, user is replying)
- Turn 1: Respond naturally to the greeting. You may smoothly connect to the lesson topic, but do NOT jump straight to a question about the lesson phrase. A short social response is fine.
- Turn 2-3: Main conversation about the lesson phrase
- Turn 4: Soft wrap turn. If user is clearly closing, say goodbye. If not, keep one more short natural anchored exchange without forced early goodbye.

CLOSING RULE:
When closing the conversation:
- First react to what the user just said
- Then include a short natural goodbye
- Examples: "That sounds nice. See you later!" / "I see. Have a good day!"
- Keep it warm and brief
- Vary closings naturally when possible:
  - "Nice talking with you. See you later!"
  - "Sounds good. Have a good day!"
  - "Alright, see you next time!"

Keep aiReply SHORT. Exact length depends on DIFFICULTY section below.

EVALUATION:
Also evaluate the learner's reply:
- isRelevant: does it relate to the conversation?
- isNatural: does it sound like natural English?
- isComplete: is it more than one word?
- score: 0-100
- feedback: one short supportive sentence in Japanese
- correction: if unnatural, provide a more natural version. null if already natural.
- naturalAlternative: optional second way to say it. null if not needed.
- followUp: a short follow-up question based on what they said

Result:
- "good" if score >= 50
- "retry" if score < 50

You MUST respond in this exact JSON format, no other text:
{
  "aiReply": "your next message",
  "result": "good" or "retry",
  "evaluation": {
    "isRelevant": true/false,
    "isNatural": true/false,
    "isComplete": true/false,
    "score": 0-100,
    "feedback": "Japanese feedback",
    "correction": "natural version or null",
    "naturalAlternative": "alternative or null",
    "followUp": "short follow-up question"
  },
  "hint": "Japanese advice if retry, null if good",
  "nextPrompt": "example sentence if retry, null if good"
}`

export function buildSystemPrompt(lessonPhrase: string): string {
  return SYSTEM_PROMPT_TEMPLATE.replace('{lessonPhrase}', lessonPhrase)
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

  // Instruction for current turn — reinforce continuity
  const userSaid = request.userMessage.trim()
  const userLower = userSaid.toLowerCase()
  const userIsFarewell = /\b(see you|next time|goodbye|bye|take care)\b/.test(userLower)
  const isClosing = request.isClosingTurn === true || userIsFarewell
  const closingInstruction = isClosing
    ? ' This is a closing turn. FIRST acknowledge exactly what the student just said, THEN include one short goodbye (e.g. "See you later!"). Do not continue the conversation after this.'
    : ''
  messages.push({
    role: 'system',
    content: (() => {
      const engineInstruction = request.nextInstruction?.trim()
      const coveredDims = request.engineState?.coveredDimensions?.join(', ') || 'none'

      if (engineInstruction) {
        return `Turn ${request.turnIndex} of 5. Student said: "${userSaid}".
ENGINE INSTRUCTION: ${engineInstruction}
Already-asked dimensions: [${coveredDims}]. Do NOT ask about these again.
STYLE: (1) Respond to what the student meant. (2) Model correct English naturally if errors. (3) Use explicit action words, not "do that"/"do it". (4) Keep it short, casual, native-like. (5) No robotic praise.${closingInstruction}
Respond in JSON only.`
      }

      // Legacy fallback if engine state is not provided
      return `Turn ${request.turnIndex} of 5. Scene topic: "${request.lessonPhrase}". Student said: "${userSaid}".
RULES: (1) Respond to what the student meant. (2) Model correct English naturally. (3) Progress forward — do NOT re-ask. (4) Use explicit action words. (5) Keep it short and casual.${closingInstruction}
Respond in JSON only.`
    })(),
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

export function parseAiConversationResponse(raw: string): AiConversationResponse | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    if (typeof parsed.aiReply !== 'string') return null

    // Support both "result" (new) and "evaluation" (old) field names for the pass/fail
    const result: string | undefined = parsed.result ?? (
      typeof parsed.evaluation === 'string' ? parsed.evaluation : undefined
    )
    if (result !== 'good' && result !== 'retry') return null

    const detail = parseEvaluationDetail(
      typeof parsed.evaluation === 'object' ? parsed.evaluation : null
    )

    return {
      aiReply: parsed.aiReply.trim(),
      evaluation: result,
      evaluationDetail: detail,
      hint: typeof parsed.hint === 'string' ? parsed.hint : null,
      nextPrompt: typeof parsed.nextPrompt === 'string' ? parsed.nextPrompt : null,
    }
  } catch {
    return null
  }
}
