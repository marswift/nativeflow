import { describe, it, expect } from 'vitest'
import { validateSlot, hasPastContextMismatch } from '../lib/conversation-slot-filler'

// Minimal SlotDefinition stub for people-domain tests
const peopleSlotDef = {
  accept: new Set(['alone', 'myself', 'family', 'mom', 'mother', 'dad', 'father', 'brother', 'sister', 'husband', 'wife', 'friend', 'friends', 'together', 'someone', 'nobody']),
  acceptYesNo: false,
  repairTemplates: ['Do you clean up alone or with someone?'],
}

const peopleQuestion = 'Do you clean up alone or with someone?'

describe('hasPastContextMismatch', () => {
  // ── Should detect past context ──
  it('"I grew up alone." → true', () => {
    expect(hasPastContextMismatch('I grew up alone.')).toBe(true)
  })

  it('"I lived alone before." → true', () => {
    expect(hasPastContextMismatch('I lived alone before.')).toBe(true)
  })

  it('"I was alone yesterday." → true', () => {
    expect(hasPastContextMismatch('I was alone yesterday.')).toBe(true)
  })

  it('"I used to live with my family." → true', () => {
    expect(hasPastContextMismatch('I used to live with my family.')).toBe(true)
  })

  it('"I was born in Tokyo." → true', () => {
    expect(hasPastContextMismatch('I was born in Tokyo.')).toBe(true)
  })

  it('"I used to be alone." → true', () => {
    expect(hasPastContextMismatch('I used to be alone.')).toBe(true)
  })

  // ── Should NOT flag valid present-tense answers ──
  it('"I clean up alone." → false', () => {
    expect(hasPastContextMismatch('I clean up alone.')).toBe(false)
  })

  it('"I usually do it alone." → false', () => {
    expect(hasPastContextMismatch('I usually do it alone.')).toBe(false)
  })

  it('"I do it with my family." → false', () => {
    expect(hasPastContextMismatch('I do it with my family.')).toBe(false)
  })

  it('"with my mom" → false', () => {
    expect(hasPastContextMismatch('with my mom')).toBe(false)
  })

  it('"by myself" → false (2 words, bare keyword)', () => {
    expect(hasPastContextMismatch('by myself')).toBe(false)
  })

  it('"alone" → false (1 word, bare keyword)', () => {
    expect(hasPastContextMismatch('alone')).toBe(false)
  })
})

describe('validateSlot — past context rejection with slotSchema', () => {
  it('"I grew up alone." is invalid for people slot', () => {
    const result = validateSlot('person', 'I grew up alone.', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('mismatch')
  })

  it('"I lived alone before." is invalid for people slot', () => {
    const result = validateSlot('person', 'I lived alone before.', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('mismatch')
  })

  it('"I was alone yesterday." is invalid for people slot', () => {
    const result = validateSlot('person', 'I was alone yesterday.', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('mismatch')
  })

  // ── Valid answers must still pass ──
  it('"alone" remains valid (bare keyword)', () => {
    const result = validateSlot('person', 'alone', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(true)
  })

  it('"by myself" remains valid', () => {
    const result = validateSlot('person', 'by myself', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(true)
  })

  it('"with my family" remains valid', () => {
    const result = validateSlot('person', 'with my family', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(true)
  })

  it('"with my mom" remains valid', () => {
    const result = validateSlot('person', 'with my mom', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(true)
  })

  it('"I clean up alone." remains valid', () => {
    const result = validateSlot('person', 'I clean up alone.', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(true)
  })

  it('"I usually do it by myself." remains valid', () => {
    const result = validateSlot('person', 'I usually do it by myself.', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(true)
  })

  it('"I do it with my family." remains valid', () => {
    const result = validateSlot('person', 'I do it with my family.', peopleQuestion, peopleSlotDef)
    expect(result.valid).toBe(true)
  })
})

describe('validateSlot — past context rejection in generic fallback', () => {
  // Generic fallback (no slotDef) — only validates object meaningType
  const whoQuestion = 'Do you eat alone or with someone?'

  it('"I grew up alone." is invalid in generic people domain', () => {
    const result = validateSlot('object', 'I grew up alone.', whoQuestion, null)
    expect(result.valid).toBe(false)
  })

  it('"I clean up alone." remains valid in generic people domain', () => {
    const result = validateSlot('object', 'I clean up alone.', whoQuestion, null)
    expect(result.valid).toBe(true)
  })
})
