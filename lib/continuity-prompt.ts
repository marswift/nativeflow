import type { PromptAssemblyResult } from '@/lib/prompt-assembly-types'

const EMPTY_FALLBACK =
  'There is no important prior dialogue yet. Start naturally from the current situation.'

const MAX_TURNS_SUMMARY = 6

function normalizeSpeaker(speaker: string): string {
  const s = speaker.toLowerCase()
  if (s === 'learner') return 'user'
  if (s === 'assistant' || s === 'ai') return 'assistant'
  return speaker
}

export function buildContinuityPrompt(
  promptAssemblyResult: PromptAssemblyResult
): string {
  const continuity = promptAssemblyResult.memory.continuity
  const recentTurns = continuity.recentTurns ?? []
  if (recentTurns.length === 0) {
    return EMPTY_FALLBACK
  }
  const recent = recentTurns.slice(-MAX_TURNS_SUMMARY)
  const summary = recent
    .map(
      (t) =>
        `${normalizeSpeaker(t.speaker)}: ${(t.text || '').trim() || '(empty)'}`
    )
    .join('\n')
  return [
    'This is an ongoing conversation. Stay consistent with the recent dialogue and do not repeat yourself unnecessarily.',
    `Recent turns:\n${summary}`,
  ].join(' ')
}
