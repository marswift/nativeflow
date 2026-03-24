'use client'

import Link from 'next/link'
import { TARGET_LANGUAGE_OPTIONS } from '@/lib/constants'

type AppHeaderProps = {
  onLogout: () => void
  currentLanguage: string
  onChangeLanguage: (lang: string) => void
}

export default function AppHeader({
  onLogout,
  currentLanguage,
  onChangeLanguage,
}: AppHeaderProps) {
  return (
    <header className="w-full border-b border-[#ede9e2] bg-white px-6 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/dashboard" className="cursor-pointer">
          <img
            src="/images/branding/header_logo.png"
            alt="NativeFlow"
            className="h-[44px] w-auto"
          />
        </Link>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#5c5c5c]">現在の学習言語</span>
            <select
              value={currentLanguage}
              onChange={(e) => onChangeLanguage(e.target.value)}
              className="cursor-pointer rounded-md border border-[#ede9e2] bg-[#f8f6f2] px-2 py-1 text-sm text-[#7a7a7a]"
            >
              {TARGET_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/dashboard"
            className="cursor-pointer text-sm font-medium text-[#1a1a2e] transition hover:text-amber-600"
          >
            マイページ
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="cursor-pointer text-sm font-medium text-amber-600 transition hover:text-amber-700"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
}
