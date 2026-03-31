import type { LessonBlock, LessonBlockItem } from '../lesson-engine' // 既存型に合わせる
import type { Scene, Phrase } from './lesson-types'

export function convertScenesToBlocks(scenes: Scene[]): LessonBlock[] {
  return scenes.map((scene) => {
    const items: LessonBlockItem[] = scene.phrases.map((phrase) => {
      return {
        id: crypto.randomUUID(),

        // UIで使う
        prompt: phrase.text,
        answer: phrase.text,

        // 🔥 音声
        audio_url: phrase.audioUrl ?? null,

        // 🔥 将来用
        audio_voice: phrase.audioVoice ?? null,

        // UI fallback
        sceneLabel: scene.title,
      } as unknown as LessonBlockItem
    })

    return {
      id: crypto.randomUUID(),
      title: scene.title,
      items,
      estimatedMinutes: Math.max(1, Math.ceil(items.length * 0.5)),
    } as unknown as LessonBlock
  })
}