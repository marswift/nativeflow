/**
 * Premium KPI card for admin dashboards.
 * Shows label, large value, delta indicator, optional mini sparkline,
 * and status-driven accent colors.
 */
'use client'

type Status = 'default' | 'success' | 'warning' | 'danger'

type DeltaDirection = 'up' | 'down' | 'neutral'

const STATUS_BG: Record<Status, string> = {
  default: 'bg-gray-50',
  success: 'bg-emerald-50',
  warning: 'bg-amber-50',
  danger:  'bg-red-50',
}

const STATUS_BORDER: Record<Status, string> = {
  default: 'border-gray-200',
  success: 'border-emerald-200',
  warning: 'border-amber-200',
  danger:  'border-red-200',
}

const STATUS_ICON_BG: Record<Status, string> = {
  default: 'bg-gray-100',
  success: 'bg-emerald-100',
  warning: 'bg-amber-100',
  danger:  'bg-red-100',
}

const STATUS_ICON_TEXT: Record<Status, string> = {
  default: 'text-gray-500',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger:  'text-red-600',
}

const DELTA_COLOR: Record<DeltaDirection, string> = {
  up:      'text-emerald-600',
  down:    'text-red-500',
  neutral: 'text-gray-400',
}

const DELTA_BG: Record<DeltaDirection, string> = {
  up:      'bg-emerald-50',
  down:    'bg-red-50',
  neutral: 'bg-gray-100',
}

function ArrowIcon({ direction }: { direction: DeltaDirection }) {
  if (direction === 'neutral') {
    return (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M2 6h8" />
      </svg>
    )
  }
  return (
    <svg
      className={`h-3 w-3 ${direction === 'down' ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 12 12"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3m0 0L3 6m3-3 3 3" />
    </svg>
  )
}

/** Tiny inline sparkline rendered as an SVG polyline. Pure CSS, no chart lib. */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 80
  const h = 24
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - (v / max) * (h - 2) - 1
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} className="shrink-0 opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AdminKpiCard({
  label,
  value,
  sub,
  status = 'default',
  delta,
  deltaLabel,
  deltaDirection = 'neutral',
  sparkData,
  sparkColor,
}: {
  label: string
  value: string | number
  sub?: string
  status?: Status
  /** e.g. "+12" or "-3%" */
  delta?: string
  /** e.g. "vs yesterday" */
  deltaLabel?: string
  deltaDirection?: DeltaDirection
  /** Array of recent values for a mini sparkline. At least 2 points needed. */
  sparkData?: number[]
  /** Sparkline stroke color. Defaults to status-derived color. */
  sparkColor?: string
}) {
  const resolvedSparkColor =
    sparkColor ??
    (status === 'success' ? '#10b981' : status === 'danger' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#9ca3af')

  return (
    <div
      className={`group relative rounded-2xl border ${STATUS_BORDER[status]} ${STATUS_BG[status]} p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      {/* Header row: icon dot + label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${STATUS_ICON_BG[status]} ring-2 ring-white ${STATUS_ICON_TEXT[status]}`} />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        </div>
        {sparkData && sparkData.length >= 2 && (
          <MiniSparkline data={sparkData} color={resolvedSparkColor} />
        )}
      </div>

      {/* Large value */}
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900">{value}</p>

      {/* Delta row */}
      {delta && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${DELTA_COLOR[deltaDirection]} ${DELTA_BG[deltaDirection]}`}
          >
            <ArrowIcon direction={deltaDirection} />
            {delta}
          </span>
          {deltaLabel && (
            <span className="text-[10px] text-gray-400">{deltaLabel}</span>
          )}
        </div>
      )}

      {/* Sub-text */}
      {sub && <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{sub}</p>}
    </div>
  )
}
