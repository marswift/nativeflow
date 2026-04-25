/**
 * POST /api/diamonds/checkout
 *
 * Creates a Stripe Checkout Session for a one-time diamond pack purchase.
 * Auth required. Returns { url } for client redirect.
 *
 * Webhook fulfillment (crediting diamonds + logging transaction) is handled
 * separately in the Stripe webhook route under checkout.session.completed.
 * The webhook identifies diamond purchases via metadata.purchase_type === 'diamond_pack'.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { getDiamondPack } from '@/lib/diamond-packs'

/** Base URL for redirects. */
function getSiteUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  const trimmed = typeof fromEnv === 'string' ? fromEnv.trim() : ''
  const base = trimmed.length > 0 ? trimmed : req.nextUrl.origin
  return base.replace(/\/+$/, '')
}

export async function POST(req: NextRequest) {
  // ── Auth ──
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // ── Validate pack ──
  let body: { packId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
  }

  const packId = typeof body.packId === 'string' ? body.packId.trim() : ''
  const pack = getDiamondPack(packId)

  if (!pack) {
    return NextResponse.json({ message: 'Invalid pack' }, { status: 400 })
  }

  // ── Resolve or create Stripe customer ──
  const { data: profileRow } = await supabaseServer
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  let stripeCustomerId =
    typeof profileRow?.stripe_customer_id === 'string'
      ? profileRow.stripe_customer_id.trim()
      : ''

  const stripe = getStripe()

  if (!stripeCustomerId) {
    const customerEmail = (user.email ?? '').trim()
    if (!customerEmail) {
      return NextResponse.json({ message: 'User email is required' }, { status: 400 })
    }

    const customer = await stripe.customers.create({
      email: customerEmail,
      metadata: { user_id: user.id },
    })

    stripeCustomerId = customer.id

    const { error: updateError } = await supabaseServer
      .from('user_profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save stripe_customer_id for diamond checkout', {
        userId: user.id,
        customerId: stripeCustomerId,
        message: updateError.message,
      })
      return NextResponse.json({ message: 'Failed to save Stripe customer' }, { status: 500 })
    }
  }

  // ── Create Checkout Session ──
  const siteUrl = getSiteUrl(req)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            unit_amount: pack.priceJpy,
            product_data: {
              name: `Diamond Pack — ${pack.diamonds} Diamonds`,
              description: `${pack.diamonds} diamonds for NativeFlow`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        purchase_type: 'diamond_pack',
        pack_id: pack.id,
        diamonds: String(pack.diamonds),
      },
      success_url: `${siteUrl}/rewards?purchase=success`,
      cancel_url: `${siteUrl}/rewards?purchase=cancel`,
    })

    if (!session.url) {
      return NextResponse.json({ message: 'Stripe session URL was not created' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    console.error('Diamond checkout failed', {
      userId: user.id,
      packId: pack.id,
      message,
    })
    return NextResponse.json({ message }, { status: 500 })
  }
}
