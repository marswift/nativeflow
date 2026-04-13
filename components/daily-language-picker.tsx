'use client'

/**
 * Daily Language Picker — Choose today's study language
 *
 * Shown before study starts when user has multiple selected languages.
 * Sets the daily language lock.
 *
 * Rules:
 * - Shows only selected languages (max 2)
 * - Once chosen, language is locked until daily target is met
 * - If only 1 selected language, auto-selects it
 */

import { useState } from 'react'
import { TARGET_LANGUAGE_OPTIONS } from '@/lib/constants'
import type { SelectedLanguage } from '@/lib/language-selection'

type DailyLanguagePickerProps = {
  selectedLanguages: SelectedLanguage[]
  onChoose: (languageCode: string) => void
}

export default function DailyLanguagePicker({
  selectedLanguages,
  onChoose,
}: DailyLanguagePickerProps) {
  const [chosen, setChosen] = useState<string | null>(null)

  if (selectedLanguages.length === 0) return null

  // Auto-select if only 1 language
  if (selectedLanguages.length === 1) {
    return (
      <div className="mx-auto max-w-md px-6 py-12 text-center">
        <h2 className="text-xl font-black text-[#1a1a2e]">今日の学習を始めましょう</h2>
        <button
          type="button"
          onClick={() => onChoose(selectedLanguages[0].languageCode)}
          className="mx-auto mt-6 block rounded-xl bg-blue-500 px-8 py-3 text-base font-bold text-white transition hover:bg-blue-600"
        >
          学習を開始
        </button>
      </div>
    )
  }

  const getLangLabel = (code: string) =>
    TARGET_LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code

  return (
    <div className="mx-auto max-w-md px-6 py-12 text-center">
      <h2 className="text-xl font-black text-[#1a1a2e]">今学習する言語を選んでください</h2>
      <p className="mt-2 text-sm text-[#7b7b94]">
        今日の問題数が終わるまでは他の言語に切り替えられません
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {selectedLanguages.map((lang) => (
          <button
            key={lang.languageCode}
            type="button"
            onClick={() => setChosen(lang.languageCode)}
            className={`rounded-xl border-2 px-5 py-4 text-left transition ${
              chosen === lang.languageCode
                ? 'border-blue-400 bg-blue-50'
                : 'border-[#E8E4DF] bg-white hover:bg-[#FAF8F5]'
            }`}
          >
            <p className="text-base font-bold text-[#1a1a2e]">{getLangLabel(lang.languageCode)}</p>
            <p className="text-xs text-[#7b7b94]">{lang.currentLevel}</p>
          </button>
        ))}
      </div>

      {chosen && (
        <button
          type="button"
          onClick={() => onChoose(chosen)}
          className="mx-auto mt-6 block rounded-xl bg-blue-500 px-8 py-3 text-base font-bold text-white transition hover:bg-blue-600"
        >
          この言語で学習を開始
        </button>
      )}
    </div>
  )
}
