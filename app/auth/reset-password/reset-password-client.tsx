'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CONTAINER_CLASS = 'mx-auto max-w-md px-6 py-10 sm:py-12'
const CARD_CLASS = 'rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-9'
const INPUT_CLASS =
  'mt-1.5 w-full rounded-lg border border-[#ede9e2] bg-white px-3.5 py-2.5 text-[#1a1a2e] placeholder-[#9ca3af] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-70 disabled:cursor-not-allowed'

export function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let isActive = true

    async function checkSession() {
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        if (error) {
          console.error('Reset password verifyOtp error', error)
          if (isActive) {
            setHasSession(false)
            setLoading(false)
          }
          return
        }
      }
      let session = (await supabase.auth.getSession()).data.session
      if (session && isActive) {
        setHasSession(true)
        setLoading(false)
        return
      }
      await new Promise((r) => setTimeout(r, 400))
      if (!isActive) return
      session = (await supabase.auth.getSession()).data.session
      if (isActive) {
        setHasSession(!!session)
        setLoading(false)
      }
    }

    checkSession()
    return () => {
      isActive = false
    }
  }, [searchParams])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordError('')
    setConfirmError('')
    setFormError('')

    let hasFieldErrors = false
    if (!password) {
      setPasswordError('新しいパスワードを入力してください')
      hasFieldErrors = true
    } else if (password.length < 8) {
      setPasswordError('パスワードは8文字以上にしてください')
      hasFieldErrors = true
    }
    if (!confirmPassword) {
      setConfirmError('パスワード（確認）を入力してください')
      hasFieldErrors = true
    } else if (password !== confirmPassword) {
      setConfirmError('パスワードが一致しません')
      hasFieldErrors = true
    }
    if (hasFieldErrors) return

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        console.error('Reset password updateUser error', error)
        setFormError('パスワードの更新に失敗しました。時間をおいて再度お試しください。')
        return
      }
      router.replace('/login?reset=1')
    } catch (err) {
      console.error('Reset password exception', err)
      setFormError('パスワードの更新に失敗しました。時間をおいて再度お試しください。')
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
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_CLASS} text-center`}>
            <p className="text-[#4a4a6a]" aria-live="polite">読み込み中...</p>
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

  if (!hasSession) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <header className="sticky top-0 z-50 border-b border-[#ede9e2] bg-white">
          <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 sm:px-10">
            <Link href="/" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg" aria-label="NativeFlow トップへ">
              <Image src="/header_logo.svg" alt="NativeFlow" width={200} height={48} className="h-9 w-auto object-contain sm:h-10" priority />
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_CLASS} text-center`}>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">リンクが無効または期限切れです</h2>
            <p className="mt-3 text-sm text-[#4a4a6a]">
              パスワード再設定メールのリンクの有効期限が切れているか、既に使用されています。もう一度パスワード再設定の手続きをお願いします。
            </p>
            <p className="mt-6">
              <Link href="/forgot-password" className="text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
                パスワードを忘れた方
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
          <Link href="/" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg" aria-label="NativeFlow トップへ">
            <Image src="/header_logo.svg" alt="NativeFlow" width={200} height={48} className="h-9 w-auto object-contain sm:h-10" priority />
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          <div className="text-center mt-6 sm:mt-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
              新しいパスワードを設定
            </h1>
            <p className="mt-2 text-sm text-[#4a4a6a]">
              新しいパスワードを入力してください。
            </p>
          </div>

          <form onSubmit={handleSubmit} className={`mt-4 ${CARD_CLASS}`} noValidate>
            <label htmlFor="reset-password" className="block text-sm font-medium text-[#1a1a2e]">
              新しいパスワード
            </label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              autoComplete="new-password"
              className={INPUT_CLASS}
              disabled={submitting}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'reset-password-error' : undefined}
            />
            {passwordError && (
              <p id="reset-password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {passwordError}
              </p>
            )}

            <label htmlFor="reset-password-confirm" className="mt-5 block text-sm font-medium text-[#1a1a2e]">
              新しいパスワード（確認）
            </label>
            <input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="8文字以上"
              autoComplete="new-password"
              className={INPUT_CLASS}
              disabled={submitting}
              aria-invalid={!!confirmError}
              aria-describedby={confirmError ? 'reset-password-confirm-error' : undefined}
            />
            {confirmError && (
              <p id="reset-password-confirm-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {confirmError}
              </p>
            )}

            {formError && (
              <p className="mt-5 text-center text-sm text-red-600" role="alert" aria-live="polite">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-amber-500 py-3.5 font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? '設定中...' : 'パスワードを設定する'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#4a4a6a]">
            <Link href="/login" className="font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
              ログインへ戻る
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
