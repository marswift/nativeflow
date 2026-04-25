'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import AppHeader from '@/components/header/app-header'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import {
  getUserProfileForCompletionCheck,
  isUserProfileOnboardingComplete,
} from '@/lib/profile-completion'
import { logAuthFailure } from '@/lib/log-auth-failure'

const supabase = getSupabaseBrowserClient()

const FAILURE_REDIRECT = '/login?confirm_error=1'
const TIMEOUT_MS = 15_000

function isSafeRedirect(next: string | null): next is string {
  if (!next || typeof next !== 'string') return false
  const trimmed = next.trim()
  if (trimmed === '' || trimmed !== next) return false
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false
  if (trimmed.includes(':')) return false
  return true
}

export function AuthConfirmClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const didRun = useRef(false)
  const [timedOut, setTimedOut] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    // Safety timeout — if redirect never fires, show error UI
    timeoutRef.current = setTimeout(() => setTimedOut(true), TIMEOUT_MS)

    const tokenHash = searchParams.get('token_hash')
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const nextParam = searchParams.get('next')
    const planParam = searchParams.get('plan')
    const planQuery = planParam === 'monthly' || planParam === 'yearly' ? `?plan=${planParam}` : ''
    const isSupportedType = type === 'email' || type === 'signup' || type === 'magiclink'

    if (type != null && type !== '' && !isSupportedType) {
      router.replace(FAILURE_REDIRECT)
      return
    }

    function clearSafetyTimeout() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    async function handlePostConfirmRedirect() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Auth confirm session fetch failed', sessionError)
          clearSafetyTimeout()
          router.replace(FAILURE_REDIRECT)
          return
        }

        const user = session?.user
        if (!user) {
          clearSafetyTimeout()
          router.replace(FAILURE_REDIRECT)
          return
        }

        const { profile, error: profileError } =
          await getUserProfileForCompletionCheck(user.id)

        if (profileError) {
          console.warn('Auth confirm profile fetch failed, routing to onboarding', profileError)
          clearSafetyTimeout()
          router.replace(`/onboarding${planQuery}`)
          return
        }

        if (!profile) {
          clearSafetyTimeout()
          router.replace(`/onboarding${planQuery}`)
          return
        }

        if (!isUserProfileOnboardingComplete(profile)) {
          clearSafetyTimeout()
          router.replace(`/onboarding${planQuery}`)
          return
        }

        if (isSafeRedirect(nextParam) && nextParam !== '/onboarding') {
          clearSafetyTimeout()
          router.replace(nextParam)
          return
        }

        clearSafetyTimeout()
        router.replace('/lesson')
      } catch (err) {
        console.error('Post auth redirect failed', err)
        clearSafetyTimeout()
        router.replace(FAILURE_REDIRECT)
      }
    }

    // ── Path 1: PKCE code in URL (Google OAuth direct, or legacy redirect) ──
    if (code) {
      ;(async () => {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Auth confirm PKCE exchange failed', error.message)
            logAuthFailure({ reason: error.message, provider: 'pkce', route: '/auth/confirm', source: 'pkce_exchange' })
            clearSafetyTimeout()
            router.replace(FAILURE_REDIRECT)
            return
          }
          await handlePostConfirmRedirect()
        } catch (err) {
          console.error('Auth confirm PKCE exchange exception', err)
          logAuthFailure({ reason: 'pkce_exchange_exception', provider: 'pkce', route: '/auth/confirm', source: 'pkce_exchange' })
          clearSafetyTimeout()
          router.replace(FAILURE_REDIRECT)
        }
      })()
      return
    }

    // ── Path 2: token_hash in URL (email verification, legacy flow) ──
    if (tokenHash) {
      if (!isSupportedType) {
        clearSafetyTimeout()
        router.replace(FAILURE_REDIRECT)
        return
      }

      ;(async () => {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'email' | 'signup' | 'magiclink',
          })

          if (error) {
            console.error('Auth confirm verification failed', {
              message: error.message,
              code: (error as { code?: string }).code,
            })
            logAuthFailure({ reason: error.message, provider: 'otp', route: '/auth/confirm', source: 'verify_otp' })
            clearSafetyTimeout()
            router.replace(FAILURE_REDIRECT)
            return
          }

          await handlePostConfirmRedirect()
        } catch (err) {
          console.error('Auth confirm exception', err)
          logAuthFailure({ reason: 'otp_verify_exception', provider: 'otp', route: '/auth/confirm', source: 'verify_otp' })
          clearSafetyTimeout()
          router.replace(FAILURE_REDIRECT)
        }
      })()
      return
    }

    // ── Path 3: No code, no token_hash — session already established (via /auth/callback server route) ──
    ;(async () => {
      try {
        await supabase.auth.initialize()
        await handlePostConfirmRedirect()
      } catch (err) {
        console.error('Auth confirm fallback exception', err)
        logAuthFailure({ reason: 'session_fallback_exception', provider: 'email', route: '/auth/confirm', source: 'session_fallback' })
        clearSafetyTimeout()
        router.replace(FAILURE_REDIRECT)
      }
    })()
  }, [router, searchParams])

  if (timedOut) {
    return (
      <div
        className="min-h-screen flex flex-col bg-[#f7f4ef]"
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader />

        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-sm text-center">
            <p className="text-base font-semibold text-[#1a1a2e]">
              確認に時間がかかっています
            </p>
            <p className="mt-2 text-sm text-[#4a4a6a]">
              通信状況をご確認のうえ、もう一度お試しください
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-amber-500 py-3 font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                再試行
              </button>
              <Link
                href="/login"
                className="rounded-xl border border-[#ede9e2] py-3 font-semibold text-[#4a4a6a] hover:bg-[#f7f4ef] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 text-center"
              >
                ログイン画面に戻る
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f7f4ef]"
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <AppHeader />

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-sm text-center">
          <p className="text-base font-semibold text-[#1a1a2e]">
            メールアドレスを確認しています
          </p>
          <p className="mt-2 text-sm text-[#4a4a6a]">そのままお待ちください</p>
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
            <Link
              href="/#features"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              特徴
            </Link>
            <Link
              href="/#scenes"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              学習方法
            </Link>
            <Link
              href="/#pricing"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              料金プラン
            </Link>
            <Link
              href="/#faq"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              よくある質問
            </Link>
          </div>

          <div>
            <p className="mb-3.5 text-sm font-extrabold text-[#1a1a2e]">法的情報</p>
            <Link
              href="/legal/privacy"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              プライバシーポリシー
            </Link>
            <Link
              href="/legal/terms"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              利用規約
            </Link>
            <Link
              href="/legal/tokusho"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              特定商取引法に基づく表記
            </Link>
            <Link
              href="/legal/company"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              会社情報
            </Link>
          </div>

          <div>
            <p className="mb-3.5 text-sm font-extrabold text-[#1a1a2e]">サポート</p>
            <Link
              href="/contact"
              className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              お問い合わせ
            </Link>
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
