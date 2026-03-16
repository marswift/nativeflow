'use client'

import Link from 'next/link'
import Image from 'next/image'

const HEADER_LINK_CLASS =
  'text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded'

export function SettingsPageHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#ede9e2] bg-white">
      <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 sm:px-10">
        <Link
          href="/dashboard"
          className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg"
          aria-label="レッスンホーム"
        >
          <Image
            src="/header_logo.svg"
            alt="NativeFlow"
            width={200}
            height={48}
            className="h-9 w-auto object-contain sm:h-10"
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className={HEADER_LINK_CLASS}>
            レッスンホーム
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className={HEADER_LINK_CLASS + ' cursor-pointer border-0 bg-transparent'}
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
}
