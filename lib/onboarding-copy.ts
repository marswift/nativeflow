/**
 * Onboarding UI copy for NativeFlow.
 * Japanese + English. Structure supports future expansion.
 * UI-independent; consumed by app/onboarding/page.tsx.
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
    uiLanguage: '後から設定で変更できます',
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

export const ONBOARDING_COPY_EN: OnboardingCopy = {
  loading: 'Loading...',
  badge: 'First step',
  title: 'Welcome to NativeFlow',
  intro: 'Tell us a little about yourself so we can create a personalized learning plan.',
  requiredMark: 'required',
  labels: {
    uiLanguage: 'App display language',
    targetLanguage: 'Language to learn',
    targetCountry: 'Target country',
    regionOptional: 'Target region (optional)',
    currentLevel: 'Current level',
    speakByDeadline: 'When do you want to be conversational?',
    targetOutcome: 'Your goal',
  },
  hints: {
    uiLanguage: 'You can change this later in settings',
    targetCountry: 'Content will reflect this region',
    region: 'Content will reflect this region.',
    currentLevel: 'Choose the closest match to your current ability.',
    speakByDeadline: "We'll calculate your daily study plan from this target.",
    targetOutcome: 'One line is fine. e.g. daily conversation, work emails',
  },
  placeholders: {
    select: 'Select',
    region: 'e.g. California, Osaka',
    speakByDeadline: 'e.g. 3 months, 1 year',
    targetOutcome: 'e.g. Hold everyday conversations, write work emails',
  },
  errors: {
    validationRequired: 'Please fill in all required fields.',
    loginRequired: 'Please log in. Sign-in is required to save your profile.',
    saveFailed: 'Failed to save.',
    saveError: 'An error occurred while saving.',
  },
  buttons: {
    saving: 'Saving...',
    save: 'Save',
    createPlan: 'Create my learning plan',
  },
}

export const ONBOARDING_COPY_KO: OnboardingCopy = {
  loading: '로딩 중...',
  badge: '첫 번째 단계',
  title: 'NativeFlow에 오신 것을 환영합니다',
  intro: '간단한 정보를 알려주시면 맞춤 학습 플랜을 만들어 드립니다.',
  requiredMark: '필수',
  labels: {
    uiLanguage: '앱 표시 언어',
    targetLanguage: '배우고 싶은 언어',
    targetCountry: '학습 대상 국가',
    regionOptional: '학습 대상 지역 (선택)',
    currentLevel: '현재 수준',
    speakByDeadline: '언제까지 말할 수 있게 되고 싶으세요?',
    targetOutcome: '목표',
  },
  hints: {
    uiLanguage: '나중에 설정에서 변경할 수 있습니다',
    targetCountry: '해당 지역 특유의 내용이 포함됩니다',
    region: '해당 지역 특유의 내용이 포함됩니다.',
    currentLevel: '현재 실력에 가장 가까운 것을 선택하세요.',
    speakByDeadline: '목표 시기를 기준으로 매일 학습량을 제안합니다.',
    targetOutcome: '한 줄이면 충분합니다. 예: 일상 회화, 업무 이메일',
  },
  placeholders: {
    select: '선택하세요',
    region: '예: California, Osaka',
    speakByDeadline: '예: 3개월, 1년',
    targetOutcome: '예: 일상 대화를 자유롭게 하고 싶다, 업무 이메일을 쓰고 싶다',
  },
  errors: {
    validationRequired: '필수 항목을 입력해 주세요.',
    loginRequired: '로그인해 주세요. 프로필을 저장하려면 로그인이 필요합니다.',
    saveFailed: '저장에 실패했습니다.',
    saveError: '저장 중 오류가 발생했습니다.',
  },
  buttons: {
    saving: '저장 중...',
    save: '저장',
    createPlan: '나의 학습 플랜 만들기',
  },
}

const ONBOARDING_COPY: Record<string, OnboardingCopy> = {
  ja: ONBOARDING_COPY_JA,
  en: ONBOARDING_COPY_EN,
  ko: ONBOARDING_COPY_KO,
}

/**
 * Returns onboarding copy for the given language code.
 * Falls back to Japanese for unsupported codes.
 */
export function getOnboardingCopy(lang: string | null | undefined): OnboardingCopy {
  if (lang === 'en') return ONBOARDING_COPY.en
  if (lang === 'ko') return ONBOARDING_COPY.ko
  return ONBOARDING_COPY.ja
}
