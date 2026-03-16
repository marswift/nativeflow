import 'server-only'
import Stripe from 'stripe'

/** Throws if value is missing or blank. */
function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`${name} is not set`)
  }
  return trimmed
}

export const STRIPE_SECRET_KEY = requireEnv(
  'STRIPE_SECRET_KEY',
  process.env.STRIPE_SECRET_KEY
)
export const STRIPE_MONTHLY_PRICE_ID = requireEnv(
  'STRIPE_MONTHLY_PRICE_ID',
  process.env.STRIPE_MONTHLY_PRICE_ID
)
export const STRIPE_YEARLY_PRICE_ID = requireEnv(
  'STRIPE_YEARLY_PRICE_ID',
  process.env.STRIPE_YEARLY_PRICE_ID
)
export const STRIPE_PORTAL_RETURN_URL = requireEnv(
  'STRIPE_PORTAL_RETURN_URL',
  process.env.STRIPE_PORTAL_RETURN_URL
)

/** Single place for Stripe API version; typed so SDK compatibility is explicit. */
const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2026-02-25.clover'
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
})

export type BillingPlanCode = 'monthly' | 'yearly'

export function getPriceIdByPlan(plan: BillingPlanCode): string {
  return plan === 'monthly' ? STRIPE_MONTHLY_PRICE_ID : STRIPE_YEARLY_PRICE_ID
}

export function normalizePlanCode(value: unknown): BillingPlanCode | null {
  if (value === 'monthly' || value === 'yearly') {
    return value
  }
  return null
}
