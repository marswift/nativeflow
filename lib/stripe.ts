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

/** Returns null if value is missing or blank. */
function optionalEnv(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Single place for Stripe API version; typed so SDK compatibility is explicit. */
const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2026-02-25.clover'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  const secretKey = requireEnv(
    'STRIPE_SECRET_KEY',
    process.env.STRIPE_SECRET_KEY
  )

  stripeClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  })

  return stripeClient
}

export type BillingPlanCode = 'monthly' | 'yearly'

export function getMonthlyPriceId(): string {
  return requireEnv(
    'STRIPE_MONTHLY_PRICE_ID',
    process.env.STRIPE_MONTHLY_PRICE_ID
  )
}

export function getYearlyPriceId(): string {
  return requireEnv(
    'STRIPE_YEARLY_PRICE_ID',
    process.env.STRIPE_YEARLY_PRICE_ID
  )
}

export function getPriceIdByPlan(plan: BillingPlanCode): string {
  return plan === 'monthly' ? getMonthlyPriceId() : getYearlyPriceId()
}

/** Derive plan code from a Stripe price ID. Returns null if unrecognized. */
export function getPlanByPriceId(priceId: string | null | undefined): BillingPlanCode | null {
  if (!priceId) return null
  if (priceId === getMonthlyPriceId()) return 'monthly'
  if (priceId === getYearlyPriceId()) return 'yearly'
  return null
}

export function normalizePlanCode(value: unknown): BillingPlanCode | null {
  if (value === 'monthly' || value === 'yearly') {
    return value
  }
  return null
}

export function getStripePortalSessionParams(customerId: string) {
  const stripePortalReturnUrl = optionalEnv(
    process.env.STRIPE_PORTAL_RETURN_URL
  )
  const stripePortalConfigurationId = optionalEnv(
    process.env.STRIPE_PORTAL_CONFIGURATION_ID
  )

  if (!stripePortalReturnUrl) {
    throw new Error('STRIPE_PORTAL_RETURN_URL is not set')
  }

  if (!stripePortalConfigurationId) {
    throw new Error('STRIPE_PORTAL_CONFIGURATION_ID is not set')
  }

  return {
    customer: customerId,
    return_url: stripePortalReturnUrl,
    configuration: stripePortalConfigurationId,
  } as const
}