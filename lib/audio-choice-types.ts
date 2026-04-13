/**
 * Audio Choice Stage — Types for non-English response stage
 *
 * Used when typing is disabled. The learner selects from audio options
 * rather than typing text. No romanization is shown.
 *
 * Learning order: sound → meaning → native script exposure (after answer)
 */

export type AudioChoiceOption = {
  /** TTS audio URL for this option */
  audioUrl: string
  /** Native script text (hidden before answer, shown after) */
  textNative?: string
  /** Translation / meaning in learner's UI language (shown after answer) */
  translation?: string
  /** Whether this is the correct option */
  isCorrect: boolean
}

export type AudioChoiceItem = {
  /** Situation/meaning prompt shown to the learner (in UI language) */
  promptTranslation: string
  /** 3 audio options — one correct, two distractors */
  options: AudioChoiceOption[]
}

export type AudioChoiceState = {
  /** Index of currently selected option (null = none selected) */
  selectedIndex: number | null
  /** Whether the learner has confirmed their answer */
  hasAnswered: boolean
  /** Whether the selected answer was correct (null = not yet answered) */
  isCorrect: boolean | null
}

/**
 * Create initial audio choice state.
 */
export function createInitialAudioChoiceState(): AudioChoiceState {
  return {
    selectedIndex: null,
    hasAnswered: false,
    isCorrect: null,
  }
}

/**
 * Judge an audio choice answer.
 */
export function judgeAudioChoice(
  item: AudioChoiceItem,
  selectedIndex: number,
): { isCorrect: boolean; correctIndex: number } {
  const correctIndex = item.options.findIndex((o) => o.isCorrect)
  return {
    isCorrect: selectedIndex === correctIndex,
    correctIndex,
  }
}
