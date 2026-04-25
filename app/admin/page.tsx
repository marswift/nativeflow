'use client'

/**
 * Admin Overview — NativeFlow operations command center.
 *
 * Read-only dashboard showing business health, user growth, lesson activity,
 * language expansion status, and operational alerts.
 *
 * Protected: owner/admin role required + MFA.
 * Data: reads from user_profiles, lesson_events, language_registry, region_registry.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../lib/admin-guard'
import AdminKpiCard from './_components/admin-kpi-card'
import AdminChartCard, { type ChartDataPoint } from './_components/admin-chart-card'
import AdminInsightCard, { type InsightData } from './_components/admin-insight-card'

// ── Types ──

type OverviewMetrics = {
  // Users
  totalUsers: number
  newUsersToday: number
  paidSubscribers: number
  trialUsers: number
  // Revenue
  monthlySubscribers: number
  yearlySubscribers: number
  estimatedMrr: number
  // Lessons
  lessonCompletionsToday: number
  lessonStartsToday: number
  aiConvCompletionsToday: number
  // Language expansion
  releasedLanguages: number
  betaLanguages: number
  draftLanguages: number
  activeRegions: number
  // Errors
  recentErrors: number
  // Charts
  userGrowth7d: ChartDataPoint[]
  lessonCompletions7d: ChartDataPoint[]
  aiConvCompletions7d: ChartDataPoint[]
}

// ── Pricing (matches Stripe-configured amounts; used only for MRR estimation) ──
// TODO: centralize pricing into a shared config when pricing changes are planned
const PLAN_MONTHLY_JPY = 2480
const PLAN_YEARLY_JPY = 19800
const PLAN_YEARLY_MONTHLY_EQUIV = Math.round(PLAN_YEARLY_JPY / 12)

// ── Helpers ──

function dayLabel(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

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

// ── Data fetching ──

async function fetchMetrics(): Promise<OverviewMetrics> {
  const supabase = getSupabaseBrowserClient()
  const today = todayStart()
  const weekAgo = daysAgoStart(7)

  // Parallel queries — all are lightweight count/aggregate operations
  const [
    totalUsersRes,
    newUsersTodayRes,
    paidRes,
    trialRes,
    monthlySubsRes,
    yearlySubsRes,
    lessonCompletesTodayRes,
    lessonStartsTodayRes,
    aiConvTodayRes,
    releasedLangsRes,
    betaLangsRes,
    draftLangsRes,
    activeRegionsRes,
    errorsRes,
    // Chart data: lesson_events for past 7 days
    weekEventsRes,
    weekUsersRes,
  ] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'trialing'),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('planned_plan_code', 'monthly'),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('planned_plan_code', 'yearly'),
    supabase.from('lesson_events').select('id', { count: 'exact', head: true }).eq('event_type', 'lesson_complete').gte('created_at', today),
    supabase.from('lesson_events').select('id', { count: 'exact', head: true }).eq('event_type', 'lesson_start').gte('created_at', today),
    supabase.from('lesson_events').select('id', { count: 'exact', head: true }).eq('event_type', 'ai_conv_complete').gte('created_at', today),
    supabase.from('language_registry').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('language_registry').select('id', { count: 'exact', head: true }).eq('status', 'beta'),
    supabase.from('language_registry').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('region_registry').select('id', { count: 'exact', head: true }).in('status', ['released', 'beta']),
    supabase.from('lesson_events').select('id', { count: 'exact', head: true }).eq('event_type', 'ai_conv_error').gte('created_at', today),
    // 7-day lesson events for charts
    supabase.from('lesson_events').select('event_type, created_at').in('event_type', ['lesson_complete', 'ai_conv_complete']).gte('created_at', weekAgo).order('created_at', { ascending: true }).limit(5000),
    // 7-day user signups for chart
    supabase.from('user_profiles').select('created_at').gte('created_at', weekAgo).order('created_at', { ascending: true }).limit(5000),
  ])

  // Build 7-day charts
  const userGrowth7d: ChartDataPoint[] = []
  const lessonCompletions7d: ChartDataPoint[] = []
  const aiConvCompletions7d: ChartDataPoint[] = []

  for (let i = 6; i >= 0; i--) {
    const label = dayLabel(i)
    const dayStart = new Date(Date.now() - i * 86_400_000)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const usersInDay = (weekUsersRes.data ?? []).filter((u: { created_at: string }) => {
      const t = new Date(u.created_at)
      return t >= dayStart && t < dayEnd
    }).length

    const lessonsInDay = (weekEventsRes.data ?? []).filter((e: { event_type: string; created_at: string }) => {
      const t = new Date(e.created_at)
      return e.event_type === 'lesson_complete' && t >= dayStart && t < dayEnd
    }).length

    const convInDay = (weekEventsRes.data ?? []).filter((e: { event_type: string; created_at: string }) => {
      const t = new Date(e.created_at)
      return e.event_type === 'ai_conv_complete' && t >= dayStart && t < dayEnd
    }).length

    userGrowth7d.push({ label, value: usersInDay })
    lessonCompletions7d.push({ label, value: lessonsInDay })
    aiConvCompletions7d.push({ label, value: convInDay })
  }

  const monthlySubs = monthlySubsRes.count ?? 0
  const yearlySubs = yearlySubsRes.count ?? 0
  const estimatedMrr = (monthlySubs * PLAN_MONTHLY_JPY) + (yearlySubs * PLAN_YEARLY_MONTHLY_EQUIV)

  return {
    totalUsers: totalUsersRes.count ?? 0,
    newUsersToday: newUsersTodayRes.count ?? 0,
    paidSubscribers: paidRes.count ?? 0,
    trialUsers: trialRes.count ?? 0,
    monthlySubscribers: monthlySubs,
    yearlySubscribers: yearlySubs,
    estimatedMrr,
    lessonCompletionsToday: lessonCompletesTodayRes.count ?? 0,
    lessonStartsToday: lessonStartsTodayRes.count ?? 0,
    aiConvCompletionsToday: aiConvTodayRes.count ?? 0,
    releasedLanguages: releasedLangsRes.count ?? 0,
    betaLanguages: betaLangsRes.count ?? 0,
    draftLanguages: draftLangsRes.count ?? 0,
    activeRegions: activeRegionsRes.count ?? 0,
    recentErrors: errorsRes.count ?? 0,
    userGrowth7d,
    lessonCompletions7d,
    aiConvCompletions7d,
  }
}

// ── Styles ──

const SECTION_TITLE = 'mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'
const CARD_BASE = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'

// ── Quick action links ──

const QUICK_ACTIONS = [
  { label: 'Users', href: '/admin/users' },
  { label: 'Languages', href: '/admin/language' },
  { label: 'Regions', href: '/admin/regions' },
  { label: 'AI Conversation', href: '/admin/ai-conversation' },
  { label: 'Lesson Content', href: '/admin/lesson-content' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Sentences', href: '/admin/sentences' },
  { label: 'Errors & Logs', href: '/admin/errors' },
] as const

// ── Insight generation (deterministic, rule-based) ──

function generateInsights(m: OverviewMetrics, deltas: { userDelta: number; lessonDelta: number; convDelta: number; completionRate: number }): InsightData[] {
  const insights: InsightData[] = []

  // ── Growth ──
  const weekTotal = m.userGrowth7d.reduce((s, d) => s + d.value, 0)
  if (deltas.userDelta > 0) {
    insights.push({
      title: `User signups up ${deltas.userDelta > 1 ? `by ${deltas.userDelta}` : ''} vs yesterday`,
      description: `${m.newUsersToday} new user${m.newUsersToday !== 1 ? 's' : ''} today compared to ${m.userGrowth7d[5]?.value ?? 0} yesterday. ${weekTotal} total signups this week.`,
      priority: deltas.userDelta >= 5 ? 'high' : 'medium',
      category: 'growth',
      href: '/admin/users',
      linkLabel: 'View users',
    })
  } else if (deltas.userDelta < 0) {
    insights.push({
      title: 'User signups declined vs yesterday',
      description: `${m.newUsersToday} signup${m.newUsersToday !== 1 ? 's' : ''} today vs ${m.userGrowth7d[5]?.value ?? 0} yesterday. Consider reviewing acquisition channels.`,
      priority: m.newUsersToday === 0 ? 'high' : 'medium',
      category: 'growth',
      href: '/admin/users',
      linkLabel: 'View users',
    })
  }

  // Week-over-week growth signal
  const firstHalf = m.userGrowth7d.slice(0, 3).reduce((s, d) => s + d.value, 0)
  const secondHalf = m.userGrowth7d.slice(4).reduce((s, d) => s + d.value, 0)
  if (secondHalf > firstHalf && secondHalf >= 3) {
    insights.push({
      title: 'Strong growth signal this week',
      description: `Recent days (${secondHalf} signups) outpacing earlier this week (${firstHalf}). Momentum is building.`,
      priority: 'medium',
      category: 'growth',
    })
  }

  // ── Retention / Lessons ──
  if (deltas.lessonDelta < 0 && m.lessonCompletionsToday > 0) {
    insights.push({
      title: 'Lesson completions dropped vs yesterday',
      description: `${m.lessonCompletionsToday} completion${m.lessonCompletionsToday !== 1 ? 's' : ''} today vs ${m.lessonCompletions7d[5]?.value ?? 0} yesterday. Monitor if trend continues.`,
      priority: Math.abs(deltas.lessonDelta) >= 5 ? 'high' : 'medium',
      category: 'retention',
    })
  } else if (deltas.lessonDelta > 0) {
    insights.push({
      title: 'Lesson completions increased vs yesterday',
      description: `${m.lessonCompletionsToday} today vs ${m.lessonCompletions7d[5]?.value ?? 0} yesterday. Learner engagement is trending up.`,
      priority: 'low',
      category: 'retention',
    })
  }

  if (m.lessonStartsToday > 0 && deltas.completionRate < 40) {
    insights.push({
      title: `Low completion rate: ${deltas.completionRate}%`,
      description: `Only ${deltas.completionRate}% of started lessons were completed today. Investigate lesson difficulty or UX friction.`,
      priority: 'high',
      category: 'retention',
    })
  }

  // ── Risk / Errors ──
  if (m.recentErrors > 5) {
    insights.push({
      title: `${m.recentErrors} AI conversation errors today`,
      description: 'Error rate is elevated. Check AI conversation logs for patterns or API issues.',
      priority: 'high',
      category: 'risk',
      href: '/admin/ai-conversation',
      linkLabel: 'View errors',
    })
  } else if (m.recentErrors > 0) {
    insights.push({
      title: `${m.recentErrors} error${m.recentErrors !== 1 ? 's' : ''} detected today`,
      description: 'Some AI conversation errors occurred. Low volume but worth monitoring.',
      priority: 'medium',
      category: 'risk',
      href: '/admin/ai-conversation',
      linkLabel: 'View errors',
    })
  }

  // ── Revenue ──
  if (m.yearlySubscribers > m.monthlySubscribers && m.paidSubscribers > 0) {
    insights.push({
      title: 'Annual plans are the majority',
      description: `${m.yearlySubscribers} annual vs ${m.monthlySubscribers} monthly subscribers. Higher LTV mix is healthy.`,
      priority: 'low',
      category: 'revenue',
    })
  }

  if (m.trialUsers > 0 && m.paidSubscribers === 0) {
    insights.push({
      title: 'Trial users active but no paid conversions yet',
      description: `${m.trialUsers} user${m.trialUsers !== 1 ? 's are' : ' is'} trialing. Monitor trial-to-paid conversion as trials end.`,
      priority: 'high',
      category: 'revenue',
    })
  } else if (m.trialUsers > m.paidSubscribers && m.paidSubscribers > 0) {
    insights.push({
      title: 'More trial users than paid subscribers',
      description: `${m.trialUsers} trialing vs ${m.paidSubscribers} paid. Conversion rate will be a key metric to watch.`,
      priority: 'medium',
      category: 'revenue',
    })
  }

  if (m.estimatedMrr === 0 && m.totalUsers > 0) {
    insights.push({
      title: 'No active revenue yet',
      description: 'MRR is zero. Focus on trial-to-paid conversion and signup growth.',
      priority: 'medium',
      category: 'revenue',
    })
  }

  // ── Language ──
  if (m.betaLanguages > 0) {
    insights.push({
      title: `${m.betaLanguages} language${m.betaLanguages !== 1 ? 's' : ''} in beta`,
      description: 'Beta languages are available for early testing. Monitor learner adoption before promoting to released.',
      priority: 'low',
      category: 'language',
      href: '/admin/language',
      linkLabel: 'Manage languages',
    })
  }

  if (m.draftLanguages > 0) {
    insights.push({
      title: `${m.draftLanguages} draft language${m.draftLanguages !== 1 ? 's' : ''} pending`,
      description: 'Draft languages need content completion before they can enter beta.',
      priority: 'low',
      category: 'language',
      href: '/admin/language',
      linkLabel: 'Manage languages',
    })
  }

  // ── Neutral / insufficient data ──
  if (weekTotal === 0 && m.totalUsers === 0) {
    insights.push({
      title: 'Waiting for first users',
      description: 'No signups recorded yet. Insights will become more specific as data accumulates.',
      priority: 'low',
      category: 'growth',
    })
  }

  // Sort: high > medium > low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return insights
}

// ── Component ──

export default function AdminOverviewPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)

  // Auth guard — identical to existing admin pages
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    checkIsAdmin(supabase).then(({ isAdmin, mfaRequired }) => {
      if (!isAdmin) { router.replace('/dashboard'); return }
      if (mfaRequired) { router.replace('/admin/mfa-setup'); return }
      setAuthorized(true)
    })
  }, [router])

  // Data fetch — only after authorized
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      setMetrics(await fetchMetrics())
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
    return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-sm text-gray-400 animate-pulse">Loading dashboard...</p></div>
  }

  const m = metrics
  const completionRate = m.lessonStartsToday > 0 ? Math.round((m.lessonCompletionsToday / m.lessonStartsToday) * 100) : 0

  // Derive sparkline arrays from 7-day chart data
  const userSpark = m.userGrowth7d.map((d) => d.value)
  const lessonSpark = m.lessonCompletions7d.map((d) => d.value)
  const aiConvSpark = m.aiConvCompletions7d.map((d) => d.value)

  // Yesterday comparisons (index 5 = yesterday, index 6 = today in 7-day array)
  const yesterdayUsers = m.userGrowth7d[5]?.value ?? 0
  const userDelta = m.newUsersToday - yesterdayUsers
  const yesterdayLessons = m.lessonCompletions7d[5]?.value ?? 0
  const lessonDelta = m.lessonCompletionsToday - yesterdayLessons
  const yesterdayConv = m.aiConvCompletions7d[5]?.value ?? 0
  const convDelta = m.aiConvCompletionsToday - yesterdayConv

  function fmtDelta(n: number): string { return n > 0 ? `+${n}` : String(n) }
  function deltaDir(n: number): 'up' | 'down' | 'neutral' { return n > 0 ? 'up' : n < 0 ? 'down' : 'neutral' }

  const insights = generateInsights(m, { userDelta, lessonDelta, convDelta, completionRate })

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* ── A. Page Header ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
          <p className="mt-1 text-sm text-gray-500">NativeFlow operations command center</p>
        </div>

        {/* ── B. KPI Cards ── */}
        <p className={SECTION_TITLE}>Key Metrics</p>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <AdminKpiCard
            label="Total Users"
            value={m.totalUsers}
            sub="All registered accounts"
            sparkData={userSpark}
            sparkColor="#6366f1"
          />
          <AdminKpiCard
            label="New Today"
            value={m.newUsersToday}
            sub="Signups since midnight"
            status={m.newUsersToday > 0 ? 'success' : 'default'}
            delta={fmtDelta(userDelta)}
            deltaLabel="vs yesterday"
            deltaDirection={deltaDir(userDelta)}
          />
          <AdminKpiCard
            label="Paid Subscribers"
            value={m.paidSubscribers}
            sub={`${m.monthlySubscribers} monthly / ${m.yearlySubscribers} yearly`}
            status="success"
          />
          <AdminKpiCard
            label="Trial Users"
            value={m.trialUsers}
            sub="Currently trialing"
          />
          <AdminKpiCard
            label="Lessons Today"
            value={m.lessonCompletionsToday}
            sub={`${m.lessonStartsToday} started / ${completionRate}% rate`}
            sparkData={lessonSpark}
            sparkColor="#10b981"
            delta={fmtDelta(lessonDelta)}
            deltaLabel="vs yesterday"
            deltaDirection={deltaDir(lessonDelta)}
          />
          <AdminKpiCard
            label="AI Conv Today"
            value={m.aiConvCompletionsToday}
            sub="Completed AI conversations"
            sparkData={aiConvSpark}
            sparkColor="#f59e0b"
            delta={fmtDelta(convDelta)}
            deltaLabel="vs yesterday"
            deltaDirection={deltaDir(convDelta)}
          />
          <AdminKpiCard
            label="Languages"
            value={m.releasedLanguages}
            sub={`${m.betaLanguages} beta / ${m.draftLanguages} draft`}
          />
          <AdminKpiCard
            label="Errors Today"
            value={m.recentErrors}
            sub="ai_conv_error events"
            status={m.recentErrors > 5 ? 'danger' : m.recentErrors > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* ── C. Growth Charts ── */}
        <p className={SECTION_TITLE}>7-Day Trends</p>
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <AdminChartCard title="User Signups" data={m.userGrowth7d} color="#6366f1" emptyText="No signups in last 7 days" />
          <AdminChartCard title="Lesson Completions" data={m.lessonCompletions7d} color="#10b981" emptyText="No lesson completions" />
          <AdminChartCard title="AI Conversations" data={m.aiConvCompletions7d} color="#f59e0b" emptyText="No AI conversations" />
        </div>

        {/* ── D. Learning Experience ── */}
        <p className={SECTION_TITLE}>Learning Experience</p>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <AdminKpiCard
            label="Start Rate"
            value={m.lessonStartsToday}
            sub="Lessons started today"
            sparkData={lessonSpark}
            sparkColor="#6366f1"
          />
          <AdminKpiCard
            label="Completion Rate"
            value={`${completionRate}%`}
            sub="Completions / starts today"
            status={completionRate >= 70 ? 'success' : completionRate >= 40 ? 'warning' : 'danger'}
          />
          <AdminKpiCard
            label="AI Conv Rate"
            value={m.aiConvCompletionsToday}
            sub="AI conversations finished"
            sparkData={aiConvSpark}
            sparkColor="#f59e0b"
          />
          <AdminKpiCard
            label="Est. MRR"
            value={`¥${m.estimatedMrr.toLocaleString()}`}
            sub="Estimated from active subscriptions"
            status={m.estimatedMrr > 0 ? 'success' : 'default'}
          />
        </div>

        {/* ── E. Language Expansion Status ── */}
        <p className={SECTION_TITLE}>Language Expansion</p>
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className={CARD_BASE}>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Language Registry</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Released</span><span className="font-semibold text-gray-900">{m.releasedLanguages}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Beta</span><span className="font-semibold text-amber-600">{m.betaLanguages}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Draft</span><span className="font-semibold text-gray-400">{m.draftLanguages}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-500">Active Regions</span><span className="font-semibold text-gray-900">{m.activeRegions}</span></div>
            </div>
            <Link href="/admin/language" className="mt-3 block text-xs font-medium text-indigo-600 hover:text-indigo-800">Manage languages</Link>
          </div>

          {/* ── F. Alerts ── */}
          <div className={`${CARD_BASE} ${m.recentErrors > 0 ? 'border-amber-200' : 'border-emerald-200'}`}>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Operational Status</h3>
            {m.recentErrors > 0 ? (
              <div>
                <p className="text-sm text-amber-700">{m.recentErrors} error event{m.recentErrors !== 1 ? 's' : ''} today</p>
                <p className="mt-1 text-xs text-gray-400">Check AI Conversation dashboard for details</p>
                <Link href="/admin/ai-conversation" className="mt-2 block text-xs font-medium text-amber-700 hover:text-amber-900">View errors</Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-emerald-700">No critical issues detected</p>
                <p className="mt-1 text-xs text-gray-400">All systems operating normally</p>
              </div>
            )}
          </div>
        </div>

        {/* ── G. AI Insights ── */}
        {insights.length > 0 && (
          <>
            <p className={SECTION_TITLE}>AI Insights</p>
            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insights.map((insight, idx) => (
                <AdminInsightCard key={idx} insight={insight} />
              ))}
            </div>
          </>
        )}

        {/* ── H. Quick Actions ── */}
        <p className={SECTION_TITLE}>Quick Actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-300"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
