import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getStripe, getPlanByPriceId } from '@/lib/stripe'

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
    console.log('[BILLING_WEBHOOK]', JSON.stringify({
      type: event.type,
      id: event.id,
      created: event.created,
      livemode: event.livemode,
    }))

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const userId =
          typeof session.metadata?.user_id === 'string'
            ? session.metadata.user_id.trim()
            : ''

        // ── Diamond pack purchase ──
        // Handled separately from subscription checkout.
        // Identified by metadata.purchase_type set in /api/diamonds/checkout.
        //
        // Fulfillment order (retry-safe with credited_at + atomic RPC):
        //   1. Check diamond_transactions for existing stripe_session_id
        //      a. If exists AND credited_at is set → fully processed, skip
        //      b. If exists AND credited_at is null → credit failed last time, retry via RPC
        //      c. If not exists → insert row (credited_at = null), then credit via RPC
        //   2. credit_diamonds RPC atomically: sets credited_at + increments total_diamonds
        //
        // The RPC sets credited_at BEFORE crediting inside one transaction.
        // If the row is already credited, the RPC raises an exception (idempotent).
        if (session.metadata?.purchase_type === 'diamond_pack') {
          const packId = session.metadata.pack_id ?? ''
          const diamondsStr = session.metadata.diamonds ?? '0'
          const diamonds = parseInt(diamondsStr, 10)
          const amountTotal = (session as unknown as Record<string, unknown>).amount_total as number | null

          console.log('WEBHOOK DIAMOND PACK PURCHASE:', {
            sessionId: session.id,
            userId,
            packId,
            diamonds,
            amountTotal,
          })

          if (!userId || !diamonds || diamonds <= 0) {
            console.error('WEBHOOK [diamond_pack]: invalid userId or diamonds', {
              sessionId: session.id,
              userId,
              diamonds,
            })
            break
          }

          // Step 1: Check existing transaction row
          const { data: existingTx, error: checkError } = await supabase
            .from('diamond_transactions')
            .select('id, credited_at')
            .eq('stripe_session_id', session.id)
            .maybeSingle()

          if (checkError) {
            console.error('WEBHOOK THROW [diamond_pack]: diamond_transactions table is required before diamond purchase fulfillment', {
              sessionId: session.id,
              message: checkError.message,
              code: (checkError as { code?: string }).code,
            })
            throw new Error(`diamond_transactions check failed: ${checkError.message}`)
          }

          // 1a. Fully processed — skip
          if (existingTx && existingTx.credited_at) {
            console.log('WEBHOOK [diamond_pack]: already processed (credited_at set), skipping', {
              sessionId: session.id,
              existingTxId: existingTx.id,
            })
            break
          }

          let txId: string

          if (existingTx) {
            // 1b. Transaction row exists but credited_at is null — credit failed last time
            console.log('WEBHOOK [diamond_pack]: transaction exists but credited_at is null — retrying credit', {
              sessionId: session.id,
              existingTxId: existingTx.id,
            })
            txId = existingTx.id
          } else {
            // 1c. New purchase — insert transaction row with credited_at = null
            const { data: insertedTx, error: txInsertError } = await supabase
              .from('diamond_transactions')
              .insert({
                user_id: userId,
                type: 'purchase',
                diamonds,
                amount_jpy: typeof amountTotal === 'number' ? amountTotal : null,
                source: 'stripe',
                stripe_session_id: session.id,
                credited_at: null,
              })
              .select('id')
              .single()

            if (txInsertError || !insertedTx) {
              console.error('WEBHOOK THROW [diamond_pack]: transaction insert failed — no diamonds credited', {
                userId,
                diamonds,
                sessionId: session.id,
                message: txInsertError?.message,
              })
              throw new Error(`diamond_transactions insert failed: ${txInsertError?.message}`)
            }

            txId = insertedTx.id
          }

          // Step 2: Atomic credit via RPC — sets credited_at + increments total_diamonds
          // in one transaction. If already credited, the RPC raises an exception (safe skip).
          const { error: rpcError } = await supabase.rpc('credit_diamonds', {
            p_user_id: userId,
            p_tx_id: txId,
            p_diamonds: diamonds,
          })

          if (rpcError) {
            // If the error is "already credited", this is a safe duplicate — skip
            if (rpcError.message?.includes('already credited')) {
              console.log('WEBHOOK [diamond_pack]: RPC reports already credited — safe skip', {
                sessionId: session.id,
                txId,
              })
              break
            }

            console.error('WEBHOOK THROW [diamond_pack]: credit_diamonds RPC failed — credited_at remains null for retry', {
              userId,
              diamonds,
              sessionId: session.id,
              txId,
              message: rpcError.message,
            })
            throw new Error(`credit_diamonds RPC failed: ${rpcError.message}`)
          }

          console.log('WEBHOOK [diamond_pack]: diamonds credited atomically', {
            userId,
            diamonds,
            txId,
          })

          break
        }

        // ── Subscription checkout (existing logic below) ──

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
          console.error('WEBHOOK THROW [checkout.session.completed]: missing userId', {
            sessionId: session.id,
            metadata: session.metadata,
            clientReferenceId: session.client_reference_id,
          })
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

        // Persist planned_plan_code from session metadata (if available)
        const checkoutPlanCode =
          session.metadata?.plan === 'yearly' ? 'yearly' :
          session.metadata?.plan === 'monthly' ? 'monthly' : null

        const { data: updatedRows, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: subscriptionStatus,
            subscription_current_period_end: subscriptionCurrentPeriodEnd,
            subscription_cancel_at_period_end: subscriptionCancelAtPeriodEnd,
            ...(checkoutPlanCode !== null && { planned_plan_code: checkoutPlanCode }),
          })
          .eq('id', userId)
          .select('id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end')

        if (updateError) {
          console.error('WEBHOOK THROW [checkout.session.completed]: Supabase updateError', {
            userId,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          })
          throw new Error(
            `FAILED TO UPDATE USER PROFILE FROM CHECKOUT SESSION: ${updateError.message}`
          )
        }

        if (!updatedRows || updatedRows.length === 0) {
          console.error('WEBHOOK THROW [checkout.session.completed]: zero updatedRows', {
            userId,
            customerId,
            subscriptionId,
          })
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
          console.error('WEBHOOK THROW [subscription.created/updated]: resolveUserIdForSubscription returned null', {
            eventType: event.type,
            subscriptionId: sub.id,
            customerId: sub.customer,
            metadata: sub.metadata,
          })
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

        // Derive plan from active price ID first (reliable after deferred downgrades),
        // then fall back to metadata.plan (set at checkout).
        const planCode = getPlanByPriceId(sub.items.data[0]?.price?.id) ??
          (sub.metadata?.plan === 'yearly' ? 'yearly' :
           sub.metadata?.plan === 'monthly' ? 'monthly' : null)

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
          console.error('WEBHOOK THROW [subscription.created/updated]: Supabase updateError', {
            userId,
            subscriptionId: sub.id,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          })
          throw new Error(
            `FAILED TO UPDATE USER PROFILE FROM SUBSCRIPTION EVENT: ${updateError.message}`
          )
        }

        if (!updatedRows || updatedRows.length === 0) {
          console.error('WEBHOOK THROW [subscription.created/updated]: zero updatedRows', {
            userId,
            subscriptionId: sub.id,
            customerId,
            storedSubId,
          })
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
          console.error('WEBHOOK THROW [subscription.deleted]: resolveUserIdForSubscription returned null', {
            subscriptionId: sub.id,
            customerId: sub.customer,
            metadata: sub.metadata,
          })
          throw new Error(
            `Could not resolve user for subscription delete event. subscriptionId=${sub.id}`
          )
        }

        // Preserve period end so the user retains access until expiry
        const deletedPeriodEndTs = sub.items?.data[0]?.current_period_end ?? null
        const deletedPeriodEnd =
          typeof deletedPeriodEndTs === 'number'
            ? new Date(deletedPeriodEndTs * 1000).toISOString()
            : null

        const { data: updatedRows, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            subscription_status: 'canceled',
            subscription_cancel_at_period_end: true,
            ...(deletedPeriodEnd && { subscription_current_period_end: deletedPeriodEnd }),
          })
          .eq('id', userId)
          .select(
            'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_cancel_at_period_end, subscription_current_period_end'
          )

        if (updateError) {
          console.error('WEBHOOK THROW [subscription.deleted]: Supabase updateError', {
            userId,
            subscriptionId: sub.id,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          })
          throw new Error(
            `FAILED TO UPDATE USER PROFILE FROM SUBSCRIPTION DELETE: ${updateError.message}`
          )
        }

        if (!updatedRows || updatedRows.length === 0) {
          console.error('WEBHOOK THROW [subscription.deleted]: zero updatedRows', {
            userId,
            subscriptionId: sub.id,
            customerId,
          })
          throw new Error(
            `No user_profiles row updated from subscription delete. userId=${userId}, subscriptionId=${sub.id}`
          )
        }

        console.log('UPDATED USER PROFILE FROM SUBSCRIPTION DELETE:', updatedRows)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const invoiceRaw = event.data.object as unknown as Record<string, unknown>

        // Resolve subscription ID from invoice (Stripe SDK v20 compat)
        const paidSubId =
          typeof invoiceRaw.subscription === 'string' ? invoiceRaw.subscription.trim() :
          (typeof invoice.parent?.subscription_details?.subscription === 'string'
            ? invoice.parent.subscription_details.subscription.trim() : null)

        if (!paidSubId) {
          // One-time invoice (e.g. diamond purchase) — no subscription to update
          console.log('WEBHOOK [invoice.paid]: no subscription on invoice, skipping', { invoiceId: invoice.id })
          break
        }

        const paidSub = await stripe.subscriptions.retrieve(paidSubId)
        const paidUserId = await resolveUserIdForSubscription(paidSub)

        if (!paidUserId) {
          console.error('WEBHOOK THROW [invoice.paid]: could not resolve userId', {
            invoiceId: invoice.id,
            subscriptionId: paidSubId,
            customerId: invoice.customer,
          })
          throw new Error(`invoice.paid: could not resolve userId for subscription ${paidSubId}`)
        }

        const paidPeriodEndTs = paidSub.trial_end ?? paidSub.items.data[0]?.current_period_end ?? null
        const paidPeriodEnd = typeof paidPeriodEndTs === 'number' ? new Date(paidPeriodEndTs * 1000).toISOString() : null
        const paidPlanCode = getPlanByPriceId(paidSub.items.data[0]?.price?.id) ??
          (paidSub.metadata?.plan === 'yearly' ? 'yearly' :
           paidSub.metadata?.plan === 'monthly' ? 'monthly' : null)

        console.log('WEBHOOK [invoice.paid]: updating profile', {
          invoiceId: invoice.id,
          userId: paidUserId,
          subscriptionId: paidSubId,
          status: paidSub.status,
          periodEnd: paidPeriodEnd,
        })

        const { error: paidUpdateError } = await supabase
          .from('user_profiles')
          .update({
            stripe_subscription_id: paidSubId,
            subscription_status: paidSub.status,
            subscription_current_period_end: paidPeriodEnd,
            subscription_cancel_at_period_end: paidSub.cancel_at_period_end === true,
            ...(paidPlanCode !== null && { planned_plan_code: paidPlanCode }),
          })
          .eq('id', paidUserId)

        if (paidUpdateError) {
          console.error('WEBHOOK THROW [invoice.paid]: update failed', {
            userId: paidUserId,
            message: paidUpdateError.message,
          })
          throw new Error(`invoice.paid update failed: ${paidUpdateError.message}`)
        }

        console.log('WEBHOOK [invoice.paid]: profile updated', { userId: paidUserId, status: paidSub.status })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // Stripe SDK v20: subscription and payment_intent are nested or removed from
        // top-level Invoice type. Access safely via the raw event data object.
        const invoiceRaw = event.data.object as unknown as Record<string, unknown>

        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer.trim() : null
        const subscriptionId =
          typeof invoiceRaw.subscription === 'string' ? invoiceRaw.subscription.trim() :
          (typeof invoice.parent?.subscription_details?.subscription === 'string'
            ? invoice.parent.subscription_details.subscription.trim() : null)
        const paymentIntentId =
          typeof invoiceRaw.payment_intent === 'string' ? invoiceRaw.payment_intent.trim() : null

        // Resolve user for actor_user_id (best-effort)
        let userId: string | null = null
        if (customerId) {
          const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()
          userId = profileRow?.id ?? null
        }

        console.log('WEBHOOK INVOICE PAYMENT FAILED:', {
          invoiceId: invoice.id,
          customerId,
          subscriptionId,
          userId,
          amountDue: invoice.amount_due,
          currency: invoice.currency,
        })

        // Best-effort audit log — must not break webhook
        try {
          await supabase.from('admin_audit_log').insert({
            actor_user_id: userId,
            event_type: 'stripe_payment_failed',
            metadata: {
              stripe_event_id: event.id,
              stripe_event_type: event.type,
              customer: customerId,
              subscription: subscriptionId,
              invoice: invoice.id,
              payment_intent: paymentIntentId,
              amount_due: invoice.amount_due,
              currency: invoice.currency,
              failure_message: invoice.last_finalization_error?.message ?? null,
              created: invoice.created,
            },
          })
        } catch (auditErr) {
          console.error('Failed to log payment failure to admin_audit_log', auditErr)
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        // Stripe SDK v20: invoice may not be on the typed PaymentIntent. Access safely.
        const piRaw = event.data.object as unknown as Record<string, unknown>

        const customerId =
          typeof pi.customer === 'string' ? pi.customer.trim() : null
        const invoiceId =
          typeof piRaw.invoice === 'string' ? piRaw.invoice.trim() : null

        // Resolve user for actor_user_id (best-effort)
        let userId: string | null = null
        if (customerId) {
          const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()
          userId = profileRow?.id ?? null
        }

        console.log('WEBHOOK PAYMENT INTENT FAILED:', {
          paymentIntentId: pi.id,
          customerId,
          userId,
          amount: pi.amount,
          currency: pi.currency,
          failureMessage: pi.last_payment_error?.message,
        })

        // Best-effort audit log — must not break webhook
        try {
          await supabase.from('admin_audit_log').insert({
            actor_user_id: userId,
            event_type: 'stripe_payment_failed',
            metadata: {
              stripe_event_id: event.id,
              stripe_event_type: event.type,
              customer: customerId,
              payment_intent: pi.id,
              invoice: invoiceId,
              amount_due: pi.amount,
              currency: pi.currency,
              failure_message: pi.last_payment_error?.message ?? null,
              failure_code: pi.last_payment_error?.code ?? null,
              created: pi.created,
            },
          })
        } catch (auditErr) {
          console.error('Failed to log payment_intent failure to admin_audit_log', auditErr)
        }

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
    console.error('WEBHOOK CATCH — final error handler', {
      eventType: event.type,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}