/**
 * Lesson Access Control — unified billing gate
 *
 * Determines whether a user can start a lesson based on:
 * 1. Role (owner/admin/staff bypass)
 * 2. Billing exemption (admin-granted free access)
 * 3. App-level trial (independent from Stripe)
 * 4. Active Stripe subscription or Stripe trial
 *
 * Pure function. No DB access, no side effects.
 */

export type LessonAccessInput = {
  role?: string | null
  is_admin?: boolean | null
  billing_exempt?: boolean | null
  billing_exempt_until?: string | null
  subscription_status?: string | null
  trial_ends_at?: string | null
}

export type LessonAccessResult = {
  allowed: boolean
  reason?: 'subscription_required'
  /** Remaining trial days (0 if not in trial or trial expired) */
  trialDaysRemaining?: number
}

const INTERNAL_ROLES = new Set(['owner', 'admin', 'staff'])
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

/**
 * Check if the user can start a lesson.
 *
 * Priority:
 * 1. Internal role → allowed
 * 2. is_admin flag → allowed
 * 3. billing_exempt → allowed
 * 4. App-level trial active (trial_ends_at in future) → allowed
 * 5. Stripe subscription active/trialing/past_due → allowed
 * 6. Otherwise → blocked
 */
export function canStartLesson(input: LessonAccessInput): LessonAccessResult {
  // 1. Internal users always allowed
  if (input.role && INTERNAL_ROLES.has(input.role)) {
    return { allowed: true }
  }

  // 2. is_admin backward compat
  if (input.is_admin === true) {
    return { allowed: true }
  }

  // 3. Billing exempt
  if (input.billing_exempt === true) {
    if (!input.billing_exempt_until) {
      return { allowed: true }
    }
    if (new Date(input.billing_exempt_until) > new Date()) {
      return { allowed: true }
    }
  }

  // 4. App-level trial (independent from Stripe)
  if (input.trial_ends_at) {
    const trialEnd = new Date(input.trial_ends_at)
    const now = new Date()
    if (trialEnd > now) {
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { allowed: true, trialDaysRemaining: daysRemaining }
    }
  }

  // 5. Active Stripe subscription or Stripe trial
  if (input.subscription_status && ACTIVE_STATUSES.has(input.subscription_status)) {
    return { allowed: true }
  }

  // 6. No valid access
  return { allowed: false, reason: 'subscription_required' }
}
