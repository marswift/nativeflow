import 'server-only'

/**
 * Validated server-side secret environment variables.
 *
 * Throws at import time if any required secret is missing
 * (skipped in NODE_ENV === 'test').
 *
 * Usage:
 *   import { OPENAI_API_KEY } from '@/config/server-env'
 *
 * NEVER import this file from client components or files without 'use server'.
 */

const REQUIRED_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_MONTHLY_PRICE_ID',
  'STRIPE_YEARLY_PRICE_ID',
] as const

function validateSecrets(): void {
  if (process.env.NODE_ENV === 'test') return

  const missing = REQUIRED_SECRETS.filter(
    (key) => !process.env[key] || process.env[key]!.trim() === ''
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required server secrets:\n${missing.map((k) => `  ✗ ${k}`).join('\n')}\n` +
      'Copy .env.example to .env.local and fill in the values.'
    )
  }
}

validateSecrets()

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
export const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!
export const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!
export const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID!
export const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID!
