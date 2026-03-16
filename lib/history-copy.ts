/**
 * History page UI copy for the NativeFlow MVP.
 * Japanese only; structure is ready for future i18n.
 * UI-independent; consumed by app/history/page.tsx or other history UI.
 */

/** Lesson run status keys for copy lookup. */
export type HistoryStatusKey = 'in_progress' | 'completed' | 'abandoned'

export type HistoryCopy = {
  loading: string
  pageTitle: string
  pageIntro: string
  sectionTitles: {
    recentLessons: string
    dailySummaries: string
  }
  emptyState: string
  statusLabels: Record<HistoryStatusKey, string>
  labels: {
    progressPercent: string
    completedItems: string
    typingCorrect: string
    lessonRunsStarted: string
    lessonRunsCompleted: string
    lessonItemsCompleted: string
    typingItemsCorrect: string
    studyMinutes: string
  }
  backToDashboard: string
}

/** Japanese history copy. Use this in the history page until language switching is added. */
export const HISTORY_COPY_JA: HistoryCopy = {
  loading: '読み込み中...',
  pageTitle: '履歴',
  pageIntro: '過去のレッスンと日別の学習サマリーを確認できます。',
  sectionTitles: {
    recentLessons: '最近のレッスン',
    dailySummaries: '日別サマリー',
  },
  emptyState: 'まだ履歴がありません。',
  statusLabels: {
    in_progress: '進行中',
    completed: '完了',
    abandoned: '中断',
  },
  labels: {
    progressPercent: '進捗',
    completedItems: '完了アイテム数',
    typingCorrect: 'typing正解数',
    lessonRunsStarted: 'レッスン開始数',
    lessonRunsCompleted: 'レッスン完了数',
    lessonItemsCompleted: '完了アイテム数',
    typingItemsCorrect: 'typing正解数',
    studyMinutes: '学習時間（分）',
  },
  backToDashboard: 'ダッシュボードに戻る',
}
