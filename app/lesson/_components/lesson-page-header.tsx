'use client'

const BRAND_TITLE = 'NativeFlow'
const BRAND_TAGLINE = 'Speak with AI. Learn like a native.'

/** Presentational header for the lesson page (branding line). */
export function LessonPageHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">{BRAND_TITLE}</h1>
      <p className="mt-1 text-[#5c5c5c]">{BRAND_TAGLINE}</p>
    </header>
  )
}
