import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getStripe, getPriceIdByPlan, normalizePlanCode } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'

type CheckoutBody = { plan?: unknown }

const TRIAL_DAYS = 7

function formatTrialEndDateParts(baseDate = new Date()): {
  billingStartDateLabel: string
  cancelDeadlineLabel: string
} {
  const billingStart = new Date(baseDate)
  billingStart.setDate(billingStart.getDate() + TRIAL_DAYS)

  const cancelDeadline = new Date(billingStart)
  cancelDeadline.setDate(cancelDeadline.getDate() - 1)

  const formatter = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    billingStartDateLabel: formatter.format(billingStart),
    cancelDeadlineLabel: formatter.format(cancelDeadline),
  }
}

/** Base URL for redirects: NEXT_PUBLIC_SITE_URL if set, else req.nextUrl.origin. Trailing slash removed. */
function getSiteUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  const trimmed = typeof fromEnv === 'string' ? fromEnv.trim() : ''
  const base = trimmed.length > 0 ? trimmed : req.nextUrl.origin
  return base.replace(/\/+$/, '')
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()

  let body: CheckoutBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body' },
      { status: 400 }
    )
  }

  const plan = normalizePlanCode(body?.plan)
  if (!plan) {
    return NextResponse.json(
      { message: 'Invalid or missing plan' },
      { status: 400 }
    )
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { data: profileRow } = await supabaseServer
    .from('user_profiles')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle()

  const stripeCustomerId =
    typeof profileRow?.stripe_customer_id === 'string'
      ? profileRow.stripe_customer_id.trim()
      : ''

  // If user already has an active subscription, reject checkout and direct to plan change.
  // Never cancel an active subscription before a replacement is confirmed.
  const existingSubId =
    typeof profileRow?.stripe_subscription_id === 'string'
      ? profileRow.stripe_subscription_id.trim()
      : ''
  if (existingSubId) {
    try {
      const existingSub = await stripe.subscriptions.retrieve(existingSubId)
      const activeStatuses = new Set(['active', 'trialing', 'past_due'])
      if (activeStatuses.has(existingSub.status)) {
        return NextResponse.json(
          { message: 'Active subscription exists. Use plan change instead.', code: 'USE_PLAN_CHANGE' },
          { status: 409 }
        )
      }
      // Subscription exists but is canceled/unpaid/incomplete — safe to proceed with new checkout
    } catch {
      // Subscription not found in Stripe — safe to proceed with new checkout
    }
  }

  const customerEmail = (user.email ?? '').trim()
  if (!stripeCustomerId && !customerEmail) {
    return NextResponse.json(
      { message: 'User email is required for checkout' },
      { status: 400 }
    )
  }

  const priceId = getPriceIdByPlan(plan)
  if (!priceId || typeof priceId !== 'string') {
    return NextResponse.json(
      { message: 'Stripe price ID is not configured for this plan' },
      { status: 500 }
    )
  }

  const siteUrl = getSiteUrl(req)

  try {
    const price = await stripe.prices.retrieve(priceId)

    if (!price.active) {
      return NextResponse.json(
        { message: 'Stripe price is inactive' },
        { status: 500 }
      )
    }

    if (price.type !== 'recurring') {
      return NextResponse.json(
        { message: 'Stripe price must be recurring for subscription checkout' },
        { status: 500 }
      )
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to retrieve Stripe price'

    console.error('Stripe price validation failed', {
      message,
      userId: user.id,
      plan,
      priceId,
    })

    return NextResponse.json({ message }, { status: 500 })
  }

  const { billingStartDateLabel, cancelDeadlineLabel } =
    formatTrialEndDateParts()
  const priceLabel = plan === 'yearly' ? '￥19,800/年' : '￥2,480/月'

  const sessionMetadata = { user_id: user.id, plan }

  console.log('CHECKOUT USER ID:', user.id)
  console.log('CHECKOUT SESSION METADATA:', sessionMetadata)
  console.log('CHECKOUT STRIPE CUSTOMER ID:', stripeCustomerId || '(none)')
  console.log('CHECKOUT CUSTOMER EMAIL:', customerEmail || '(none)')

  try {
    console.info('Creating Stripe checkout session', {
      userId: user.id,
      plan,
      priceId,
      hasStripeCustomerId: Boolean(stripeCustomerId),
      hasCustomerEmail: Boolean(customerEmail),
      siteUrl,
      trialDays: TRIAL_DAYS,
      billingStartDateLabel,
      cancelDeadlineLabel,
      priceLabel,
    })

    let finalCustomerId = stripeCustomerId

    if (!finalCustomerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          user_id: user.id,
          plan,
        },
      })

      finalCustomerId = customer.id

      const { error: customerUpdateError } = await supabaseServer
        .from('user_profiles')
        .update({
          stripe_customer_id: finalCustomerId,
        })
        .eq('id', user.id)

      if (customerUpdateError) {
        console.error('Failed to save stripe_customer_id', {
          userId: user.id,
          customerId: finalCustomerId,
          message: customerUpdateError.message,
          details: customerUpdateError.details,
          hint: customerUpdateError.hint,
          code: customerUpdateError.code,
        })

        return NextResponse.json(
          { message: 'Failed to save Stripe customer' },
          { status: 500 }
        )
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: finalCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=cancel`,
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    })

    console.log('CHECKOUT SESSION CREATED:', {
      sessionId: session.id,
      clientReferenceId: session.client_reference_id,
      customer: session.customer,
      subscription: session.subscription,
      metadata: session.metadata,
    })

    if (session.url == null || session.url === '') {
      return NextResponse.json(
        { message: 'Stripe checkout URL was not created' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'

    console.error('Checkout failed', {
      message,
      userId: user.id,
      plan,
      priceId,
      hasStripeCustomerId: Boolean(stripeCustomerId),
      hasCustomerEmail: Boolean(customerEmail),
      siteUrl,
    })

    return NextResponse.json(
      {
        message,
        code: 'STRIPE_CHECKOUT_CREATE_FAILED',
      },
      { status: 500 }
    )
  }
}