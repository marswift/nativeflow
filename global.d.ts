// ── next-intl type-safe messages ──
// Generates autocomplete for useTranslations() keys from the default locale.
type Messages = typeof import('./messages/ja.json')
declare interface IntlMessages extends Messages {}

// ── Environment variables ──
// Extend ProcessEnv only for vars actually used; do NOT use `declare module '*'`.
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY: string
    OPENAI_API_KEY: string
    NEXT_PUBLIC_LESSON_DEBUG?: string
    NEXT_PUBLIC_FF_I18N_ENABLED?: string
  }
}
