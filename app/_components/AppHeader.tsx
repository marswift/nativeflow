'use client'

import Link from 'next/link'

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

        {/* ロゴ */}
        <div className="text-lg font-bold text-[#1a1a2e]">
          NativeFlow
        </div>

        {/* メニュー */}
        <div className="flex items-center gap-5">

          {/* 言語切替 */}
          <select
            value={currentLanguage}
            onChange={(e) => onChangeLanguage(e.target.value)}
            className="cursor-pointer text-sm border border-[#ede9e2] rounded-md px-2 py-1 bg-white"
          >
            <option value="en">英語</option>
            <option value="ko">韓国語</option>
          </select>

          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#1a1a2e] transition hover:text-amber-600"
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
