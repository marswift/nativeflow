import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { stripe, getPriceIdByPlan, normalizePlanCode } from '@/lib/stripe'
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

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const customerEmail = (user.email ?? '').trim()
  if (!customerEmail) {
    return NextResponse.json(
      { message: 'User email is required for checkout' },
      { status: 400 }
    )
  }

  const priceId = getPriceIdByPlan(plan)
  const siteUrl = getSiteUrl(req)

  const { billingStartDateLabel, cancelDeadlineLabel } = formatTrialEndDateParts()
  const priceLabel = plan === 'yearly' ? '￥19,800/年' : '￥2,480/月'

  /** Must stay aligned with webhook metadata contract. */
  const sessionMetadata = { user_id: user.id, plan }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: customerEmail,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/#pricing`,
      custom_text: {
        submit: {
          message: `最初の決済は、${priceLabel}、${billingStartDateLabel}以降です。${cancelDeadlineLabel}までに解約手続きをした場合、料金はかかりません。`,
        },
      },
      metadata: sessionMetadata,
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: sessionMetadata,
      },
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
      userId: user?.id ?? undefined,
      plan,
      priceId,
    })
    return NextResponse.json({ message }, { status: 500 })
  }
}
