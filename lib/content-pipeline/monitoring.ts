/**
 * Content Quality Monitoring — Health Evaluation & Anomaly Detection
 *
 * Pure functions. No side effects, no DB access.
 * Consumes aggregated runtime stats and produces health snapshots + flags.
 *
 * Anomaly rules are simple, deterministic, and explainable.
 */

import type {
  ContentHealthInput,
  ContentHealthSnapshot,
  AnomalyFlag,
  RegressionReport,
  RegressionFlag,
} from './monitoring-types'

// ── Thresholds ──

const COMPLETION_RATE_CRITICAL = 0.35
const COMPLETION_RATE_WARNING = 0.50
const RETRY_RATE_WARNING = 0.30
const RETRY_RATE_CRITICAL = 0.45
const SILENT_RATE_WARNING = 0.20
const SILENT_RATE_CRITICAL = 0.35
const DROPOFF_RATE_WARNING = 0.25
const DROPOFF_RATE_CRITICAL = 0.40
const SEGMENT_UNDERPERFORM_DELTA = 0.20
const REGRESSION_DELTA_WARNING = 0.10
const REGRESSION_DELTA_CRITICAL = 0.20

// ── Rate helpers ──

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 1000
}

// ── Main evaluation ──

export function evaluateContentHealth(input: ContentHealthInput): ContentHealthSnapshot {
  const flags: AnomalyFlag[] = []

  const completionRate = rate(input.totalCompletions, input.totalStarts)
  const avgSeconds = input.totalCompletions > 0
    ? Math.round(input.totalCompletionSeconds / input.totalCompletions)
    : 0

  // Per-stage rates
  const retryRateByStage: Record<string, number> = {}
  const dropoffRateByStage: Record<string, number> = {}
  const silentRateByStage: Record<string, number> = {}

  for (const [stage, stats] of Object.entries(input.stageStats)) {
    const total = stats.starts
    retryRateByStage[stage] = rate(stats.retries, total)
    dropoffRateByStage[stage] = rate(stats.dropoffs, total)
    silentRateByStage[stage] = rate(stats.silentAttempts, total)
  }

  // ── Anomaly rules ──

  // 1. Completion anomaly
  if (completionRate < COMPLETION_RATE_CRITICAL) {
    flags.push({ code: 'low_completion_rate', message: `Completion rate ${(completionRate * 100).toFixed(1)}% is critically low`, severity: 'critical' })
  } else if (completionRate < COMPLETION_RATE_WARNING) {
    flags.push({ code: 'low_completion_rate', message: `Completion rate ${(completionRate * 100).toFixed(1)}% is below target`, severity: 'warning' })
  }

  // 2. Retry anomaly per stage
  for (const [stage, r] of Object.entries(retryRateByStage)) {
    if (r >= RETRY_RATE_CRITICAL) {
      flags.push({ code: 'high_retry_rate', message: `${stage} retry rate ${(r * 100).toFixed(1)}% is critical`, severity: 'critical', dimension: stage })
    } else if (r >= RETRY_RATE_WARNING) {
      flags.push({ code: 'high_retry_rate', message: `${stage} retry rate ${(r * 100).toFixed(1)}% is elevated`, severity: 'warning', dimension: stage })
    }
  }

  // 3. Silent anomaly per stage
  for (const [stage, r] of Object.entries(silentRateByStage)) {
    if (r >= SILENT_RATE_CRITICAL) {
      flags.push({ code: 'high_silent_rate', message: `${stage} silent rate ${(r * 100).toFixed(1)}% is critical`, severity: 'critical', dimension: stage })
    } else if (r >= SILENT_RATE_WARNING) {
      flags.push({ code: 'high_silent_rate', message: `${stage} silent rate ${(r * 100).toFixed(1)}% is elevated`, severity: 'warning', dimension: stage })
    }
  }

  // 4. Drop-off anomaly per stage
  for (const [stage, r] of Object.entries(dropoffRateByStage)) {
    if (r >= DROPOFF_RATE_CRITICAL) {
      flags.push({ code: 'high_dropoff_rate', message: `${stage} drop-off ${(r * 100).toFixed(1)}% is critical`, severity: 'critical', dimension: stage })
    } else if (r >= DROPOFF_RATE_WARNING) {
      flags.push({ code: 'high_dropoff_rate', message: `${stage} drop-off ${(r * 100).toFixed(1)}% is elevated`, severity: 'warning', dimension: stage })
    }
  }

  // 5. Segment anomaly (age)
  if (input.byAgeGroup) {
    for (const [age, seg] of Object.entries(input.byAgeGroup)) {
      const segRate = rate(seg.completions, seg.starts)
      if (seg.starts >= 5 && segRate < completionRate - SEGMENT_UNDERPERFORM_DELTA) {
        flags.push({
          code: 'segment_underperforming',
          message: `Age group "${age}" completion ${(segRate * 100).toFixed(1)}% is ${((completionRate - segRate) * 100).toFixed(1)}pp below global`,
          severity: 'warning',
          dimension: `age:${age}`,
        })
      }
    }
  }

  // 6. Segment anomaly (region)
  if (input.byRegion) {
    for (const [region, seg] of Object.entries(input.byRegion)) {
      const segRate = rate(seg.completions, seg.starts)
      if (seg.starts >= 5 && segRate < completionRate - SEGMENT_UNDERPERFORM_DELTA) {
        flags.push({
          code: 'segment_underperforming',
          message: `Region "${region}" completion ${(segRate * 100).toFixed(1)}% is ${((completionRate - segRate) * 100).toFixed(1)}pp below global`,
          severity: 'warning',
          dimension: `region:${region}`,
        })
      }
    }
  }

  const isHealthy = flags.filter((f) => f.severity === 'critical').length === 0

  return {
    bundleId: input.bundleId,
    versionNumber: input.versionNumber,
    publishedAt: input.publishedAt,
    evaluatedAt: new Date().toISOString(),
    totalStarts: input.totalStarts,
    totalCompletions: input.totalCompletions,
    completionRate,
    averageCompletionSeconds: avgSeconds,
    retryRateByStage,
    dropoffRateByStage,
    silentRateByStage,
    flags,
    isHealthy,
  }
}

// ── Version regression comparison ──

export function compareVersionHealth(
  current: ContentHealthSnapshot,
  previous: ContentHealthSnapshot,
): RegressionReport {
  const regressions: RegressionFlag[] = []

  // Completion rate regression
  const completionDelta = previous.completionRate - current.completionRate
  if (completionDelta >= REGRESSION_DELTA_CRITICAL) {
    regressions.push({
      metric: 'completionRate',
      previous: previous.completionRate,
      current: current.completionRate,
      delta: -completionDelta,
      message: `Completion rate dropped ${(completionDelta * 100).toFixed(1)}pp (critical)`,
    })
  } else if (completionDelta >= REGRESSION_DELTA_WARNING) {
    regressions.push({
      metric: 'completionRate',
      previous: previous.completionRate,
      current: current.completionRate,
      delta: -completionDelta,
      message: `Completion rate dropped ${(completionDelta * 100).toFixed(1)}pp`,
    })
  }

  // Per-stage retry regression
  for (const stage of Object.keys(current.retryRateByStage)) {
    const prevRate = previous.retryRateByStage[stage] ?? 0
    const currRate = current.retryRateByStage[stage] ?? 0
    const delta = currRate - prevRate
    if (delta >= REGRESSION_DELTA_WARNING) {
      regressions.push({
        metric: `retryRate.${stage}`,
        previous: prevRate,
        current: currRate,
        delta,
        message: `${stage} retry rate increased ${(delta * 100).toFixed(1)}pp`,
      })
    }
  }

  // Per-stage dropoff regression
  for (const stage of Object.keys(current.dropoffRateByStage)) {
    const prevRate = previous.dropoffRateByStage[stage] ?? 0
    const currRate = current.dropoffRateByStage[stage] ?? 0
    const delta = currRate - prevRate
    if (delta >= REGRESSION_DELTA_WARNING) {
      regressions.push({
        metric: `dropoffRate.${stage}`,
        previous: prevRate,
        current: currRate,
        delta,
        message: `${stage} drop-off increased ${(delta * 100).toFixed(1)}pp`,
      })
    }
  }

  return {
    bundleId: current.bundleId,
    currentVersion: current.versionNumber,
    previousVersion: previous.versionNumber,
    evaluatedAt: new Date().toISOString(),
    regressions,
    hasRegression: regressions.length > 0,
  }
}
