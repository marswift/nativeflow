import { describe, it, expect } from 'vitest'
import { getAuthCopy } from '../auth-copy'

describe('getAuthCopy', () => {
  it('returns Japanese copy by default', () => {
    const copy = getAuthCopy(null)
    expect(copy.login.title).toBe('ログイン')
    expect(copy.signup.title).toBe('新規登録')
  })

  it('returns Japanese copy for undefined', () => {
    const copy = getAuthCopy(undefined)
    expect(copy.login.title).toBe('ログイン')
  })

  it('returns English copy for "en"', () => {
    const copy = getAuthCopy('en')
    expect(copy.login.title).toBe('Log in')
    expect(copy.signup.title).toBe('Sign up')
  })

  it('returns Korean copy for "ko"', () => {
    const copy = getAuthCopy('ko')
    expect(copy.login.title).toBe('로그인')
    expect(copy.signup.title).toBe('회원가입')
  })

  it('falls back to Japanese for unsupported locale', () => {
    const copy = getAuthCopy('fr')
    expect(copy.login.title).toBe('ログイン')
  })

  it('has consistent key structure across all locales', () => {
    const ja = getAuthCopy('ja')
    const en = getAuthCopy('en')
    const ko = getAuthCopy('ko')

    const jaLoginKeys = Object.keys(ja.login).sort()
    const enLoginKeys = Object.keys(en.login).sort()
    const koLoginKeys = Object.keys(ko.login).sort()

    expect(enLoginKeys).toEqual(jaLoginKeys)
    expect(koLoginKeys).toEqual(jaLoginKeys)
  })
})
