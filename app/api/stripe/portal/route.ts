import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getStripe, getStripePortalSessionParams } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
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

  const { data: profile, error: profileError } = await supabaseServer
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Portal profile fetch failed', {
      userId: user.id,
      error: profileError,
    })
    return NextResponse.json({ message: 'Failed to load billing profile' }, { status: 500 })
  }

  const stripeCustomerId =
    typeof profile?.stripe_customer_id === 'string'
      ? profile.stripe_customer_id.trim()
      : ''

  if (!stripeCustomerId) {
    return NextResponse.json(
      { message: 'Stripe customer not found for this user' },
      { status: 400 }
    )
  }

  try {
    const session = await getStripe().billingPortal.sessions.create(
      getStripePortalSessionParams(stripeCustomerId)
    )

    if (!session.url) {
      console.error('[BILLING_PORTAL] session created but URL missing', { userId: user.id, stripeCustomerId })
      return NextResponse.json(
        { message: 'Stripe portal URL was not created' },
        { status: 500 }
      )
    }

    console.log('[BILLING_PORTAL] session created', { userId: user.id, stripeCustomerId })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal creation failed'
    console.error('Stripe portal creation failed', {
      userId: user.id,
      stripeCustomerId,
      message,
    })
    return NextResponse.json({ message }, { status: 500 })
  }
}