import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, getPriceIdByPlan, getYearlyPriceId } from '@/lib/stripe'

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const body = await req.json()
    const { plan } = body as { plan: 'monthly' | 'yearly' }

    if (plan !== 'monthly' && plan !== 'yearly') {
      return NextResponse.json({ message: 'Invalid plan' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // DBからsubscription id取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_subscription_id) {
      return NextResponse.json({ message: 'Subscription not found' }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id
    )

    const item = subscription.items.data.find(item => item.price?.id)

    if (!item) {
      return NextResponse.json({ message: 'Subscription item not found' }, { status: 400 })
    }
    
    const itemId = item.id

    const priceId = getPriceIdByPlan(plan)
    const currentPriceId = item.price?.id ?? ''
    const isDowngrade = currentPriceId === getYearlyPriceId() && plan === 'monthly'

    if (isDowngrade) {
      // Yearly → Monthly: defer to next billing period
      await stripe.subscriptions.update(subscription.id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'none',
        billing_cycle_anchor: 'unchanged',
      })
    } else {
      // Monthly → Yearly: apply immediately with proration
      await stripe.subscriptions.update(subscription.id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'create_prorations',
      })
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(isDowngrade
        ? { next_plan_code: plan }
        : { planned_plan_code: plan, next_plan_code: null }
      )
      .eq('id', user.id)

    if (updateError) {
      console.error(updateError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: 'Failed to change plan' },
      { status: 500 }
    )
  }
}