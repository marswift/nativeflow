import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe, normalizePlanCode, type BillingPlanCode } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'

/** Webhook secret; must be set in env. Not exported from lib/stripe to keep route-scoped. */
function getWebhookSecret(): string {
  const v = process.env.STRIPE_WEBHOOK_SECRET
  const trimmed = typeof v === 'string' ? v.trim() : ''
  if (!trimmed) throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  return trimmed
}

/** Metadata keys aligned with app/api/stripe/checkout/route.ts (session + subscription_data.metadata). */
const META_USER_ID = 'user_id'
const META_PLAN = 'plan'

function getMetadataUserId(meta: Record<string, string> | null | undefined): string | null {
  if (!meta || typeof meta[META_USER_ID] !== 'string') return null
  const id = (meta[META_USER_ID] as string).trim()
  return id.length > 0 ? id : null
}

function getMetadataPlan(meta: Record<string, string> | null | undefined): BillingPlanCode | null {
  if (!meta || typeof meta[META_PLAN] !== 'string') return null
  return normalizePlanCode(meta[META_PLAN])
}

/** Returns { userId, plan } from metadata; plan only when monthly/yearly. */
function getUserIdAndPlanFromMetadata(meta: Record<string, string> | null | undefined): {
  userId: string | null
  plan: BillingPlanCode | null
} {
  return {
    userId: getMetadataUserId(meta),
    plan: getMetadataPlan(meta),
  }
}

/** Extract Stripe customer id from session/subscription customer field (string or expanded object). */
function getCustomerIdFromUnknownCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (customer == null) return null
  if (typeof customer === 'string') return customer.trim() || null
  if (typeof customer === 'object' && customer !== null && 'id' in customer && typeof (customer as { id?: string }).id === 'string') {
    return (customer as { id: string }).id
  }
  return null
}

/** Unix seconds → ISO string for timestamptz. Returns null if value missing or invalid. */
function toIsoFromUnixSeconds(value: number | null | undefined): string | null {
  if (value == null || typeof value !== 'number' || !Number.isFinite(value)) return null
  try {
    return new Date(value * 1000).toISOString()
  } catch {
    return null
  }
}

function logMissingUserId(eventType: string, source: string): void {
  console.warn('Stripe webhook user_id missing', {
    eventType,
    source,
    reason: 'user_id missing in metadata',
  })
}

function logSyncFailure(eventType: string, userId: string, error: unknown): void {
  console.error('Stripe webhook sync failed', {
    eventType,
    userId,
    error,
  })
}

/** Billing fields written to user_profiles; all optional so we only set what we have. */
type BillingProfilePatch = {
  planned_plan_code?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
}

/** Build patch from Stripe subscription and optional plan. planned_plan_code only set when plan is monthly/yearly. */
function buildSubscriptionProfilePatch(
  subscription: Stripe.Subscription,
  plan: BillingPlanCode | null
): BillingProfilePatch {
  const customerId = getCustomerIdFromUnknownCustomer(subscription.customer)
  const status =
    subscription.status != null && String(subscription.status).trim().length > 0
      ? String(subscription.status)
      : null
      const trialEnd = (subscription as { trial_end?: number }).trial_end
      const periodEnd = (subscription as { current_period_end?: number }).current_period_end
      
      let effectivePeriodEnd: number | null | undefined
      
      if (subscription.status === 'trialing') {
        effectivePeriodEnd = trialEnd ?? periodEnd
      } else {
        effectivePeriodEnd = periodEnd ?? trialEnd
      }
      const iso = toIsoFromUnixSeconds(effectivePeriodEnd)

      const patch: BillingProfilePatch = {
        stripe_customer_id: customerId ?? undefined,
        stripe_subscription_id: subscription.id ?? undefined,
        subscription_status: status ?? undefined,
        current_period_end: iso ?? undefined,
        cancel_at_period_end:
          typeof subscription.cancel_at_period_end === 'boolean'
            ? subscription.cancel_at_period_end
            : undefined,
      }
  if (plan === 'monthly' || plan === 'yearly') {
    patch.planned_plan_code = plan
  }
  return patch
}

/** Idempotent: update user_profiles billing columns. Only includes keys that are defined on patch. */
async function syncUserProfileBilling(
  userId: string,
  patch: BillingProfilePatch
): Promise<{ error: unknown } | null> {
  const payload: Record<string, unknown> = {}
  if (patch.planned_plan_code !== undefined) payload.planned_plan_code = patch.planned_plan_code
  if (patch.stripe_customer_id !== undefined) payload.stripe_customer_id = patch.stripe_customer_id
  if (patch.stripe_subscription_id !== undefined)
    payload.stripe_subscription_id = patch.stripe_subscription_id
  if (patch.subscription_status !== undefined) payload.subscription_status = patch.subscription_status
  if (patch.current_period_end !== undefined) payload.current_period_end = patch.current_period_end
  if (patch.cancel_at_period_end !== undefined)
    payload.cancel_at_period_end = patch.cancel_at_period_end
  if (Object.keys(payload).length === 0) return null
  const { error } = await supabaseServer
    .from('user_profiles')
    .update(payload)
    .eq('id', userId)
  if (error) return { error }
  return null
}

export async function POST(req: NextRequest) {
  let body: string
  try {
    body = await req.text()
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature?.trim()) {
    return NextResponse.json({ message: 'Missing stripe-signature' }, { status: 400 })
  }

  let secret: string
  try {
    secret = getWebhookSecret()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Webhook secret not configured'
    return NextResponse.json({ message: msg }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 400 })
  }

  const type = event.type

  try {
    if (type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const sessionMeta = session.metadata as Record<string, string> | null
      const sessionMetaInfo = getUserIdAndPlanFromMetadata(sessionMeta)
      let userId = sessionMetaInfo.userId
      let plan = sessionMetaInfo.plan

      let subscription: Stripe.Subscription | null = null
      const subId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription)?.id ?? null
      if (subId) {
        try {
          subscription = await stripe.subscriptions.retrieve(subId, {
            expand: ['default_payment_method']
          })
          if (userId == null || plan == null) {
            const subMeta = subscription.metadata as Record<string, string> | null
            const subMetaInfo = getUserIdAndPlanFromMetadata(subMeta)
            if (userId == null) userId = subMetaInfo.userId
            if (plan == null) plan = subMetaInfo.plan
          }
        } catch (retrieveErr) {
          console.error('Stripe webhook subscription retrieve failed', {
            eventType: type,
            subId,
            userId,
            plan,
            error: retrieveErr,
          })
          subscription = null
        }
      }

      const sessionCustomerId = getCustomerIdFromUnknownCustomer(session.customer)
      if (userId == null) {
        logMissingUserId(type, 'checkout.session.completed session/subscription metadata')
        return NextResponse.json({ received: true })
      }

      const planForPatch = plan === 'monthly' || plan === 'yearly' ? plan : null
      let patch: BillingProfilePatch
      if (subscription) {
        patch = buildSubscriptionProfilePatch(subscription, planForPatch)
        if ((patch.stripe_customer_id == null || patch.stripe_customer_id === '') && sessionCustomerId != null) {
          patch.stripe_customer_id = sessionCustomerId
        }
      } else {
        patch = {}
        if (sessionCustomerId != null) patch.stripe_customer_id = sessionCustomerId
        if (planForPatch != null) patch.planned_plan_code = planForPatch
      }

      const syncErr = await syncUserProfileBilling(userId, patch)
      if (syncErr) {
        logSyncFailure(type, userId, syncErr.error)
        return NextResponse.json({ message: 'Sync failed' }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      const meta = subscription.metadata as Record<string, string> | null
      const { userId, plan } = getUserIdAndPlanFromMetadata(meta)
      if (userId == null) {
        logMissingUserId(type, 'customer.subscription metadata')
        return NextResponse.json({ received: true })
      }
      const patch = buildSubscriptionProfilePatch(subscription, plan ?? null)
      const syncErr = await syncUserProfileBilling(userId, patch)
      if (syncErr) {
        logSyncFailure(type, userId, syncErr.error)
        return NextResponse.json({ message: 'Sync failed' }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    if (type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const meta = subscription.metadata as Record<string, string> | null
      const { userId, plan } = getUserIdAndPlanFromMetadata(meta)
      if (userId == null) {
        logMissingUserId(type, 'customer.subscription metadata')
        return NextResponse.json({ received: true })
      }
      const customerId = getCustomerIdFromUnknownCustomer(subscription.customer)
      const periodEnd = (subscription as { current_period_end?: number }).current_period_end
      const patch: BillingProfilePatch = {
        subscription_status: subscription.status ?? 'canceled',
        cancel_at_period_end: false,
        current_period_end: toIsoFromUnixSeconds(periodEnd) ?? undefined,
        stripe_customer_id: customerId ?? undefined,
        stripe_subscription_id: subscription.id ?? undefined,
      }
      if (plan === 'monthly' || plan === 'yearly') {
        patch.planned_plan_code = plan
      }
      const syncErr = await syncUserProfileBilling(userId, patch)
      if (syncErr) {
        logSyncFailure(type, userId, syncErr.error)
        return NextResponse.json({ message: 'Sync failed' }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error', { eventType: type, error: err })
    const message = err instanceof Error ? err.message : 'Webhook processing failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
