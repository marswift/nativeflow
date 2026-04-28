/**
 * Scripted Conversation Engine v2
 *
 * Deterministic turn-by-turn conversation control with slot-aware validation.
 * The app decides: turn order, next question, closing timing, retry.
 * The LLM only helps with: meaning classification.
 *
 * Validation rules:
 * - Each turn declares expectedTypes (which meaning types are valid answers)
 * - If classification matches expectedTypes → accept and advance
 * - If mismatch (wrong type, past-context, unclear) → repair prompt, stay
 * - If repair exhausted (max 2 per turn) → weak-accept and advance
 * - Closing only after final turn is accepted or repair-exhausted
 */

import type { ConversationScript } from './scripted-conversation-scripts'
import { hasPastContextMismatch } from './conversation-slot-filler'

// ── Types ──

export type ScriptMeaningType = 'yes' | 'no' | 'object' | 'person' | 'time' | 'frequency' | 'feeling' | 'social' | 'unclear'

export type ScriptClassification = {
  meaningType: ScriptMeaningType
  meaningValue: string | null
  confidence: number
}

export type ScriptState = {
  scriptId: string
  /** Which scripted turn we're currently asking (0-based, independent of component turn counter) */
  currentTurnIndex: number
  totalTurns: number
  /** Number of repair prompts issued for the current turn */
  repairCount: number
  /** true only after the final turn has been answered */
  completed: boolean
}

export type ScriptAdvanceResult = {
  /** The AI reply text to speak/show */
  reply: string
  /** Whether the conversation should close after this reply */
  isClosing: boolean
  /** Whether this was a repair (stayed on same turn) */
  isRepair: boolean
  /** Updated state */
  state: ScriptState
}

// ── Constants ──

/** Max repairs per turn. After this many, weak-accept and advance. */
const MAX_REPAIRS_PER_TURN = 2

/** Short reactions per meaning type — deterministic, no LLM involvement */
const SCRIPT_REACTIONS: Record<ScriptMeaningType, string[]> = {
  yes:       ['Nice.', 'Good.', 'Great.', 'Got it.'],
  no:        ['Okay.', 'Got it.', 'I see.', 'Fair enough.'],
  object:    ['Nice.', 'Good choice.', 'I see.', 'Oh.'],
  person:    ['Nice.', 'Oh.', 'Got it.', 'I see.'],
  time:      ['Got it.', 'I see.', 'Okay.', 'Nice.'],
  frequency: ['I see.', 'Got it.', 'Oh.', 'Nice.'],
  feeling:   ['I see.', 'Got it.', 'Oh.', 'Makes sense.'],
  social:    ['Nice.', 'Good.', 'Got it.', 'Okay.'],
  unclear:   ['', '', '', ''],
}

// ── Engine ──

export function createScriptState(script: ConversationScript): ScriptState {
  return {
    scriptId: script.id,
    currentTurnIndex: 0,
    totalTurns: script.turns.length,
    repairCount: 0,
    completed: false,
  }
}

export function getCurrentQuestion(script: ConversationScript, state: ScriptState): string {
  if (state.completed) return script.closingLine
  if (state.currentTurnIndex >= script.turns.length) return script.closingLine
  return script.turns[state.currentTurnIndex].aiQuestion
}

export function getOpener(script: ConversationScript): string {
  return script.opener
}

/**
 * Advance the script after a user answer.
 *
 * Validation cascade:
 * 1. Already completed → return closing (idempotent)
 * 2. Past-context mismatch → repair
 * 3. Unclear / low confidence → repair
 * 4. Meaning type not in turn's expectedTypes → repair
 * 5. All repairs exhausted → weak-accept and advance
 * 6. Valid answer → accept and advance
 * 7. Final turn accepted → close
 */
export function advanceScript(
  script: ConversationScript,
  state: ScriptState,
  classification: ScriptClassification,
  userMessage?: string | null,
): ScriptAdvanceResult {
  if (state.completed) {
    return { reply: script.closingLine, isClosing: true, isRepair: false, state }
  }

  const turn = script.turns[state.currentTurnIndex]
  if (!turn) {
    return {
      reply: script.closingLine,
      isClosing: true,
      isRepair: false,
      state: { ...state, completed: true },
    }
  }

  // ── Determine if answer is valid for this turn ──
  const needsRepair = checkNeedsRepair(turn.expectedTypes, classification, userMessage)

  if (needsRepair && state.repairCount < MAX_REPAIRS_PER_TURN) {
    // Stay on same turn, issue repair prompt
    return {
      reply: turn.repairPrompt,
      isClosing: false,
      isRepair: true,
      state: { ...state, repairCount: state.repairCount + 1 },
    }
  }

  // ── Accept (valid answer or repair-exhausted weak-accept) → advance ──
  if (needsRepair && state.repairCount >= MAX_REPAIRS_PER_TURN) {
    console.log('[SCRIPT_WEAK_ACCEPT]', JSON.stringify({
      turnId: turn.id,
      meaningType: classification.meaningType,
      expected: turn.expectedTypes,
      repairCount: state.repairCount,
    }))
  }

  const reaction = pickReaction(classification.meaningType, state.currentTurnIndex)
  const nextIndex = state.currentTurnIndex + 1
  const isFinalTurn = nextIndex >= script.turns.length

  if (isFinalTurn) {
    const reply = reaction ? `${reaction} ${script.closingLine}` : script.closingLine
    return {
      reply,
      isClosing: true,
      isRepair: false,
      state: { ...state, currentTurnIndex: nextIndex, repairCount: 0, completed: true },
    }
  }

  const nextQuestion = script.turns[nextIndex].aiQuestion
  const reply = reaction ? `${reaction} ${nextQuestion}` : nextQuestion
  return {
    reply,
    isClosing: false,
    isRepair: false,
    state: { ...state, currentTurnIndex: nextIndex, repairCount: 0 },
  }
}

export function hasScript(scripts: ConversationScript[], sceneId: string, level: string): ConversationScript | null {
  return scripts.find((s) => s.sceneId === sceneId && s.level === level) ?? null
}

export function getScriptTtsTexts(script: ConversationScript): string[] {
  const texts = new Set<string>()
  texts.add(script.opener)
  for (const turn of script.turns) {
    texts.add(turn.aiQuestion)
    texts.add(turn.repairPrompt)
  }
  texts.add(script.closingLine)
  for (let i = 0; i < script.turns.length; i++) {
    const nextIdx = i + 1
    const nextQ = nextIdx < script.turns.length ? script.turns[nextIdx].aiQuestion : script.closingLine
    for (const pool of [SCRIPT_REACTIONS.yes, SCRIPT_REACTIONS.no, SCRIPT_REACTIONS.social, SCRIPT_REACTIONS.person]) {
      const reaction = pool[i % pool.length]
      if (reaction) texts.add(`${reaction} ${nextQ}`)
    }
  }
  return Array.from(texts)
}

// ── Validation helpers ──

/**
 * Check if the user's answer needs repair for this turn.
 * Returns true if answer is invalid (past context, unclear, or wrong type).
 */
function checkNeedsRepair(
  expectedTypes: ScriptMeaningType[],
  classification: ScriptClassification,
  userMessage?: string | null,
): boolean {
  // Past-context mismatch (e.g. "I grew up alone")
  if (userMessage && hasPastContextMismatch(userMessage)) return true

  // Unclear / low confidence
  if (classification.meaningType === 'unclear' || classification.confidence < 0.3) return true

  // Type mismatch: classified meaning not in this turn's expected types
  if (expectedTypes.length > 0 && !expectedTypes.includes(classification.meaningType)) return true

  return false
}

function pickReaction(meaningType: ScriptMeaningType, turnIndex: number): string {
  const pool = SCRIPT_REACTIONS[meaningType] ?? SCRIPT_REACTIONS.yes
  return pool[turnIndex % pool.length]
}
