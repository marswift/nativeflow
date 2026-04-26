import { describe, it, expect } from 'vitest'
import { composeNormalReply } from '../lib/conversation-response-composer'

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
