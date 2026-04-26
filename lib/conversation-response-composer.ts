/**
 * ResponseComposer — deterministic reply assembly for normal answers.
 *
 * Owns: ack selection, reaction selection (bridge/micro/pool), dedup,
 *       comment-only turn logic, question append, fallback.
 *
 * Does NOT own: intent routing, slot validation, repair, clarification,
 *               closing, redirect, reciprocal — those stay in ai-conversation-prompt.ts.
 */

import type { Dimension } from './ai-conversation-state'
import type { SceneQuestionSet } from './ai-conversation-scene-questions'
import { getConversationLanguagePack } from './conversation-language-packs'

// ── Types ──

export type MeaningType = 'yes' | 'no' | 'object' | 'person' | 'time' | 'frequency' | 'feeling' | 'social' | 'unclear'

export type ComposeInput = {
  meaningType: MeaningType
  meaningValue: string | null
  turnIndex: number
  engineQuestion: string | null
  engineDimension: string | null
  scene: SceneQuestionSet | null
}

// ── Data tables ──

/** Acknowledgment rotation pool — sourced from language pack. */
export const ACKS = getConversationLanguagePack('en').acks

/** Reaction templates by meaning type — warm, varied, must NOT overlap with ACKS */
export const REACTION_BY_MEANING: Record<MeaningType, string[]> = {
  yes:       ['Oh, nice.', 'Good to hear.', 'Great.', 'That\'s good.', 'Perfect.', 'Wonderful.', 'Love that.'],
  no:        ['No problem.', 'Fair enough.', 'That\'s fine.', 'No worries.', 'All good.', 'That\'s okay.', 'Totally fine.'],
  object:    ['Sounds good.', 'Interesting.', 'Oh, that one.', 'Ah, I know.', 'That\'s a good pick.', 'Classic.', 'Love it.'],
  person:    ['That\'s nice.', 'Sounds fun.', 'Lucky.', 'Oh, with them.', 'That\'s sweet.', 'Aw, nice.', 'All by yourself?'],
  time:      ['Oh, around then.', 'Not too bad.', 'That works.', 'Solid timing.', 'Sounds about right.', 'Smart.', 'Early bird.'],
  frequency: ['That often?', 'Oh, really?', 'Consistent.', 'Wow.', 'Impressive.', 'Ha, nice.', 'Every single time?'],
  feeling:   ['I feel you.', 'Makes sense.', 'Yeah, same.', 'Totally.', 'That\'s real.', 'Relatable.', 'For real.'],
  social:    ['', '', '', '', '', '', ''],
  unclear:   ['', '', '', '', '', '', ''],
}

/** Phrases that count as acknowledgment-like — used for dedup in assembly */
export const ACK_LIKE = new Set(['right.', 'got it.', 'i see.', 'okay.', 'oh, okay.', 'alright.', 'sure.', 'cool.', 'oh.', 'hmm.', 'nice.', 'yeah.', 'ah, i see.', 'ah.', 'mm-hm.', 'good.', 'great.'])

/** Value-keyword micro-reactions: short natural responses for common answer values */
const MICRO: Record<string, string[]> = {
  // People / family
  alone:     ['On your own?', 'Solo, huh.', 'Just you?'],
  myself:    ['All by yourself.', 'Solo — nice.', 'Just you?'],
  mom:       ['With your mom — sweet.', 'Oh, your mom. Nice.', 'Aw, that\'s warm.'],
  mother:    ['With your mom — sweet.', 'Oh, your mom. Nice.', 'Aw, that\'s warm.'],
  dad:       ['With your dad — nice.', 'Oh, your dad. Cool.', 'That sounds fun.'],
  father:    ['With your dad — nice.', 'Oh, your dad. Cool.', 'That sounds fun.'],
  family:    ['With family — love that.', 'As a family. That\'s nice.', 'Aw, together.'],
  together:  ['Together — that\'s nice.', 'Oh, together. Sweet.', 'Love that.'],
  sister:    ['With your sister — fun.', 'Oh, your sister. Nice.', 'That\'s sweet.'],
  brother:   ['With your brother — cool.', 'Oh, your brother.', 'That\'s fun.'],
  husband:   ['With your husband — nice.', 'Oh, together. Sweet.', 'That\'s lovely.'],
  wife:      ['With your wife — nice.', 'Oh, together. Sweet.', 'That\'s lovely.'],
  friend:    ['With a friend — fun.', 'Oh, nice.', 'Sounds fun.'],
  friends:   ['With friends — fun.', 'Oh, nice.', 'Sounds like a good time.'],
  // Time
  morning:   ['A morning person.', 'Bright and early.', 'Oh, in the morning.'],
  night:     ['A night owl.', 'Oh, at night. Cozy.', 'Late vibes.'],
  early:     ['Bright and early.', 'Oh, early. Nice.', 'You\'re up early.'],
  late:      ['Oh, a bit late.', 'Late — fair enough.', 'Night owl.'],
  // Frequency / habits
  everyday:  ['Every day — dedication.', 'Oh, daily. Nice habit.', 'That\'s impressive.'],
  always:    ['Always — wow.', 'Oh, always. Respect.', 'That\'s consistent.'],
  usually:   ['Usually — nice rhythm.', 'Oh, usually. Good habit.', 'Makes sense.'],
  sometimes: ['Sometimes — fair enough.', 'Oh, when you feel like it.', 'That\'s flexible.'],
  often:     ['Often — nice.', 'Oh, quite a lot.', 'Sounds regular.'],
  never:     ['Never? Interesting.', 'Oh, never. Okay.', 'Hmm, really?'],
  rarely:    ['Rarely — okay.', 'Oh, not so much.', 'Fair enough.'],
  maybe:     ['Maybe — fair.', 'Oh, depends. Got it.', 'Flexible.'],
  depends:   ['Oh, it depends.', 'Flexible — makes sense.', 'Fair enough.'],
  // Feeling
  tired:     ['Oh, tired. Hang in there.', 'Tired — I get that.', 'Rest well later.'],
  happy:     ['Happy — love that.', 'Oh, happy. Great.', 'That\'s wonderful.'],
  bored:     ['Oh, bored. Let\'s fix that.', 'Bored — let\'s chat.', 'Ha, let\'s make it fun.'],
  fun:       ['Sounds fun.', 'Oh, fun. Nice.', 'Love that.'],
  hard:      ['That\'s tough.', 'Oh, hard. I get it.', 'Hang in there.'],
  easy:      ['Oh, easy. Nice.', 'Easy — lucky you.', 'That\'s great.'],
}

/** Dimension-to-meaning type alignment map for bridge template selection */
const DIM_TYPE_MAP: Record<string, string> = {
  object: 'object',
  people: 'person',
  time: 'time',
  frequency: 'frequency',
  feeling: 'feeling',
  place: 'place',
}

// ── Composer ──

/**
 * Compose a natural reply for a normal answer turn.
 * Called by assembleReplyV25 after all routing decisions are made.
 */
export function composeNormalReply(input: ComposeInput): string {
  const { meaningType, meaningValue, turnIndex, engineQuestion, engineDimension, scene } = input
  const segments: string[] = []

  // Ack: only on turn 2+
  const ack = turnIndex >= 2 ? ACKS[turnIndex % ACKS.length] : null

  // Reaction: prefer value-aware bridge template, fall back to micro, then generic pool
  let reaction: string | null = null
  const dimForBridge = (engineDimension ?? meaningType) as Exclude<Dimension, 'action'>
  const bridgeAligned = !engineDimension || DIM_TYPE_MAP[engineDimension] === meaningType
  const bridgePool = bridgeAligned ? scene?.bridgeTemplates?.[dimForBridge] : undefined
  if (bridgePool && bridgePool.length > 0 && meaningValue) {
    const template = bridgePool[turnIndex % bridgePool.length]
    reaction = template.replace(/\{value\}/g, meaningValue)
  }

  // Value-keyword micro-reactions when bridge didn't fire
  if (!reaction && meaningValue) {
    const v = meaningValue.toLowerCase()
    const pool = MICRO[v]
    if (pool) reaction = pool[turnIndex % pool.length]
  }
  if (!reaction) {
    const reactionPool = REACTION_BY_MEANING[meaningType] ?? REACTION_BY_MEANING.yes
    reaction = reactionPool[turnIndex % reactionPool.length] || null
  }

  // Deduplicate: if reaction is also an ack-like phrase, keep only one
  const reactionIsAck = reaction ? ACK_LIKE.has(reaction.toLowerCase()) : false

  if (ack && reaction && reactionIsAck) {
    segments.push(ack)
  } else {
    if (ack) segments.push(ack)
    if (reaction) segments.push(reaction)
  }

  // Comment-only turn: on turn 2, if we have a value-aware bridge reaction,
  // skip the question to let the reaction breathe.
  const isCommentOnly = turnIndex === 2 && reaction && meaningValue &&
    (engineDimension === 'object' || engineDimension === 'people')

  // Question: from engine (single source of truth)
  if (engineQuestion && !isCommentOnly) segments.push(engineQuestion)
  if (isCommentOnly) segments.push('Tell me more.')

  if (segments.length === 0) {
    return turnIndex === 0 ? 'Hi! How are you today?' : 'Tell me more about that.'
  }

  return segments.join(' ')
}
