'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import AppHeader from '@/components/header/app-header'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import {
  getUserProfileForCompletionCheck,
  isUserProfileOnboardingComplete,
} from '@/lib/profile-completion'

const supabase = getSupabaseBrowserClient()

const FAILURE_REDIRECT = '/login?confirm_error=1'

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

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const nextParam = searchParams.get('next')
    const planParam = searchParams.get('plan')
    const planQuery = planParam === 'monthly' || planParam === 'yearly' ? `?plan=${planParam}` : ''
    const isSupportedType = type === 'email' || type === 'signup' || type === 'magiclink'

    if (type != null && type !== '' && !isSupportedType) {
      router.replace(FAILURE_REDIRECT)
      return
    }

    async function handlePostConfirmRedirect() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Auth confirm session fetch failed', sessionError)
          router.replace(FAILURE_REDIRECT)
          return
        }

        const user = session?.user
        if (!user) {
          router.replace(FAILURE_REDIRECT)
          return
        }

      const { profile, error: profileError } =
        await getUserProfileForCompletionCheck(user.id)
      
      if (profileError) {
        console.warn('Auth confirm profile fetch failed, routing to onboarding', profileError)
        router.replace(`/onboarding${planQuery}`)
        return
      }
      
      if (!profile) {
        router.replace(`/onboarding${planQuery}`)
        return
      }

      if (!isUserProfileOnboardingComplete(profile)) {
        router.replace(`/onboarding${planQuery}`)
        return
      }

        if (isSafeRedirect(nextParam) && nextParam !== '/onboarding') {
          router.replace(nextParam)
          return
        }

        router.replace('/lesson')
      } catch (err) {
        console.error('Post auth redirect failed', err)
        router.replace(FAILURE_REDIRECT)
      }
    }

    async function tryHashFallback() {
      await supabase.auth.initialize()
      await handlePostConfirmRedirect()
    }

    if (!tokenHash) {
      ;(async () => {
        try {
          await tryHashFallback()
        } catch (err) {
          console.error('Auth confirm hash fallback exception', err)
          router.replace(FAILURE_REDIRECT)
        }
      })()
      return
    }

    if (!isSupportedType) {
      router.replace(FAILURE_REDIRECT)
      return
    }

    async function verify() {
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
          router.replace(FAILURE_REDIRECT)
          return
        }

        await handlePostConfirmRedirect()
      } catch (err) {
        console.error('Auth confirm exception', err)
        router.replace(FAILURE_REDIRECT)
      }
    }

    void verify()
  }, [router, searchParams])

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