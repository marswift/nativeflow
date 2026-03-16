/**
 * Dashboard UI copy for the NativeFlow MVP.
 * Japanese only; structure is ready for future i18n.
 * UI-independent; consumed by app/dashboard/page.tsx or other dashboard UI.
 */

export type DashboardCopy = {
  loading: string
  welcome: string
  dailyStats: {
    sectionTitle: string
    lessonRunsStarted: string
    lessonRunsCompleted: string
    lessonItemsCompleted: string
    typingItemsCorrect: string
    studyMinutes: string
    studyMinutesDiff: string
  }
  labels: {
    targetLanguage: string
    currentLevel: string
    dailyStudyTime: string
    totalStudyTime: string
    speakByDeadline: string
    remainingDays: string
    targetOutcome: string
  }
  ctaSupport: string
  ctaPrimary: string
  linkToHistory: string
  emptyValue: string
  minutesSuffix: string
}

/** Japanese dashboard copy. Use this in the dashboard page until language switching is added. */
export const DASHBOARD_COPY_JA: DashboardCopy = {
  loading: '読み込み中...',
  welcome: 'ようこそ。今日も一緒に学習していきましょう。',
  dailyStats: {
    sectionTitle: '今日の学習',
    lessonRunsStarted: '今日のレッスン開始数',
    lessonRunsCompleted: '今日のレッスン完了数',
    lessonItemsCompleted: '今日の完了アイテム数',
    typingItemsCorrect: '今日のtyping正解数',
    studyMinutes: '今日の学習時間（分）',
    studyMinutesDiff: '目標との差（分）',
  },
  labels: {
    targetLanguage: '学習したい言語',
    currentLevel: '現在のレベル',
    dailyStudyTime: '推奨の1日の学習時間',
    totalStudyTime: '推奨の総学習時間',
    speakByDeadline: '話せる目標時期',
    remainingDays: '目標までの残り日数',
    targetOutcome: '目指したいこと',
  },
  ctaSupport: '今日の目標に合わせたレッスンを始めます。',
  ctaPrimary: '今日のレッスンを始める',
  linkToHistory: '履歴を見る',
  emptyValue: '—',
  minutesSuffix: '分',
}
