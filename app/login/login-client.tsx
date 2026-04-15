'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AppHeader from '@/components/header/app-header'
import AppFooter, { LP_FOOTER_CSS } from '@/components/footer/app-footer'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getUserProfileForCompletionCheck,
  isUserProfileOnboardingComplete,
} from '@/lib/profile-completion'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { getAuthCopy, readUiLanguageFromStorage } from '@/lib/auth-copy'

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

  const t = getAuthCopy(readUiLanguageFromStorage()).login

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkSubmitting, setMagicLinkSubmitting] = useState(false)
  const [showPasswordLogin, setShowPasswordLogin] = useState(false)

  useEffect(() => {
    setLoading(false)
  }, [])

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  async function handleGoogleOAuth() {
    setFormError('')
    setOauthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/confirm`,
        },
      })
      if (error) {
        setFormError(t.errorGoogleFailed)
        setOauthLoading(false)
      }
      // On success, Supabase redirects the browser — no further action needed
    } catch {
      setFormError(t.errorGoogleFailed)
      setOauthLoading(false)
    }
  }

  async function handleMagicLink() {
    setEmailError('')
    setFormError('')
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setEmailError(t.emailRequired)
      return
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailError(t.emailInvalid)
      return
    }
    setMagicLinkSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('rate') || msg.includes('limit')) {
          setFormError(t.errorRateLimit)
        } else {
          setFormError(t.errorMagicLinkFailed)
        }
      } else {
        setMagicLinkSent(true)
      }
    } catch {
      setFormError(t.errorMagicLinkFailed)
    } finally {
      setMagicLinkSubmitting(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEmailError('')
    setPasswordError('')
    setFormError('')

    const trimmedEmail = email.trim()
    let hasFieldErrors = false

    if (!trimmedEmail) {
      setEmailError(t.emailRequired)
      hasFieldErrors = true
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError(t.emailInvalid)
      hasFieldErrors = true
    }

    if (!password) {
      setPasswordError(t.passwordRequired)
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
          setFormError(t.errorInvalidCredentials)
        } else if (isEmailNotConfirmed) {
          setFormError(t.errorEmailNotConfirmed)
        } else {
          setFormError(t.errorGeneric)
        }
        return
      }
      
      // 👇 これが今回の最重要追加
      if (!data?.user) {
        setFormError(t.errorGeneric)
        return
      }

      // 👇 getUserは使わない（ここが超重要）
      const user = data.user

      const nextRoute = await resolvePostLoginRoute(user.id)
      router.replace(nextRoute)
    } catch (err) {
      console.error('Login submit failed', err)
      setFormError(t.errorGeneric)
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
        <AppHeader />
        <div className="h-[72px] lg:block hidden" />
        <div className="h-[56px] lg:hidden" />

        <main className="flex-1">
          <div className={CONTAINER_CLASS}>
            <div className="text-center mt-10 sm:mt-12">
              <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
                {t.title}
              </h1>
              <p className="mt-2 text-sm text-[#4a4a6a]">
                {t.subtitle}
              </p>
            </div>

            <div className="min-h-[2.75rem] mb-1" aria-hidden="true" />

            <div className={`mt-4 ${CARD_CLASS} flex flex-col items-center justify-center min-h-[200px]`}>
              <p className="text-[#4a4a6a]" aria-live="polite">
                {getAuthCopy(readUiLanguageFromStorage()).shared.loading}
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-[#4a4a6a]">
              {t.signupPrompt}
              <Link
                href="/signup"
                className="ml-1 font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
              >
                {t.signupLink}
              </Link>
            </p>
          </div>
        </main>

        <style>{LP_FOOTER_CSS}</style>
        <AppFooter />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f7f4ef]"
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <AppHeader />
      <div className="h-[72px] lg:block hidden" />
      <div className="h-[56px] lg:hidden" />

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          <div className="text-center mt-10 sm:mt-12">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-[#4a4a6a]">
              {t.subtitle}
            </p>
          </div>

          <div className="min-h-[2.75rem] mb-1 flex flex-col justify-center" aria-live="polite" aria-atomic="true">
            {!formError &&
              (confirmError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="status">
                  {t.bannerConfirmError}
                </p>
              ) : confirmed ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
                  {t.bannerConfirmed}
                </p>
              ) : registered ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
                  {t.bannerRegistered}
                </p>
              ) : reset ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
                  {t.bannerReset}
                </p>
              ) : null)}
          </div>

          <div className={`mt-4 ${CARD_CLASS}`}>
            {/* ── Google OAuth ── */}
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={oauthLoading || submitting || magicLinkSubmitting}
              className="w-full rounded-xl border border-[#ede9e2] bg-white py-3.5 font-semibold text-[#1a1a2e] shadow-sm hover:bg-[#f7f4ef] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {oauthLoading ? t.googleLoading : t.googleButton}
            </button>

            {/* ── Divider ── */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#ede9e2]" />
              <span className="text-xs font-medium text-[#9ca3af]">{getAuthCopy(readUiLanguageFromStorage()).shared.or}</span>
              <div className="h-px flex-1 bg-[#ede9e2]" />
            </div>

            {/* ── Magic Link ── */}
            {magicLinkSent ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                <p className="text-sm font-medium text-emerald-800">
                  {t.magicLinkSentTitle}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  {t.magicLinkSentBody}
                </p>
                <button
                  type="button"
                  onClick={() => setMagicLinkSent(false)}
                  className="mt-3 text-xs font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
                >
                  {t.magicLinkRetry}
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleMagicLink() }} noValidate>
                <label htmlFor="login-email" className="block text-sm font-medium text-[#1a1a2e]">
                  {t.emailLabel}
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
                  disabled={submitting || magicLinkSubmitting}
                  aria-required="true"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'login-email-error' : undefined}
                />
                {emailError && (
                  <p id="login-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {emailError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={magicLinkSubmitting || submitting || oauthLoading}
                  className="mt-4 w-full rounded-xl bg-amber-500 py-3.5 font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {magicLinkSubmitting ? t.magicLinkSending : t.magicLinkButton}
                </button>
              </form>
            )}

            {formError && (
              <p
                className="mt-5 text-center text-sm text-red-600 whitespace-pre-line"
                role="alert"
                aria-live="polite"
              >
                {formError}
              </p>
            )}

            {/* ── Password fallback (collapsible) ── */}
            <div className="mt-6 border-t border-[#ede9e2] pt-5">
              <button
                type="button"
                onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                className="w-full text-center text-sm font-medium text-[#9ca3af] hover:text-[#4a4a6a] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
              >
                {showPasswordLogin ? t.passwordToggleClose : t.passwordToggleOpen}
              </button>

              {showPasswordLogin && (
                <form onSubmit={handleSubmit} className="mt-4" noValidate>
                  <label htmlFor="login-password" className="block text-sm font-medium text-[#1a1a2e]">
                    {t.passwordLabel}
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
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
                      {t.forgotPassword}
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-4 w-full rounded-xl border border-amber-500 bg-white py-3 font-semibold text-amber-600 shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {submitting ? t.passwordSubmitting : t.passwordButton}
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-[#4a4a6a]">
            {t.signupPrompt}
            <Link
              href="/signup"
              className="ml-1 font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              {t.signupLink}
            </Link>
          </p>
        </div>
      </main>

      <style>{LP_FOOTER_CSS}</style>
      <AppFooter />
    </div>
  )
}