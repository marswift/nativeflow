/**
 * Minimal event tracking client.
 * Fire-and-forget — never blocks UI, fails silently.
 */

export type TrackEventName =
  | 'lesson_start'
  | 'lesson_completed'
  | 'lesson_abandoned'
  | 'ai_question_answer'
  | 'typing_answer'
  | 'conversation_turn'
  | 'conversation_complete'
  | 'paywall_clicked'
  | 'signup_completed'
  | 'onboarding_completed'
  | 'first_lesson_started'
  | 'first_lesson_completed'
  | 'billing_page_viewed'
  | 'checkout_started'
  | 'checkout_completed'
  | 'rewards_page_viewed'
  // LP Pattern A events
  | 'hero_cta_view'
  | 'cta_click'
  | 'quick_test_click'
  | 'scroll_50'
  | 'signup_complete'

type TrackEventPayload = {
  event: TrackEventName
  properties?: Record<string, string | number | boolean | null>
}

export function trackEvent(event: TrackEventName, properties?: Record<string, string | number | boolean | null>): void {
  const payload: TrackEventPayload = { event, properties }

  // Fire-and-forget — no await, no error propagation
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // survives page navigation
    }).catch(() => {
      // Silently ignore network failures
    })
  } catch {
    // Silently ignore any synchronous errors
  }
}
