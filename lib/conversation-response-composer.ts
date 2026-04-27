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
  /** Numeric rank for level-aware composition. 0-19 ultra-beginner, 20-39 beginner, 40-69 intermediate, 70+ advanced. */
  rank?: number | null
  /** The meaning type of the previous turn — used to detect repetitive yes/no loops. */
  prevMeaningType?: MeaningType | null
  /** The raw user message for emphatic detection. */
  userMessage?: string | null
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

/** Beginner-friendly reactions — short, simple, one idea only */
const REACTION_BEGINNER: Record<MeaningType, string[]> = {
  yes:       ['Nice.', 'Good.', 'Great.', 'Okay.'],
  no:        ['Okay.', 'Got it.', 'I see.', 'Fine.'],
  object:    ['Nice.', 'Good.', 'Oh.', 'Okay.'],
  person:    ['Nice.', 'Oh.', 'Good.', 'Okay.'],
  time:      ['Okay.', 'I see.', 'Oh.', 'Nice.'],
  frequency: ['Oh.', 'I see.', 'Nice.', 'Okay.'],
  feeling:   ['I see.', 'Oh.', 'Okay.', 'Got it.'],
  social:    ['', '', '', ''],
  unclear:   ['', '', '', ''],
}

/** Advanced reactions — richer, more personality, varied rhythm */
const REACTION_ADVANCED: Record<MeaningType, string[]> = {
  yes:       ['Oh, nice — that\'s great to hear.', 'Awesome, love that.', 'Perfect, sounds solid.', 'That\'s really good.', 'Great, glad to hear it.'],
  no:        ['Fair enough, no worries at all.', 'That\'s totally fine.', 'Got it, makes sense.', 'No problem, everyone\'s different.', 'Honestly, that\'s fair.'],
  object:    ['Oh, interesting choice.', 'Ah, nice pick.', 'That\'s a solid one.', 'Classic — I like it.', 'Good taste.'],
  person:    ['That sounds really nice.', 'Oh, that must be fun.', 'Lucky — sounds great.', 'That\'s sweet.', 'Aw, I love that.'],
  time:      ['That\'s a good time for it.', 'Makes sense, smart timing.', 'Oh, around then — nice.', 'Solid routine.', 'That works well.'],
  frequency: ['Oh, quite a lot — impressive.', 'That\'s a solid habit.', 'Interesting rhythm.', 'Ha, respect.', 'That takes dedication.'],
  feeling:   ['I totally get that.', 'Yeah, that\'s real.', 'Honestly, same sometimes.', 'Makes total sense.', 'I hear you.'],
  social:    ['', '', '', '', ''],
  unclear:   ['', '', '', '', ''],
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

// ── Emphatic detection ──

/** Detect emphatic/strong phrasing in user message for intensity-matched reactions. */
export function detectEmphatic(msg: string | null | undefined): 'strong_yes' | 'strong_no' | 'uncertain' | null {
  if (!msg) return null
  const lower = msg.toLowerCase().trim()
  if (/\b(of course|definitely|absolutely|always do|every single|for sure|obviously)\b/.test(lower)) return 'strong_yes'
  if (/\b(not really|not at all|never|nah|nope|hardly ever|no way)\b/.test(lower)) return 'strong_no'
  if (/\b(maybe|sometimes|it depends|not sure|kind of|sort of|i guess)\b/.test(lower)) return 'uncertain'
  return null
}

/** Emphatic reaction pools — more intense/specific than generic yes/no */
const EMPHATIC_REACTIONS: Record<string, string[]> = {
  strong_yes:  ['Wow, very consistent.', 'Love the dedication.', 'Nice discipline.', 'Sounds like a habit.', 'That\'s impressive.'],
  strong_no:   ['Totally fair.', 'Honest answer.', 'Nothing wrong with that.', 'That\'s real.', 'No judgment.'],
  uncertain:   ['Hmm, depends on the day?', 'Fair — not everything is fixed.', 'Flexible, got it.', 'That makes sense.', 'Yeah, life\'s like that.'],
}

// ── Micro-comments (scene color) ──

/** Short scene-context comments inserted between reaction and question on select turns.
 *  Keyed by scene ID. Only fires for intermediate+ on turn 1 or 3.
 */
const SCENE_MICRO_COMMENTS: Record<string, string[]> = {
  wake_up:           ['Mornings are everything.', 'The start of the day!', 'A fresh start.'],
  breakfast:         ['Breakfast is the best.', 'Good fuel for the day.', 'Morning energy!'],
  breakfast_cleanup: ['Got to keep it clean.', 'Part of the routine.'],
  commute:           ['The daily commute.', 'On the move.', 'Travel time.'],
  dinner:            ['Dinner time is the best.', 'Evening fuel.', 'A nice way to end the day.'],
  bath:              ['So relaxing.', 'Best part of the night.', 'A daily reset.'],
  go_home:           ['Home sweet home.', 'Finally back.', 'End of the day.'],
  arrive_work:       ['Time to get going.', 'A new work day.', 'Ready to start.'],
  sleep:             ['Sleep is so important.', 'Rest well.', 'Sweet dreams.'],
  meet_friend:       ['Friends make everything better.', 'Social time!'],
  restaurant:        ['Eating out is fun.', 'Good food, good mood.'],
  shopping:          ['Shopping time.', 'Getting supplies.'],
  office:            ['Work mode on.', 'Busy day ahead.'],
  school:            ['School life.', 'Study hard.'],
}

// ── Reciprocity snippets ──

/** Tiny self-disclosure lines. Fire at low frequency (turn 3, advanced only). */
const RECIPROCITY: Record<MeaningType, string[]> = {
  yes:       ['Same here, actually.', 'Me too.'],
  no:        ['I get that — same sometimes.', 'Fair, I\'m like that too.'],
  object:    ['Good choice — I like that one too.'],
  person:    ['That\'s nice — sounds like me.'],
  time:      ['Similar for me.', 'About the same here.'],
  frequency: ['I should do that more.', 'Ha, same.'],
  feeling:   ['Yeah, I feel that way too.', 'Relatable.'],
  social:    [],
  unclear:   [],
}

// ── Consecutive-repeat variety ──

/** Alternative reactions when the same meaningType appears twice in a row (avoids monotone). */
const REPEAT_VARIETY: Record<string, string[]> = {
  yes: ['Cool.', 'Sounds good.', 'Alright.', 'Nice one.'],
  no:  ['Got it.', 'Understood.', 'Alright.', 'I hear you.'],
}

// ── Composer ──

/**
 * Compose a natural reply for a normal answer turn.
 * Called by assembleReplyV25 after all routing decisions are made.
 */
export function composeNormalReply(input: ComposeInput): string {
  const { meaningType, meaningValue, turnIndex, engineQuestion, engineDimension, scene } = input
  const rank = input.rank ?? 50 // default to intermediate if not provided
  const segments: string[] = []

  // ── Level tiers ──
  const isBeginner = rank < 40
  const isAdvanced = rank >= 70
  const isRepeatedType = input.prevMeaningType === meaningType && (meaningType === 'yes' || meaningType === 'no')

  // ── Emphatic detection (intensity-matched reaction override) ──
  const emphatic = !isBeginner ? detectEmphatic(input.userMessage) : null

  // Ack: turn 2+ for intermediate/advanced, turn 3+ for beginners (less clutter)
  const ackTurnThreshold = isBeginner ? 3 : 2
  const ack = turnIndex >= ackTurnThreshold ? ACKS[turnIndex % ACKS.length] : null

  // ── Reaction selection (priority cascade) ──
  let reaction: string | null = null

  // Priority 1: Emphatic override (intermediate+ only)
  if (!reaction && emphatic) {
    const pool = EMPHATIC_REACTIONS[emphatic]
    if (pool) reaction = pool[turnIndex % pool.length]
  }

  // Priority 2: Consecutive-repeat variety (break yes/no monotone)
  if (!reaction && isRepeatedType && !isBeginner) {
    const pool = REPEAT_VARIETY[meaningType]
    if (pool) reaction = pool[turnIndex % pool.length]
  }

  // Priority 3: Bridge templates (intermediate+ only)
  if (!reaction && !isBeginner) {
    const dimForBridge = (engineDimension ?? meaningType) as Exclude<Dimension, 'action'>
    const bridgeAligned = !engineDimension || DIM_TYPE_MAP[engineDimension] === meaningType
    const bridgePool = bridgeAligned ? scene?.bridgeTemplates?.[dimForBridge] : undefined
    if (bridgePool && bridgePool.length > 0 && meaningValue) {
      const template = bridgePool[turnIndex % bridgePool.length]
      reaction = template.replace(/\{value\}/g, meaningValue)
    }
  }

  // Priority 4: Value-keyword micro-reactions (intermediate+ only)
  if (!reaction && meaningValue && !isBeginner) {
    const v = meaningValue.toLowerCase()
    const pool = MICRO[v]
    if (pool) reaction = pool[turnIndex % pool.length]
  }

  // Priority 5: Generic reaction pool — level-appropriate
  if (!reaction) {
    const pool = isBeginner
      ? (REACTION_BEGINNER[meaningType] ?? REACTION_BEGINNER.yes)
      : isAdvanced
        ? (REACTION_ADVANCED[meaningType] ?? REACTION_ADVANCED.yes)
        : (REACTION_BY_MEANING[meaningType] ?? REACTION_BY_MEANING.yes)
    reaction = pool[turnIndex % pool.length] || null
  }

  // Deduplicate: if reaction is also an ack-like phrase, keep only one
  const reactionIsAck = reaction ? ACK_LIKE.has(reaction.toLowerCase()) : false

  if (ack && reaction && reactionIsAck) {
    segments.push(ack)
  } else {
    if (ack) segments.push(ack)
    if (reaction) segments.push(reaction)
  }

  // ── Micro-comment: scene color on select turns (intermediate+ only) ──
  const sceneId = scene?.id
  if (!isBeginner && sceneId && (turnIndex === 1 || turnIndex === 3)) {
    const commentPool = SCENE_MICRO_COMMENTS[sceneId]
    if (commentPool && commentPool.length > 0) {
      segments.push(commentPool[turnIndex % commentPool.length])
    }
  }

  // ── Reciprocity: tiny self-disclosure on turn 3 for advanced only ──
  if (isAdvanced && turnIndex === 3 && !isRepeatedType) {
    const recipPool = RECIPROCITY[meaningType]
    if (recipPool && recipPool.length > 0) {
      segments.push(recipPool[turnIndex % recipPool.length])
    }
  }

  // Comment-only turn: on turn 2, if we have a value-aware bridge reaction,
  // skip the question to let the reaction breathe.
  // Disabled for beginners (always ask the next question — keep it simple).
  const isCommentOnly = !isBeginner && turnIndex === 2 && reaction && meaningValue &&
    (engineDimension === 'object' || engineDimension === 'people')

  // Question: from engine (single source of truth)
  if (engineQuestion && !isCommentOnly) segments.push(engineQuestion)
  if (isCommentOnly) segments.push('Tell me more.')

  if (segments.length === 0) {
    return turnIndex === 0 ? 'Hi! How are you today?' : 'Tell me more about that.'
  }

  return segments.join(' ')
}
