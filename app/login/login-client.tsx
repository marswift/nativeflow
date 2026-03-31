'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getUserProfileForCompletionCheck,
  isUserProfileOnboardingComplete,
} from '@/lib/profile-completion'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'

const supabase = getSupabaseBrowserClient()

const CONTAINER_CLASS = 'mx-auto max-w-md px-6 py-10 sm:py-12'
const CARD_CLASS =
  'rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-9'
const INPUT_CLASS =
  'mt-1.5 w-full rounded-lg border border-[#ede9e2] bg-white px-3.5 py-2.5 text-[#1a1a2e] placeholder-[#9ca3af] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-70 disabled:cursor-not-allowed'

async function resolvePostLoginRoute(userId: string): Promise<'/dashboard' | '/onboarding'> {
  const { profile, error } = await getUserProfileForCompletionCheck(userId)

  if (error) {
    return '/onboarding' // ← 安全側に倒す
  }

  if (!profile) {
    return '/onboarding'
  }

  return isUserProfileOnboardingComplete(profile) ? '/dashboard' : '/onboarding'
}

export function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const confirmError = searchParams.get('confirm_error') === '1'
  const confirmed = searchParams.get('confirmed') === '1'
  const registered = searchParams.get('registered') === '1'
  const reset = searchParams.get('reset') === '1'

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(false)
  }, [])

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEmailError('')
    setPasswordError('')
    setFormError('')

    const trimmedEmail = email.trim()
    let hasFieldErrors = false

    if (!trimmedEmail) {
      setEmailError('メールアドレスを入力してください')
      hasFieldErrors = true
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError('正しいメールアドレスを入力してください')
      hasFieldErrors = true
    }

    if (!password) {
      setPasswordError('パスワードを入力してください')
      hasFieldErrors = true
    }

    if (hasFieldErrors) return

    setSubmitting(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      
      if (signInError) {
        const msg = signInError.message.toLowerCase()
        const isInvalidCredentials =
          msg.includes('invalid') &&
          (msg.includes('credentials') || msg.includes('login') || msg.includes('password'))
        const isEmailNotConfirmed =
          msg.includes('confirm') || msg.includes('verified') || msg.includes('email not')
      
        if (isInvalidCredentials) {
          setFormError('メールアドレスまたはパスワードが正しくありません')
        } else if (isEmailNotConfirmed) {
          setFormError('メール認証が完了していません。\n確認メールをご確認ください。')
        } else {
          setFormError('ログインに失敗しました。時間をおいて再度お試しください')
        }
        return
      }
      
      // 👇 これが今回の最重要追加
      if (!data?.user) {
        setFormError('ログインに失敗しました（ユーザー取得不可）')
        return
      }

      // 👇 getUserは使わない（ここが超重要）
      const user = data.user

      const nextRoute = await resolvePostLoginRoute(user.id)
      router.replace(nextRoute)
    } catch (err) {
      console.error('Login submit failed', err)
      setFormError('ログインに失敗しました。時間をおいて再度お試しください')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
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
                ログイン
              </h1>
              <p className="mt-2 text-sm text-[#4a4a6a]">
                メールアドレスとパスワードでログインしてください。
              </p>
            </div>

            <div className="min-h-[2.75rem] mb-1" aria-hidden="true" />

            <div className={`mt-4 ${CARD_CLASS} flex flex-col items-center justify-center min-h-[200px]`}>
              <p className="text-[#4a4a6a]" aria-live="polite">
                読み込み中...
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-[#4a4a6a]">
              初めての方は
              <Link
                href="/signup"
                className="ml-1 font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
              >
                新規登録
              </Link>
              へ
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
              ログイン
            </h1>
            <p className="mt-2 text-sm text-[#4a4a6a]">
              メールアドレスとパスワードでログインしてください。
            </p>
          </div>

          <div className="min-h-[2.75rem] mb-1 flex flex-col justify-center" aria-live="polite" aria-atomic="true">
            {!formError &&
              (confirmError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="status">
                  メールアドレスの確認に失敗しました。もう一度お試しください。
                </p>
              ) : confirmed ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
                  メールアドレスの確認が完了しました。ログインしてください。
                </p>
              ) : registered ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
                  アカウント登録が完了しました。ログインしてください。
                </p>
              ) : reset ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
                  パスワードを再設定しました。ログインしてください。
                </p>
              ) : null)}
          </div>

          <form onSubmit={handleSubmit} className={`mt-4 ${CARD_CLASS}`} noValidate>
            <label htmlFor="login-email" className="block text-sm font-medium text-[#1a1a2e]">
              メールアドレス
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              autoComplete="email"
              className={INPUT_CLASS}
              disabled={submitting}
              aria-required="true"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'login-email-error' : undefined}
            />
            {emailError && (
              <p id="login-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {emailError}
              </p>
            )}

            <label htmlFor="login-password" className="mt-5 block text-sm font-medium text-[#1a1a2e]">
              パスワード
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              required
              autoComplete="current-password"
              className={INPUT_CLASS}
              disabled={submitting}
              aria-required="true"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'login-password-error' : undefined}
            />
            {passwordError && (
              <p id="login-password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {passwordError}
              </p>
            )}

            <div className="mt-2 text-right text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
              >
                パスワードを忘れた方はこちら
              </Link>
            </div>

            {formError && (
              <p
                className="mt-7 text-center text-sm text-red-600 whitespace-pre-line"
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
              {submitting ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#4a4a6a]">
            初めての方は
            <Link
              href="/signup"
              className="ml-1 font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              新規登録
            </Link>
            へ
          </p>
        </div>
      </main>

      <footer className="border-t border-[#ede9e2] bg-white px-6 py-10 sm:px-10 sm:py-10">
        <div className="mx-auto grid max-w-[1140px] gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="mb-3.5 flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
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