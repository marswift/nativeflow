import Link from 'next/link'
import Image from 'next/image'

const CONTAINER_CLASS = 'mx-auto max-w-xl px-6 py-10 sm:py-12'
const CARD_CLASS = 'rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-9'

export default function VerifyNoticePage() {
  return (
    <div
      className="min-h-screen flex flex-col bg-[#f7f4ef]"
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <header className="sticky top-0 z-50 border-b border-[#ede9e2] bg-white">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 sm:px-10">
          <Link
            href="/"
            className="flex items-center"
            aria-label="NativeFlow トップへ"
          >
            <Image
              src="/images/branding/header_logo.svg"
              alt="NativeFlow"
              width={200}
              height={48}
              className="h-9 w-auto object-contain sm:h-10"
              priority
            />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          <div className={`mt-6 sm:mt-8 ${CARD_CLASS} text-center`}>
            <p className="text-sm leading-relaxed text-[#4a4a6a]">
              ご登録のメールアドレスに確認メールをお送りしました。
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a4a6a]">
              メール内の「メールアドレスを認証する」ボタンをクリックして<br />
              登録を完了してください。
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a4a6a]">
              認証が完了すると、ログイン画面からご利用いただけます。
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a4a6a]">
              メールが届かない場合は、
              <br />
              迷惑メールフォルダもご確認ください。
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#ede9e2] bg-white px-6 py-10 sm:px-10 sm:py-10">
        <div className="mx-auto grid max-w-[1140px] gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="mb-3.5 flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              <Image
                src="/images/branding/footer_logo.svg"
                alt="NativeFlow"
                width={200}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="max-w-[240px] text-[13px] leading-relaxed text-[#aaa]">
              Speak with AI. Learn like a native.
            </p>
          </div>
          <div>
            <p className="mb-3.5 text-sm font-extrabold text-[#1a1a2e]">プロダクト</p>
            <Link href="/#features" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">特徴</Link>
            <Link href="/#scenes" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">学習方法</Link>
            <Link href="/#pricing" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">料金プラン</Link>
            <Link href="/#faq" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">よくある質問</Link>
          </div>
          <div>
            <p className="mb-3.5 text-sm font-extrabold text-[#1a1a2e]">法的情報</p>
            <Link href="/legal/privacy" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">プライバシーポリシー</Link>
            <Link href="/legal/terms" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">利用規約</Link>
            <Link href="/legal/tokusho" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">特定商取引法に基づく表記</Link>
            <Link href="/legal/company" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">会社情報</Link>
          </div>
          <div>
            <p className="mb-3.5 text-sm font-extrabold text-[#1a1a2e]">サポート</p>
            <Link href="/contact" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">お問い合わせ</Link>
          </div>
        </div>
        <div className="mx-auto mt-7 max-w-[1140px] border-t border-[#ede9e2] pt-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <p className="text-[13px] text-[#bbb]">© 2026 NativeFlow. All rights reserved.</p>
          <p className="text-xs text-[#bbb]">Speak with AI. Learn like a native.</p>
        </div>
      </footer>
    </div>
  )
}
