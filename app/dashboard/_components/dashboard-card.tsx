import Link from 'next/link'

// app/dashboard/_components/dashboard-card.tsx

type Props = {
  title: string
  description: string
  href: string
  icon?: string
  isCompleted?: boolean
}

export default function DashboardCard({
  title,
  description,
  href,
  icon,
  isCompleted = false,
}: Props) {
  return (
    <Link
      href={href}
      aria-label={`${title}へ移動`}
      className={`group flex h-full flex-col rounded-2xl border p-5 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
        isCompleted
          ? 'border-[#BBF7D0] bg-[#F0FDF4] shadow-[0_6px_24px_rgba(34,197,94,.12)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(34,197,94,.16)]'
          : 'border-[#e8e4de] bg-white shadow-[0_6px_24px_rgba(0,0,0,.06)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,.08)]'
      }`}
    >
      <div className="flex flex-1 flex-col">
        <div>
          {icon && (
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-xl ${
                isCompleted ? 'bg-[#DCFCE7]' : 'bg-[#f5f3ef]'
              }`}
            >
              {icon}
            </div>
          )}
          <p className="text-lg font-bold tracking-tight text-[#1a1a2e]">
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            {description}
          </p>
        </div>

        <div
          className={`mt-auto pt-4 inline-flex items-center text-sm font-semibold ${
            isCompleted
              ? 'text-[#16A34A] group-hover:text-[#15803D]'
              : 'text-amber-600 group-hover:text-amber-700'
          }`}
        >
          {isCompleted ? '達成済み' : '移動する'}
          <span className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </div>
      </div>
    </Link>
  )
}