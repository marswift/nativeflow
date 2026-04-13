import { describe, it, expect } from 'vitest'
import { getOnboardingCopy } from '../onboarding-copy'

describe('getOnboardingCopy', () => {
  it('returns Japanese copy by default', () => {
    const copy = getOnboardingCopy(null)
    expect(copy.title).toBe('NativeFlow へようこそ')
    expect(copy.requiredMark).toBe('必須')
  })

  it('returns English copy for "en"', () => {
    const copy = getOnboardingCopy('en')
    expect(copy.title).toBe('Welcome to NativeFlow')
    expect(copy.requiredMark).toBe('required')
  })

  it('returns Korean copy for "ko"', () => {
    const copy = getOnboardingCopy('ko')
    expect(copy.title).toBe('NativeFlow에 오신 것을 환영합니다')
  })

  it('falls back to Japanese for unsupported locale', () => {
    const copy = getOnboardingCopy('de')
    expect(copy.title).toBe('NativeFlow へようこそ')
  })

  it('all locales have non-empty hint for uiLanguage', () => {
    const ja = getOnboardingCopy('ja')
    const en = getOnboardingCopy('en')
    const ko = getOnboardingCopy('ko')

    expect(ja.hints.uiLanguage.length).toBeGreaterThan(0)
    expect(en.hints.uiLanguage.length).toBeGreaterThan(0)
    expect(ko.hints.uiLanguage.length).toBeGreaterThan(0)
  })
})
