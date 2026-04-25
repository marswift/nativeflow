import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import {
  finalizeConversationLessonFacade,
  type ConversationLessonFacadeState,
} from '@/lib/conversation-lesson-runtime-facade'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
} from '@/lib/habit-retention-types'
import { incrementDailyStats } from '@/lib/daily-stats-service'
import { supabaseServer } from '@/lib/supabase-server'

type CompleteConversationLessonRequestBody = {
  state: ConversationLessonFacadeState
  todayDate: string
  userId: string
  completedAt: string
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  dueReviewCount?: number
}

type CompleteConversationLessonResponseBody =
  | {
      ok: true
      state: Awaited<ReturnType<typeof finalizeConversationLessonFacade>>['state']
      status: Awaited<ReturnType<typeof finalizeConversationLessonFacade>>['status']
      isLessonCompleted: Awaited<
        ReturnType<typeof finalizeConversationLessonFacade>
      >['isLessonCompleted']
      reviewItems: Awaited<
        ReturnType<typeof finalizeConversationLessonFacade>
      >['reviewItems']
      mission: Awaited<ReturnType<typeof finalizeConversationLessonFacade>>['mission']
      missionProgress: Awaited<
        ReturnType<typeof finalizeConversationLessonFacade>
      >['missionProgress']
      streak: Awaited<ReturnType<typeof finalizeConversationLessonFacade>>['streak']
      comeback: Awaited<ReturnType<typeof finalizeConversationLessonFacade>>['comeback']
      retentionSnapshot: Awaited<
        ReturnType<typeof finalizeConversationLessonFacade>
      >['retentionSnapshot']
    }
  | {
      ok: false
      error: string
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasOwn<K extends string>(
  value: Record<string, unknown>,
  key: K
): value is Record<K, unknown> & Record<string, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function isMinimalConversationLessonFacadeState(
  value: unknown
): value is ConversationLessonFacadeState {
  if (!isObjectRecord(value)) return false
  if (!hasOwn(value, 'session')) return false
  if (!isObjectRecord(value.session)) return false
  if (
    !hasOwn(value.session, 'lessonId') ||
    !isNonEmptyString(value.session.lessonId)
  )
    return false
  if (!hasOwn(value, 'steps') || !Array.isArray(value.steps)) return false
  return true
}

function isMinimalMission(value: unknown): value is DailyMissionDefinition {
  if (!isObjectRecord(value)) return false
  if (!hasOwn(value, 'missionDate') || !isNonEmptyString(value.missionDate))
    return false
  if (!hasOwn(value, 'userId') || !isNonEmptyString(value.userId)) return false
  if (!hasOwn(value, 'title') || typeof value.title !== 'string') return false
  if (!hasOwn(value, 'status') || typeof value.status !== 'string')
    return false
  return true
}

function isMinimalMissionProgress(
  value: unknown
): value is DailyMissionProgress {
  if (!isObjectRecord(value)) return false
  if (!hasOwn(value, 'userId') || !isNonEmptyString(value.userId)) return false
  if (!hasOwn(value, 'missionDate') || !isNonEmptyString(value.missionDate))
    return false
  if (!hasOwn(value, 'isMissionCompleted')) return false
  if (typeof value.isMissionCompleted !== 'boolean') return false
  return true
}

function isMinimalStreak(value: unknown): value is LearnerStreakState {
  if (!isObjectRecord(value)) return false
  if (!hasOwn(value, 'userId') || !isNonEmptyString(value.userId)) return false
  if (!hasOwn(value, 'currentStreakDays')) return false
  if (typeof value.currentStreakDays !== 'number') return false
  return true
}

function validateCompleteConversationLessonRequestBody(
  value: unknown
):
  | { ok: true; data: CompleteConversationLessonRequestBody }
  | {
      ok: false
      error: Extract<
        CompleteConversationLessonResponseBody,
        { ok: false }
      >['error']
    } {
  if (!isObjectRecord(value)) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'state')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'todayDate')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'userId')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'completedAt')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'mission')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'missionProgress')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'streak')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!isObjectRecord(value.state)) {
    return { ok: false, error: 'Invalid state' }
  }
  if (!isMinimalConversationLessonFacadeState(value.state)) {
    return { ok: false, error: 'Invalid state' }
  }
  if (!isNonEmptyString(value.todayDate)) {
    return { ok: false, error: 'Invalid todayDate' }
  }
  if (!isNonEmptyString(value.userId)) {
    return { ok: false, error: 'Invalid userId' }
  }
  if (!isNonEmptyString(value.completedAt)) {
    return { ok: false, error: 'Invalid completedAt' }
  }
  if (!isObjectRecord(value.mission)) {
    return { ok: false, error: 'Invalid mission' }
  }
  if (!isMinimalMission(value.mission)) {
    return { ok: false, error: 'Invalid mission' }
  }
  const rawMissionProgress = value.missionProgress
  if (rawMissionProgress !== null && !isObjectRecord(rawMissionProgress)) {
    return { ok: false, error: 'Invalid missionProgress' }
  }
  if (
    rawMissionProgress !== null &&
    !isMinimalMissionProgress(rawMissionProgress)
  ) {
    return { ok: false, error: 'Invalid missionProgress' }
  }
  const rawStreak = value.streak
  if (rawStreak !== null && !isObjectRecord(rawStreak)) {
    return { ok: false, error: 'Invalid streak' }
  }
  if (rawStreak !== null && !isMinimalStreak(rawStreak)) {
    return { ok: false, error: 'Invalid streak' }
  }
  if (hasOwn(value, 'dueReviewCount')) {
    if (typeof value.dueReviewCount !== 'number') {
      return { ok: false, error: 'Invalid dueReviewCount' }
    }
  }
  const state = value.state
  const todayDate = value.todayDate
  const userId = value.userId
  const completedAt = value.completedAt
  const mission = value.mission
  const missionProgress: DailyMissionProgress | null =
    rawMissionProgress === null
      ? null
      : isMinimalMissionProgress(rawMissionProgress)
        ? rawMissionProgress
        : null
  const streak: LearnerStreakState | null =
    rawStreak === null ? null : isMinimalStreak(rawStreak) ? rawStreak : null
  const dueReviewCount = hasOwn(value, 'dueReviewCount')
    ? typeof value.dueReviewCount === 'number'
      ? value.dueReviewCount
      : undefined
    : undefined
  return {
    ok: true,
    data: {
      state,
      todayDate,
      userId,
      completedAt,
      mission,
      missionProgress,
      streak,
      ...(dueReviewCount !== undefined && { dueReviewCount }),
    },
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<CompleteConversationLessonResponseBody>> {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth as NextResponse<CompleteConversationLessonResponseBody>

  try {
    const body: unknown = await req.json()
    const validated = validateCompleteConversationLessonRequestBody(body)
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 }
      )
    }
    const result = await finalizeConversationLessonFacade(validated.data)

    // daily_stats への書き込み（study_minutes / lesson_runs_completed）
    if (result.isLessonCompleted) {
      try {
        const startedAt = result.state.lesson.startedAt
        const completedAt = validated.data.completedAt
        const start = startedAt ? new Date(startedAt).getTime() : null
        const end = completedAt ? new Date(completedAt).getTime() : null
        const studyMinutes =
          start !== null && end !== null && Number.isFinite(start) && Number.isFinite(end)
            ? Math.max(0, Math.floor((end - start) / 60000))
            : 0

        const lessonId = result.state.session.lessonId
        const idempotencyKey = `${validated.data.userId}:${lessonId}:${validated.data.todayDate}`

        await incrementDailyStats(
          supabaseServer,
          validated.data.userId,
          {
            lesson_runs_completed: 1,
            study_minutes: studyMinutes,
          },
          validated.data.todayDate,
          idempotencyKey
        )
      } catch (statsErr) {
        // daily_stats の書き込み失敗はレッスン完了のレスポンスをブロックしない
        console.error('daily_stats increment failed', statsErr)
      }
    }

    return NextResponse.json(
      {
        ok: true,
        state: result.state,
        status: result.status,
        isLessonCompleted: result.isLessonCompleted,
        reviewItems: result.reviewItems,
        mission: result.mission,
        missionProgress: result.missionProgress,
        streak: result.streak,
        comeback: result.comeback,
        retentionSnapshot: result.retentionSnapshot,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}