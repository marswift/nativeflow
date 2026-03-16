/**
 * Home/landing UI copy for the NativeFlow MVP.
 * Japanese only; structure is ready for future i18n.
 * UI-independent; consumed by app/page.tsx or other home UI.
 */

export type HomeCopy = {
  tagline: string
  description: string
  ctaPrimary: string
  supabaseLabel: string
  status: {
    checking: string
    success: string
    failure: string
  }
}

/** Japanese home copy. Use this in the home page until language switching is added. */
export const HOME_COPY_JA: HomeCopy = {
  tagline: 'AIと話すだけで、英語が口から出てくる。',
  description: `日常で使う英語が自然と身につきます。`,
  ctaPrimary: '無料ではじめる',
  supabaseLabel: 'Supabase',
  status: {
    checking: '接続を確認中...',
    success: '接続しました',
    failure: '接続に失敗しました',
  },
}
