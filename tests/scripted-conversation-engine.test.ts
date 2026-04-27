import { describe, it, expect } from 'vitest'
import {
  createScriptState,
  getCurrentQuestion,
  getOpener,
  advanceScript,
  hasScript,
  type ScriptClassification,
  type ScriptState,
} from '../lib/scripted-conversation-engine'
import { SCRIPT_BREAKFAST_CLEANUP_BEGINNER, ALL_SCRIPTS } from '../lib/scripted-conversation-scripts'

const script = SCRIPT_BREAKFAST_CLEANUP_BEGINNER

const YES: ScriptClassification = { meaningType: 'yes', meaningValue: null, confidence: 0.9 }
const NO: ScriptClassification = { meaningType: 'no', meaningValue: null, confidence: 0.9 }
const UNCLEAR: ScriptClassification = { meaningType: 'unclear', meaningValue: null, confidence: 0.2 }
const SOCIAL: ScriptClassification = { meaningType: 'social', meaningValue: 'fine', confidence: 0.8 }
const PERSON: ScriptClassification = { meaningType: 'person', meaningValue: 'mom', confidence: 0.9 }

function advanceN(n: number, classification: ScriptClassification = YES): ScriptState {
  let state = createScriptState(script)
  for (let i = 0; i < n; i++) {
    const result = advanceScript(script, state, classification)
    state = result.state
  }
  return state
}

describe('scripted-conversation-engine', () => {
  // ── Basic lifecycle ──

  it('creates initial state at turn 0, not completed', () => {
    const state = createScriptState(script)
    expect(state.currentTurnIndex).toBe(0)
    expect(state.completed).toBe(false)
    expect(state.totalTurns).toBe(5)
    expect(state.repairCount).toBe(0)
  })

  it('opener returns the script opener text', () => {
    expect(getOpener(script)).toBe('Hi! How are you today?')
  })

  it('getCurrentQuestion returns first turn question at index 0', () => {
    const state = createScriptState(script)
    expect(getCurrentQuestion(script, state)).toBe('Glad to hear that. Did you have breakfast today?')
  })

  // ── CRITICAL: first reply never closes ──

  it('first reply with "yes" continues to turn 2, not closing', () => {
    const state = createScriptState(script)
    const result = advanceScript(script, state, YES)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you clean up after breakfast?')
    expect(result.reply).not.toContain('See you')
    expect(result.state.currentTurnIndex).toBe(1)
  })

  it('first reply with social answer ("I\'m fine") continues, not closing', () => {
    const state = createScriptState(script)
    const result = advanceScript(script, state, SOCIAL)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you clean up after breakfast?')
    expect(result.state.currentTurnIndex).toBe(1)
  })

  it('first reply with "no" continues to turn 2, not closing', () => {
    const state = createScriptState(script)
    const result = advanceScript(script, state, NO)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you clean up after breakfast?')
  })

  // ── Normal greeting answer continues ──

  it('"I\'m fine, thank you" (social, high confidence) produces follow-up', () => {
    const state = createScriptState(script)
    const fineThankYou: ScriptClassification = { meaningType: 'social', meaningValue: 'fine', confidence: 0.85 }
    const result = advanceScript(script, state, fineThankYou)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you clean up after breakfast?')
  })

  // ── Repeated yes answers progress through all turns ──

  it('5 consecutive "yes" answers progress through all turns and close', () => {
    let state = createScriptState(script)

    // Turn 1 → 2
    let result = advanceScript(script, state, YES)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you clean up after breakfast?')
    state = result.state

    // Turn 2 → 3
    result = advanceScript(script, state, YES)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you wash the dishes too?')
    state = result.state

    // Turn 3 → 4
    result = advanceScript(script, state, YES)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you usually clean up alone or with someone?')
    state = result.state

    // Turn 4 → 5
    result = advanceScript(script, state, YES)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you clean up right after eating?')
    state = result.state

    // Turn 5 (final) → closing
    result = advanceScript(script, state, YES)
    expect(result.isClosing).toBe(true)
    expect(result.reply).toContain('See you next time!')
    expect(result.state.completed).toBe(true)
  })

  // ── Unknown answer gives repair prompt ──

  it('unclear answer on turn 1 gives repair prompt, stays on same turn', () => {
    const state = createScriptState(script)
    const result = advanceScript(script, state, UNCLEAR)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toBe('Did you eat breakfast this morning?')
    expect(result.state.currentTurnIndex).toBe(0) // stayed
    expect(result.state.repairCount).toBe(1)
  })

  it('second unclear on same turn moves on (never blocks the user)', () => {
    const state = createScriptState(script)
    // First unclear → repair
    const r1 = advanceScript(script, state, UNCLEAR)
    expect(r1.state.repairCount).toBe(1)
    // Second unclear → accept and advance
    const r2 = advanceScript(script, r1.state, UNCLEAR)
    expect(r2.isClosing).toBe(false)
    expect(r2.state.currentTurnIndex).toBe(1)
    expect(r2.state.repairCount).toBe(0) // reset for next turn
    expect(r2.reply).toContain('Do you clean up after breakfast?')
  })

  it('unclear on turn 3 gives that turn\'s repair prompt', () => {
    const state = advanceN(2) // at turn index 2 (dishes)
    const result = advanceScript(script, state, UNCLEAR)
    expect(result.reply).toBe('Do you wash dishes after eating?')
    expect(result.state.currentTurnIndex).toBe(2) // stayed
  })

  // ── Closing only after final turn ──

  it('closing is false on turns 1 through 4', () => {
    let state = createScriptState(script)
    for (let i = 0; i < 4; i++) {
      const result = advanceScript(script, state, YES)
      expect(result.isClosing).toBe(false)
      state = result.state
    }
  })

  it('closing is true only on turn 5 (final)', () => {
    const state = advanceN(4) // answered turns 1-4, now on turn 5
    const result = advanceScript(script, state, YES)
    expect(result.isClosing).toBe(true)
    expect(result.state.completed).toBe(true)
  })

  // ── Script state is deterministic ──

  it('same inputs always produce same outputs', () => {
    const state = createScriptState(script)
    const r1 = advanceScript(script, state, YES)
    const r2 = advanceScript(script, state, YES)
    expect(r1.reply).toBe(r2.reply)
    expect(r1.isClosing).toBe(r2.isClosing)
    expect(r1.state).toEqual(r2.state)
  })

  it('different meaning types produce different reactions but same next question', () => {
    const state = createScriptState(script)
    const rYes = advanceScript(script, state, YES)
    const rNo = advanceScript(script, state, NO)
    // Different reactions
    expect(rYes.reply).not.toBe(rNo.reply)
    // Same next question
    expect(rYes.reply).toContain('Do you clean up after breakfast?')
    expect(rNo.reply).toContain('Do you clean up after breakfast?')
  })

  // ── No LLM close intent can override script ──

  it('even if LLM says "closing", script engine ignores it on early turns', () => {
    // The script engine receives classification, not LLM intent.
    // If caller passes meaning=social (from a "bye" that was reclassified),
    // the engine still advances normally.
    const state = createScriptState(script)
    const closingAttempt: ScriptClassification = { meaningType: 'social', meaningValue: 'bye', confidence: 0.7 }
    const result = advanceScript(script, state, closingAttempt)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you clean up after breakfast?')
  })

  it('completed state is idempotent — repeated advances return closing', () => {
    const state = advanceN(5) // completed
    expect(state.completed).toBe(true)
    const result = advanceScript(script, state, YES)
    expect(result.isClosing).toBe(true)
    expect(result.reply).toContain('See you next time!')
    expect(result.state).toBe(state) // exact same reference
  })

  // ── Registry lookup ──

  it('hasScript finds breakfast_cleanup beginner', () => {
    const found = hasScript(ALL_SCRIPTS, 'breakfast_cleanup', 'beginner')
    expect(found).not.toBeNull()
    expect(found?.id).toBe('breakfast_cleanup_beginner_v1')
  })

  it('hasScript returns null for unknown scene', () => {
    expect(hasScript(ALL_SCRIPTS, 'unknown_scene', 'beginner')).toBeNull()
  })

  it('hasScript returns null for wrong level', () => {
    expect(hasScript(ALL_SCRIPTS, 'breakfast_cleanup', 'advanced')).toBeNull()
  })

  // ── Person/object answers work correctly ──

  it('person answer on people turn gives appropriate reaction', () => {
    const state = advanceN(3) // at turn index 3 (people)
    const result = advanceScript(script, state, PERSON)
    expect(result.isClosing).toBe(false)
    expect(result.reply).toContain('Do you clean up right after eating?')
    // Reaction should be from person pool
    expect(result.reply).toMatch(/^(Nice\.|Oh\.|Got it\.|I see\.)/)
  })
})
