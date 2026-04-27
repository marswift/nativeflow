/**
 * Scripted Conversation Engine v1
 *
 * Deterministic turn-by-turn conversation control.
 * The app decides: turn order, next question, closing timing, retry.
 * The LLM only helps with: meaning classification, short reaction.
 *
 * No LLM intent can override the script. Closing is only allowed after
 * the final scripted turn.
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
  currentTurnIndex: number
  totalTurns: number
  repairCount: number
  /** true only after the final turn has been answered */
  completed: boolean
}

export type ScriptAdvanceResult = {
  /** The AI reply text to speak/show */
  reply: string
  /** Whether the conversation should close after this reply */
  isClosing: boolean
  /** Updated state */
  state: ScriptState
}

// ── Constants ──

const MAX_REPAIRS_PER_TURN = 1

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

/**
 * Create initial state for a scripted conversation.
 */
export function createScriptState(script: ConversationScript): ScriptState {
  return {
    scriptId: script.id,
    currentTurnIndex: 0,
    totalTurns: script.turns.length,
    repairCount: 0,
    completed: false,
  }
}

/**
 * Get the current turn's AI question text.
 * Returns the closing line if the conversation is completed.
 */
export function getCurrentQuestion(script: ConversationScript, state: ScriptState): string {
  if (state.completed) return script.closingLine
  if (state.currentTurnIndex >= script.turns.length) return script.closingLine
  return script.turns[state.currentTurnIndex].aiQuestion
}

/**
 * Get the opening message for a scripted conversation.
 */
export function getOpener(script: ConversationScript): string {
  return script.opener
}

/**
 * Advance the script after a user answer.
 *
 * This is the core function. It:
 * 1. Classifies whether the answer is acceptable (any recognized meaning = ok)
 * 2. If unclear + repairs not exhausted → repair prompt (stay on same turn)
 * 3. If unclear + repairs exhausted → accept and move on (never block the user)
 * 4. If acceptable → reaction + next question
 * 5. If final turn answered → reaction + closing line
 *
 * The LLM classification is an INPUT — this function does not call any LLM.
 * No LLM intent (including "closing") can cause early termination.
 */
export function advanceScript(
  script: ConversationScript,
  state: ScriptState,
  classification: ScriptClassification,
  userMessage?: string | null,
): ScriptAdvanceResult {
  // Already completed — return closing (idempotent)
  if (state.completed) {
    return {
      reply: script.closingLine,
      isClosing: true,
      state,
    }
  }

  const turn = script.turns[state.currentTurnIndex]
  if (!turn) {
    // Safety: beyond script bounds
    return {
      reply: script.closingLine,
      isClosing: true,
      state: { ...state, completed: true },
    }
  }

  // ── Past-context mismatch → repair (e.g. "I grew up alone" on a present-routine question) ──
  if (userMessage && hasPastContextMismatch(userMessage)) {
    if (state.repairCount < MAX_REPAIRS_PER_TURN) {
      return {
        reply: turn.repairPrompt,
        isClosing: false,
        state: { ...state, repairCount: state.repairCount + 1 },
      }
    }
  }

  // ── Unclear / low confidence → repair (max once per turn) ──
  if (classification.meaningType === 'unclear' || classification.confidence < 0.3) {
    if (state.repairCount < MAX_REPAIRS_PER_TURN) {
      return {
        reply: turn.repairPrompt,
        isClosing: false,
        state: { ...state, repairCount: state.repairCount + 1 },
      }
    }
    // Repairs exhausted — accept and move on (never block the user)
  }

  // ── Acceptable answer → reaction + advance ──
  const reaction = pickReaction(classification.meaningType, state.currentTurnIndex)
  const nextIndex = state.currentTurnIndex + 1
  const isFinalTurn = nextIndex >= script.turns.length

  if (isFinalTurn) {
    // Final turn answered — close
    const reply = reaction
      ? `${reaction} ${script.closingLine}`
      : script.closingLine
    return {
      reply,
      isClosing: true,
      state: { ...state, currentTurnIndex: nextIndex, repairCount: 0, completed: true },
    }
  }

  // More turns remain — reaction + next question
  const nextQuestion = script.turns[nextIndex].aiQuestion
  const reply = reaction
    ? `${reaction} ${nextQuestion}`
    : nextQuestion
  return {
    reply,
    isClosing: false,
    state: { ...state, currentTurnIndex: nextIndex, repairCount: 0 },
  }
}

/**
 * Check if a script exists for a given scene + level combination.
 */
export function hasScript(scripts: ConversationScript[], sceneId: string, level: string): ConversationScript | null {
  return scripts.find((s) => s.sceneId === sceneId && s.level === level) ?? null
}

// ── Helpers ──

function pickReaction(meaningType: ScriptMeaningType, turnIndex: number): string {
  const pool = SCRIPT_REACTIONS[meaningType] ?? SCRIPT_REACTIONS.yes
  return pool[turnIndex % pool.length]
}
