/**
 * Content Safety Actions — Automatic Response to Anomalies
 *
 * Turns monitoring detection into protective action.
 * Pure logic + localStorage side effects only.
 *
 * Rules:
 * - critical → auto-rollback (if safe previous version exists)
 * - warning  → log + flag only
 * - NEVER rollback to draft or unvalidated
 * - NEVER loop rollback infinitely
 */

import type { ContentHealthSnapshot, AnomalyFlag, RegressionFlag } from './monitoring-types'
import type { ContentFlag } from './types'
import { evaluateContentHealth, compareVersionHealth } from './monitoring'
import type { ContentHealthInput } from './monitoring-types'
import { rollbackToVersion, getBundleInfo } from './lifecycle'

// ── Types ──

export type SafetyAction = 'none' | 'log' | 'rollback'

export type SafetyActionResult = {
  bundleId: string
  versionNumber: number
  action: SafetyAction
  anomalyFlags: AnomalyFlag[]
  regressionFlags: RegressionFlag[]
  contentFlags: ContentFlag[]
  rollbackTarget: number | null
  rollbackSuccess: boolean | null
  reason: string
  evaluatedAt: string
}

// ── Rollback guard — prevent infinite loops ──

const recentRollbacks = new Map<string, string>()
const ROLLBACK_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

function canRollback(bundleId: string): boolean {
  const last = recentRollbacks.get(bundleId)
  if (!last) return true
  return Date.now() - new Date(last).getTime() > ROLLBACK_COOLDOWN_MS
}

function recordRollback(bundleId: string): void {
  recentRollbacks.set(bundleId, new Date().toISOString())
}

// ── Flag conversion ──

function toContentFlags(anomalyFlags: AnomalyFlag[], regressionFlags: RegressionFlag[]): ContentFlag[] {
  const now = new Date().toISOString()
  const flags: ContentFlag[] = []

  for (const f of anomalyFlags) {
    flags.push({
      code: f.code,
      message: f.message,
      severity: f.severity,
      detectedAt: now,
    })
  }

  for (const r of regressionFlags) {
    flags.push({
      code: `regression:${r.metric}`,
      message: r.message,
      severity: Math.abs(r.delta) >= 0.20 ? 'critical' : 'warning',
      detectedAt: now,
    })
  }

  return flags
}

// ── Find safe rollback target ──

function findSafeRollbackTarget(bundleId: string, currentVersion: number): number | null {
  const bundle = getBundleInfo(bundleId)
  if (!bundle) return null

  // Look for an archived (previously published) or validated version
  // that is older than current and NOT at-risk
  const candidates = bundle.versions
    .filter((v) =>
      v.version < currentVersion &&
      (v.status === 'archived' || v.status === 'validated') &&
      !v.isAtRisk
    )
    .sort((a, b) => b.version - a.version) // newest first

  return candidates.length > 0 ? candidates[0].version : null
}

// ── Mark version flags in storage ──

function attachFlagsToVersion(
  bundleId: string,
  versionNumber: number,
  flags: ContentFlag[],
  isAtRisk: boolean,
): void {
  const bundle = getBundleInfo(bundleId)
  if (!bundle) return

  const version = bundle.versions.find((v) => v.version === versionNumber)
  if (!version) return

  version.flags = [...(version.flags ?? []), ...flags]
  version.isAtRisk = isAtRisk
  version.lastHealthCheckAt = new Date().toISOString()

  // Re-save via lifecycle's internal storage
  // We access the same localStorage key pattern
  try {
    const key = `nativeflow:content-bundle:${bundleId}`
    const value = JSON.stringify(bundle)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value)
    }
  } catch { /* non-blocking */ }
}

// ── Core: handle content health ──

export function handleContentHealth(
  input: ContentHealthInput,
  previousSnapshot?: ContentHealthSnapshot,
): SafetyActionResult {
  const now = new Date().toISOString()

  // Step 1 — evaluate health
  const snapshot = evaluateContentHealth(input)

  // Step 2 — collect regression flags
  let regressionFlags: RegressionFlag[] = []
  if (previousSnapshot) {
    const report = compareVersionHealth(snapshot, previousSnapshot)
    regressionFlags = report.regressions
  }

  // Step 3 — merge all flags
  const contentFlags = toContentFlags(snapshot.flags, regressionFlags)

  const hasCritical = snapshot.flags.some((f) => f.severity === 'critical') ||
    regressionFlags.some((r) => Math.abs(r.delta) >= 0.20)
  const hasWarning = snapshot.flags.some((f) => f.severity === 'warning') ||
    regressionFlags.length > 0

  // Step 4 — decide action
  let action: SafetyAction = 'none'
  let rollbackTarget: number | null = null
  let rollbackSuccess: boolean | null = null
  let reason = 'All metrics healthy'

  if (hasCritical) {
    action = 'rollback'
    reason = `Critical anomaly detected: ${contentFlags.filter((f) => f.severity === 'critical').map((f) => f.code).join(', ')}`

    // Safety checks before rollback
    if (!canRollback(input.bundleId)) {
      action = 'log'
      reason += ' — rollback skipped (cooldown active, possible loop)'
    } else {
      rollbackTarget = findSafeRollbackTarget(input.bundleId, input.versionNumber)
      if (rollbackTarget === null) {
        action = 'log'
        reason += ' — rollback skipped (no safe previous version)'
      }
    }
  } else if (hasWarning) {
    action = 'log'
    reason = `Warning flags: ${contentFlags.map((f) => f.code).join(', ')}`
  }

  // Step 5 — execute action
  // Always attach flags to version
  attachFlagsToVersion(
    input.bundleId,
    input.versionNumber,
    contentFlags,
    hasCritical,
  )

  if (action === 'rollback' && rollbackTarget !== null) {
    // eslint-disable-next-line no-console
    console.warn('[content-pipeline][safety] ROLLBACK triggered', {
      bundleId: input.bundleId,
      from: input.versionNumber,
      to: rollbackTarget,
      reason,
    })

    rollbackSuccess = rollbackToVersion(input.bundleId, rollbackTarget)
    if (rollbackSuccess) {
      recordRollback(input.bundleId)
    } else {
      reason += ' — rollback execution failed'
    }
  } else if (action === 'log') {
    // eslint-disable-next-line no-console
    console.warn('[content-pipeline][safety] WARNING logged', {
      bundleId: input.bundleId,
      version: input.versionNumber,
      flags: contentFlags.map((f) => f.code),
    })
  }

  return {
    bundleId: input.bundleId,
    versionNumber: input.versionNumber,
    action,
    anomalyFlags: snapshot.flags,
    regressionFlags,
    contentFlags,
    rollbackTarget,
    rollbackSuccess,
    reason,
    evaluatedAt: now,
  }
}
