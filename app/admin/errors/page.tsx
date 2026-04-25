'use client'

/**
 * Admin Errors & Logs — operational error monitoring.
 *
 * Data sources:
 *   - lesson_events (event_type = 'ai_conv_error') — AI conversation errors with metadata
 *   - admin_audit_log (event_type = 'rate_limit_denied') — rate-limit events from middleware
 *
 * Protected: owner/admin role required + MFA.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../../lib/admin-guard'
import AdminKpiCard from '../_components/admin-kpi-card'
import AdminChartCard, { type ChartDataPoint } from '../_components/admin-chart-card'

// ── Types ──

type ErrorRow = {
  id: string
  created_at: string
  category: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  source: string
  metadata: Record<string, unknown> | null
}

type ErrorMetrics = {
  aiErrorsToday: number
  aiErrorsYesterday: number
  rateLimitToday: number
  paymentFailuresToday: number
  authFailuresToday: number
  totalErrorsToday: number
  errors7d: ChartDataPoint[]
  recentErrors: ErrorRow[]
}

// ── Helpers ──

function todayStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function daysAgoStart(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function dayLabel(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function extractErrorMessage(metadata: Record<string, unknown> | null): string {
  if (!metadata) return 'Unknown error'
  if (typeof metadata.error === 'string') return metadata.error
  if (typeof metadata.message === 'string') return metadata.message
  if (typeof metadata.group === 'string') return `Rate limit: ${metadata.group}`
  return JSON.stringify(metadata).slice(0, 120)
}

// ── Data fetching ──

async function fetchErrorMetrics(): Promise<ErrorMetrics> {
  const supabase = getSupabaseBrowserClient()
  const today = todayStart()
  const yesterday = daysAgoStart(1)
  const weekAgo = daysAgoStart(7)

  const [
    aiErrorsTodayRes,
    aiErrorsYesterdayRes,
    rateLimitTodayRes,
    paymentFailuresTodayRes,
    authFailuresTodayRes,
    weekAiErrorsRes,
    weekRateLimitRes,
    weekPaymentFailuresRes,
    weekAuthFailuresRes,
    recentAiErrorsRes,
    recentRateLimitRes,
    recentPaymentFailuresRes,
    recentAuthFailuresRes,
  ] = await Promise.all([
    // KPI counts
    supabase.from('lesson_events').select('id', { count: 'exact', head: true })
      .eq('event_type', 'ai_conv_error').gte('created_at', today),
    supabase.from('lesson_events').select('id', { count: 'exact', head: true })
      .eq('event_type', 'ai_conv_error').gte('created_at', yesterday).lt('created_at', today),
    supabase.from('admin_audit_log').select('id', { count: 'exact', head: true })
      .eq('event_type', 'rate_limit_denied').gte('created_at', today),
    supabase.from('admin_audit_log').select('id', { count: 'exact', head: true })
      .eq('event_type', 'stripe_payment_failed').gte('created_at', today),
    supabase.from('admin_audit_log').select('id', { count: 'exact', head: true })
      .eq('event_type', 'auth_failure').gte('created_at', today),
    // 7-day chart data
    supabase.from('lesson_events').select('created_at')
      .eq('event_type', 'ai_conv_error').gte('created_at', weekAgo)
      .order('created_at', { ascending: true }).limit(5000),
    supabase.from('admin_audit_log').select('created_at')
      .eq('event_type', 'rate_limit_denied').gte('created_at', weekAgo)
      .order('created_at', { ascending: true }).limit(5000),
    supabase.from('admin_audit_log').select('created_at')
      .eq('event_type', 'stripe_payment_failed').gte('created_at', weekAgo)
      .order('created_at', { ascending: true }).limit(5000),
    supabase.from('admin_audit_log').select('created_at')
      .eq('event_type', 'auth_failure').gte('created_at', weekAgo)
      .order('created_at', { ascending: true }).limit(5000),
    // Recent errors
    supabase.from('lesson_events').select('id, created_at, event_type, metadata, stage')
      .eq('event_type', 'ai_conv_error')
      .order('created_at', { ascending: false }).limit(30),
    supabase.from('admin_audit_log').select('id, created_at, event_type, metadata')
      .eq('event_type', 'rate_limit_denied')
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('admin_audit_log').select('id, created_at, event_type, metadata')
      .eq('event_type', 'stripe_payment_failed')
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('admin_audit_log').select('id, created_at, event_type, metadata')
      .eq('event_type', 'auth_failure')
      .order('created_at', { ascending: false }).limit(20),
  ])

  // Build 7-day error chart
  const errors7d: ChartDataPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const label = dayLabel(i)
    const ds = new Date(Date.now() - i * 86_400_000)
    ds.setHours(0, 0, 0, 0)
    const de = new Date(ds)
    de.setDate(de.getDate() + 1)

    const aiCount = (weekAiErrorsRes.data ?? []).filter((e: { created_at: string }) => {
      const t = new Date(e.created_at)
      return t >= ds && t < de
    }).length

    const rlCount = (weekRateLimitRes.data ?? []).filter((e: { created_at: string }) => {
      const t = new Date(e.created_at)
      return t >= ds && t < de
    }).length

    const pfCount = (weekPaymentFailuresRes.data ?? []).filter((e: { created_at: string }) => {
      const t = new Date(e.created_at)
      return t >= ds && t < de
    }).length

    const afCount = (weekAuthFailuresRes.data ?? []).filter((e: { created_at: string }) => {
      const t = new Date(e.created_at)
      return t >= ds && t < de
    }).length

    errors7d.push({ label, value: aiCount + rlCount + pfCount + afCount })
  }

  // Merge recent errors into unified list
  const recentErrors: ErrorRow[] = []

  for (const row of (recentAiErrorsRes.data ?? []) as Array<{
    id: string; created_at: string; event_type: string; metadata: Record<string, unknown> | null; stage: string | null
  }>) {
    recentErrors.push({
      id: row.id,
      created_at: row.created_at,
      category: 'AI Conversation',
      message: extractErrorMessage(row.metadata),
      severity: 'critical',
      source: row.stage ?? 'ai_conversation',
      metadata: row.metadata,
    })
  }

  for (const row of (recentRateLimitRes.data ?? []) as Array<{
    id: string; created_at: string; event_type: string; metadata: Record<string, unknown> | null
  }>) {
    recentErrors.push({
      id: row.id,
      created_at: row.created_at,
      category: 'Rate Limit',
      message: extractErrorMessage(row.metadata),
      severity: 'warning',
      source: (row.metadata?.path as string) ?? 'middleware',
      metadata: row.metadata,
    })
  }

  for (const row of (recentPaymentFailuresRes.data ?? []) as Array<{
    id: string; created_at: string; event_type: string; metadata: Record<string, unknown> | null
  }>) {
    const meta = row.metadata
    const amount = typeof meta?.amount_due === 'number' ? `¥${meta.amount_due.toLocaleString()}` : ''
    const failMsg = typeof meta?.failure_message === 'string' ? meta.failure_message : ''
    const message = [failMsg, amount].filter(Boolean).join(' — ') || extractErrorMessage(meta)
    recentErrors.push({
      id: row.id,
      created_at: row.created_at,
      category: 'Payment',
      message,
      severity: 'critical',
      source: typeof meta?.stripe_event_type === 'string' ? meta.stripe_event_type : 'stripe',
      metadata: meta,
    })
  }

  for (const row of (recentAuthFailuresRes.data ?? []) as Array<{
    id: string; created_at: string; event_type: string; metadata: Record<string, unknown> | null
  }>) {
    const meta = row.metadata
    const reason = typeof meta?.reason === 'string' ? meta.reason : 'unknown'
    const provider = typeof meta?.provider === 'string' ? meta.provider : ''
    const message = provider ? `${reason} (${provider})` : reason
    recentErrors.push({
      id: row.id,
      created_at: row.created_at,
      category: 'Auth',
      message,
      severity: 'warning',
      source: typeof meta?.route === 'string' ? meta.route : 'auth',
      metadata: meta,
    })
  }

  // Sort by time descending
  recentErrors.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const aiToday = aiErrorsTodayRes.count ?? 0
  const rlToday = rateLimitTodayRes.count ?? 0
  const pfToday = paymentFailuresTodayRes.count ?? 0
  const afToday = authFailuresTodayRes.count ?? 0

  return {
    aiErrorsToday: aiToday,
    aiErrorsYesterday: aiErrorsYesterdayRes.count ?? 0,
    rateLimitToday: rlToday,
    paymentFailuresToday: pfToday,
    authFailuresToday: afToday,
    totalErrorsToday: aiToday + rlToday + pfToday + afToday,
    errors7d,
    recentErrors: recentErrors.slice(0, 50),
  }
}

// ── Styles ──

const SECTION_TITLE = 'mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'
const CARD_BASE = 'rounded-2xl border border-gray-200 bg-white shadow-sm'

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  warning:  'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  info:     'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/10',
}

const CATEGORY_BADGE: Record<string, string> = {
  'AI Conversation': 'bg-violet-50 text-violet-700',
  'Rate Limit':      'bg-amber-50 text-amber-700',
  'Auth':            'bg-sky-50 text-sky-700',
  'Payment':         'bg-emerald-50 text-emerald-700',
}

// ── Error Detail Modal ──

function ErrorDetailModal({ error, onClose }: { error: ErrorRow; onClose: () => void }) {
  const meta = error.metadata

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const metaJson = meta ? JSON.stringify(meta, null, 2) : null

  function handleCopyMeta() {
    if (metaJson) navigator.clipboard.writeText(metaJson).catch(() => { /* ignore */ })
  }

  function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null
    return (
      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
        <span className="shrink-0 text-xs font-semibold text-gray-400 sm:w-32">{label}</span>
        <span className="break-all text-sm text-gray-800">{value}</span>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh] sm:pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="relative max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Error detail"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h3 className="text-sm font-bold text-gray-900">Error Detail</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${SEVERITY_BADGE[error.severity] ?? SEVERITY_BADGE.info}`}>
              {error.severity}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CATEGORY_BADGE[error.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {error.category}
            </span>
          </div>

          {/* Core fields */}
          <div className="space-y-3">
            <DetailRow label="Time" value={formatTime(error.created_at)} />
            <DetailRow label="Message" value={error.message} />
            <DetailRow label="Source" value={error.source} />
            <DetailRow label="Category" value={error.category} />
            <DetailRow label="Severity" value={error.severity} />
            <DetailRow label="Event ID" value={error.id} />
          </div>

          {/* Contextual fields from metadata */}
          {meta && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <DetailRow label="Event Type" value={meta.event_type as string ?? meta.stripe_event_type as string} />
              <DetailRow label="Route" value={meta.route as string ?? meta.path as string} />
              <DetailRow label="Provider" value={meta.provider as string} />
              <DetailRow label="Reason" value={meta.reason as string} />
              <DetailRow label="Failure Code" value={meta.failure_code as string} />
              <DetailRow label="Customer" value={meta.customer as string} />
              <DetailRow label="User ID" value={meta.actor_user_id as string ?? meta.user_id as string} />
              <DetailRow label="Subscription" value={meta.subscription as string} />
              <DetailRow label="Invoice" value={meta.invoice as string} />
              <DetailRow label="Payment Intent" value={meta.payment_intent as string} />
              <DetailRow label="Amount" value={typeof meta.amount_due === 'number' ? `¥${(meta.amount_due as number).toLocaleString()}` : undefined} />
              <DetailRow label="Currency" value={meta.currency as string} />
              <DetailRow label="Masked Email" value={meta.masked_email as string} />
            </div>
          )}

          {/* Raw metadata JSON */}
          {metaJson && (
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400">Raw Metadata</span>
                <button
                  type="button"
                  onClick={handleCopyMeta}
                  className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="max-h-64 overflow-auto rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">
                {metaJson}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Component ──

export default function AdminErrorsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null)
  const [selectedError, setSelectedError] = useState<ErrorRow | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    checkIsAdmin(supabase).then(({ isAdmin, mfaRequired }) => {
      if (!isAdmin) { router.replace('/dashboard'); return }
      if (mfaRequired) { router.replace('/admin/mfa-setup'); return }
      setAuthorized(true)
    })
  }, [router])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      setMetrics(await fetchErrorMetrics())
    } catch {
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authorized) loadData()
  }, [authorized, loadData])

  if (!authorized) {
    return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-sm text-gray-400 animate-pulse">Checking access...</p></div>
  }

  if (loading || !metrics) {
    return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-sm text-gray-400 animate-pulse">Loading errors...</p></div>
  }

  const m = metrics
  const aiDelta = m.aiErrorsToday - m.aiErrorsYesterday
  const fmtDelta = (n: number) => n > 0 ? `+${n}` : String(n)
  const deltaDir = (n: number): 'up' | 'down' | 'neutral' => n > 0 ? 'up' : n < 0 ? 'down' : 'neutral'
  // For errors, "up" is bad — invert status
  const errorStatus = (n: number): 'success' | 'warning' | 'danger' =>
    n === 0 ? 'success' : n <= 5 ? 'warning' : 'danger'

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">&larr; Overview</Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Errors & Logs</h1>
          <p className="mt-1 text-sm text-gray-500">System error monitoring and operational logs</p>
        </div>

        {/* ── A. KPI Row ── */}
        <p className={SECTION_TITLE}>Error Summary</p>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <AdminKpiCard
            label="Total Errors"
            value={m.totalErrorsToday}
            sub="All error events today"
            status={errorStatus(m.totalErrorsToday)}
          />
          <AdminKpiCard
            label="AI Errors"
            value={m.aiErrorsToday}
            sub="ai_conv_error events"
            status={errorStatus(m.aiErrorsToday)}
            delta={fmtDelta(aiDelta)}
            deltaLabel="vs yesterday"
            deltaDirection={deltaDir(aiDelta)}
          />
          <AdminKpiCard
            label="Rate Limits"
            value={m.rateLimitToday}
            sub="Denied requests today"
            status={errorStatus(m.rateLimitToday)}
          />
          <AdminKpiCard
            label="Auth Failures"
            value={m.authFailuresToday}
            sub="Login / OAuth / verify failures"
            status={errorStatus(m.authFailuresToday)}
          />
          <AdminKpiCard
            label="Payment Failures"
            value={m.paymentFailuresToday}
            sub="Stripe payment failures"
            status={errorStatus(m.paymentFailuresToday)}
          />
        </div>

        {/* ── B. Error Trend Chart ── */}
        <p className={SECTION_TITLE}>7-Day Error Trend</p>
        <div className="mb-8">
          <AdminChartCard
            title="Errors per Day"
            data={m.errors7d}
            color="#ef4444"
            emptyText="No errors in the last 7 days"
          />
        </div>

        {/* ── C. Recent Errors Table ── */}
        <p className={SECTION_TITLE}>Recent Errors</p>
        {m.recentErrors.length === 0 ? (
          <div className={`${CARD_BASE} border-emerald-200 p-8 text-center`}>
            <p className="text-sm font-medium text-emerald-700">No critical issues detected</p>
            <p className="mt-1 text-xs text-gray-400">All systems operating normally</p>
          </div>
        ) : (
          <div className={`${CARD_BASE} overflow-hidden`}>
            {/* Table header */}
            <div className="hidden border-b border-gray-100 bg-gray-50/60 px-5 py-2.5 sm:grid sm:grid-cols-[140px_100px_1fr_80px_140px] sm:gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Time</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Category</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Message</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Severity</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Source</span>
            </div>
            {/* Rows */}
            {m.recentErrors.map((err, idx) => (
              <button
                type="button"
                key={err.id}
                onClick={() => setSelectedError(err)}
                className={`w-full text-left px-5 py-3 transition hover:bg-gray-50 cursor-pointer sm:grid sm:grid-cols-[140px_100px_1fr_80px_140px] sm:items-center sm:gap-3 ${
                  idx < m.recentErrors.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                {/* Time */}
                <span className="block text-xs text-gray-500 sm:text-[13px]">
                  {formatTime(err.created_at)}
                </span>
                {/* Category */}
                <span className="mt-1 sm:mt-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[err.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {err.category}
                  </span>
                </span>
                {/* Message */}
                <p className="mt-1 truncate text-sm text-gray-700 sm:mt-0">{err.message}</p>
                {/* Severity */}
                <span className="mt-1 sm:mt-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_BADGE[err.severity] ?? SEVERITY_BADGE.info}`}>
                    {err.severity}
                  </span>
                </span>
                {/* Source */}
                <span className="mt-1 block truncate text-xs text-gray-400 sm:mt-0 sm:text-[13px]">
                  {err.source}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── D. Placeholder sections ── */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className={`${CARD_BASE} p-5 ${m.authFailuresToday > 0 ? 'border-amber-200' : 'border-emerald-200'}`}>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Auth Failure Logs</h3>
            {m.authFailuresToday > 0 ? (
              <div>
                <p className="text-sm text-amber-700">{m.authFailuresToday} auth failure{m.authFailuresToday !== 1 ? 's' : ''} today</p>
                <p className="mt-1 text-xs text-gray-400">Failed logins, OAuth errors, and verification failures are tracked.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-emerald-700">No auth failures today</p>
                <p className="mt-1 text-xs text-gray-400">Password, OAuth, magic link, and PKCE failures are tracked.</p>
              </div>
            )}
          </div>
          <div className={`${CARD_BASE} p-5 ${m.paymentFailuresToday > 0 ? 'border-red-200' : 'border-emerald-200'}`}>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Payment Failure Logs</h3>
            {m.paymentFailuresToday > 0 ? (
              <div>
                <p className="text-sm text-red-700">{m.paymentFailuresToday} payment failure{m.paymentFailuresToday !== 1 ? 's' : ''} today</p>
                <p className="mt-1 text-xs text-gray-400">Stripe invoice and payment_intent failures are logged automatically.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-emerald-700">No payment failures today</p>
                <p className="mt-1 text-xs text-gray-400">Stripe invoice.payment_failed and payment_intent.payment_failed events are tracked.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <ErrorDetailModal error={selectedError} onClose={() => setSelectedError(null)} />
      )}
    </div>
  )
}
