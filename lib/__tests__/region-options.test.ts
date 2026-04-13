import { describe, it, expect } from 'vitest'
import { getRegionsForLanguage, getRegionByCode } from '../constants'
import { buildRegionPromptContext, regionSlugToLabel } from '../lesson-run-service'

describe('getRegionsForLanguage', () => {
  it('returns English regions for "en"', () => {
    const regions = getRegionsForLanguage('en')
    expect(regions.length).toBeGreaterThan(0)
    expect(regions.every((r) => r.languageCode === 'en')).toBe(true)
  })

  it('returns Korean regions for "ko"', () => {
    const regions = getRegionsForLanguage('ko')
    expect(regions.length).toBeGreaterThan(0)
    expect(regions.every((r) => r.languageCode === 'ko')).toBe(true)
  })

  it('returns empty array for unknown language', () => {
    const regions = getRegionsForLanguage('xx')
    expect(regions).toEqual([])
  })

  it('enabled English regions include expected slugs', () => {
    const enabled = getRegionsForLanguage('en').filter((r) => r.enabled)
    const codes = enabled.map((r) => r.code)
    expect(codes).toContain('en_us_new_york')
    expect(codes).toContain('en_gb_london')
    expect(codes).toContain('en_au_sydney')
  })
})

describe('getRegionByCode', () => {
  it('finds en_gb_london', () => {
    const region = getRegionByCode('en_gb_london')
    expect(region).toBeDefined()
    expect(region?.languageCode).toBe('en')
  })

  it('returns undefined for nonexistent slug', () => {
    expect(getRegionByCode('xx_yy_zz')).toBeUndefined()
  })
})

describe('buildRegionPromptContext', () => {
  it('returns null for null input', () => {
    expect(buildRegionPromptContext(null)).toBeNull()
  })

  it('returns null for unknown slug', () => {
    expect(buildRegionPromptContext('xx_yy_zz')).toBeNull()
  })

  it('returns prompt string for known slug', () => {
    const result = buildRegionPromptContext('en_gb_london')
    expect(result).toContain('London')
    expect(result).toContain('British English')
  })
})

describe('regionSlugToLabel', () => {
  it('returns null for null', () => {
    expect(regionSlugToLabel(null)).toBeNull()
  })

  it('returns label for known slug', () => {
    expect(regionSlugToLabel('en_gb_london')).toBe('London, UK')
  })
})
