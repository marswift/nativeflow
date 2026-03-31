/**
 * Mock lesson source for API/hooks. No DB. Replace with catalog or API when ready.
 */

import type { Lesson } from '@/lib/lesson/lesson-types'

export function getLessonById(lessonId: string): Lesson | null {
  const trimmed = lessonId.trim()
  if (trimmed === '') return null
  const sceneId = `scene-${trimmed}`
  const phraseId = `phrase-${trimmed}`
  return {
    id: trimmed,
    slug: trimmed,
    title: '',
    description: '',
    targetLanguage: 'en',
    supportLanguage: 'ja',
    cefrLevel: null,
    status: 'draft',
    scenes: [
      {
        id: sceneId,
        lessonId: trimmed,
        kind: 'intro',
        key: 'wake_up',
        title: '',
        description: '',
        order: 0,
        phrases: [
          {
            id: phraseId,
            sceneId,
            text: '',
            translation: '',
            hint: null,
            order: 0,
            imageUrl: null,
            imagePrompt: null,
            audioUrl: null,
            audioVoice: null,
          },
        ],
      },
    ],
  }
}
