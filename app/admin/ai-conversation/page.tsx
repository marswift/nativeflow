'use client'

/**
 * AI Conversation Analytics Dashboard
 *
 * Reads ai_conv_turn / ai_conv_complete / ai_conv_error events from lesson_events.
 * Thresholds and status colors per NativeFlow Admin Dashboard Metrics Guide.
 * Admin-only. Read-only. Non-blocking.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../../lib/admin-guard'

// ── Types ──

type TurnRow = {
  metadata: {
    turn?: number
    matchedScene?: string | null
    userInputType?: string
    selectedDimension?: string | null
    usedFallback?: boolean
    clarifyTriggered?: boolean
    offTopicTriggered?: boolean
    wrapTriggered?: boolean
    responseLatencyMs?: number
    totalMs?: number
    sttMs?: number
  } | null
  created_at: string
}

type CompleteRow = {
  metadata: {
    turnCount?: number
    matchedScene?: string | null
    coveredDimensions?: number
    completionReached?: boolean
  } | null
  created_at: string
}

type ErrorRow = {
  metadata: {
    turn?: number
    error?: string
    llmMs?: number
    totalMs?: number
  } | null
  created_at: string
}

type AggregatedMetrics = {
  totalTurns: number
  totalConversations: number
  sceneRanking: { scene: string; count: number }[]
  fallbackRate: number
  clarifyRate: number
  offTopicRate: number
  wrapRate: number
  completionRate: number
  medianSttMs: number
  medianAiMs: number
  medianTotalMs: number
  p95AiMs: number
  p95TotalMs: number
  dimensionFrequency: { dimension: string; count: number }[]
  sceneHealth: {
    scene: string
    turns: number
    fallbackPct: number
    clarifyPct: number
    completions: number
    medianLatency: number
  }[]
  recentErrors: { time: string; error: string; turn: number; llmMs: number }[]
}

// ── Threshold helpers (Metrics Guide §1–§7, §12) ──

type Status = 'excellent' | 'healthy' | 'warning' | 'critical'

const STATUS_DOT: Record<Status, string> = {
  excellent: 'bg-emerald-400',
  healthy:   'bg-green-400',
  warning:   'bg-amber-400',
  critical:  'bg-red-400',
}

const STATUS_BORDER: Record<Status, string> = {
  excellent: 'border-emerald-200',
  healthy:   'border-gray-200',
  warning:   'border-amber-200',
  critical:  'border-red-200',
}

/** Higher-is-better metric (completion) */
function statusHigherBetter(v: number, excellent: number, healthy: number, warning: number): Status {
  if (v >= excellent) return 'excellent'
  if (v >= healthy) return 'healthy'
  if (v >= warning) return 'warning'
  return 'critical'
}

/** Lower-is-better metric (fallback, latency) */
function statusLowerBetter(v: number, excellent: number, healthy: number, warning: number): Status {
  if (v <= excellent) return 'excellent'
  if (v <= healthy) return 'healthy'
  if (v <= warning) return 'warning'
  return 'critical'
}

/** Clarify has a sweet-spot range */
function statusClarify(v: number): Status {
  if (v >= 5 && v <= 12) return 'excellent'
  if (v <= 18) return 'healthy'
  if (v <= 30) return 'warning'
  return 'critical'
}

// ── Math helpers ──

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function median(arr: number[]): number {
  return percentile(arr, 50)
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100)
}

// ── Aggregation ──

function aggregate(turns: TurnRow[], completes: CompleteRow[], errors: ErrorRow[]): AggregatedMetrics {
  const totalTurns = turns.length
  const totalConversations = completes.length

  const sceneCounts = new Map<string, number>()
  const sceneData = new Map<string, { turns: number; fallbacks: number; clarifies: number; latencies: number[] }>()
  const dimCounts = new Map<string, number>()
  const sttArr: number[] = []
  const aiArr: number[] = []
  const totalArr: number[] = []
  let fallbacks = 0
  let clarifies = 0
  let offTopics = 0
  let wraps = 0

  for (const t of turns) {
    const m = t.metadata
    if (!m) continue

    const scene = m.matchedScene ?? '(generic)'
    sceneCounts.set(scene, (sceneCounts.get(scene) ?? 0) + 1)

    if (!sceneData.has(scene)) sceneData.set(scene, { turns: 0, fallbacks: 0, clarifies: 0, latencies: [] })
    const sd = sceneData.get(scene)!
    sd.turns++

    if (m.usedFallback) { fallbacks++; sd.fallbacks++ }
    if (m.clarifyTriggered) { clarifies++; sd.clarifies++ }
    if (m.offTopicTriggered) offTopics++
    if (m.wrapTriggered) wraps++

    if (m.selectedDimension) dimCounts.set(m.selectedDimension, (dimCounts.get(m.selectedDimension) ?? 0) + 1)

    if (typeof m.sttMs === 'number') sttArr.push(m.sttMs)
    if (typeof m.responseLatencyMs === 'number') { aiArr.push(m.responseLatencyMs); sd.latencies.push(m.responseLatencyMs) }
    if (typeof m.totalMs === 'number') totalArr.push(m.totalMs)
  }

  const completions = completes.filter((c) => c.metadata?.completionReached).length
  const sceneCompleteCounts = new Map<string, number>()
  for (const c of completes) {
    const scene = c.metadata?.matchedScene ?? '(generic)'
    if (c.metadata?.completionReached) sceneCompleteCounts.set(scene, (sceneCompleteCounts.get(scene) ?? 0) + 1)
  }

  return {
    totalTurns,
    totalConversations,
    sceneRanking: [...sceneCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([scene, count]) => ({ scene, count })),
    fallbackRate: pct(fallbacks, totalTurns),
    clarifyRate: pct(clarifies, totalTurns),
    offTopicRate: pct(offTopics, totalTurns),
    wrapRate: pct(wraps, totalTurns),
    completionRate: pct(completions, totalConversations),
    medianSttMs: median(sttArr),
    medianAiMs: median(aiArr),
    medianTotalMs: median(totalArr),
    p95AiMs: percentile(aiArr, 95),
    p95TotalMs: percentile(totalArr, 95),
    dimensionFrequency: [...dimCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([dimension, count]) => ({ dimension, count })),
    sceneHealth: [...sceneData.entries()]
      .sort((a, b) => b[1].turns - a[1].turns)
      .map(([scene, d]) => ({
        scene,
        turns: d.turns,
        fallbackPct: pct(d.fallbacks, d.turns),
        clarifyPct: pct(d.clarifies, d.turns),
        completions: sceneCompleteCounts.get(scene) ?? 0,
        medianLatency: median(d.latencies),
      })),
    recentErrors: errors
      .slice(0, 20)
      .map((e) => ({
        time: e.created_at,
        error: e.metadata?.error ?? 'unknown',
        turn: e.metadata?.turn ?? -1,
        llmMs: e.metadata?.llmMs ?? 0,
      })),
  }
}

// ── Styles ──

const CARD_BASE = 'rounded-2xl bg-white p-5 shadow-sm border'
const METRIC_LABEL = 'text-xs font-medium text-gray-500 uppercase tracking-wide'
const METRIC_VALUE = 'mt-1 text-2xl font-bold text-gray-900'
const TABLE_HEADER = 'px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase'
const TABLE_CELL = 'px-3 py-2 text-sm text-gray-700'

const STATUS_BADGE_STYLE: Record<Status, string> = {
  excellent: 'bg-emerald-100 text-emerald-800',
  healthy:   'bg-green-100 text-green-800',
  warning:   'bg-amber-100 text-amber-800',
  critical:  'bg-red-100 text-red-800',
}

const STATUS_BADGE_LABEL: Record<Status, string> = {
  excellent: 'Excellent',
  healthy:   'Healthy',
  warning:   'Warning',
  critical:  'Critical',
}

// ── Metric card config ──

type MetricConfig = {
  meaning: string
  ranges: string
  action: string | null
}

// ── Metric card with tooltip, badge, and action ──

function MetricCard({ label, value, unit, status, config, sub }: {
  label: string
  value: number | string
  unit?: string
  status: Status
  config: MetricConfig
  sub?: string
}) {
  const [showTip, setShowTip] = useState(false)
  const needsAction = status === 'warning' || status === 'critical'

  return (
    <div className={`${CARD_BASE} ${STATUS_BORDER[status]} relative`}>
      {/* Header: dot + label + info icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
          <p className={METRIC_LABEL}>{label}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTip(!showTip)}
          className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          aria-label={`Info: ${label}`}
        >
          ?
        </button>
      </div>

      {/* Value */}
      <p className={METRIC_VALUE}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-400">{unit}</span>}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}

      {/* Status badge */}
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_STYLE[status]}`}>
          {STATUS_BADGE_LABEL[status]}
        </span>
      </div>

      {/* Recommended action (warning/critical only) */}
      {needsAction && config.action && (
        <p className="mt-1.5 text-[11px] leading-snug text-amber-700">{config.action}</p>
      )}

      {/* Info tooltip */}
      {showTip && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold text-gray-700">{label}</p>
          <p className="mt-1 text-[11px] text-gray-500">{config.meaning}</p>
          <p className="mt-1.5 text-[11px] text-gray-400">{config.ranges}</p>
          {config.action && (
            <p className="mt-1.5 text-[11px] font-medium text-amber-700">Action: {config.action}</p>
          )}
          <button type="button" onClick={() => setShowTip(false)} className="mt-2 text-[10px] text-gray-400 hover:text-gray-600">Close</button>
        </div>
      )}
    </div>
  )
}

// ── Metric configs (Metrics Guide §1–§7) ──

const METRIC_CONFIGS = {
  completion: {
    meaning: 'Percentage of conversations that reached a natural end.',
    ranges: 'Excellent: 85%+ | Healthy: 75-84% | Warning: 60-74% | Critical: <60%',
    action: 'Shorten conversations, simplify questions, improve latency, reduce loops.',
  },
  fallback: {
    meaning: 'Percentage of turns using fallback instead of real AI response.',
    ranges: 'Excellent: <5% | Healthy: 5-10% | Warning: 10-20% | Critical: >20%',
    action: 'Check API timeout, use faster model, add retry strategy.',
  },
  clarify: {
    meaning: 'Percentage of turns requiring clarification. 5-12% is optimal.',
    ranges: 'Excellent: 5-12% | Healthy: 12-18% | Warning: 18-30% | Critical: >30%',
    action: 'Simplify prompts, improve STT, better beginner wording.',
  },
  offTopic: {
    meaning: 'Percentage of turns classified as off-topic.',
    ranges: 'Excellent: <2% | Healthy: 2-5% | Warning: 5-10% | Critical: >10%',
    action: 'Tune off-topic detection — may be too aggressive. Check false positives.',
  },
  wrap: {
    meaning: 'Percentage of turns that triggered closing behavior.',
    ranges: 'Healthy: wraps on final turn only. Warning: many wraps before turn 3.',
    action: null,
  },
  stt: {
    meaning: 'Median speech-to-text processing time.',
    ranges: 'Excellent: <700ms | Healthy: 700-1200ms | Warning: 1200-2000ms | Critical: >2000ms',
    action: 'Reduce audio payload, use faster STT, improve network.',
  },
  ai: {
    meaning: 'Median AI response generation time.',
    ranges: 'Excellent: <900ms | Healthy: 900-1500ms | Warning: 1500-2500ms | Critical: >2500ms',
    action: 'Use faster model, shorten prompt, consider streaming.',
  },
  total: {
    meaning: 'End-to-end wait from user finish speaking to reply.',
    ranges: 'Excellent: <1500ms | Healthy: 1500-2500ms | Warning: 2500-4000ms | Critical: >4000ms',
    action: 'Check which segment (STT/AI/frontend) is slow, optimize that.',
  },
  errors: {
    meaning: 'API errors (empty response, parse failure, exception).',
    ranges: 'Excellent: 0 | Healthy: 1-3 | Warning: 4-10 | Critical: >10',
    action: 'Check error types. Parse = prompt issue. Empty = model issue.',
  },
} satisfies Record<string, MetricConfig>

// ── Week-over-week trend ──

type TrendItem = {
  label: string
  current: number
  delta: number
  unit: string
  /** true = higher is better (completion), false = lower is better (fallback, latency) */
  higherIsBetter: boolean
}

function buildTrends(curr: AggregatedMetrics, prev: AggregatedMetrics | null): TrendItem[] {
  if (!prev || prev.totalTurns === 0) return []
  return [
    { label: 'Completion', current: curr.completionRate, delta: curr.completionRate - prev.completionRate, unit: '%', higherIsBetter: true },
    { label: 'Fallback', current: curr.fallbackRate, delta: curr.fallbackRate - prev.fallbackRate, unit: '%', higherIsBetter: false },
    { label: 'Clarify', current: curr.clarifyRate, delta: curr.clarifyRate - prev.clarifyRate, unit: '%', higherIsBetter: false },
    { label: 'Off-topic', current: curr.offTopicRate, delta: curr.offTopicRate - prev.offTopicRate, unit: '%', higherIsBetter: false },
    { label: 'Total p50', current: curr.medianTotalMs, delta: curr.medianTotalMs - prev.medianTotalMs, unit: 'ms', higherIsBetter: false },
    { label: 'Errors', current: curr.recentErrors.length, delta: curr.recentErrors.length - prev.recentErrors.length, unit: '', higherIsBetter: false },
  ]
}

function trendColor(delta: number, higherIsBetter: boolean): string {
  if (delta === 0) return 'text-gray-400'
  const isGood = higherIsBetter ? delta > 0 : delta < 0
  return isGood ? 'text-emerald-600' : 'text-red-600'
}

function trendArrow(delta: number): string {
  if (delta === 0) return ''
  return delta > 0 ? '+' : ''
}

// ── Auto priority queue ──

type PriorityItem = {
  scene: string
  score: number
  reasons: string[]
}

const SEVERITY_WEIGHTS: Record<Status, number> = { excellent: 0, healthy: 0, warning: 2, critical: 5 }

function buildPriorityQueue(m: AggregatedMetrics): PriorityItem[] {
  const maxTurns = Math.max(...m.sceneHealth.map((s) => s.turns), 1)

  const items: PriorityItem[] = m.sceneHealth.map((s) => {
    const reasons: string[] = []
    let severity = 0

    const fb = statusLowerBetter(s.fallbackPct, 5, 10, 20)
    if (fb === 'warning' || fb === 'critical') { severity += SEVERITY_WEIGHTS[fb]; reasons.push(`Fallback ${s.fallbackPct}%`) }

    const cl = statusClarify(s.clarifyPct)
    if (cl === 'warning' || cl === 'critical') { severity += SEVERITY_WEIGHTS[cl]; reasons.push(`Clarify ${s.clarifyPct}%`) }

    const lt = statusLowerBetter(s.medianLatency, 900, 1500, 2500)
    if (lt === 'warning' || lt === 'critical') { severity += SEVERITY_WEIGHTS[lt]; reasons.push(`Latency ${s.medianLatency}ms`) }

    // Low completion for this scene (estimate ~4 turns per conversation)
    const sceneConvEst = Math.ceil(s.turns / 4)
    const sceneCompPct = sceneConvEst > 0 ? pct(s.completions, sceneConvEst) : 100
    if (sceneCompPct < 60 && s.turns >= 10) { severity += 4; reasons.push(`Completion ~${sceneCompPct}%`) }

    if (reasons.length === 0) return null

    // traffic weight: 0-3 based on relative volume
    const trafficWeight = Math.round((s.turns / maxTurns) * 3)

    return { scene: s.scene, score: severity + trafficWeight, reasons }
  }).filter((x): x is PriorityItem => x !== null)

  return items.sort((a, b) => b.score - a.score).slice(0, 5)
}

// ── Scene drilldown data ──

type SceneDrilldown = {
  scene: string
  turns: number
  fallbackPct: number
  clarifyPct: number
  completions: number
  medianLatency: number
  dimensions: { dimension: string; count: number }[]
  errors: { time: string; error: string; turn: number }[]
  actions: string[]
}

function buildSceneDrilldown(
  scene: string,
  health: AggregatedMetrics['sceneHealth'][number],
  rawTurns: TurnRow[],
  rawErrors: ErrorRow[],
): SceneDrilldown {
  // Per-scene dimension frequency
  const dimCounts = new Map<string, number>()
  for (const t of rawTurns) {
    const m = t.metadata
    if (!m || (m.matchedScene ?? '(generic)') !== scene) continue
    if (m.selectedDimension) dimCounts.set(m.selectedDimension, (dimCounts.get(m.selectedDimension) ?? 0) + 1)
  }

  // Per-scene errors (match by scene name appearing in surrounding turn timestamps — approximate)
  const sceneErrors = rawErrors.slice(0, 10).map((e) => ({
    time: e.created_at,
    error: e.metadata?.error ?? 'unknown',
    turn: e.metadata?.turn ?? -1,
  }))

  // Auto-generate recommended actions
  const actions: string[] = []
  const fb = statusLowerBetter(health.fallbackPct, 5, 10, 20)
  if (fb === 'warning' || fb === 'critical') actions.push('Reduce fallback: check API timeout, try faster model')
  const cl = statusClarify(health.clarifyPct)
  if (cl === 'warning' || cl === 'critical') actions.push('Reduce clarify: simplify questions, improve STT')
  else if (health.clarifyPct < 3 && health.turns >= 20) actions.push('Clarify too low: check if AI accepts unclear input without confirming')
  const lt = statusLowerBetter(health.medianLatency, 900, 1500, 2500)
  if (lt === 'warning' || lt === 'critical') actions.push('Reduce latency: shorter prompt, faster model, or streaming')
  if (dimCounts.size < 3 && health.turns >= 20) actions.push('Low dimension coverage: add more scene-specific questions')
  if (actions.length === 0) actions.push('No issues detected. Monitor for regressions.')

  return {
    scene,
    turns: health.turns,
    fallbackPct: health.fallbackPct,
    clarifyPct: health.clarifyPct,
    completions: health.completions,
    medianLatency: health.medianLatency,
    dimensions: [...dimCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([dimension, count]) => ({ dimension, count })),
    errors: sceneErrors,
    actions,
  }
}

// ── Global alerts (§12) ──

function buildAlerts(m: AggregatedMetrics): string[] {
  const alerts: string[] = []
  if (m.totalTurns === 0) return alerts
  if (m.completionRate < 70) alerts.push(`Completion rate ${m.completionRate}% (< 70%)`)
  if (m.fallbackRate > 15) alerts.push(`Fallback rate ${m.fallbackRate}% (> 15%)`)
  if (m.clarifyRate > 25) alerts.push(`Clarify rate ${m.clarifyRate}% (> 25%)`)
  if (m.medianTotalMs > 3500) alerts.push(`Median total latency ${m.medianTotalMs}ms (> 3500ms)`)
  for (const s of m.sceneHealth) {
    if (s.turns >= 50) {
      const sceneDone = s.completions
      const sceneConvs = m.sceneRanking.find((r) => r.scene === s.scene)?.count ?? s.turns
      const sceneCompPct = pct(sceneDone, Math.ceil(sceneConvs / 4)) // ~4 turns per conv
      if (sceneCompPct < 60) alerts.push(`Scene "${s.scene}" completion < 60% (${s.turns} turns)`)
    }
  }
  return alerts
}

// ── Component ──

export default function AiConversationDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null)
  const [prevMetrics, setPrevMetrics] = useState<AggregatedMetrics | null>(null)
  const [rawTurns, setRawTurns] = useState<TurnRow[]>([])
  const [rawErrors, setRawErrors] = useState<ErrorRow[]>([])
  const [days, setDays] = useState(7)
  const [drillScene, setDrillScene] = useState<string | null>(null)

  const fetchData = useCallback(async (dayRange: number) => {
    setLoading(true)
    setDrillScene(null)
    try {
      const supabase = getSupabaseBrowserClient()

      const { isAdmin, mfaRequired } = await checkIsAdmin(supabase)
      if (!isAdmin) { router.push('/dashboard'); return }
      if (mfaRequired) { router.push('/admin/mfa-setup'); return }

      const now = Date.now()
      const since = new Date(now - dayRange * 86_400_000).toISOString()
      const prevSince = new Date(now - dayRange * 2 * 86_400_000).toISOString()

      // Fetch current + previous period in parallel
      const [turnRes, completeRes, errorRes, prevTurnRes, prevCompleteRes, prevErrorRes] = await Promise.all([
        supabase.from('lesson_events').select('metadata, created_at').eq('event_type', 'ai_conv_turn').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
        supabase.from('lesson_events').select('metadata, created_at').eq('event_type', 'ai_conv_complete').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
        supabase.from('lesson_events').select('metadata, created_at').eq('event_type', 'ai_conv_error').gte('created_at', since).order('created_at', { ascending: false }).limit(50),
        supabase.from('lesson_events').select('metadata, created_at').eq('event_type', 'ai_conv_turn').gte('created_at', prevSince).lt('created_at', since).order('created_at', { ascending: false }).limit(5000),
        supabase.from('lesson_events').select('metadata, created_at').eq('event_type', 'ai_conv_complete').gte('created_at', prevSince).lt('created_at', since).order('created_at', { ascending: false }).limit(1000),
        supabase.from('lesson_events').select('metadata, created_at').eq('event_type', 'ai_conv_error').gte('created_at', prevSince).lt('created_at', since).order('created_at', { ascending: false }).limit(50),
      ])

      const turns = (turnRes.data ?? []) as TurnRow[]
      const completes = (completeRes.data ?? []) as CompleteRow[]
      const errors = (errorRes.data ?? []) as ErrorRow[]

      setRawTurns(turns)
      setRawErrors(errors)
      setMetrics(aggregate(turns, completes, errors))
      setPrevMetrics(aggregate(
        (prevTurnRes.data ?? []) as TurnRow[],
        (prevCompleteRes.data ?? []) as CompleteRow[],
        (prevErrorRes.data ?? []) as ErrorRow[],
      ))
    } catch {
      setMetrics(null)
      setPrevMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData(days) }, [fetchData, days])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400 animate-pulse">Loading...</p>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">No data available.</p>
      </div>
    )
  }

  const m = metrics
  const alerts = buildAlerts(m)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Conversation Analytics</h1>
            <p className="text-sm text-gray-500">{m.totalTurns} turns / {m.totalConversations} conversations</p>
          </div>
          <div className="flex gap-2">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${days === d ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Global alerts (§12) */}
        {alerts.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="mb-1 text-xs font-semibold uppercase text-red-700">Alerts</p>
            <ul className="space-y-0.5">
              {alerts.map((a, i) => (
                <li key={i} className="text-sm text-red-800">{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 1. Key metrics — with status, tooltips, and actions */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <MetricCard
            label="Completion"
            value={m.completionRate}
            unit="%"
            status={statusHigherBetter(m.completionRate, 85, 75, 60)}
            config={METRIC_CONFIGS.completion}
          />
          <MetricCard
            label="Fallback"
            value={m.fallbackRate}
            unit="%"
            status={statusLowerBetter(m.fallbackRate, 5, 10, 20)}
            config={METRIC_CONFIGS.fallback}
          />
          <MetricCard
            label="Clarify"
            value={m.clarifyRate}
            unit="%"
            status={statusClarify(m.clarifyRate)}
            config={METRIC_CONFIGS.clarify}
          />
          <MetricCard
            label="Off-topic"
            value={m.offTopicRate}
            unit="%"
            status={statusLowerBetter(m.offTopicRate, 2, 5, 10)}
            config={METRIC_CONFIGS.offTopic}
          />
          <MetricCard
            label="Wrap"
            value={m.wrapRate}
            unit="%"
            status={'healthy'}
            config={METRIC_CONFIGS.wrap}
          />
        </div>

        {/* 2. Latency — p50 / p95 with status */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="STT p50"
            value={m.medianSttMs}
            unit="ms"
            status={statusLowerBetter(m.medianSttMs, 700, 1200, 2000)}
            config={METRIC_CONFIGS.stt}
          />
          <MetricCard
            label="AI p50"
            value={m.medianAiMs}
            unit="ms"
            status={statusLowerBetter(m.medianAiMs, 900, 1500, 2500)}
            config={METRIC_CONFIGS.ai}
            sub={`p95: ${m.p95AiMs}ms`}
          />
          <MetricCard
            label="Total p50"
            value={m.medianTotalMs}
            unit="ms"
            status={statusLowerBetter(m.medianTotalMs, 1500, 2500, 4000)}
            config={METRIC_CONFIGS.total}
            sub={`p95: ${m.p95TotalMs}ms`}
          />
          <MetricCard
            label="Errors"
            value={m.recentErrors.length}
            status={statusLowerBetter(m.recentErrors.length, 0, 3, 10)}
            config={METRIC_CONFIGS.errors}
          />
        </div>

        {/* ── Week-over-Week Trend ── */}
        {(() => {
          const trends = buildTrends(m, prevMetrics)
          if (trends.length === 0) return null
          return (
            <div className={`mb-6 ${CARD_BASE} border-gray-200`}>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Week-over-Week Trend</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 md:grid-cols-6">
                {trends.map((t) => (
                  <div key={t.label}>
                    <p className="text-[11px] text-gray-400">{t.label}</p>
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">{t.current}{t.unit}</p>
                    <p className={`text-xs font-medium tabular-nums ${trendColor(t.delta, t.higherIsBetter)}`}>
                      {t.delta === 0 ? '—' : `${trendArrow(t.delta)}${t.delta}${t.unit}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── Auto Priority Queue ── */}
        {(() => {
          const queue = buildPriorityQueue(m)
          if (queue.length === 0) return null
          return (
            <div className={`mb-6 ${CARD_BASE} border-gray-200`}>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Priority Queue</h2>
              <div className="space-y-2">
                {queue.map((item, i) => (
                  <div key={item.scene} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.scene}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{item.reasons.join(' / ')}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">score {item.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* 3. Scene ranking + dimension frequency */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className={`${CARD_BASE} border-gray-200`}>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Scene Ranking</h2>
            {m.sceneRanking.length === 0 ? (
              <p className="text-sm text-gray-400">No data</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_HEADER}>Scene</th>
                    <th className={`${TABLE_HEADER} text-right`}>Turns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {m.sceneRanking.map((s) => (
                    <tr key={s.scene}>
                      <td className={TABLE_CELL}>{s.scene}</td>
                      <td className={`${TABLE_CELL} text-right tabular-nums`}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={`${CARD_BASE} border-gray-200`}>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Dimension Frequency</h2>
            {m.dimensionFrequency.length === 0 ? (
              <p className="text-sm text-gray-400">No data</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_HEADER}>Dimension</th>
                    <th className={`${TABLE_HEADER} text-right`}>Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {m.dimensionFrequency.map((d) => (
                    <tr key={d.dimension}>
                      <td className={TABLE_CELL}>{d.dimension}</td>
                      <td className={`${TABLE_CELL} text-right tabular-nums`}>{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 4. Scene health — clickable rows for drilldown */}
        <div className={`${CARD_BASE} border-gray-200`}>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Scene Health Summary <span className="text-[10px] font-normal text-gray-400">click row to drill down</span></h2>
          {m.sceneHealth.length === 0 ? (
            <p className="text-sm text-gray-400">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_HEADER}>Scene</th>
                    <th className={`${TABLE_HEADER} text-right`}>Turns</th>
                    <th className={`${TABLE_HEADER} text-right`}>Fallback</th>
                    <th className={`${TABLE_HEADER} text-right`}>Clarify</th>
                    <th className={`${TABLE_HEADER} text-right`}>Done</th>
                    <th className={`${TABLE_HEADER} text-right`}>Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {m.sceneHealth.map((s) => {
                    const fbStatus = statusLowerBetter(s.fallbackPct, 5, 10, 20)
                    const clStatus = statusClarify(s.clarifyPct)
                    const ltStatus = statusLowerBetter(s.medianLatency, 900, 1500, 2500)
                    const isSelected = drillScene === s.scene
                    return (
                      <tr
                        key={s.scene}
                        onClick={() => setDrillScene(isSelected ? null : s.scene)}
                        className={`cursor-pointer transition ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className={TABLE_CELL}>{s.scene}</td>
                        <td className={`${TABLE_CELL} text-right tabular-nums`}>{s.turns}</td>
                        <td className={`${TABLE_CELL} text-right tabular-nums`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[fbStatus]} mr-1`} />{s.fallbackPct}%
                        </td>
                        <td className={`${TABLE_CELL} text-right tabular-nums`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[clStatus]} mr-1`} />{s.clarifyPct}%
                        </td>
                        <td className={`${TABLE_CELL} text-right tabular-nums`}>{s.completions}</td>
                        <td className={`${TABLE_CELL} text-right tabular-nums`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[ltStatus]} mr-1`} />{s.medianLatency}ms
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Scene Drilldown Panel ── */}
        {drillScene && (() => {
          const health = m.sceneHealth.find((s) => s.scene === drillScene)
          if (!health) return null
          const dd = buildSceneDrilldown(drillScene, health, rawTurns, rawErrors)
          return (
            <div className={`mt-4 ${CARD_BASE} border-blue-200 bg-blue-50/30`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">{dd.scene}</h2>
                <button type="button" onClick={() => setDrillScene(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-4">
                <div><p className="text-[11px] text-gray-400">Turns</p><p className="text-lg font-bold text-gray-900 tabular-nums">{dd.turns}</p></div>
                <div><p className="text-[11px] text-gray-400">Fallback</p><p className="text-lg font-bold text-gray-900 tabular-nums">{dd.fallbackPct}%</p></div>
                <div><p className="text-[11px] text-gray-400">Clarify</p><p className="text-lg font-bold text-gray-900 tabular-nums">{dd.clarifyPct}%</p></div>
                <div><p className="text-[11px] text-gray-400">Completions</p><p className="text-lg font-bold text-gray-900 tabular-nums">{dd.completions}</p></div>
                <div><p className="text-[11px] text-gray-400">Latency</p><p className="text-lg font-bold text-gray-900 tabular-nums">{dd.medianLatency}ms</p></div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Dimensions used */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Dimensions Asked</p>
                  {dd.dimensions.length === 0 ? (
                    <p className="text-xs text-gray-400">No dimension data</p>
                  ) : (
                    <div className="space-y-1">
                      {dd.dimensions.map((d) => (
                        <div key={d.dimension} className="flex items-center justify-between">
                          <span className="text-xs text-gray-700">{d.dimension}</span>
                          <span className="text-xs text-gray-400 tabular-nums">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended actions */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Recommended Actions</p>
                  <ul className="space-y-1">
                    {dd.actions.map((a, i) => (
                      <li key={i} className="text-xs text-gray-700">{a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Scene errors */}
              {dd.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Recent Errors</p>
                  <div className="space-y-0.5">
                    {dd.errors.slice(0, 5).map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${e.error === 'parse' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{e.error}</span>
                        <span className="tabular-nums">turn {e.turn}</span>
                        <span className="text-gray-400 tabular-nums">{new Date(e.time).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* 5. Recent errors */}
        {m.recentErrors.length > 0 && (
          <div className={`mt-6 ${CARD_BASE} border-gray-200`}>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Recent Errors</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_HEADER}>Time</th>
                    <th className={TABLE_HEADER}>Error</th>
                    <th className={`${TABLE_HEADER} text-right`}>Turn</th>
                    <th className={`${TABLE_HEADER} text-right`}>LLM ms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {m.recentErrors.map((e, i) => (
                    <tr key={i}>
                      <td className={`${TABLE_CELL} text-xs tabular-nums`}>
                        {new Date(e.time).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className={TABLE_CELL}>
                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                          e.error === 'parse' ? 'bg-amber-100 text-amber-800'
                            : e.error === 'empty' ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {e.error}
                        </span>
                      </td>
                      <td className={`${TABLE_CELL} text-right tabular-nums`}>{e.turn}</td>
                      <td className={`${TABLE_CELL} text-right tabular-nums`}>{e.llmMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
