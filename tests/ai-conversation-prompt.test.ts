import { describe, it, expect } from 'vitest'
import { assembleReplyV25 } from '../lib/ai-conversation-prompt'

const defaultWrap = ['Nice talking with you. See you next time!']
const defaultClarification = {
  fragment: ['Could you say more?'],
  confusion: ['No problem. Could you say that again?'],
  garbled: ['Sorry, could you try again?'],
}

describe('assembleReplyV25 — early-turn closing prevention', () => {
  const closingLlm = {
    intent: 'closing' as const,
    meaning: { type: 'social' as const, value: null, confidence: 0.8 },
    answerToAi: null,
  }

  it('turn 0: "closing" intent produces follow-up, not goodbye', () => {
    const reply = assembleReplyV25(
      closingLlm, 0, 'What time do you wake up?', null,
      defaultWrap, defaultClarification, null, null,
      'I\'m fine, thank you.',
    )
    expect(reply).not.toContain('See you')
    expect(reply).not.toContain('Nice talking')
    expect(reply).toContain('What time do you wake up?')
  })

  it('turn 1: "closing" intent produces follow-up, not goodbye', () => {
    const reply = assembleReplyV25(
      closingLlm, 1, 'Do you use an alarm?', null,
      defaultWrap, defaultClarification, null, null,
      'Thank you, bye!',
    )
    expect(reply).not.toContain('See you')
    expect(reply).toContain('Do you use an alarm?')
  })

  it('turn 2: "closing" intent produces follow-up, not goodbye', () => {
    const reply = assembleReplyV25(
      closingLlm, 2, 'Is it hard to get up?', null,
      defaultWrap, defaultClarification, null, null,
      'Thanks, goodbye!',
    )
    expect(reply).not.toContain('Nice talking')
    expect(reply).toContain('Is it hard to get up?')
  })

  it('turn 3+: "closing" intent DOES produce goodbye', () => {
    const reply = assembleReplyV25(
      closingLlm, 3, 'Do you eat breakfast?', null,
      defaultWrap, defaultClarification, null, null,
      'Bye!',
    )
    expect(reply).toContain('Nice talking')
  })

  it('turn 4: engine wrap action produces goodbye', () => {
    const answerLlm = {
      intent: 'answer' as const,
      meaning: { type: 'yes' as const, value: null, confidence: 0.9 },
      answerToAi: null,
    }
    const reply = assembleReplyV25(
      answerLlm, 4, null, 'wrap',
      defaultWrap, defaultClarification, null, null, null,
    )
    expect(reply).toContain('Nice talking')
  })

  it('"I\'m fine, thank you" on turn 0 gets a question, not closing', () => {
    // This is the exact reported bug scenario
    const llm = {
      intent: 'closing' as const,
      meaning: { type: 'social' as const, value: 'fine', confidence: 0.7 },
      answerToAi: "I'm good too!",
    }
    const reply = assembleReplyV25(
      llm, 0, 'What time do you usually wake up?', null,
      defaultWrap, defaultClarification, null, null,
      "Hi, I'm fine, thank you.",
    )
    expect(reply).not.toContain('See you')
    expect(reply).not.toContain('Nice talking')
    expect(reply).toContain('What time do you usually wake up?')
  })
})
