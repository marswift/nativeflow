import type { PromptAssemblyResult } from '@/lib/prompt-assembly-types'

const GENERIC_FALLBACK =
  'When appropriate, you may reference everyday culture, shared local experiences, familiar places, media, or routines that feel natural. Do not force nostalgic references. Keep references simple, natural, and beginner-friendly.'

export function buildGenerationalPrompt(
  promptAssemblyResult: PromptAssemblyResult
): string {
  const learner = promptAssemblyResult.memory.learner
  const country = learner.targetCountryCode?.trim()
  const region = learner.targetRegionSlug?.trim()
  const variant = learner.regionVariant
  const hasLocale = country || region || (variant && variant !== 'default')
  if (!hasLocale) {
    return GENERIC_FALLBACK
  }
  const parts: string[] = []
  if (country) parts.push(`country ${country}`)
  if (region) parts.push(`region ${region}`)
  if (variant && variant !== 'default') parts.push(`variant ${variant}`)
  const locale = parts.join(', ')
  return `For context: target locale is ${locale}. When appropriate, you may reference everyday culture, shared local experiences, familiar shops, media, trends, or routines that feel natural for people living in that place. Do not force nostalgic references. Keep references simple, natural, and beginner-friendly.`
}
