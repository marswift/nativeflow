'use client'

import { usePathname, useRouter } from 'next/navigation'

const ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/users': 'Users',
  '/admin/language': 'Languages',
  '/admin/regions': 'Regions',
  '/admin/ai-conversation': 'AI Conversation',
  '/admin/lesson-content': 'Lesson Content',
  '/admin/announcements': 'Announcements',
  '/admin/sentences': 'Sentences',
  '/admin/revenue': 'Revenue',
  '/admin/errors': 'Errors & Logs',
  '/admin/mfa-setup': 'MFA Setup',
}

function resolveTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  // Match longest prefix for sub-routes like /admin/sentences/[id]
  const match = Object.keys(ROUTE_TITLES)
    .filter((key) => key !== '/admin' && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]
  return match ? ROUTE_TITLES[match] : 'Admin'
}

export default function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const title = resolveTitle(pathname)

  return (
    <header className="hidden md:flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 mx-6 mt-6 mb-2">
      {/* Left side */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-400">Operations command center</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          Admin Active
        </span>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          aria-label="Refresh page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.05 19.07A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10M19.95 4.93A9.96 9.96 0 0012 2C6.48 2 2 6.48 2 12" />
          </svg>
        </button>
      </div>
    </header>
  )
}
