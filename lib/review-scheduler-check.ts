import type {
  ReviewScheduleItem,
  BuildInitialReviewItemInput,
} from './review-scheduler-types'
import {
  clampDifficulty,
  clampEaseFactor,
  parseDateOnlyToUtcMs,
  addDays,
  compareDateOnly,
  resolveScheduleStatus,
  buildInitialIntervalDays,
  buildInitialReviewItem,
  buildNextIntervalDays,
  buildNextEaseFactor,
  updateReviewSchedule,
  refreshReviewScheduleStatus,
  buildReviewQueueSnapshot,
} from './review-scheduler-engine'
import {
  buildInitialReviewItems,
  applyReviewCompletion,
  applyReviewCompletionToList,
  buildReviewQueueState,
} from './review-scheduler-service'

export type ReviewSchedulerCheckResult = {
  name: string
  passed: boolean
  details: string
}

export function buildMockInitialReviewItemInput(): BuildInitialReviewItemInput {
  return {
    userId: 'u1',
    itemType: 'phrase',
    source: {
      lessonId: 'lesson-1',
      sceneId: 'scene-1',
      microSituationId: 'micro-1',
      stepId: 'step-1',
      phraseId: 'phrase-1',
      sourceType: 'phrase',
    },
    promptText: 'Say: Good morning.',
    expectedAnswer: 'Good morning.',
    lastLearnerAnswer: 'Good morning.',
    difficulty: 2,
    createdAt: '2026-03-12T10:00:00Z',
  }
}

export function buildMockReviewItem(): ReviewScheduleItem {
  return buildInitialReviewItem(buildMockInitialReviewItemInput()).item
}

export function checkClampDifficulty(): ReviewSchedulerCheckResult {
  const a = clampDifficulty(0) === 1
  const b = clampDifficulty(3) === 3
  const c = clampDifficulty(9) === 5
  const passed = a && b && c
  return {
    name: 'checkClampDifficulty',
    passed,
    details: passed ? '0=>1, 3=>3, 9=>5' : `a=${a}, b=${b}, c=${c}`,
  }
}

export function checkClampEaseFactor(): ReviewSchedulerCheckResult {
  const a = clampEaseFactor(1.0) === 1.3
  const b = clampEaseFactor(2.5) === 2.5
  const c = clampEaseFactor(5) === 3
  const passed = a && b && c
  return {
    name: 'checkClampEaseFactor',
    passed,
    details: passed ? '1.0=>1.3, 2.5=>2.5, 5=>3' : `a=${a}, b=${b}, c=${c}`,
  }
}

export function checkParseDateOnlyToUtcMs(): ReviewSchedulerCheckResult {
  const result = parseDateOnlyToUtcMs('2026-03-12') > 0
  return {
    name: 'checkParseDateOnlyToUtcMs',
    passed: result,
    details: result ? 'parseDateOnlyToUtcMs 2026-03-12 > 0' : 'parse returned <= 0',
  }
}

export function checkAddDays(): ReviewSchedulerCheckResult {
  const a = addDays('2026-03-12', 1) === '2026-03-13'
  const b = addDays('2026-03-12', 3) === '2026-03-15'
  const passed = a && b
  return {
    name: 'checkAddDays',
    passed,
    details: passed ? '+1 => 2026-03-13, +3 => 2026-03-15' : `a=${a}, b=${b}`,
  }
}

export function checkCompareDateOnly(): ReviewSchedulerCheckResult {
  const a = compareDateOnly('2026-03-11', '2026-03-12') === -1
  const b = compareDateOnly('2026-03-12', '2026-03-12') === 0
  const c = compareDateOnly('2026-03-13', '2026-03-12') === 1
  const passed = a && b && c
  return {
    name: 'checkCompareDateOnly',
    passed,
    details: passed ? 'before -1, equal 0, after 1' : `a=${a}, b=${b}, c=${c}`,
  }
}

export function checkResolveScheduleStatus(): ReviewSchedulerCheckResult {
  const overdue = resolveScheduleStatus({
    dueDate: '2026-03-11',
    todayDate: '2026-03-12',
  }) === 'overdue'
  const due = resolveScheduleStatus({
    dueDate: '2026-03-12',
    todayDate: '2026-03-12',
  }) === 'due'
  const scheduled = resolveScheduleStatus({
    dueDate: '2026-03-13',
    todayDate: '2026-03-12',
  }) === 'scheduled'
  const passed = overdue && due && scheduled
  return {
    name: 'checkResolveScheduleStatus',
    passed,
    details: passed
      ? 'before today=>overdue, same=>due, after=>scheduled'
      : `overdue=${overdue}, due=${due}, scheduled=${scheduled}`,
  }
}

export function checkBuildInitialIntervalDays(): ReviewSchedulerCheckResult {
  const a = buildInitialIntervalDays(1) === 1
  const b = buildInitialIntervalDays(3) === 2
  const c = buildInitialIntervalDays(5) === 3
  const passed = a && b && c
  return {
    name: 'checkBuildInitialIntervalDays',
    passed,
    details: passed ? 'difficulty 1=>1, 3=>2, 5=>3' : `a=${a}, b=${b}, c=${c}`,
  }
}

export function checkBuildInitialReviewItem(): ReviewSchedulerCheckResult {
  const { item } = buildInitialReviewItem(buildMockInitialReviewItemInput())
  const passed =
    item.userId === 'u1' &&
    item.intervalDays === 1 &&
    item.dueDate === '2026-03-13' &&
    item.status === 'new'
  return {
    name: 'checkBuildInitialReviewItem',
    passed,
    details: passed
      ? 'userId u1, intervalDays 1, dueDate 2026-03-13, status new'
      : `userId=${item.userId}, intervalDays=${item.intervalDays}, dueDate=${item.dueDate}, status=${item.status}`,
  }
}

export function checkBuildNextIntervalDays(): ReviewSchedulerCheckResult {
  const again = buildNextIntervalDays({
    previousIntervalDays: 2,
    repetitionCount: 1,
    rating: 'again',
    easeFactor: 2.5,
  }) === 1
  const good = buildNextIntervalDays({
    previousIntervalDays: 1,
    repetitionCount: 0,
    rating: 'good',
    easeFactor: 2.5,
  }) === 2
  const easy = buildNextIntervalDays({
    previousIntervalDays: 1,
    repetitionCount: 0,
    rating: 'easy',
    easeFactor: 2.5,
  }) === 4
  const passed = again && good && easy
  return {
    name: 'checkBuildNextIntervalDays',
    passed,
    details: passed
      ? 'again=>1, rep0+good=>2, rep0+easy=>4'
      : `again=${again}, good=${good}, easy=${easy}`,
  }
}

export function checkBuildNextEaseFactor(): ReviewSchedulerCheckResult {
  const current = 2.5
  const again = buildNextEaseFactor(current, 'again') < current
  const hard = buildNextEaseFactor(current, 'hard') < current
  const good = buildNextEaseFactor(current, 'good') === current
  const easy = buildNextEaseFactor(current, 'easy') > current
  const passed = again && hard && good && easy
  return {
    name: 'checkBuildNextEaseFactor',
    passed,
    details: passed
      ? 'again lowers, hard lowers, good keeps, easy raises'
      : `again=${again}, hard=${hard}, good=${good}, easy=${easy}`,
  }
}

export function checkUpdateReviewSchedule(): ReviewSchedulerCheckResult {
  const item = buildMockReviewItem()
  const { item: updated, completion } = updateReviewSchedule({
    item,
    rating: 'good',
    learnerAnswer: 'Good morning.',
    reviewedAt: '2026-03-13T10:00:00Z',
  })
  const passed =
    updated.repetitionCount === 1 &&
    updated.status === 'completed' &&
    updated.lastReviewedAt === '2026-03-13T10:00:00Z' &&
    completion.reviewItemId === item.id
  return {
    name: 'checkUpdateReviewSchedule',
    passed,
    details: passed
      ? 'repetitionCount 1, status completed, lastReviewedAt set, completion.reviewItemId matches'
      : `repetitionCount=${updated.repetitionCount}, status=${updated.status}, lastReviewedAt=${updated.lastReviewedAt}, reviewItemIdMatch=${completion.reviewItemId === item.id}`,
  }
}

export function checkRefreshReviewScheduleStatus(): ReviewSchedulerCheckResult {
  const completedPast: ReviewScheduleItem = {
    ...buildMockReviewItem(),
    status: 'completed',
    dueDate: '2026-03-11',
  }
  const refreshedOverdue = refreshReviewScheduleStatus(
    completedPast,
    '2026-03-12'
  )
  const sameDay: ReviewScheduleItem = {
    ...buildMockReviewItem(),
    status: 'completed',
    dueDate: '2026-03-12',
  }
  const refreshedDue = refreshReviewScheduleStatus(sameDay, '2026-03-12')
  const passed =
    refreshedOverdue.status === 'overdue' && refreshedDue.status === 'due'
  return {
    name: 'checkRefreshReviewScheduleStatus',
    passed,
    details: passed
      ? 'completed+dueBeforeToday=>overdue, same day=>due'
      : `overdue=${refreshedOverdue.status}, due=${refreshedDue.status}`,
  }
}

export function checkBuildReviewQueueSnapshot(): ReviewSchedulerCheckResult {
  const today = '2026-03-12'
  const overdueItem: ReviewScheduleItem = {
    ...buildMockReviewItem(),
    id: 'review:u1:lesson-1:phrase:overdue',
    dueDate: '2026-03-11',
    status: 'overdue',
  }
  const dueItem: ReviewScheduleItem = {
    ...buildMockReviewItem(),
    id: 'review:u1:lesson-1:phrase:due',
    dueDate: '2026-03-12',
    status: 'due',
  }
  const scheduledItem: ReviewScheduleItem = {
    ...buildMockReviewItem(),
    id: 'review:u1:lesson-1:phrase:scheduled',
    dueDate: '2026-03-13',
    status: 'scheduled',
  }
  const snapshot = buildReviewQueueSnapshot({
    todayDate: today,
    items: [dueItem, scheduledItem, overdueItem],
  })
  const overdueCountOk = snapshot.overdueCount === 1
  const dueCountOk = snapshot.dueCount === 1
  const firstStatus = snapshot.items[0]?.status
  const secondStatus = snapshot.items[1]?.status
  const orderOk = firstStatus === 'overdue' && secondStatus === 'due'
  const passed = overdueCountOk && dueCountOk && orderOk
  return {
    name: 'checkBuildReviewQueueSnapshot',
    passed,
    details: passed
      ? 'overdueCount 1, dueCount 1, order overdue then due'
      : `overdueCount=${snapshot.overdueCount}, dueCount=${snapshot.dueCount}, first=${firstStatus}, second=${secondStatus}`,
  }
}

export function checkBuildInitialReviewItems(): ReviewSchedulerCheckResult {
  const input = buildMockInitialReviewItemInput()
  const { items } = buildInitialReviewItems({ items: [input] })
  const passed = items.length === 1 && items[0].userId === 'u1'
  return {
    name: 'checkBuildInitialReviewItems',
    passed,
    details: passed
      ? 'one input => one item, userId u1'
      : `length=${items.length}, userId=${items[0]?.userId}`,
  }
}

export function checkApplyReviewCompletion(): ReviewSchedulerCheckResult {
  const item = buildMockReviewItem()
  const { item: updated, completion } = applyReviewCompletion({
    item,
    rating: 'good',
    learnerAnswer: 'Good morning.',
    reviewedAt: '2026-03-13T10:00:00Z',
  })
  const passed =
    updated.status === 'completed' && completion.reviewItemId === item.id
  return {
    name: 'checkApplyReviewCompletion',
    passed,
    details: passed
      ? 'item.status completed, completion.reviewItemId matches'
      : `status=${updated.status}, reviewItemIdMatch=${completion.reviewItemId === item.id}`,
  }
}

export function checkApplyReviewCompletionToList(): ReviewSchedulerCheckResult {
  const item = buildMockReviewItem()
  const { items, completion } = applyReviewCompletionToList({
    items: [item],
    reviewItemId: item.id,
    rating: 'good',
    learnerAnswer: 'Good morning.',
    reviewedAt: '2026-03-13T10:00:00Z',
  })
  const updated = items[0]
  const passed =
    updated != null &&
    updated.status === 'completed' &&
    completion !== null
  return {
    name: 'checkApplyReviewCompletionToList',
    passed,
    details: passed
      ? 'updated item status completed, completion not null'
      : `updated.status=${updated?.status}, completion=${completion != null}`,
  }
}

export function checkBuildReviewQueueState(): ReviewSchedulerCheckResult {
  const item = buildMockReviewItem()
  const today = '2026-03-12'
  const { snapshot } = buildReviewQueueState({
    todayDate: today,
    items: [item],
  })
  const passed =
    snapshot.todayDate === today && snapshot.items.length === 1
  return {
    name: 'checkBuildReviewQueueState',
    passed,
    details: passed
      ? 'snapshot.todayDate matches, snapshot.items.length 1'
      : `todayDate=${snapshot.todayDate}, items.length=${snapshot.items.length}`,
  }
}

export function runAllReviewSchedulerChecks(): ReviewSchedulerCheckResult[] {
  return [
    checkClampDifficulty(),
    checkClampEaseFactor(),
    checkParseDateOnlyToUtcMs(),
    checkAddDays(),
    checkCompareDateOnly(),
    checkResolveScheduleStatus(),
    checkBuildInitialIntervalDays(),
    checkBuildInitialReviewItem(),
    checkBuildNextIntervalDays(),
    checkBuildNextEaseFactor(),
    checkUpdateReviewSchedule(),
    checkRefreshReviewScheduleStatus(),
    checkBuildReviewQueueSnapshot(),
    checkBuildInitialReviewItems(),
    checkApplyReviewCompletion(),
    checkApplyReviewCompletionToList(),
    checkBuildReviewQueueState(),
  ]
}
