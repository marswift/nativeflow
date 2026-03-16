/**
 * Onboarding UI copy for the NativeFlow MVP.
 * Japanese only; structure is ready for future i18n.
 * UI-independent; consumed by app/onboarding/page.tsx or other onboarding UI.
 */

export type OnboardingCopy = {
  loading: string
  badge: string
  title: string
  intro: string
  requiredMark: string
  labels: {
    uiLanguage: string
    targetLanguage: string
    targetCountry: string
    regionOptional: string
    currentLevel: string
    speakByDeadline: string
    targetOutcome: string
  }
  hints: {
    uiLanguage: string
    targetCountry: string
    region: string
    currentLevel: string
    speakByDeadline: string
    targetOutcome: string
  }
  placeholders: {
    select: string
    region: string
    speakByDeadline: string
    targetOutcome: string
  }
  errors: {
    validationRequired: string
    loginRequired: string
    saveFailed: string
    saveError: string
  }
  buttons: {
    saving: string
    save: string
    createPlan: string
  }
}

/** Japanese onboarding copy. Use this in the onboarding page until language switching is added. */
export const ONBOARDING_COPY_JA: OnboardingCopy = {
  loading: '読み込み中...',
  badge: '最初の一歩',
  title: 'NativeFlow へようこそ',
  intro: '少しだけ教えてください。あなたに合った学習プランを作成します。',
  requiredMark: '必須',
  labels: {
    uiLanguage: 'アプリの表示言語',
    targetLanguage: '学習したい言語',
    targetCountry: '学習したい対象国',
    regionOptional: '学習したい対象地域（任意）',
    currentLevel: '現在のレベル',
    speakByDeadline: 'いつまでに話せるようになりたい？',
    targetOutcome: '目指したいこと',
  },
  hints: {
    uiLanguage: '',
    targetCountry: 'その地域特有の内容が盛り込まれます',
    region: 'その地域特有の内容が盛り込まれます。',
    currentLevel: '今の英語力に近いものを選んでください。',
    speakByDeadline: '目標時期から逆算して、毎日の学習量を提案します。',
    targetOutcome: '一言でOK。例：日常会話、仕事でメールなど。',
  },
  placeholders: {
    select: '選んでください',
    region: '例: california, Osaka',
    speakByDeadline: '例: 3ヶ月、1年、6 months',
    targetOutcome: '例: 日常会話で困らない、仕事でメールを書けるようになりたい',
  },
  errors: {
    validationRequired: '必須項目を入力してください。',
    loginRequired: 'ログインしてください。プロフィールを保存するにはサインインが必要です。',
    saveFailed: '保存に失敗しました。',
    saveError: '保存中にエラーが発生しました。',
  },
  buttons: {
    saving: '保存中...',
    save: '保存する',
    createPlan: 'マイ学習プランを作成する',
  },
}
