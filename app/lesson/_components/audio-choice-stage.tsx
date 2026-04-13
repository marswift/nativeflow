'use client'

/**
 * Audio Choice Stage — Non-English response stage
 *
 * Displays a meaning-based prompt with 3 audio options.
 * No romanization. Native script shown only after answer.
 *
 * Learning order: sound → meaning → native script exposure
 */

import { useCallback, useRef, useState } from 'react'
import {
  type AudioChoiceItem,
  type AudioChoiceState,
  createInitialAudioChoiceState,
  judgeAudioChoice,
} from '../../../lib/audio-choice-types'

type AudioChoiceStageProps = {
  item: AudioChoiceItem
  onComplete: (isCorrect: boolean) => void
}

export default function AudioChoiceStage({ item, onComplete }: AudioChoiceStageProps) {
  const [state, setState] = useState<AudioChoiceState>(createInitialAudioChoiceState)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playAudio = useCallback((url: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play().catch(() => {})
    } catch {
      // Non-blocking
    }
  }, [])

  const handleSelect = useCallback((index: number) => {
    if (state.hasAnswered) return
    setState((s) => ({ ...s, selectedIndex: index }))
    // Auto-play the selected option
    const option = item.options[index]
    if (option?.audioUrl) playAudio(option.audioUrl)
  }, [state.hasAnswered, item.options, playAudio])

  const handleConfirm = useCallback(() => {
    if (state.selectedIndex === null || state.hasAnswered) return
    const { isCorrect, correctIndex } = judgeAudioChoice(item, state.selectedIndex)
    setState({ selectedIndex: state.selectedIndex, hasAnswered: true, isCorrect })

    // If incorrect, play the correct option after a brief delay
    if (!isCorrect) {
      const correctOption = item.options[correctIndex]
      if (correctOption?.audioUrl) {
        setTimeout(() => playAudio(correctOption.audioUrl), 600)
      }
    }

    // Notify parent after reveal delay
    setTimeout(() => onComplete(isCorrect), isCorrect ? 1000 : 2000)
  }, [state.selectedIndex, state.hasAnswered, item, playAudio, onComplete])

  const correctIndex = item.options.findIndex((o) => o.isCorrect)

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* Prompt */}
      <p className="text-center text-lg font-bold text-[#1a1a2e]">
        {item.promptTranslation}
      </p>
      <p className="mt-1 text-center text-xs text-[#7b7b94]">
        音声を聞いて正しいものを選んでください
      </p>

      {/* Options */}
      <div className="mt-6 flex flex-col gap-3">
        {item.options.map((option, i) => {
          const isSelected = state.selectedIndex === i
          const isCorrectOption = option.isCorrect
          const showResult = state.hasAnswered

          let borderColor = 'border-[#E8E4DF]'
          let bgColor = 'bg-white'
          if (isSelected && !showResult) {
            borderColor = 'border-blue-400'
            bgColor = 'bg-blue-50'
          }
          if (showResult && isCorrectOption) {
            borderColor = 'border-[#22c55e]'
            bgColor = 'bg-[#F0FDF4]'
          }
          if (showResult && isSelected && !isCorrectOption) {
            borderColor = 'border-[#ef4444]'
            bgColor = 'bg-red-50'
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={state.hasAnswered}
              className={`flex items-center gap-3 rounded-xl border-2 ${borderColor} ${bgColor} px-4 py-3 transition active:scale-[0.98]`}
            >
              {/* Play button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (option.audioUrl) playAudio(option.audioUrl)
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f172a] text-white"
              >
                🔊
              </button>

              <div className="flex-1 text-left">
                {/* Before answer: show only option number */}
                {!showResult && (
                  <span className="text-sm font-semibold text-[#1a1a2e]">
                    {`Option ${i + 1}`}
                  </span>
                )}

                {/* After answer: reveal native script + meaning */}
                {showResult && (
                  <>
                    {option.textNative && (
                      <p className="text-base font-bold text-[#1a1a2e]">
                        {option.textNative}
                      </p>
                    )}
                    {option.translation && (
                      <p className="text-xs text-[#7b7b94]">
                        {option.translation}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Result indicator */}
              {showResult && isCorrectOption && (
                <span className="text-lg">✓</span>
              )}
              {showResult && isSelected && !isCorrectOption && (
                <span className="text-lg">✗</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Confirm button */}
      {!state.hasAnswered && state.selectedIndex !== null && (
        <button
          type="button"
          onClick={handleConfirm}
          className="mx-auto mt-6 block rounded-xl bg-blue-500 px-8 py-3 text-sm font-bold text-white transition hover:bg-blue-600 active:scale-[0.97]"
        >
          決定
        </button>
      )}

      {/* Result message */}
      {state.hasAnswered && (
        <div className="mt-4 text-center">
          {state.isCorrect ? (
            <p className="text-lg font-black text-[#22c55e]">正解!</p>
          ) : (
            <>
              <p className="text-lg font-black text-[#F5A623]">もう一度!</p>
              {item.options[correctIndex]?.textNative && (
                <p className="mt-1 text-sm text-[#7b7b94]">
                  正解: <span className="font-bold text-[#1a1a2e]">{item.options[correctIndex].textNative}</span>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
