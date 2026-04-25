/**
 * Runtime Lesson Event Collection
 *
 * Collects real user behavior events during lessons.
 * Fire-and-forget — never blocks lesson flow.
 *
 * Events are stored in Supabase `lesson_events` table
 * and aggregated into ContentHealthInput for monitoring.
 */

// ── Event types ──

export type LessonEventType =
  | 'lesson_start'
  | 'lesson_complete'
  | 'lesson_abandon'
  | 'stage_enter'
  | 'stage_complete'
  | 'stage_retry'
  | 'stage_silent'
  | 'ai_conv_turn'
  | 'ai_conv_complete'
  | 'ai_conv_error'

export type LessonEventPayload = {
  userId: string | null
  bundleId: string
  versionNumber: number
  ageGroup: string | null
  region: string | null
  stage: string | null
  eventType: LessonEventType
  metadata?: Record<string, string | number | boolean | null>
}

// ── Client-side fire-and-forget logger ──

/**
 * Log a lesson event. Non-blocking, fire-and-forget.
 * Silently ignores all failures.
 */
export function logLessonEvent(event: LessonEventPayload): void {
  try {
    fetch('/api/lesson/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {
      // Silently ignore
    })
  } catch {
    // Silently ignore
  }
}

/**
 * Convenience: log lesson start.
 */
export function logLessonStart(params: {
  userId: string | null
  bundleId: string
  versionNumber: number
  ageGroup: string | null
  region: string | null
}): void {
  logLessonEvent({
    ...params,
    stage: null,
    eventType: 'lesson_start',
  })
}

/**
 * Convenience: log lesson complete.
 */
export function logLessonComplete(params: {
  userId: string | null
  bundleId: string
  versionNumber: number
  ageGroup: string | null
  region: string | null
  completionSeconds?: number
}): void {
  logLessonEvent({
    ...params,
    stage: null,
    eventType: 'lesson_complete',
    metadata: params.completionSeconds != null
      ? { completionSeconds: params.completionSeconds }
      : undefined,
  })
}

/**
 * Convenience: log lesson abandon.
 */
export function logLessonAbandon(params: {
  userId: string | null
  bundleId: string
  versionNumber: number
  ageGroup: string | null
  region: string | null
  stage: string | null
}): void {
  logLessonEvent({
    ...params,
    eventType: 'lesson_abandon',
  })
}

/**
 * Convenience: log stage event (enter/complete/retry/silent).
 */
export function logStageEvent(params: {
  userId: string | null
  bundleId: string
  versionNumber: number
  ageGroup: string | null
  region: string | null
  stage: string
  eventType: 'stage_enter' | 'stage_complete' | 'stage_retry' | 'stage_silent'
}): void {
  logLessonEvent(params)
}
