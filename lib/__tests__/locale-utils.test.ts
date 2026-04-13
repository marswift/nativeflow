import { describe, it, expect } from 'vitest'
import { readUiLanguageFromStorage, writeUiLanguageToStorage } from '../auth-copy'

// Note: These tests run in Node environment.
// localStorage is not available — tests verify the null-safety path.

describe('readUiLanguageFromStorage', () => {
  it('returns null when window is undefined (server)', () => {
    expect(readUiLanguageFromStorage()).toBeNull()
  })
})

describe('writeUiLanguageToStorage', () => {
  it('does not throw when window is undefined (server)', () => {
    expect(() => writeUiLanguageToStorage('en')).not.toThrow()
  })
})
