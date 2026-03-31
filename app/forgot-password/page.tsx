'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client'

const supabase = getSupabaseBrowserClient()

const CONTAINER_CLASS = 'mx-auto max-w-md px-6 py-10 sm:py-12'
const CARD_CLASS = 'rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-9'
const INPUT_CLASS =
  'mt-1.5 w-full rounded-lg border border-[#ede9e2] bg-white px-3.5 py-2.5 text-[#1a1a2e] placeholder-[#9ca3af] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-70 disabled:cursor-not-allowed'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEmailError('')
    setFormError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setEmailError('メールアドレスを入力してください')
      return
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('正しいメールアドレスを入力してください')
      return
    }

    setSubmitting(true)
    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      })
      if (error) {
        console.error('Forgot password error', { message: error.message, code: (error as { code?: string }).code })
        setFormError('送信に失敗しました。時間をおいて再度お試しください')
        return
      }
      setSuccess(true)
    } catch (err) {
      console.error('Forgot password exception', err)
      setFormError('送信に失敗しました。時間をおいて再度お試しください')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f7f4ef]"
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <header className="sticky top-0 z-50 border-b border-[#ede9e2] bg-white">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 sm:px-10">
          <Link
            href="/"
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg"
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
          <div className="text-center mt-6 sm:mt-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
              パスワード再設定
            </h1>
            <p className="mt-2 text-sm text-[#4a4a6a]">
              登録済みのメールアドレスを入力してください。
              <br />
              パスワード再設定用のメールをお送りします。
            </p>
          </div>

          {success ? (
            <div className={`mt-4 ${CARD_CLASS} text-center`}>
              <p className="text-sm font-medium leading-relaxed text-[#1a1a2e]">
                パスワード再設定用のメールを送信しました。
                <br />
                メールをご確認ください。
              </p>
              <p className="mt-5 rounded-lg border border-[#ede9e2] bg-[#faf9f7] px-4 py-3 text-xs leading-relaxed text-[#6b6b8a]">
                メールが届かない場合は、迷惑メールフォルダもご確認ください。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={`mt-4 ${CARD_CLASS}`} noValidate>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-[#1a1a2e]">
                メールアドレス
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                className={INPUT_CLASS}
                disabled={submitting}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'forgot-email-error' : undefined}
              />
              {emailError && (
                <p id="forgot-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                  {emailError}
                </p>
              )}

              {formError && (
                <p
                  className="mt-5 text-center text-sm text-red-600"
                  role="alert"
                  aria-live="polite"
                >
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-xl bg-amber-500 py-3.5 font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? '送信中...' : '送信する'}
              </button>

              <p className="mt-5 rounded-lg border border-[#ede9e2] bg-[#faf9f7] px-4 py-3 text-xs leading-relaxed text-[#6b6b8a]">
                メールが届かない場合は、迷惑メールフォルダもご確認ください。
              </p>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-[#4a4a6a]">
            <Link
              href="/login"
              className="font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              ログインへ戻る
            </Link>
          </p>
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
