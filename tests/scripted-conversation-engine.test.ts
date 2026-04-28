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
import { classifyMeaningLocal } from '../lib/scripted-conversation-classifier'

const script = SCRIPT_BREAKFAST_CLEANUP_BEGINNER

const YES: ScriptClassification = { meaningType: 'yes', meaningValue: null, confidence: 0.9 }
const NO: ScriptClassification = { meaningType: 'no', meaningValue: null, confidence: 0.9 }
const UNCLEAR: ScriptClassification = { meaningType: 'unclear', meaningValue: null, confidence: 0.2 }
const SOCIAL: ScriptClassification = { meaningType: 'social', meaningValue: 'fine', confidence: 0.8 }
const PERSON: ScriptClassification = { meaningType: 'person', meaningValue: 'myself', confidence: 0.85 }
const TIME: ScriptClassification = { meaningType: 'time', meaningValue: 'right after', confidence: 0.8 }
const OBJECT: ScriptClassification = { meaningType: 'object', meaningValue: 'farm', confidence: 0.6 }
const FREQ: ScriptClassification = { meaningType: 'frequency', meaningValue: 'sometimes', confidence: 0.8 }

/** Advance N turns with a valid answer for each turn */
function advanceValidN(n: number): ScriptState {
  let state = createScriptState(script)
  const validAnswers: ScriptClassification[] = [SOCIAL, YES, YES, PERSON, TIME]
  for (let i = 0; i < n; i++) {
    const result = advanceScript(script, state, validAnswers[i] ?? YES)
    state = result.state
  }
  return state
}

describe('scripted-conversation-engine v2', () => {
  // ── Basic lifecycle ──

  it('creates initial state at turn 0', () => {
    const state = createScriptState(script)
    expect(state.currentTurnIndex).toBe(0)
    expect(state.completed).toBe(false)
    expect(state.repairCount).toBe(0)
  })

  it('opener returns script opener', () => {
    expect(getOpener(script)).toBe('Hi! How are you today?')
  })

  // ── Slot-aware validation: people turn ──

  it('people turn: "By myself" (person type) accepted, advances to timing', () => {
    const state = advanceValidN(3) // at people turn (index 3)
    expect(state.currentTurnIndex).toBe(3)
    const result = advanceScript(script, state, PERSON, 'By myself')
    expect(result.isClosing).toBe(false)
    expect(result.isRepair).toBe(false)
    expect(result.reply).toContain('Do you clean up right after eating?')
    expect(result.state.currentTurnIndex).toBe(4)
  })

  it('people turn: "I was with my mother" → past-context repair, stays', () => {
    const state = advanceValidN(3)
    const personClass: ScriptClassification = { meaningType: 'person', meaningValue: 'mother', confidence: 0.85 }
    const result = advanceScript(script, state, personClass, 'I was with my mother.')
    expect(result.isRepair).toBe(true)
    expect(result.isClosing).toBe(false)
    expect(result.state.currentTurnIndex).toBe(3) // stayed
    expect(result.reply).toBe('By yourself, or does someone help?')
  })

  it('people turn after repair: "By myself" → accepted, advances to timing (NOT closing)', () => {
    const state = advanceValidN(3)
    // First: past-context repair
    const r1 = advanceScript(script, state, PERSON, 'I was with my mother.')
    expect(r1.isRepair).toBe(true)
    expect(r1.state.repairCount).toBe(1)
    // Second: valid answer
    const r2 = advanceScript(script, r1.state, PERSON, 'By myself')
    expect(r2.isRepair).toBe(false)
    expect(r2.isClosing).toBe(false)
    expect(r2.state.currentTurnIndex).toBe(4) // advanced to timing
    expect(r2.reply).toContain('Do you clean up right after eating?')
  })

  it('people turn: "I clean a farm" (object type) → type mismatch repair, stays', () => {
    const state = advanceValidN(3)
    const result = advanceScript(script, state, OBJECT, 'I clean a farm')
    expect(result.isRepair).toBe(true)
    expect(result.state.currentTurnIndex).toBe(3)
    expect(result.reply).toBe('By yourself, or does someone help?')
  })

  it('people turn: repeated "yes" → type mismatch repair (yes not in people expectedTypes)', () => {
    const state = advanceValidN(3)
    const result = advanceScript(script, state, YES, 'Yes, I do.')
    expect(result.isRepair).toBe(true)
    expect(result.state.currentTurnIndex).toBe(3)
  })

  // ── Slot-aware validation: time/timing turn ──

  it('time turn: "right after eating" → accepted, closes', () => {
    const state = advanceValidN(4) // at timing turn (index 4, final)
    const result = advanceScript(script, state, TIME, 'Right after eating')
    expect(result.isClosing).toBe(true)
    expect(result.reply).toContain('Nice work today. See you next time!')
    expect(result.state.completed).toBe(true)
  })

  it('time turn: "Sometimes my mother helps me" → person type, mismatch for time turn, repair', () => {
    const state = advanceValidN(4)
    const personClass: ScriptClassification = { meaningType: 'person', meaningValue: 'mother', confidence: 0.85 }
    const result = advanceScript(script, state, personClass, 'Sometimes my mother helps me')
    expect(result.isRepair).toBe(true)
    expect(result.state.currentTurnIndex).toBe(4)
    expect(result.reply).toBe('Do you do it right away, or later?')
  })

  it('time turn: "sometimes" (frequency) → accepted (frequency is in timing expectedTypes)', () => {
    const state = advanceValidN(4)
    const result = advanceScript(script, state, FREQ, 'Sometimes')
    expect(result.isClosing).toBe(true)
    expect(result.isRepair).toBe(false)
  })

  // ── Repair exhaustion ──

  it('repair exhaustion (2 repairs) → weak-accept and advance', () => {
    const state = advanceValidN(3) // people turn
    // Repair 1
    const r1 = advanceScript(script, state, OBJECT, 'I clean a farm')
    expect(r1.isRepair).toBe(true)
    expect(r1.state.repairCount).toBe(1)
    // Repair 2
    const r2 = advanceScript(script, r1.state, OBJECT, 'I do clean things')
    expect(r2.isRepair).toBe(true)
    expect(r2.state.repairCount).toBe(2)
    // Exhausted → weak-accept
    const r3 = advanceScript(script, r2.state, OBJECT, 'Something else')
    expect(r3.isRepair).toBe(false)
    expect(r3.state.currentTurnIndex).toBe(4) // advanced despite mismatch
    expect(r3.reply).toContain('Do you clean up right after eating?')
  })

  // ── Final turn closes only after valid answer ──

  it('final turn: only closes after valid time/frequency answer', () => {
    const state = advanceValidN(4) // timing turn (final)
    // First: wrong type → repair
    const r1 = advanceScript(script, state, OBJECT, 'My dishes')
    expect(r1.isRepair).toBe(true)
    expect(r1.isClosing).toBe(false)
    // Second: valid time answer → close
    const r2 = advanceScript(script, r1.state, TIME, 'Right after eating')
    expect(r2.isClosing).toBe(true)
    expect(r2.state.completed).toBe(true)
  })

  // ── Full conversation: no premature closing ──

  it('full 5-turn conversation with valid answers closes correctly', () => {
    let state = createScriptState(script)
    // Turn 0: social greeting
    let r = advanceScript(script, state, SOCIAL, "I'm fine, thank you")
    expect(r.isClosing).toBe(false)
    state = r.state

    // Turn 1: yes to cleanup
    r = advanceScript(script, state, YES, 'Yes, I do')
    expect(r.isClosing).toBe(false)
    state = r.state

    // Turn 2: yes to dishes
    r = advanceScript(script, state, YES, 'Yes')
    expect(r.isClosing).toBe(false)
    state = r.state

    // Turn 3: person answer
    r = advanceScript(script, state, PERSON, 'By myself')
    expect(r.isClosing).toBe(false)
    expect(r.reply).toContain('Do you clean up right after eating?')
    state = r.state

    // Turn 4: time answer → close
    r = advanceScript(script, state, TIME, 'Right after eating')
    expect(r.isClosing).toBe(true)
    expect(r.reply).toContain('Nice work today')
  })

  it('full conversation with repair on people turn, no premature close', () => {
    let state = createScriptState(script)
    // Turns 0-2: normal
    for (let i = 0; i < 3; i++) {
      const r = advanceScript(script, state, i === 0 ? SOCIAL : YES)
      state = r.state
    }
    expect(state.currentTurnIndex).toBe(3)

    // Turn 3: past-context repair
    let r = advanceScript(script, state, PERSON, 'I grew up alone.')
    expect(r.isRepair).toBe(true)
    state = r.state

    // Turn 3 retry: valid person answer
    r = advanceScript(script, state, PERSON, 'By myself')
    expect(r.isClosing).toBe(false)
    expect(r.reply).toContain('Do you clean up right after eating?')
    state = r.state

    // Turn 4: valid time → close
    r = advanceScript(script, state, TIME, 'Right after')
    expect(r.isClosing).toBe(true)
  })

  // ── Registry ──

  it('hasScript finds breakfast_cleanup beginner', () => {
    expect(hasScript(ALL_SCRIPTS, 'breakfast_cleanup', 'beginner')).not.toBeNull()
  })

  it('hasScript returns null for non-script scene', () => {
    expect(hasScript(ALL_SCRIPTS, 'wake_up', 'beginner')).toBeNull()
  })

  // ── Completed state is idempotent ──

  it('completed state returns closing on any further advance', () => {
    const state = advanceValidN(5)
    expect(state.completed).toBe(true)
    const r = advanceScript(script, state, YES)
    expect(r.isClosing).toBe(true)
    expect(r.state).toBe(state) // exact same ref
  })
})

// ── Local classifier tests ──

describe('classifyMeaningLocal v2', () => {
  it('"By myself" → person', () => {
    expect(classifyMeaningLocal('By myself').meaningType).toBe('person')
  })

  it('"alone" → person', () => {
    expect(classifyMeaningLocal('alone').meaningType).toBe('person')
  })

  it('"with my mother" → person', () => {
    expect(classifyMeaningLocal('with my mother').meaningType).toBe('person')
  })

  it('"someone helps me" → person', () => {
    expect(classifyMeaningLocal('someone helps me').meaningType).toBe('person')
  })

  it('"right after eating" → time', () => {
    expect(classifyMeaningLocal('right after eating').meaningType).toBe('time')
  })

  it('"later" → time', () => {
    expect(classifyMeaningLocal('later').meaningType).toBe('time')
  })

  it('"in the morning" → time', () => {
    expect(classifyMeaningLocal('in the morning').meaningType).toBe('time')
  })

  it('"sometimes" → frequency', () => {
    expect(classifyMeaningLocal('sometimes').meaningType).toBe('frequency')
  })

  it('"usually" → frequency', () => {
    expect(classifyMeaningLocal('usually').meaningType).toBe('frequency')
  })

  it('"Yes, I do" → yes', () => {
    expect(classifyMeaningLocal('Yes, I do').meaningType).toBe('yes')
  })

  it('"No" → no', () => {
    expect(classifyMeaningLocal('No').meaningType).toBe('no')
  })

  it('"Not really" → no', () => {
    expect(classifyMeaningLocal('Not really').meaningType).toBe('no')
  })

  it('"I\'m fine, thank you" → social', () => {
    expect(classifyMeaningLocal("I'm fine, thank you").meaningType).toBe('social')
  })

  it('"I clean a farm" → object (no person/time match)', () => {
    const c = classifyMeaningLocal('I clean a farm')
    expect(c.meaningType).toBe('object')
  })

  it('empty → unclear', () => {
    expect(classifyMeaningLocal('').meaningType).toBe('unclear')
  })
})
