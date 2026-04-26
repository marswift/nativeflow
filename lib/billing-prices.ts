/**
 * Single source of truth for plan display prices.
 * Update here when Stripe prices change — all UI reads from this file.
 */

export const PLAN_PRICES = {
  monthly: {
    amountJpy: 2480,
    labelJa: '¥2,480/月',
    shortJa: '¥2,480',
  },
  yearly: {
    amountJpy: 19800,
    labelJa: '¥19,800/年',
    shortJa: '¥19,800',
    discountLabel: '33%お得',
  },
} as const
