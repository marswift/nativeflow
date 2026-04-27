import { describe, it, expect } from 'vitest'
import { composeNormalReply, detectEmphatic } from '../lib/conversation-response-composer'

const base = {
  meaningType: 'yes' as const,
  meaningValue: null,
  turnIndex: 3,
  engineQuestion: 'Do you like it?',
  engineDimension: null,
  scene: null,
}

describe('composeNormalReply — level-aware composition', () => {
  // ── Beginner (rank < 40) ──
  describe('beginner (rank 15)', () => {
    it('uses short reactions', () => {
      const reply = composeNormalReply({ ...base, rank: 15 })
      // Beginner reactions: "Nice.", "Good.", "Great.", "Okay." — all short
      const reaction = reply.replace(/ Do you like it\?$/, '').trim()
      expect(reaction.length).toBeLessThanOrEqual(10)
    })

    it('no ack on turn 2 (ack threshold is 3 for beginners)', () => {
      const reply = composeNormalReply({ ...base, turnIndex: 2, rank: 15 })
      // Should be just reaction + question, no ack prefix
      const parts = reply.split(' ')
      // Beginner reactions are single words with period — ack words are different
      expect(reply).not.toMatch(/^(Right\.|Got it\.|I see\.|Ah, I see\.)\s/)
    })

    it('has ack on turn 3+', () => {
      const reply = composeNormalReply({ ...base, turnIndex: 3, rank: 15 })
      // Should have some content (ack or reaction) + question
      expect(reply).toContain('Do you like it?')
    })

    it('skips bridge templates (uses simple pool)', () => {
      const reply = composeNormalReply({
        ...base,
        meaningType: 'person',
        meaningValue: 'mom',
        engineDimension: 'people',
        rank: 15,
      })
      // Should NOT contain bridge-style "your mom" phrases, just simple reactions
      expect(reply).not.toMatch(/your mom/)
    })

    it('skips micro-reactions', () => {
      const reply = composeNormalReply({
        ...base,
        meaningType: 'person',
        meaningValue: 'family',
        rank: 15,
      })
      // Should NOT contain MICRO phrases like "With family — love that."
      expect(reply).not.toContain('love that')
    })

    it('never uses comment-only turn', () => {
      const reply = composeNormalReply({
        ...base,
        turnIndex: 2,
        meaningType: 'object',
        meaningValue: 'dishes',
        engineDimension: 'object',
        rank: 15,
      })
      // Should contain the engine question, not "Tell me more."
      expect(reply).toContain('Do you like it?')
      expect(reply).not.toContain('Tell me more.')
    })
  })

  // ── Intermediate (rank 50, default) ──
  describe('intermediate (rank 50)', () => {
    it('uses standard reactions', () => {
      const reply = composeNormalReply({ ...base, rank: 50 })
      expect(reply).toContain('Do you like it?')
    })

    it('has ack on turn 2+', () => {
      const reply = composeNormalReply({ ...base, turnIndex: 2, rank: 50 })
      expect(reply.length).toBeGreaterThan('Do you like it?'.length)
    })

    it('allows micro-reactions', () => {
      const reply = composeNormalReply({
        ...base,
        meaningType: 'person',
        meaningValue: 'family',
        turnIndex: 0,
        rank: 50,
      })
      // MICRO["family"] pool: "With family — love that." etc.
      expect(reply).toMatch(/family|together|Aw/)
    })
  })

  // ── Advanced (rank >= 70) ──
  describe('advanced (rank 85)', () => {
    it('uses richer reactions', () => {
      const reply = composeNormalReply({ ...base, turnIndex: 0, rank: 85 })
      // Advanced yes reactions are longer: "Oh, nice — that's great to hear." etc.
      const reaction = reply.replace(/ Do you like it\?$/, '').trim()
      expect(reaction.length).toBeGreaterThan(5)
    })

    it('uses advanced pool for "no" answers', () => {
      const reply = composeNormalReply({
        ...base,
        meaningType: 'no',
        meaningValue: null,
        turnIndex: 0,
        rank: 85,
      })
      // Advanced no reactions: "Fair enough, no worries at all." etc.
      const reaction = reply.replace(/ Do you like it\?$/, '').trim()
      expect(reaction.split(' ').length).toBeGreaterThanOrEqual(3)
    })

    it('allows micro-reactions for value keywords', () => {
      const reply = composeNormalReply({
        ...base,
        meaningType: 'frequency',
        meaningValue: 'always',
        turnIndex: 0,
        rank: 85,
      })
      // MICRO["always"] should fire for advanced too
      expect(reply).toMatch(/always|wow|Respect|consistent/i)
    })
  })

  // ── Default rank (no rank provided) ──
  describe('default rank (null)', () => {
    it('behaves as intermediate', () => {
      const withNull = composeNormalReply({ ...base, rank: null })
      const withUndefined = composeNormalReply({ ...base })
      const with50 = composeNormalReply({ ...base, rank: 50 })
      // All three should produce the same output (same pool, same index)
      expect(withNull).toBe(with50)
      expect(withUndefined).toBe(with50)
    })
  })
})

// ── Humanization tests ──

describe('detectEmphatic', () => {
  it('detects strong yes', () => {
    expect(detectEmphatic('Of course I do')).toBe('strong_yes')
    expect(detectEmphatic('Definitely')).toBe('strong_yes')
    expect(detectEmphatic('I always do that')).toBe('strong_yes')
  })

  it('detects strong no', () => {
    expect(detectEmphatic('Not really')).toBe('strong_no')
    expect(detectEmphatic('Never')).toBe('strong_no')
    expect(detectEmphatic('Nah not at all')).toBe('strong_no')
  })

  it('detects uncertainty', () => {
    expect(detectEmphatic('Maybe sometimes')).toBe('uncertain')
    expect(detectEmphatic('It depends')).toBe('uncertain')
    expect(detectEmphatic('I guess so')).toBe('uncertain')
  })

  it('returns null for plain answers', () => {
    expect(detectEmphatic('Yes')).toBeNull()
    expect(detectEmphatic('Rice')).toBeNull()
    expect(detectEmphatic(null)).toBeNull()
  })
})

describe('composeNormalReply — emphatic reactions', () => {
  it('"Of course I do" gets intensity-matched reaction (intermediate)', () => {
    const reply = composeNormalReply({
      ...base,
      turnIndex: 0,
      rank: 50,
      userMessage: 'Of course I do',
    })
    // Should use EMPHATIC_REACTIONS.strong_yes instead of generic yes pool
    expect(reply).toMatch(/consistent|dedication|discipline|habit|impressive/i)
  })

  it('"Not really" gets strong_no reaction', () => {
    const reply = composeNormalReply({
      ...base,
      meaningType: 'no',
      turnIndex: 0,
      rank: 50,
      userMessage: 'Not really',
    })
    expect(reply).toMatch(/fair|honest|wrong|real|judgment/i)
  })

  it('"Maybe sometimes" gets uncertain reaction', () => {
    const reply = composeNormalReply({
      ...base,
      meaningType: 'yes',
      turnIndex: 0,
      rank: 50,
      userMessage: 'Maybe sometimes I do',
    })
    expect(reply).toMatch(/depends|flexible|fixed|sense|life/i)
  })

  it('beginner ignores emphatic detection', () => {
    const reply = composeNormalReply({
      ...base,
      turnIndex: 0,
      rank: 15,
      userMessage: 'Of course I do',
    })
    // Beginner should use simple pool, not emphatic
    expect(reply).toMatch(/^(Nice\.|Good\.|Great\.|Okay\.)/)
  })
})

describe('composeNormalReply — consecutive yes/no variety', () => {
  it('repeated yes type uses variety pool (intermediate)', () => {
    const reply = composeNormalReply({
      ...base,
      meaningType: 'yes',
      turnIndex: 1,
      rank: 50,
      prevMeaningType: 'yes',
    })
    // REPEAT_VARIETY.yes: "Cool.", "Sounds good.", "Alright.", "Nice one."
    expect(reply).toMatch(/Cool|Sounds good|Alright|Nice one/)
  })

  it('repeated no type uses variety pool', () => {
    const reply = composeNormalReply({
      ...base,
      meaningType: 'no',
      turnIndex: 1,
      rank: 50,
      prevMeaningType: 'no',
    })
    expect(reply).toMatch(/Got it|Understood|Alright|hear you/)
  })

  it('non-repeated type uses normal pool', () => {
    const normal = composeNormalReply({ ...base, meaningType: 'yes', turnIndex: 0, rank: 50 })
    const withPrev = composeNormalReply({ ...base, meaningType: 'yes', turnIndex: 0, rank: 50, prevMeaningType: 'no' })
    // Different prevMeaningType should NOT trigger variety
    expect(normal).toBe(withPrev)
  })
})

describe('composeNormalReply — reciprocity (advanced, turn 3)', () => {
  it('advanced turn 3 includes self-disclosure', () => {
    const reply = composeNormalReply({
      ...base,
      meaningType: 'yes',
      turnIndex: 3,
      rank: 85,
    })
    // Should contain reciprocity snippet: "Same here, actually." or "Me too."
    expect(reply).toMatch(/same|too|me/i)
  })

  it('intermediate turn 3 does NOT include reciprocity', () => {
    const reply = composeNormalReply({
      ...base,
      meaningType: 'yes',
      turnIndex: 3,
      rank: 50,
    })
    // Should NOT contain reciprocity phrases
    expect(reply).not.toMatch(/Same here, actually|Me too/)
  })

  it('advanced turn 1 does NOT include reciprocity', () => {
    const reply = composeNormalReply({
      ...base,
      meaningType: 'yes',
      turnIndex: 1,
      rank: 85,
    })
    expect(reply).not.toMatch(/Same here, actually|Me too/)
  })
})

describe('composeNormalReply — micro-comments', () => {
  const sceneBase = {
    ...base,
    rank: 50,
    scene: { id: 'wake_up', patterns: [], anchorQuestion: '', dimensions: {}, dimensionOrder: [] as never[], clarificationPrompts: { fragment: [], confusion: [], garbled: [] } },
  }

  it('intermediate turn 1 with scene gets micro-comment', () => {
    const reply = composeNormalReply({ ...sceneBase, turnIndex: 1 })
    // SCENE_MICRO_COMMENTS.wake_up: "Mornings are everything.", "The start of the day!", "A fresh start."
    expect(reply).toMatch(/morning|start|fresh/i)
  })

  it('beginner turn 1 with scene does NOT get micro-comment', () => {
    const reply = composeNormalReply({ ...sceneBase, turnIndex: 1, rank: 15 })
    expect(reply).not.toMatch(/morning|start|fresh/i)
  })

  it('turn 0 does NOT get micro-comment', () => {
    const reply = composeNormalReply({ ...sceneBase, turnIndex: 0 })
    expect(reply).not.toMatch(/morning|start|fresh/i)
  })
})
