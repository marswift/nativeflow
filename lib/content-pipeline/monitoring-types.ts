/**
 * Content Quality Monitoring — Type Definitions
 *
 * Internal monitoring layer for detecting content quality regressions,
 * anomalous lesson patterns, and version-level health issues.
 */

// ── Aggregate input (from runtime stats) ──

export type StageAggregates = {
  starts: number
  completions: number
  retries: number
  silentAttempts: number
  dropoffs: number
}

export type ContentHealthInput = {
  bundleId: string
  versionNumber: number
  publishedAt: string
  /** Overall counts */
  totalStarts: number
  totalCompletions: number
  totalAbandonments: number
  totalCompletionSeconds: number
  /** Per-stage breakdown */
  stageStats: Record<string, StageAggregates>
  /** Optional segment breakdowns */
  byAgeGroup?: Record<string, { starts: number; completions: number }>
  byRegion?: Record<string, { starts: number; completions: number }>
}

// ── Health snapshot (computed output) ──

export type AnomalyFlag = {
  code: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  dimension?: string
}

export type ContentHealthSnapshot = {
  bundleId: string
  versionNumber: number
  publishedAt: string
  evaluatedAt: string
  totalStarts: number
  totalCompletions: number
  completionRate: number
  averageCompletionSeconds: number
  retryRateByStage: Record<string, number>
  dropoffRateByStage: Record<string, number>
  silentRateByStage: Record<string, number>
  flags: AnomalyFlag[]
  isHealthy: boolean
}

// ── Version regression ──

export type RegressionFlag = {
  metric: string
  previous: number
  current: number
  delta: number
  message: string
}

export type RegressionReport = {
  bundleId: string
  currentVersion: number
  previousVersion: number
  evaluatedAt: string
  regressions: RegressionFlag[]
  hasRegression: boolean
}
