'use client'

/**
 * Admin Revenue — subscription and revenue operations view.
 *
 * Data sources:
 *   - user_profiles: subscription_status, planned_plan_code,
 *     subscription_current_period_end, subscription_cancel_at_period_end, username
 *
 * Protected: owner/admin role required + MFA.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../../lib/admin-guard'
import AdminKpiCard from '../_components/admin-kpi-card'

// ── Pricing (matches Stripe-configured amounts; used only for MRR estimation) ──
// TODO: centralize pricing into a shared config when pricing changes are planned
const PLAN_MONTHLY_JPY = 2480
const PLAN_YEARLY_JPY = 19800
const PLAN_YEARLY_MONTHLY_EQUIV = Math.round(PLAN_YEARLY_JPY / 12)

// ── Types ──

type RevenueMetrics = {
  totalPaid: number
  monthlySubs: number
  yearlySubs: number
  trialUsers: number
  cancelPending: number
  estimatedMrr: number
}

type BillingRow = {
  id: string
  username: string | null
  subscription_status: string | null
  planned_plan_code: string | null
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean | null
  created_at: string | null
}

// ── Helpers ──

function maskUsername(name: string | null, id: string): string {
  if (name && name.trim().length > 0) {
    const n = name.trim()
    return n.length <= 2 ? n : n.slice(0, 2) + '***'
  }
  return id.slice(0, 8) + '...'
}

function formatDate(iso: string | null): string {
  if (!iso) return '--'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(iso))
}

function planLabel(code: string | null): string {
  if (code === 'monthly') return 'Monthly'
  if (code === 'yearly') return 'Yearly'
  return '--'
}

function statusLabel(status: string | null): string {
  if (!status) return '--'
  if (status === 'active') return 'Active'
  if (status === 'trialing') return 'Trialing'
  if (status === 'canceled') return 'Canceled'
  if (status === 'past_due') return 'Past Due'
  if (status === 'unpaid') return 'Unpaid'
  return status
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  trialing: 'bg-sky-50 text-sky-700',
  canceled: 'bg-gray-100 text-gray-500',
  past_due: 'bg-amber-50 text-amber-700',
  unpaid: 'bg-red-50 text-red-700',
}

// ── Data fetching ──

async function fetchRevenueData(): Promise<{
  metrics: RevenueMetrics
  recentBilling: BillingRow[]
}> {
  const supabase = getSupabaseBrowserClient()

  const [
    paidRes,
    monthlyRes,
    yearlyRes,
    trialRes,
    cancelPendingRes,
    recentBillingRes,
  ] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('subscription_status', 'active'),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('subscription_status', 'active').eq('planned_plan_code', 'monthly'),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('subscription_status', 'active').eq('planned_plan_code', 'yearly'),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('subscription_status', 'trialing'),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('subscription_cancel_at_period_end', true)
      .in('subscription_status', ['active', 'trialing']),
    supabase.from('user_profiles')
      .select('id, username, subscription_status, planned_plan_code, subscription_current_period_end, subscription_cancel_at_period_end, created_at')
      .in('subscription_status', ['active', 'trialing', 'canceled', 'past_due', 'unpaid'])
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const monthly = monthlyRes.count ?? 0
  const yearly = yearlyRes.count ?? 0

  return {
    metrics: {
      totalPaid: paidRes.count ?? 0,
      monthlySubs: monthly,
      yearlySubs: yearly,
      trialUsers: trialRes.count ?? 0,
      cancelPending: cancelPendingRes.count ?? 0,
      estimatedMrr: (monthly * PLAN_MONTHLY_JPY) + (yearly * PLAN_YEARLY_MONTHLY_EQUIV),
    },
    recentBilling: (recentBillingRes.data ?? []) as BillingRow[],
  }
}

// ── Styles ──

const SECTION_TITLE = 'mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'
const CARD_BASE = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'

// ── Component ──

export default function AdminRevenuePage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [billingRows, setBillingRows] = useState<BillingRow[]>([])

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
      const result = await fetchRevenueData()
      setMetrics(result.metrics)
      setBillingRows(result.recentBilling)
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
    return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-sm text-gray-400 animate-pulse">Loading revenue...</p></div>
  }

  const m = metrics
  const totalActive = m.monthlySubs + m.yearlySubs
  const monthlyPct = totalActive > 0 ? Math.round((m.monthlySubs / totalActive) * 100) : 0
  const yearlyPct = totalActive > 0 ? 100 - monthlyPct : 0

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">&larr; Overview</Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="mt-1 text-sm text-gray-500">Subscription metrics and billing operations</p>
        </div>

        {/* ── A. KPI Row ── */}
        <p className={SECTION_TITLE}>Revenue Summary</p>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <AdminKpiCard
            label="Est. MRR"
            value={`¥${m.estimatedMrr.toLocaleString()}`}
            sub="Estimated monthly recurring"
            status={m.estimatedMrr > 0 ? 'success' : 'default'}
          />
          <AdminKpiCard
            label="Paid Subscribers"
            value={m.totalPaid}
            sub="subscription_status = active"
            status={m.totalPaid > 0 ? 'success' : 'default'}
          />
          <AdminKpiCard
            label="Monthly"
            value={m.monthlySubs}
            sub={`¥${PLAN_MONTHLY_JPY.toLocaleString()} / mo`}
          />
          <AdminKpiCard
            label="Yearly"
            value={m.yearlySubs}
            sub={`¥${PLAN_YEARLY_JPY.toLocaleString()} / yr`}
          />
          <AdminKpiCard
            label="Trial Users"
            value={m.trialUsers}
            sub="Currently trialing"
            status={m.trialUsers > 0 ? 'warning' : 'default'}
          />
          <AdminKpiCard
            label="Cancel Pending"
            value={m.cancelPending}
            sub="Will churn at period end"
            status={m.cancelPending > 0 ? 'danger' : 'success'}
          />
        </div>

        {/* ── B. Plan Breakdown ── */}
        <p className={SECTION_TITLE}>Plan Breakdown</p>
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className={CARD_BASE}>
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Active Subscriber Distribution</h3>
            {totalActive === 0 ? (
              <p className="text-sm text-gray-400">No active paid subscribers yet.</p>
            ) : (
              <>
                {/* Visual bar */}
                <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-gray-100">
                  {monthlyPct > 0 && (
                    <div className="bg-indigo-500 transition-all" style={{ width: `${monthlyPct}%` }} />
                  )}
                  {yearlyPct > 0 && (
                    <div className="bg-emerald-500 transition-all" style={{ width: `${yearlyPct}%` }} />
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <span className="text-gray-600">Monthly (¥{PLAN_MONTHLY_JPY.toLocaleString()}/mo)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{m.monthlySubs} ({monthlyPct}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-gray-600">Yearly (¥{PLAN_YEARLY_JPY.toLocaleString()}/yr)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{m.yearlySubs} ({yearlyPct}%)</span>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Est. Annual Revenue</span>
                    <span className="font-semibold text-gray-900">¥{(m.estimatedMrr * 12).toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── C. Trial Funnel Snapshot ── */}
          <div className={CARD_BASE}>
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Trial Funnel</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Active Trials</span>
                <span className="font-semibold text-gray-900">{m.trialUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Converted to Paid</span>
                <span className="font-semibold text-gray-900">{m.totalPaid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pending Cancellation</span>
                <span className="font-semibold text-gray-900">{m.cancelPending}</span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Trial-to-Paid Rate</span>
                  <span className="font-medium text-gray-400">--</span>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Needs historical conversion tracking. Current data shows a point-in-time snapshot only.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── D. Revenue Data Quality ── */}
        <p className={SECTION_TITLE}>Data Quality Notes</p>
        <div className="mb-8">
          <div className={`${CARD_BASE} space-y-2`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              <p className="text-sm text-gray-600">
                <strong className="font-semibold text-gray-800">MRR is estimated</strong> from <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">planned_plan_code</code> counts
                multiplied by fixed plan prices (¥{PLAN_MONTHLY_JPY.toLocaleString()} monthly, ¥{PLAN_YEARLY_JPY.toLocaleString()} yearly).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              <p className="text-sm text-gray-600">
                <strong className="font-semibold text-gray-800">subscription_amount_jpy is not populated</strong> by the webhook yet.
                Exact per-user revenue requires persisting <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">subscription.items.data[0].price.unit_amount</code> from Stripe events.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-gray-300" />
              <p className="text-sm text-gray-600">
                <strong className="font-semibold text-gray-800">MRR trend / history</strong> requires daily snapshots (e.g. <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">daily_mrr_snapshots</code> table).
                Not available yet.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-gray-300" />
              <p className="text-sm text-gray-600">
                <strong className="font-semibold text-gray-800">Trial-to-paid conversion rate</strong> requires tracking trial start + conversion events historically.
              </p>
            </div>
          </div>
        </div>

        {/* ── E. Recent Billing State ── */}
        <p className={SECTION_TITLE}>Recent Billing State</p>
        {billingRows.length === 0 ? (
          <div className={`${CARD_BASE} text-center`}>
            <p className="text-sm text-gray-400">No users with billing state found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div className="hidden border-b border-gray-100 bg-gray-50/60 px-5 py-2.5 sm:grid sm:grid-cols-[1fr_90px_80px_120px_100px] sm:gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">User</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Period End</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cancel</span>
            </div>
            {billingRows.map((row, idx) => (
              <div
                key={row.id}
                className={`px-5 py-3 sm:grid sm:grid-cols-[1fr_90px_80px_120px_100px] sm:items-center sm:gap-3 ${
                  idx < billingRows.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">{maskUsername(row.username, row.id)}</span>
                  <span className="ml-2 text-xs text-gray-400 sm:hidden">{statusLabel(row.subscription_status)}</span>
                </div>
                <span className="mt-1 sm:mt-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[row.subscription_status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                    {statusLabel(row.subscription_status)}
                  </span>
                </span>
                <span className="mt-1 text-sm text-gray-700 sm:mt-0">{planLabel(row.planned_plan_code)}</span>
                <span className="mt-1 text-xs text-gray-500 sm:mt-0 sm:text-sm">{formatDate(row.subscription_current_period_end)}</span>
                <span className="mt-1 text-xs sm:mt-0 sm:text-sm">
                  {row.subscription_cancel_at_period_end ? (
                    <span className="font-medium text-red-600">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
