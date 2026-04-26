/**
 * Billing Production QA Checklist
 *
 * Developer-facing verification surface for Stripe billing flows.
 * Each case maps to a specific user journey that must be verified
 * in Stripe test mode before going live.
 *
 * Run through each case manually in order. Check Supabase user_profiles
 * after each step to verify webhook reflection.
 */

export const BILLING_QA_CASES = [
  // ── Purchase flows ──
  {
    id: 'BQ-01',
    name: 'New monthly purchase',
    steps: [
      'User has no subscription (fresh account or canceled+expired)',
      'Click "月額プラン" on billing page or onboarding',
      'Complete Stripe Checkout with test card 4242424242424242',
      'Verify redirect back to app',
    ],
    verify: {
      db: 'subscription_status = "trialing", planned_plan_code = "monthly", subscription_current_period_end = 7 days from now',
      ui: 'Billing page shows "無料トライアル中", correct renewal date',
      webhook: 'checkout.session.completed + customer.subscription.created both received',
    },
  },
  {
    id: 'BQ-02',
    name: 'New yearly purchase',
    steps: [
      'User has no subscription',
      'Click "年額プラン" on billing page or onboarding',
      'Complete Stripe Checkout with test card',
    ],
    verify: {
      db: 'subscription_status = "trialing", planned_plan_code = "yearly"',
      ui: 'Billing page shows "年額プラン", "無料トライアル中"',
      webhook: 'checkout.session.completed received, planned_plan_code = yearly',
    },
  },

  // ── Webhook reflection ──
  {
    id: 'BQ-03',
    name: 'Successful webhook updates DB',
    steps: [
      'After BQ-01 or BQ-02, wait 5 seconds',
      'Refresh billing page',
    ],
    verify: {
      db: 'stripe_customer_id, stripe_subscription_id, subscription_status all populated',
      ui: 'All fields show correct values (not "未設定")',
      webhook: 'Server logs show WEBHOOK EVENT TYPE + UPDATED USER PROFILE',
    },
  },

  // ── Payment failure ──
  {
    id: 'BQ-04',
    name: 'Failed payment logged',
    steps: [
      'Use Stripe test card 4000000000000341 (attach succeeds, charge fails)',
      'Attempt checkout',
    ],
    verify: {
      db: 'admin_audit_log has stripe_payment_failed entry',
      ui: 'User sees Stripe error page or retry prompt',
      webhook: 'invoice.payment_failed or payment_intent.payment_failed logged',
    },
  },

  // ── Cancellation ──
  {
    id: 'BQ-05',
    name: 'Cancel with remaining access (grace period)',
    steps: [
      'User has active subscription',
      'Open Stripe Portal via billing page → Cancel subscription',
      'Confirm cancellation in portal',
      'Return to billing page',
    ],
    verify: {
      db: 'subscription_status = "active" or "canceled", subscription_cancel_at_period_end = true',
      ui: 'Shows "期間終了後に解約予定" with remaining days and expiry date',
      lesson: 'canStartLesson returns true (period not yet expired)',
      webhook: 'customer.subscription.updated received with cancel_at_period_end = true',
    },
  },
  {
    id: 'BQ-06',
    name: 'Expired subscription blocks lessons',
    steps: [
      'After BQ-05, use Stripe CLI to advance time past period end',
      'Or manually set subscription_current_period_end to past date in DB',
    ],
    verify: {
      db: 'subscription_current_period_end < now()',
      lesson: 'canStartLesson returns false, reason = subscription_required',
      ui: 'Lesson page shows paywall / subscription required message',
    },
  },

  // ── Plan changes ──
  {
    id: 'BQ-07',
    name: 'Monthly → yearly immediate upgrade',
    steps: [
      'User has active monthly subscription',
      'Click "年額プラン" on billing page',
      'Confirm plan change (auto-handled via USE_PLAN_CHANGE → /api/stripe/change-plan)',
    ],
    verify: {
      db: 'planned_plan_code = "yearly", subscription_status = "active"',
      ui: 'Shows "年額プラン" immediately after page reload',
      stripe: 'Subscription updated with proration (immediate)',
      webhook: 'customer.subscription.updated received with new price ID',
    },
  },
  {
    id: 'BQ-08',
    name: 'Yearly → monthly deferred downgrade',
    steps: [
      'User has active yearly subscription',
      'Click "月額プラン" on billing page',
      'Confirm plan change',
    ],
    verify: {
      db: 'planned_plan_code = "yearly" (unchanged until period end), next_plan_code = "monthly"',
      ui: 'Shows deferred downgrade notice: "次回更新日より月額プランに変更されます"',
      stripe: 'proration_behavior = none, billing_cycle_anchor unchanged',
    },
  },

  // ── Portal return ──
  {
    id: 'BQ-09',
    name: 'Customer portal return refreshes billing page',
    steps: [
      'Open Stripe Portal from billing page',
      'Make any change (update card, etc.) or just close',
      'Return to billing page (focus event)',
    ],
    verify: {
      ui: 'Billing data auto-refreshes on window focus (checkSession in handleFocus)',
      no_stale: 'Page does not show stale data from before portal visit',
    },
  },

  // ── Entitlement gate ──
  {
    id: 'BQ-10',
    name: 'Active subscription allows lessons',
    steps: [
      'User has subscription_status = "active" or "trialing"',
      'Navigate to lesson page',
      'Start a lesson',
    ],
    verify: {
      lesson: 'canStartLesson returns true',
      api: 'requireLessonEntitlement returns 200 (not 403)',
      ui: 'Lesson loads and plays normally',
    },
  },
] as const
