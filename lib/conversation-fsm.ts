/**
 * Conversation FSM — single phase variable replaces scattered booleans.
 *
 * Pure functions, no React dependency. Used by AiConversationPlayer via useReducer.
 *
 * Guarantees:
 * - Text never appears before audio starts (no gap between ready_to_speak → speaking)
 * - Closing never fires twice (done rejects all events except RESET)
 * - Invalid transitions are silent no-ops (return current state unchanged)
 */

export type ConvPhase =
  | 'idle'              // Not started — show start button
  | 'speaking'          // AI audio playing (opener or reply)
  | 'waiting_for_user'  // Audio finished, user's turn to record
  | 'recording'         // Microphone active
  | 'recognizing'       // STT in-flight (aiThinking also true visually)
  | 'thinking'          // API call in-flight (STT done)
  | 'ready_to_speak'    // Reply received, 400ms auto-advance pending
  | 'wrapping'          // Final turn: closing audio playing
  | 'done'              // Conversation complete
  | 'error'             // Empty recording or failure — user can retry

export type ConvEvent =
  | { type: 'START' }
  | { type: 'AUDIO_ENDED' }
  | { type: 'AUDIO_ERROR' }
  | { type: 'RECORD_START' }
  | { type: 'RECORD_STOP' }
  | { type: 'STT_RESULT'; transcript: string }
  | { type: 'STT_EMPTY' }
  | { type: 'REPLY_READY'; reply: string; isFinal: boolean }
  | { type: 'ADVANCE' }
  | { type: 'RETRY' }
  | { type: 'RESET' }

export type ConvState = {
  phase: ConvPhase
  /** Pre-fetched AI reply text, consumed on ADVANCE */
  nextReply: string | null
  /** Whether REPLY_READY indicated this is the final turn */
  isFinalTurn: boolean
}

export function createConvState(): ConvState {
  return { phase: 'idle', nextReply: null, isFinalTurn: false }
}

/**
 * Pure transition function. Returns new state or current state (no-op) for invalid events.
 */
export function convTransition(state: ConvState, event: ConvEvent): ConvState {
  const { phase } = state

  switch (event.type) {
    case 'START':
      if (phase !== 'idle') return state
      return { ...state, phase: 'speaking' }

    case 'AUDIO_ENDED':
      if (phase === 'speaking') return { ...state, phase: 'waiting_for_user' }
      if (phase === 'wrapping') return { ...state, phase: 'done', nextReply: null }
      return state

    case 'AUDIO_ERROR':
      // Graceful: treat as audio ended
      if (phase === 'speaking') return { ...state, phase: 'waiting_for_user' }
      if (phase === 'wrapping') return { ...state, phase: 'done', nextReply: null }
      return state

    case 'RECORD_START':
      if (phase !== 'waiting_for_user' && phase !== 'error') return state
      return { ...state, phase: 'recording' }

    case 'RECORD_STOP':
      if (phase !== 'recording') return state
      return { ...state, phase: 'recognizing' }

    case 'STT_RESULT':
      if (phase !== 'recognizing') return state
      return { ...state, phase: 'thinking' }

    case 'STT_EMPTY':
      if (phase !== 'recognizing') return state
      return { ...state, phase: 'error' }

    case 'REPLY_READY':
      if (phase !== 'thinking' && phase !== 'recognizing') return state
      return { ...state, phase: 'ready_to_speak', nextReply: event.reply, isFinalTurn: event.isFinal }

    case 'ADVANCE':
      if (phase !== 'ready_to_speak') return state
      // Transition to speaking or wrapping depending on final turn
      return {
        ...state,
        phase: state.isFinalTurn ? 'wrapping' : 'speaking',
      }

    case 'RETRY':
      if (phase !== 'error' && phase !== 'ready_to_speak') return state
      return { ...state, phase: 'waiting_for_user', nextReply: null, isFinalTurn: false }

    case 'RESET':
      return createConvState()

    default:
      return state
  }
}

// ── Helpers for render guards ──

/** User can press the record button */
export function canRecord(phase: ConvPhase): boolean {
  return phase === 'waiting_for_user' || phase === 'error'
}

/** Auto-advance timer should fire */
export function canAdvance(phase: ConvPhase): boolean {
  return phase === 'ready_to_speak'
}

/** It's the user's turn (show "your turn" status, enable mic) */
export function isUserTurn(phase: ConvPhase): boolean {
  return phase === 'waiting_for_user' || phase === 'error' || phase === 'recording'
}

/** AI is "thinking" — show thinking indicator */
export function isAiProcessing(phase: ConvPhase): boolean {
  return phase === 'recognizing' || phase === 'thinking'
}

/** AI audio is playing */
export function isAiSpeaking(phase: ConvPhase): boolean {
  return phase === 'speaking' || phase === 'wrapping'
}

/** Conversation is finished */
export function isConvDone(phase: ConvPhase): boolean {
  return phase === 'done'
}

/** Reply is ready but not yet playing — hide text, show "speaking..." indicator */
export function isReadyToSpeak(phase: ConvPhase): boolean {
  return phase === 'ready_to_speak'
}
