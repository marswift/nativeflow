'use client'

/**
 * Admin sidebar navigation with active route highlighting.
 * Client component — uses usePathname for active state.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Languages', href: '/admin/language' },
  { label: 'Regions', href: '/admin/regions' },
  { label: 'AI Conversation', href: '/admin/ai-conversation' },
  { label: 'Lesson Content', href: '/admin/lesson-content' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Sentences', href: '/admin/sentences' },
  { label: 'Revenue', href: '/admin/revenue' },
  { label: 'Errors & Logs', href: '/admin/errors' },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname.startsWith(href)
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-2 border-transparent'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-gray-200 md:bg-white">
        {/* Header */}
        <div className="flex h-14 items-center border-b border-gray-200 px-5">
          <div>
            <p className="text-sm font-bold text-gray-900">NativeFlow</p>
            <p className="text-[10px] text-gray-400">Admin</p>
          </div>
        </div>
        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {navContent}
        </div>
      </aside>

      {/* Mobile header + hamburger */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <div>
          <p className="text-sm font-bold text-gray-900">NativeFlow Admin</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-60 bg-white shadow-lg md:hidden">
            <div className="flex h-14 items-center border-b border-gray-200 px-5">
              <p className="text-sm font-bold text-gray-900">NativeFlow Admin</p>
            </div>
            <div className="px-3 py-4">
              {navContent}
            </div>
          </div>
        </>
      )}
    </>
  )
}
