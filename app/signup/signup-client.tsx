'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CONTAINER_CLASS = 'mx-auto max-w-lg px-6 py-10 sm:py-12'
const CARD_CLASS = 'rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-9'
const INPUT_CLASS =
  'mt-1.5 w-full rounded-lg border border-[#ede9e2] bg-white px-3.5 py-2.5 text-[#1a1a2e] placeholder-[#9ca3af] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-70 disabled:cursor-not-allowed'

export function SignupClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')
  const hasPlan = plan === 'monthly' || plan === 'yearly'
  const isYearly = plan === 'yearly'

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let isActive = true

    async function checkSession() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (!sessionError && session?.user) {
          if (isActive) router.replace('/dashboard')
          return
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    checkSession()
    return () => {
      isActive = false
    }
  }, [router])

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  function getSignupErrorMessage(err: { message: string; code?: string; status?: number }): string {
    const msg = err.message.toLowerCase()
    const code = (err as { code?: string }).code?.toLowerCase() ?? ''

    const isAlreadyRegistered =
      code === 'user_already_registered' ||
      code === 'user_already_exists' ||
      msg.includes('already') && (msg.includes('registered') || msg.includes('exists') || msg.includes('email') || msg.includes('in use')) ||
      msg.includes('user already exists') ||
      msg.includes('email already') ||
      msg.includes('duplicate') && msg.includes('email')
    if (isAlreadyRegistered) {
      return 'このメールアドレスは既に登録されています'
    }
    if (
      code === 'signup_disabled' ||
      msg.includes('signup') && (msg.includes('disabled') || msg.includes('not allowed') || msg.includes('not enabled'))
    ) {
      return '現在この方法では登録できません。管理者設定をご確認ください'
    }
    if (
      code === 'weak_password' ||
      msg.includes('password') && (msg.includes('weak') || msg.includes('policy') || msg.includes('condition'))
    ) {
      return 'パスワードの条件を満たしていません'
    }
    if (code === 'invalid_email' || msg.includes('invalid') && msg.includes('email')) {
      return '正しいメールアドレスを入力してください'
    }
    if (msg.includes('rate limit') || msg.includes('email rate limit exceeded')) {
      return 'メール送信回数の上限に達しました。\n少し時間をおいて再度お試しください'
    }

    const fallback = '登録に失敗しました。時間をおいて再度お試しください'
    if (process.env.NODE_ENV === 'development' && err.message) {
      return `${fallback}（${err.message}）`
    }
    return fallback
  }

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
    } else if (password.length < 8) {
      setPasswordError('パスワードは8文字以上にしてください')
      hasFieldErrors = true
    }
    if (hasFieldErrors) return

    const planMeta = hasPlan ? { plan: plan as 'monthly' | 'yearly' } : {}
    const emailRedirectTo = `${window.location.origin}/auth/confirm`

    setSubmitting(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo,
          data: planMeta,
        },
      })
      if (signUpError) {
        console.error('Signup error', {
          message: signUpError.message,
          code: (signUpError as { code?: string }).code,
          status: (signUpError as { status?: number }).status,
          full: signUpError,
        })
        setFormError(getSignupErrorMessage(signUpError as { message: string; code?: string; status?: number }))
        return
      }
      if (data?.session) {
        router.replace('/onboarding')
      } else {
        router.replace('/auth/verify-notice')
      }
    } catch (err) {
      console.error('Signup exception', err)
      setFormError(
        err && typeof err === 'object' && 'message' in err
          ? getSignupErrorMessage(err as { message: string; code?: string; status?: number })
          : '登録に失敗しました。時間をおいて再度お試しください'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <header className="sticky top-0 z-50 border-b border-[#ede9e2] bg-white">
          <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 sm:px-10">
            <Link href="/" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg" aria-label="NativeFlow トップへ">
              <Image src="/header_logo.svg" alt="NativeFlow" width={200} height={48} className="h-9 w-auto object-contain sm:h-10" priority />
            </Link>
          </div>
        </header>
        <main className="flex-1">
          <div className={CONTAINER_CLASS}>
            <div className="text-center mt-6 sm:mt-8">
              <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">新規登録</h1>
              <p className="mt-2 text-sm text-[#4a4a6a]">メールアドレスとパスワードでアカウントを作成してください。</p>
            </div>
            <div className={`mt-6 ${CARD_CLASS} flex flex-col items-center justify-center min-h-[220px]`}>
              <p className="text-[#4a4a6a]" aria-live="polite">読み込み中...</p>
            </div>
            <p className="mt-6 text-center text-sm text-[#4a4a6a]">
              すでにアカウントをお持ちの方は
              <Link href="/login" className="ml-1 font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">ログイン</Link>
            </p>
          </div>
        </main>
        <footer className="border-t border-[#ede9e2] bg-white px-6 py-10 sm:px-10 sm:py-10">
          <div className="mx-auto grid max-w-[1140px] gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="mb-3.5 flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
                <Image src="/footer_logo.svg" alt="NativeFlow" width={200} height={40} className="h-10 w-auto object-contain" />
              </Link>
              <p className="max-w-[240px] text-[13px] leading-relaxed text-[#aaa]">Speak with AI. Learn like a native.</p>
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
    <div className="min-h-screen flex flex-col bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <header className="sticky top-0 z-50 border-b border-[#ede9e2] bg-white">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 sm:px-10">
          <Link
            href="/"
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg"
            aria-label="NativeFlow トップへ"
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
        </div>
      </header>

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          <div className="text-center mt-6 sm:mt-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
              新規登録
            </h1>
            <p className="mt-2 text-sm text-[#4a4a6a]">
              メールアドレスとパスワードでアカウントを作成してください。
            </p>
          </div>

          <form onSubmit={handleSubmit} className={`mt-6 ${CARD_CLASS}`} noValidate>
            {hasPlan ? (
              <div className="mb-5 rounded-xl border border-[#ede9e2] bg-[#faf8f5] px-4 py-4 flex flex-col gap-2">
                <span className="inline-block w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
                  選択中のプラン
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-bold text-[#1a1a2e] sm:text-2xl">
                    {isYearly ? '年額プラン' : '月額プラン'}
                  </span>
                  {isYearly && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700" aria-label="約33パーセントお得">
                      約33%お得！
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#4a4a6a] leading-relaxed">
                  まずは7日間無料でお試しください。無料期間終了後にご選択のプランで課金が開始されます。
                </p>
                <div className="mt-2 flex justify-end">
                  <Link
                    href="/#pricing"
                    className="text-sm font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 rounded"
                  >
                    プランを変更
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-[#ede9e2] bg-[#faf8f5] px-4 py-4 flex flex-col gap-2">
                <p className="text-lg font-bold text-[#1a1a2e] sm:text-xl">
                  無料トライアルを開始
                </p>
                <p className="text-sm text-[#4a4a6a]">
                  7日間は無料です
                </p>
                <p className="text-xs text-[#4a4a6a] leading-relaxed">
                  プランは登録後に選べます。
                </p>
                <div className="mt-2 flex justify-end">
                  <Link
                    href="/#pricing"
                    className="text-sm font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 rounded"
                  >
                    料金プランを見る
                  </Link>
                </div>
              </div>
            )}

            <label htmlFor="signup-email" className="block text-sm font-medium text-[#1a1a2e]">
              メールアドレス
            </label>
            <input
              id="signup-email"
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
              aria-describedby={emailError ? 'signup-email-error' : undefined}
            />
            {emailError && (
              <p id="signup-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {emailError}
              </p>
            )}

            <label htmlFor="signup-password" className="mt-5 block text-sm font-medium text-[#1a1a2e]">
              パスワード
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              required
              autoComplete="new-password"
              className={INPUT_CLASS}
              disabled={submitting}
              aria-required="true"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'signup-password-error' : undefined}
            />
            {passwordError && (
              <p id="signup-password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {passwordError}
              </p>
            )}

            {formError && (
              <p className="mt-6 text-center text-sm text-red-600 whitespace-pre-line" role="alert" aria-live="polite">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-amber-500 py-3.5 font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? '登録中...' : '新規登録する'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#4a4a6a]">
            すでにアカウントをお持ちの方は
            <Link
              href="/login"
              className="ml-1 font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              ログイン
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-[#ede9e2] bg-white px-6 py-10 sm:px-10 sm:py-10">
        <div className="mx-auto grid max-w-[1140px] gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="mb-3.5 flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
              <Image src="/footer_logo.svg" alt="NativeFlow" width={200} height={40} className="h-10 w-auto object-contain" />
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
