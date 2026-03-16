/**
 * Lesson UI copy for the NativeFlow MVP.
 * Japanese only; structure is ready for future i18n.
 * UI-independent; consumed by app/lesson/page.tsx or other lesson UI.
 */

export type LessonCopy = {
  loading: string
  pageErrors: {
    default: string
    profileLoadFailed: string
  }
  intro: {
    title: string
    body1: string
    body2: string
  }
  meta: {
    theme: string
    level: string
    estimatedTime: string
  }
  generated: {
    theme: string
    scenario: string
    learnerGoal: string
    localeFocus: string
    conversationTopic: string
    reviewFocus: string
    typingFocus: string
  }
  blueprint: {
    sectionTitle: string
    theme: string
    level: string
    goal: string
  }
  draft: {
    sectionTitle: string
    theme: string
    type: string
    title: string
    description: string
    estimatedMinutes: string
    prompt: string
    answer: string
  }
  mappedSession: {
    sectionTitle: string
    theme: string
    level: string
    totalEstimatedMinutes: string
    id: string
    type: string
    title: string
    description: string
    estimatedMinutes: string
    prompt: string
    answer: string
  }
  aiPromptPayload: {
    sectionTitle: string
    systemPurpose: string
    lessonInput: string
    sessionConfig: string
    blueprint: string
    draft: string
    mappedSession: string
    theme: string
    scenario: string
    learnerGoal: string
    localeFocus: string
    conversationTopic: string
    reviewFocus: string
    typingFocus: string
    blocks: string
    level: string
    totalEstimatedMinutes: string
  }
  aiMessages: {
    sectionTitle: string
    messageCount: string
    role: string
    content: string
  }
  block: {
    estimatedPrefix: string
    estimatedSuffix: string
  }
  progress: {
    progressPercent: string
    completed: string
    typing: string
  }
  typing: {
    placeholder: string
    checkButton: string
    correct: string
    incorrect: string
    answerLabel: string
  }
  buttons: {
    next: string
    complete: string
    startLesson: string
    backToDashboard: string
  }
  completion: {
    completed: string
    progressPercent: string
    typing: string
  }
}

const ESTIMATED_MINUTES_LABEL = '想定分'
const LABEL_THEME = 'テーマ'

/** Japanese lesson copy. Use this in the lesson page until language switching is added. */
export const LESSON_COPY_JA: LessonCopy = {
  loading: '読み込み中...',
  pageErrors: {
    default: 'レッスンを読み込めませんでした。もう一度お試しください。',
    profileLoadFailed: 'プロフィールを読み込めませんでした。',
  },
  intro: {
    title: '今日のレッスン',
    body1: '今日の学習を始めましょう。',
    body2: '今日の目標に合わせて、会話・復習・入力を組み合わせたレッスンを始めます。',
  },
  meta: {
    theme: '学習テーマ',
    level: 'レベル',
    estimatedTime: '想定時間',
  },
  generated: {
    theme: LABEL_THEME,
    scenario: 'シナリオ',
    learnerGoal: '学習目標',
    localeFocus: '地域',
    conversationTopic: '会話トピック',
    reviewFocus: '復習の焦点',
    typingFocus: '入力の焦点',
  },
  blueprint: {
    sectionTitle: 'ブループリント',
    theme: LABEL_THEME,
    level: 'レベル',
    goal: '目標',
  },
  draft: {
    sectionTitle: 'ドラフト',
    theme: LABEL_THEME,
    type: 'タイプ',
    title: 'タイトル',
    description: '説明',
    estimatedMinutes: ESTIMATED_MINUTES_LABEL,
    prompt: 'プロンプト',
    answer: '答え',
  },
  mappedSession: {
    sectionTitle: 'マップ済みセッション',
    theme: LABEL_THEME,
    level: 'レベル',
    totalEstimatedMinutes: '合計想定分',
    id: 'ID',
    type: 'タイプ',
    title: 'タイトル',
    description: '説明',
    estimatedMinutes: ESTIMATED_MINUTES_LABEL,
    prompt: 'プロンプト',
    answer: '答え',
  },
  aiPromptPayload: {
    sectionTitle: 'AIプロンプトペイロード',
    systemPurpose: 'システム目的',
    lessonInput: 'レッスン入力',
    sessionConfig: 'セッション設定',
    blueprint: 'ブループリント',
    draft: 'ドラフト',
    mappedSession: 'マップ済みセッション',
    theme: LABEL_THEME,
    scenario: 'シナリオ',
    learnerGoal: '学習目標',
    localeFocus: '地域',
    conversationTopic: '会話トピック',
    reviewFocus: '復習の焦点',
    typingFocus: '入力の焦点',
    blocks: 'ブロック数',
    level: 'レベル',
    totalEstimatedMinutes: '合計想定分',
  },
  aiMessages: {
    sectionTitle: 'AIメッセージ',
    messageCount: 'メッセージ数',
    role: '役割',
    content: '内容',
  },
  block: {
    estimatedPrefix: '約',
    estimatedSuffix: '分',
  },
  progress: {
    progressPercent: '進捗率',
    completed: '完了',
    typing: 'typing',
  },
  typing: {
    placeholder: '入力してください',
    checkButton: '答えを確認',
    correct: '正解です',
    incorrect: 'もう少しです',
    answerLabel: '正解: ',
  },
  buttons: {
    next: '次へ',
    complete: 'レッスン完了',
    startLesson: 'レッスンを開始する',
    backToDashboard: 'ダッシュボードへ戻る',
  },
  completion: {
    completed: '完了',
    progressPercent: '進捗率',
    typing: 'typing',
  },
}
