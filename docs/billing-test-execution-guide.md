# Billing Test Execution Guide

Stripe test-mode QA for NativeFlow billing flows.
Run this checklist end-to-end before production launch.

---

## 0. Environment Confirmation

Before starting, verify all of the following:

```
STRIPE_SECRET_KEY          = sk_test_...  (NOT sk_live_)
STRIPE_WEBHOOK_SECRET      = whsec_...    (local forwarding secret)
STRIPE_MONTHLY_PRICE_ID    = price_...    (test-mode price)
STRIPE_YEARLY_PRICE_ID     = price_...    (test-mode price)
STRIPE_PORTAL_RETURN_URL   = http://localhost:3000/settings/billing
STRIPE_PORTAL_CONFIGURATION_ID = bpc_...  (test-mode portal config)
NEXT_PUBLIC_SUPABASE_URL   = (your project URL)
SUPABASE_SERVICE_ROLE_KEY  = (service role — needed for webhook DB writes)
```

**Start local dev server:**
```bash
nvm use default && npm run dev -- --hostname localhost
```

**Start Stripe CLI webhook forwarding:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the `whsec_...` signing secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

**Verify CLI is connected:**
- Terminal should show `Ready! Your webhook signing secret is whsec_...`
- Navigate to any page to confirm app is running

---

## 1. BQ-01: New Monthly Purchase

**Precondition:** Test user has no active subscription (or expired/canceled).

| Step | Action |
|------|--------|
| 1 | Go to `/settings/billing` |
| 2 | Click "月額プラン（¥2,480/月）" |
| 3 | Complete Stripe Checkout with card `4242 4242 4242 4242`, any future expiry, any CVC |
| 4 | Confirm redirect back to app |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Stripe CLI terminal | `checkout.session.completed` + `customer.subscription.created` events |
| Server logs | `[BILLING_WEBHOOK] {"type":"checkout.session.completed",...}` |
| Supabase `user_profiles` | `subscription_status = 'trialing'`, `planned_plan_code = 'monthly'`, `subscription_current_period_end` ~ 7 days from now |
| Billing page | プラン: 月額プラン, 契約状況: 無料トライアル中（残りN日）, 次回決済日: correct date |

**Fail → STOP.** Webhook delivery or DB update failure blocks all subsequent tests.

---

## 2. BQ-02: New Yearly Purchase

**Precondition:** Use a different test user or reset the first user's subscription.

| Step | Action |
|------|--------|
| 1 | Go to `/settings/billing` |
| 2 | Click "年額プラン（¥19,800/年・33%お得）" |
| 3 | Complete Stripe Checkout with `4242 4242 4242 4242` |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Supabase | `planned_plan_code = 'yearly'`, `subscription_status = 'trialing'` |
| Billing page | プラン: 年額プラン, 無料トライアル中（残りN日） |

---

## 3. BQ-03: Webhook Reflection Verification

**Precondition:** Complete BQ-01 or BQ-02.

| Step | Action |
|------|--------|
| 1 | Wait 5 seconds after checkout |
| 2 | Refresh `/settings/billing` |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Supabase | `stripe_customer_id`, `stripe_subscription_id`, `subscription_status` all non-null |
| Billing page | No fields show "未設定" |
| Server logs | `[BILLING_WEBHOOK]` entries for each event |

---

## 4. BQ-04: Failed Payment

**Precondition:** User with no subscription, or use a fresh account.

| Step | Action |
|------|--------|
| 1 | Start checkout (monthly or yearly) |
| 2 | Enter test card `4000 0000 0000 0341` (card attaches but first charge fails) |
| 3 | Complete checkout form |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Stripe CLI | `invoice.payment_failed` or `payment_intent.payment_failed` event |
| Supabase `admin_audit_log` | Row with `event_type = 'stripe_payment_failed'` |
| UI | Stripe shows error or retry page (user not stuck) |
| Supabase `user_profiles` | `subscription_status` is NOT `'active'` |

---

## 5. BQ-05: Cancellation with Grace Period

**Precondition:** User has active subscription from BQ-01 or BQ-02.

| Step | Action |
|------|--------|
| 1 | Go to `/settings/billing` → "決済管理画面を確認する" |
| 2 | In Stripe Portal: click "サブスクリプションをキャンセル" |
| 3 | Confirm cancellation |
| 4 | Return to billing page (close portal tab or click return link) |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Stripe CLI | `customer.subscription.updated` with `cancel_at_period_end: true` |
| Supabase | `subscription_cancel_at_period_end = true` |
| Billing page | 契約状況: "解約予定（N月N日まで利用可・残りN日）" |
| Lesson access | `canStartLesson` returns `{ allowed: true }` (period still active) |

---

## 6. BQ-06: Expired Subscription Blocks Lessons

**Precondition:** User is canceled (BQ-05 done).

| Step | Action |
|------|--------|
| 1 | In Supabase, set `subscription_current_period_end` to yesterday's date for the test user |
| 2 | Try to start a lesson |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Supabase | `subscription_current_period_end < now()` |
| Lesson page | Paywall / "subscription required" message shown |
| API call | `/api/ai-conversation/reply` returns 403 |
| `canStartLesson` | Returns `{ allowed: false, reason: 'subscription_required' }` |

**Rollback:** Restore `subscription_current_period_end` to future date after test.

---

## 7. BQ-07: Monthly to Yearly Upgrade (Immediate)

**Precondition:** User has active monthly subscription.

| Step | Action |
|------|--------|
| 1 | Go to `/settings/billing` |
| 2 | Click "年額プラン" button |
| 3 | Confirm (auto-handled via `USE_PLAN_CHANGE` → `/api/stripe/change-plan`) |
| 4 | Page reloads automatically |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Stripe CLI | `customer.subscription.updated` with yearly price ID |
| Supabase | `planned_plan_code = 'yearly'`, status remains `'active'` |
| Billing page | プラン: 年額プラン (immediately after reload) |
| Stripe Dashboard | Subscription shows proration invoice |

---

## 8. BQ-08: Yearly to Monthly Downgrade (Deferred)

**Precondition:** User has active yearly subscription (from BQ-07 or fresh yearly checkout).

| Step | Action |
|------|--------|
| 1 | Go to `/settings/billing` |
| 2 | Click "月額プラン" button |
| 3 | Confirm |
| 4 | Page reloads |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Supabase | `planned_plan_code` still `'yearly'` (unchanged until period end), `next_plan_code = 'monthly'` |
| Billing page | Amber notice: "次回更新日より月額プランに変更されます" |
| Stripe Dashboard | `proration_behavior = none`, subscription unchanged until period end |

---

## 9. BQ-09: Customer Portal Return Flow

**Precondition:** User has active subscription with `stripe_customer_id`.

| Step | Action |
|------|--------|
| 1 | Go to `/settings/billing` → "決済管理画面を確認する" |
| 2 | In Stripe Portal, update payment method or just browse |
| 3 | Close portal / return to app |
| 4 | Billing page should auto-refresh on focus |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Server logs | `[BILLING_PORTAL] session created` |
| Billing page | Data refreshes without manual reload (focus event triggers `checkSession`) |
| No stale data | Page reflects portal changes immediately |

---

## 10. BQ-10: Active Subscription Allows Lessons

**Precondition:** User has `subscription_status = 'active'` or `'trialing'`.

| Step | Action |
|------|--------|
| 1 | Navigate to lesson page |
| 2 | Start any lesson |
| 3 | Verify conversation and audio work |

**Pass criteria:**

| Check | Expected |
|-------|----------|
| Lesson loads | No paywall, no 403 |
| AI conversation | `/api/ai-conversation/reply` returns 200 |
| Audio | `/api/audio/generate` returns 200 |

---

## Rollback / Safety Notes

- **All tests use Stripe test mode** — no real charges are created.
- **Supabase edits in step 6 are manual** — restore `subscription_current_period_end` after testing.
- **Stripe CLI forwarding** is local only — does not affect deployed webhook endpoint.
- **Do not copy test `whsec_*` secrets** into production `.env`. Production uses the Stripe Dashboard webhook endpoint secret.
- If a webhook event is missed, use `stripe events resend evt_xxx` to replay it.
- To reset a test user completely: set `stripe_subscription_id = null`, `subscription_status = null`, `stripe_customer_id = null` in `user_profiles`.

---

## Launch Blocker Checklist

All must pass before switching to `sk_live_` keys:

| # | Item | Status |
|---|------|--------|
| LB-1 | BQ-01 through BQ-10 all pass in test mode | [ ] |
| LB-2 | `STRIPE_SECRET_KEY` is `sk_live_*` in production env | [ ] |
| LB-3 | `STRIPE_WEBHOOK_SECRET` is the production endpoint secret (not CLI `whsec_`) | [ ] |
| LB-4 | `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_YEARLY_PRICE_ID` are live-mode prices | [ ] |
| LB-5 | `STRIPE_PORTAL_CONFIGURATION_ID` is live-mode portal config | [ ] |
| LB-6 | Webhook endpoint registered in Stripe Dashboard for production domain | [ ] |
| LB-7 | Webhook endpoint listens for all 8 events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `payment_intent.payment_failed`, `subscription_schedule.updated` | [ ] |
| LB-8 | `canStartLesson` correctly blocks expired subscriptions (BQ-06 passed) | [ ] |
| LB-9 | `requireLessonEntitlement` returns 403 for expired users (BQ-06 API check) | [ ] |
| LB-10 | Portal return URL points to production domain | [ ] |
| LB-11 | No `sk_test_*` keys in production environment | [ ] |
| LB-12 | `admin_audit_log` table exists in production Supabase | [ ] |

---

## Test Card Reference

| Card | Behavior |
|------|----------|
| `4242 4242 4242 4242` | Always succeeds |
| `4000 0000 0000 0341` | Attaches OK, first charge fails |
| `4000 0000 0000 9995` | Always declines |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |

Expiry: any future date. CVC: any 3 digits. ZIP: any 5 digits.
