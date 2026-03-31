import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ← 必須
)

async function resolveUserIdForSubscription(
  subscription: Stripe.Subscription
): Promise<string | null> {
  // Strategy 1: subscription metadata (set via subscription_data.metadata at checkout)
  const metadataUserId = subscription.metadata?.user_id?.trim()
  if (metadataUserId) return metadataUserId

  // Strategy 2: DB lookup by stripe_subscription_id
  const subscriptionId =
    typeof subscription.id === 'string' ? subscription.id.trim() : ''
  if (subscriptionId) {
    const { data: profileRow, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (error) {
      console.error('Failed to resolve user by stripe_subscription_id', {
        subscriptionId,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    }

    if (typeof profileRow?.id === 'string') return profileRow.id
  }

  // Strategy 3: DB lookup by stripe_customer_id (always available — saved before checkout)
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer.trim()
      : ''
  if (customerId) {
    const { data: profileRow, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (error) {
      console.error('Failed to resolve user by stripe_customer_id', {
        customerId,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    }

    if (typeof profileRow?.id === 'string') return profileRow.id
  }

  return null
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature error', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    console.log('WEBHOOK EVENT TYPE:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const userId =
          typeof session.metadata?.user_id === 'string'
            ? session.metadata.user_id.trim()
            : ''

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription.trim()
            : null

        const customerId =
          typeof session.customer === 'string'
            ? session.customer.trim()
            : null

        console.log('WEBHOOK CHECKOUT SESSION:', {
          sessionId: session.id,
          userId,
          clientReferenceId: session.client_reference_id,
          customer: session.customer,
          subscriptionId,
          metadata: session.metadata,
        })

        if (!userId) {
          throw new Error('checkout.session.completed missing userId')
        }

        let subscriptionStatus: string | null = 'trialing'
        let subscriptionCurrentPeriodEnd: string | null = null
        let subscriptionCancelAtPeriodEnd = false

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          console.log('RETRIEVED SUBSCRIPTION FROM STRIPE:', {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.items?.data[0]?.current_period_end ?? null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_end: subscription.trial_end,
            cancel_at: subscription.cancel_at,
            canceled_at: subscription.canceled_at,
            metadata: subscription.metadata,
          })

          subscriptionStatus = subscription.status
          const periodEndTs = subscription.trial_end ?? subscription.items.data[0]?.current_period_end ?? null
          subscriptionCurrentPeriodEnd =
            typeof periodEndTs === 'number'
              ? new Date(periodEndTs * 1000).toISOString()
              : null
          subscriptionCancelAtPeriodEnd =
            subscription.cancel_at_period_end === true
        }

        console.log('ABOUT TO UPDATE USER PROFILE FROM CHECKOUT SESSION:', {
          userId,
          customerId,
          subscriptionId,
          subscriptionStatus,
          subscriptionCurrentPeriodEnd,
          subscriptionCancelAtPeriodEnd,
        })

        const { data: updatedRows, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: subscriptionStatus,
            subscription_current_period_end: subscriptionCurrentPeriodEnd,
            subscription_cancel_at_period_end: subscriptionCancelAtPeriodEnd,
          })
          .eq('id', userId)
          .select('id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end')

        if (updateError) {
          throw new Error(
            `FAILED TO UPDATE USER PROFILE FROM CHECKOUT SESSION: ${updateError.message}`
          )
        }

        if (!updatedRows || updatedRows.length === 0) {
          throw new Error(
            `No user_profiles row updated from checkout.session.completed. userId=${userId}`
          )
        }

        console.log('UPDATED USER PROFILE FROM CHECKOUT SESSION:', updatedRows)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription

        const userId = await resolveUserIdForSubscription(sub)
        const customerId =
          typeof sub.customer === 'string' ? sub.customer.trim() : null

        console.log('WEBHOOK SUBSCRIPTION EVENT:', {
          subscriptionId: sub.id,
          status: sub.status,
          userId,
          customer: sub.customer,
          metadata: sub.metadata,
          current_period_end: sub.items?.data[0]?.current_period_end ?? null,
          cancel_at_period_end: sub.cancel_at_period_end,
        })

        if (!userId) {
          throw new Error(
            `Could not resolve user for subscription event. type=${event.type}, subscriptionId=${sub.id}`
          )
        }

        // Guard: skip stale subscription events that would overwrite a newer subscription
        const { data: currentRow } = await supabase
          .from('user_profiles')
          .select('stripe_subscription_id')
          .eq('id', userId)
          .maybeSingle()

        const storedSubId = currentRow?.stripe_subscription_id ?? null
        if (
          storedSubId &&
          storedSubId !== sub.id &&
          sub.status !== 'active' &&
          sub.status !== 'trialing'
        ) {
          console.log('SKIPPING STALE SUBSCRIPTION EVENT:', {
            eventSubId: sub.id,
            eventStatus: sub.status,
            storedSubId,
          })
          break
        }

        const planCode = sub.metadata?.plan === 'yearly' ? 'yearly' :
                 sub.metadata?.plan === 'monthly' ? 'monthly' : null

        const { data: updatedRows, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            subscription_current_period_end: (() => {
              const ts = sub.trial_end ?? sub.items.data[0]?.current_period_end ?? null
              return typeof ts === 'number' ? new Date(ts * 1000).toISOString() : null
            })(),
            subscription_cancel_at_period_end: sub.cancel_at_period_end === true,
            ...(planCode !== null && { planned_plan_code: planCode }),
          })
          .eq('id', userId)
          .select(
            'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end'
          )

        if (updateError) {
          throw new Error(
            `FAILED TO UPDATE USER PROFILE FROM SUBSCRIPTION EVENT: ${updateError.message}`
          )
        }

        if (!updatedRows || updatedRows.length === 0) {
          throw new Error(
            `No user_profiles row updated from subscription event. userId=${userId}, subscriptionId=${sub.id}`
          )
        }

        console.log('UPDATED USER PROFILE FROM SUBSCRIPTION EVENT:', updatedRows)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription

        const userId = await resolveUserIdForSubscription(sub)
        const customerId =
          typeof sub.customer === 'string' ? sub.customer.trim() : null

        console.log('WEBHOOK SUBSCRIPTION DELETED:', {
          subscriptionId: sub.id,
          status: sub.status,
          userId,
          customer: sub.customer,
          metadata: sub.metadata,
        })

        if (!userId) {
          throw new Error(
            `Could not resolve user for subscription delete event. subscriptionId=${sub.id}`
          )
        }

        const { data: updatedRows, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            subscription_status: 'canceled',
            subscription_cancel_at_period_end: true,
          })
          .eq('id', userId)
          .select(
            'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_cancel_at_period_end'
          )

        if (updateError) {
          throw new Error(
            `FAILED TO UPDATE USER PROFILE FROM SUBSCRIPTION DELETE: ${updateError.message}`
          )
        }

        if (!updatedRows || updatedRows.length === 0) {
          throw new Error(
            `No user_profiles row updated from subscription delete. userId=${userId}, subscriptionId=${sub.id}`
          )
        }

        console.log('UPDATED USER PROFILE FROM SUBSCRIPTION DELETE:', updatedRows)
        break
      }

      case 'subscription_schedule.updated': {
        const schedule = event.data.object as Stripe.SubscriptionSchedule
      
        const subscription = schedule.subscription
        if (typeof subscription !== 'string') break
      
        const { data: profileRow } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription)
          .maybeSingle()
      
        if (!profileRow?.id) break
      
        const currentPhaseEnd = schedule.current_phase?.end_date
        const phases = schedule.phases ?? []
        const nextPhase = phases.find((p) => 
          typeof currentPhaseEnd === 'number' && p.start_date === currentPhaseEnd
        )
      
        if (!nextPhase) break
      
        const nextPriceId = nextPhase.items?.[0]?.price
        const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID
        const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID
      
        const nextPlanCode =
          nextPriceId === yearlyPriceId ? 'yearly' :
          nextPriceId === monthlyPriceId ? 'monthly' : null
      
        if (!nextPlanCode) break
      
        await supabase
          .from('user_profiles')
          .update({ next_plan_code: nextPlanCode })
          .eq('id', profileRow.id)
      
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}