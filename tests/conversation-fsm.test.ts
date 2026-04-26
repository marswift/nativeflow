import { describe, it, expect } from 'vitest'
import {
  createConvState,
  convTransition,
  canRecord,
  canAdvance,
  isUserTurn,
  isAiProcessing,
  isAiSpeaking,
  isConvDone,
  isReadyToSpeak,
  type ConvState,
  type ConvEvent,
} from '../lib/conversation-fsm'

// ── Helper: chain multiple events through the FSM ──
function chain(events: ConvEvent[], initial?: ConvState): ConvState {
  return events.reduce(convTransition, initial ?? createConvState())
}

describe('conversation-fsm', () => {
  // ── 1. Opener path ──
  describe('opener path: idle -> START -> speaking', () => {
    it('transitions idle to speaking on START', () => {
      const s = convTransition(createConvState(), { type: 'START' })
      expect(s.phase).toBe('speaking')
    })

    it('rejects START when not idle', () => {
      const speaking: ConvState = { phase: 'speaking', nextReply: null, isFinalTurn: false }
      const s = convTransition(speaking, { type: 'START' })
      expect(s.phase).toBe('speaking')
      expect(s).toBe(speaking) // exact same reference = no-op
    })
  })

  // ── 2. Audio finished path ──
  describe('audio finished: speaking -> AUDIO_ENDED -> waiting_for_user', () => {
    it('transitions speaking to waiting_for_user', () => {
      const s = chain([{ type: 'START' }, { type: 'AUDIO_ENDED' }])
      expect(s.phase).toBe('waiting_for_user')
    })

    it('AUDIO_ERROR also transitions speaking to waiting_for_user', () => {
      const s = chain([{ type: 'START' }, { type: 'AUDIO_ERROR' }])
      expect(s.phase).toBe('waiting_for_user')
    })

    it('AUDIO_ENDED from wrapping transitions to done', () => {
      const wrapping: ConvState = { phase: 'wrapping', nextReply: 'bye', isFinalTurn: true }
      const s = convTransition(wrapping, { type: 'AUDIO_ENDED' })
      expect(s.phase).toBe('done')
      expect(s.nextReply).toBeNull()
    })

    it('AUDIO_ENDED is no-op in waiting_for_user', () => {
      const waiting: ConvState = { phase: 'waiting_for_user', nextReply: null, isFinalTurn: false }
      const s = convTransition(waiting, { type: 'AUDIO_ENDED' })
      expect(s).toBe(waiting)
    })
  })

  // ── 3. Recording path ──
  describe('recording: waiting_for_user -> RECORD_START -> recording -> RECORD_STOP -> recognizing', () => {
    it('full recording path', () => {
      const s = chain([
        { type: 'START' },
        { type: 'AUDIO_ENDED' },
        { type: 'RECORD_START' },
      ])
      expect(s.phase).toBe('recording')

      const s2 = convTransition(s, { type: 'RECORD_STOP' })
      expect(s2.phase).toBe('recognizing')
    })

    it('allows RECORD_START from error phase', () => {
      const err: ConvState = { phase: 'error', nextReply: null, isFinalTurn: false }
      const s = convTransition(err, { type: 'RECORD_START' })
      expect(s.phase).toBe('recording')
    })

    it('RECORD_STOP is no-op if not recording', () => {
      const waiting: ConvState = { phase: 'waiting_for_user', nextReply: null, isFinalTurn: false }
      const s = convTransition(waiting, { type: 'RECORD_STOP' })
      expect(s).toBe(waiting)
    })
  })

  // ── 4. Reply path ──
  describe('reply: recognizing -> STT_RESULT -> thinking -> REPLY_READY -> ready_to_speak', () => {
    it('full reply path', () => {
      const recognizing: ConvState = { phase: 'recognizing', nextReply: null, isFinalTurn: false }
      const s1 = convTransition(recognizing, { type: 'STT_RESULT', transcript: 'hello' })
      expect(s1.phase).toBe('thinking')

      const s2 = convTransition(s1, { type: 'REPLY_READY', reply: 'Hi there!', isFinal: false })
      expect(s2.phase).toBe('ready_to_speak')
      expect(s2.nextReply).toBe('Hi there!')
      expect(s2.isFinalTurn).toBe(false)
    })

    it('STT_EMPTY transitions to error', () => {
      const recognizing: ConvState = { phase: 'recognizing', nextReply: null, isFinalTurn: false }
      const s = convTransition(recognizing, { type: 'STT_EMPTY' })
      expect(s.phase).toBe('error')
    })

    it('REPLY_READY also works from recognizing (fast path for final turn)', () => {
      const recognizing: ConvState = { phase: 'recognizing', nextReply: null, isFinalTurn: false }
      const s = convTransition(recognizing, { type: 'REPLY_READY', reply: 'Bye!', isFinal: true })
      expect(s.phase).toBe('ready_to_speak')
      expect(s.nextReply).toBe('Bye!')
      expect(s.isFinalTurn).toBe(true)
    })

    it('REPLY_READY is no-op from speaking', () => {
      const speaking: ConvState = { phase: 'speaking', nextReply: null, isFinalTurn: false }
      const s = convTransition(speaking, { type: 'REPLY_READY', reply: 'x', isFinal: false })
      expect(s).toBe(speaking)
    })
  })

  // ── 5. Final close path ──
  describe('final close: ready_to_speak(final) -> ADVANCE -> wrapping -> AUDIO_ENDED -> done', () => {
    it('ADVANCE with isFinalTurn transitions to wrapping', () => {
      const ready: ConvState = { phase: 'ready_to_speak', nextReply: 'See you!', isFinalTurn: true }
      const s = convTransition(ready, { type: 'ADVANCE' })
      expect(s.phase).toBe('wrapping')
    })

    it('ADVANCE without isFinalTurn transitions to speaking', () => {
      const ready: ConvState = { phase: 'ready_to_speak', nextReply: 'Nice!', isFinalTurn: false }
      const s = convTransition(ready, { type: 'ADVANCE' })
      expect(s.phase).toBe('speaking')
    })

    it('wrapping -> AUDIO_ENDED -> done clears nextReply', () => {
      const wrapping: ConvState = { phase: 'wrapping', nextReply: 'See you!', isFinalTurn: true }
      const s = convTransition(wrapping, { type: 'AUDIO_ENDED' })
      expect(s.phase).toBe('done')
      expect(s.nextReply).toBeNull()
    })

    it('full 5-turn happy path ends in done', () => {
      const turn = (s: ConvState, isFinal: boolean): ConvState => chain([
        { type: 'AUDIO_ENDED' },
        { type: 'RECORD_START' },
        { type: 'RECORD_STOP' },
        { type: 'STT_RESULT', transcript: 'answer' },
        { type: 'REPLY_READY', reply: 'reply', isFinal },
        { type: 'ADVANCE' },
      ], s)

      let s = convTransition(createConvState(), { type: 'START' }) // speaking
      s = turn(s, false) // turn 1 → speaking
      s = turn(s, false) // turn 2 → speaking
      s = turn(s, false) // turn 3 → speaking
      s = turn(s, true)  // turn 4 (final) → wrapping
      expect(s.phase).toBe('wrapping')

      s = convTransition(s, { type: 'AUDIO_ENDED' })
      expect(s.phase).toBe('done')
    })
  })

  // ── 6. Invalid transition protection ──
  describe('invalid transitions are no-ops', () => {
    it('RECORD_START during speaking', () => {
      const s: ConvState = { phase: 'speaking', nextReply: null, isFinalTurn: false }
      expect(convTransition(s, { type: 'RECORD_START' })).toBe(s)
    })

    it('RECORD_START during thinking', () => {
      const s: ConvState = { phase: 'thinking', nextReply: null, isFinalTurn: false }
      expect(convTransition(s, { type: 'RECORD_START' })).toBe(s)
    })

    it('ADVANCE during thinking', () => {
      const s: ConvState = { phase: 'thinking', nextReply: null, isFinalTurn: false }
      expect(convTransition(s, { type: 'ADVANCE' })).toBe(s)
    })

    it('ADVANCE during done', () => {
      const s: ConvState = { phase: 'done', nextReply: null, isFinalTurn: false }
      expect(convTransition(s, { type: 'ADVANCE' })).toBe(s)
    })

    it('RECORD_START during done', () => {
      const s: ConvState = { phase: 'done', nextReply: null, isFinalTurn: false }
      expect(convTransition(s, { type: 'RECORD_START' })).toBe(s)
    })

    it('REPLY_READY during done', () => {
      const s: ConvState = { phase: 'done', nextReply: null, isFinalTurn: false }
      expect(convTransition(s, { type: 'REPLY_READY', reply: 'x', isFinal: false })).toBe(s)
    })

    it('START during done', () => {
      const s: ConvState = { phase: 'done', nextReply: null, isFinalTurn: false }
      expect(convTransition(s, { type: 'START' })).toBe(s)
    })

    it('RECORD_START during ready_to_speak', () => {
      const s: ConvState = { phase: 'ready_to_speak', nextReply: 'x', isFinalTurn: false }
      expect(convTransition(s, { type: 'RECORD_START' })).toBe(s)
    })

    it('RECORD_START during wrapping', () => {
      const s: ConvState = { phase: 'wrapping', nextReply: 'x', isFinalTurn: true }
      expect(convTransition(s, { type: 'RECORD_START' })).toBe(s)
    })

    it('STT_RESULT during idle', () => {
      const s = createConvState()
      expect(convTransition(s, { type: 'STT_RESULT', transcript: 'x' })).toBe(s)
    })
  })

  // ── 7. Reset path ──
  describe('RESET returns to idle from any phase', () => {
    const phases: ConvState[] = [
      { phase: 'idle', nextReply: null, isFinalTurn: false },
      { phase: 'speaking', nextReply: null, isFinalTurn: false },
      { phase: 'waiting_for_user', nextReply: null, isFinalTurn: false },
      { phase: 'recording', nextReply: null, isFinalTurn: false },
      { phase: 'recognizing', nextReply: null, isFinalTurn: false },
      { phase: 'thinking', nextReply: null, isFinalTurn: false },
      { phase: 'ready_to_speak', nextReply: 'reply', isFinalTurn: true },
      { phase: 'wrapping', nextReply: 'bye', isFinalTurn: true },
      { phase: 'done', nextReply: null, isFinalTurn: false },
      { phase: 'error', nextReply: null, isFinalTurn: false },
    ]

    for (const s of phases) {
      it(`RESET from ${s.phase}`, () => {
        const result = convTransition(s, { type: 'RESET' })
        expect(result.phase).toBe('idle')
        expect(result.nextReply).toBeNull()
        expect(result.isFinalTurn).toBe(false)
      })
    }
  })

  // ── 8. Retry path ──
  describe('RETRY returns to waiting_for_user', () => {
    it('from error', () => {
      const s: ConvState = { phase: 'error', nextReply: null, isFinalTurn: false }
      const r = convTransition(s, { type: 'RETRY' })
      expect(r.phase).toBe('waiting_for_user')
    })

    it('from ready_to_speak (user wants to redo)', () => {
      const s: ConvState = { phase: 'ready_to_speak', nextReply: 'x', isFinalTurn: false }
      const r = convTransition(s, { type: 'RETRY' })
      expect(r.phase).toBe('waiting_for_user')
      expect(r.nextReply).toBeNull()
      expect(r.isFinalTurn).toBe(false)
    })

    it('RETRY is no-op from speaking', () => {
      const s: ConvState = { phase: 'speaking', nextReply: null, isFinalTurn: false }
      expect(convTransition(s, { type: 'RETRY' })).toBe(s)
    })
  })

  // ── 9. Helper functions ──
  describe('helper functions', () => {
    it('canRecord', () => {
      expect(canRecord('waiting_for_user')).toBe(true)
      expect(canRecord('error')).toBe(true)
      expect(canRecord('speaking')).toBe(false)
      expect(canRecord('recording')).toBe(false)
      expect(canRecord('done')).toBe(false)
    })

    it('canAdvance', () => {
      expect(canAdvance('ready_to_speak')).toBe(true)
      expect(canAdvance('thinking')).toBe(false)
      expect(canAdvance('done')).toBe(false)
    })

    it('isUserTurn', () => {
      expect(isUserTurn('waiting_for_user')).toBe(true)
      expect(isUserTurn('error')).toBe(true)
      expect(isUserTurn('recording')).toBe(true)
      expect(isUserTurn('speaking')).toBe(false)
      expect(isUserTurn('done')).toBe(false)
    })

    it('isAiProcessing', () => {
      expect(isAiProcessing('recognizing')).toBe(true)
      expect(isAiProcessing('thinking')).toBe(true)
      expect(isAiProcessing('speaking')).toBe(false)
    })

    it('isAiSpeaking', () => {
      expect(isAiSpeaking('speaking')).toBe(true)
      expect(isAiSpeaking('wrapping')).toBe(true)
      expect(isAiSpeaking('thinking')).toBe(false)
    })

    it('isConvDone', () => {
      expect(isConvDone('done')).toBe(true)
      expect(isConvDone('wrapping')).toBe(false)
    })

    it('isReadyToSpeak', () => {
      expect(isReadyToSpeak('ready_to_speak')).toBe(true)
      expect(isReadyToSpeak('speaking')).toBe(false)
    })
  })

  // ── 10. State data integrity ──
  describe('state data integrity', () => {
    it('createConvState returns clean initial state', () => {
      const s = createConvState()
      expect(s.phase).toBe('idle')
      expect(s.nextReply).toBeNull()
      expect(s.isFinalTurn).toBe(false)
    })

    it('REPLY_READY stores reply and isFinal flag', () => {
      const s: ConvState = { phase: 'thinking', nextReply: null, isFinalTurn: false }
      const r = convTransition(s, { type: 'REPLY_READY', reply: 'Hello!', isFinal: true })
      expect(r.nextReply).toBe('Hello!')
      expect(r.isFinalTurn).toBe(true)
    })

    it('ADVANCE preserves nextReply for consumer', () => {
      const s: ConvState = { phase: 'ready_to_speak', nextReply: 'Next Q', isFinalTurn: false }
      const r = convTransition(s, { type: 'ADVANCE' })
      expect(r.nextReply).toBe('Next Q')
      expect(r.phase).toBe('speaking')
    })

    it('RETRY clears nextReply and isFinalTurn', () => {
      const s: ConvState = { phase: 'ready_to_speak', nextReply: 'stale', isFinalTurn: true }
      const r = convTransition(s, { type: 'RETRY' })
      expect(r.nextReply).toBeNull()
      expect(r.isFinalTurn).toBe(false)
    })
  })
})
