/**
 * Runtime environment flags — safe for both client and server.
 *
 * No secrets. No side effects. Pure derivations from NODE_ENV and
 * NEXT_PUBLIC_* variables.
 */

export const isDev = process.env.NODE_ENV === 'development'
export const isTest = process.env.NODE_ENV === 'test'
export const isProd = process.env.NODE_ENV === 'production'

export const featureFlags = {
  i18nEnabled: process.env.NEXT_PUBLIC_FF_I18N_ENABLED === 'true',
} as const
