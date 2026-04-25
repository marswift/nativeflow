/**
 * AI Insight card for admin dashboard.
 * Displays a rule-based insight with priority + category badges and optional link.
 */

import Link from 'next/link'

type Priority = 'high' | 'medium' | 'low'
type Category = 'growth' | 'revenue' | 'retention' | 'risk' | 'language'

const PRIORITY_STYLE: Record<Priority, string> = {
  high:   'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  medium: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  low:    'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/10',
}

const CATEGORY_STYLE: Record<Category, string> = {
  growth:    'bg-indigo-50 text-indigo-700',
  revenue:   'bg-emerald-50 text-emerald-700',
  retention: 'bg-sky-50 text-sky-700',
  risk:      'bg-red-50 text-red-700',
  language:  'bg-violet-50 text-violet-700',
}

const CATEGORY_LABEL: Record<Category, string> = {
  growth:    'Growth',
  revenue:   'Revenue',
  retention: 'Retention',
  risk:      'Risk',
  language:  'Language',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high:   'High',
  medium: 'Medium',
  low:    'Low',
}

export type InsightData = {
  title: string
  description: string
  priority: Priority
  category: Category
  href?: string
  linkLabel?: string
}

export default function AdminInsightCard({ insight }: { insight: InsightData }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:shadow-md">
      {/* Badges */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[insight.priority]}`}>
          {PRIORITY_LABEL[insight.priority]}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLE[insight.category]}`}>
          {CATEGORY_LABEL[insight.category]}
        </span>
      </div>
      {/* Content */}
      <h4 className="text-sm font-bold text-gray-900">{insight.title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{insight.description}</p>
      {insight.href && (
        <Link
          href={insight.href}
          className="mt-2.5 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          {insight.linkLabel ?? 'View details'}
        </Link>
      )}
    </div>
  )
}
