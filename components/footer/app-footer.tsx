import Link from 'next/link'

export default function AppFooter() {
  return (
    <footer className="border-t border-[#ede9e2] bg-white px-6 py-6">
      <div className="mx-auto flex max-w-[960px] flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[#6b7280] sm:justify-start">
          <Link
            href="/contact"
            className="hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
          >
            お問い合わせ
          </Link>
          <Link
            href="/legal/privacy"
            className="hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/legal/terms"
            className="hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
          >
            利用規約
          </Link>
          <Link
            href="/legal/tokusho"
            className="hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
          >
            特定商取引法に基づく表記
          </Link>
        </div>

        <p className="text-xs text-[#9ca3af]">© 2026 NativeFlow</p>
      </div>
    </footer>
  )
}