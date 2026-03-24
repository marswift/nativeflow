'use client'

import { useEffect, useState } from 'react'

const COPY = {
  en: {
    title: 'NativeFlow',
    tagline: 'Speak with AI. Learn like a native.',
  },
  ja: {
    title: 'NativeFlow',
    tagline: 'AIと話して、ネイティブのように学ぶ。',
  },
}

/** Presentational header for the lesson page (branding line). */
export function LessonPageHeader() {
  const [lang, setLang] = useState<'en' | 'ja'>('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ui_language_code')
      if (stored === 'ja') setLang('ja')
    } catch {}
  }, [])

  const copy = COPY[lang]

  return (
    <header>
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">{copy.title}</h1>
      <p className="mt-1 text-[#5c5c5c]">{copy.tagline}</p>
    </header>
  )
}
