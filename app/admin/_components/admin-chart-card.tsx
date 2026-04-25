/**
 * Simple bar-chart card using Recharts (already in project deps).
 * Renders a mini bar chart inside a white admin card.
 */
'use client'

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

export type ChartDataPoint = {
  label: string
  value: number
}

export default function AdminChartCard({
  title,
  data,
  color = '#6366f1',
  emptyText,
}: {
  title: string
  data: ChartDataPoint[]
  color?: string
  emptyText?: string
}) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[160px] items-center justify-center">
          <p className="text-xs text-gray-400">{emptyText ?? 'No data yet'}</p>
        </div>
      )}
    </div>
  )
}
