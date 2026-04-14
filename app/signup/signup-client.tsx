'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AppHeader from '@/components/header/app-header'
import AppFooter, { LP_FOOTER_CSS } from '@/components/footer/app-footer'
import { useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { getAuthCopy, readUiLanguageFromStorage } from '@/lib/auth-copy'

const supabase = getSupabaseBrowserClient()

const CONTAINER_CLASS = 'mx-auto max-w-lg px-6 py-10 sm:py-12'
const CARD_CLASS = 'rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-9'
const INPUT_CLASS =
  'mt-1.5 w-full rounded-lg border border-[#ede9e2] bg-white px-3.5 py-2.5 text-[#1a1a2e] placeholder-[#9ca3af] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-70 disabled:cursor-not-allowed'

function getSignupErrorMessage(
  err: { message: string; code?: string; status?: number },
  copy: ReturnType<typeof getAuthCopy>['signup']
): string {
  const msg = err.message.toLowerCase()
  const code = (err as { code?: string }).code?.toLowerCase() ?? ''

  const isAlreadyRegistered =
    code === 'user_already_registered' ||
    code === 'user_already_exists' ||
    msg.includes('already') && (msg.includes('registered') || msg.includes('exists') || msg.includes('email') || msg.includes('in use')) ||
    msg.includes('user already exists') ||
    msg.includes('email already') ||
    msg.includes('duplicate') && msg.includes('email')
  if (isAlreadyRegistered) return copy.errorAlreadyRegistered
  if (
    code === 'signup_disabled' ||
    msg.includes('signup') && (msg.includes('disabled') || msg.includes('not allowed') || msg.includes('not enabled'))
  ) return copy.errorSignupDisabled
  if (code === 'invalid_email' || msg.includes('invalid') && msg.includes('email')) return copy.errorInvalidEmail
  if (msg.includes('rate limit') || msg.includes('email rate limit exceeded')) return copy.errorRateLimit

  const fallback = copy.errorGeneric
  if (process.env.NODE_ENV === 'development') {
    const debugParts = [err.message, err.code, err.status]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .join(' / ')
    if (debugParts) return `${fallback}（${debugParts}）`
  }
  return fallback
}

export function SignupClient() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')
  const hasPlan = plan === 'monthly' || plan === 'yearly'
  const isYearly = plan === 'yearly'

  const authCopy = getAuthCopy(readUiLanguageFromStorage())
  const t = authCopy.signup

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [oauthLoading, setOauthLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkSubmitting, setMagicLinkSubmitting] = useState(false)

  useEffect(() => {
    setLoading(false)
  }, [])

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  /** Build redirect URL preserving plan query param for post-auth routing. */
  function buildRedirectUrl(): string {
    const base = `${window.location.origin}/auth/confirm`
    return hasPlan ? `${base}?plan=${plan}` : base
  }

  async function handleGoogleOAuth() {
    setFormError('')
    setOauthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildRedirectUrl(),
        },
      })
      if (error) {
        setFormError(t.errorGoogleFailed)
        setOauthLoading(false)
      }
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
          emailRedirectTo: buildRedirectUrl(),
        },
      })
      if (error) {
        setFormError(
          getSignupErrorMessage(error as { message: string; code?: string; status?: number }, t)
        )
      } else {
        setMagicLinkSent(true)
      }
    } catch (err) {
      setFormError(
        err && typeof err === 'object' && 'message' in err
          ? getSignupErrorMessage(err as { message: string; code?: string; status?: number }, t)
          : t.errorGeneric
      )
    } finally {
      setMagicLinkSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <AppHeader />
        <main className="flex-1">
          <div className={CONTAINER_CLASS}>
            <div className="text-center mt-10 sm:mt-12">
              <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">{t.title}</h1>
              <p className="mt-2 text-sm text-[#4a4a6a]">{t.subtitle}</p>
            </div>
            <div className={`mt-6 ${CARD_CLASS} flex flex-col items-center justify-center min-h-[220px]`}>
              <p className="text-[#4a4a6a]" aria-live="polite">{authCopy.shared.loading}</p>
            </div>
            <p className="mt-6 text-center text-sm text-[#4a4a6a]">
              {t.loginPrompt}
              <Link href="/login" className="ml-1 font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">{t.loginLink}</Link>
            </p>
          </div>
        </main>
        <style>{LP_FOOTER_CSS}</style>
        <AppFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <AppHeader />

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

          <div className={`mt-6 ${CARD_CLASS}`}>
            {/* ── Plan banner (preserved) ── */}
            {hasPlan ? (
              <div className="mb-5 rounded-xl border border-[#ede9e2] bg-[#faf8f5] px-4 py-4 flex flex-col gap-2">
                <span className="inline-block w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
                  {t.planBadge}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-bold text-[#1a1a2e] sm:text-2xl">
                    {isYearly ? t.planYearly : t.planMonthly}
                  </span>
                  {isYearly && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700" aria-label="約33パーセントお得">
                      {t.planYearlySaving}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#4a4a6a] leading-relaxed">
                  {t.planTrialNote}
                </p>
                <div className="mt-2 flex justify-end">
                  <Link
                    href="/#pricing"
                    className="text-sm font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 rounded"
                  >
                    {t.planChangeLink}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-[#ede9e2] bg-[#faf8f5] px-4 py-4 flex flex-col gap-2">
                <p className="text-lg font-bold text-[#1a1a2e] sm:text-xl">
                  {t.noPlanTitle}
                </p>
                <p className="text-sm text-[#4a4a6a]">
                  {t.noPlanSubtitle}
                </p>
                <p className="text-xs text-[#4a4a6a] leading-relaxed">
                  {t.noPlanNote}
                </p>
                <div className="mt-2 flex justify-end">
                  <Link
                    href="/#pricing"
                    className="text-sm font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 rounded"
                  >
                    {t.noPlanLink}
                  </Link>
                </div>
              </div>
            )}

            {/* ── Google OAuth ── */}
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={oauthLoading || magicLinkSubmitting}
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
              <span className="text-xs font-medium text-[#9ca3af]">{t.divider}</span>
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
                <label htmlFor="signup-email" className="block text-sm font-medium text-[#1a1a2e]">
                  {t.emailLabel}
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
                  disabled={magicLinkSubmitting || oauthLoading}
                  aria-required="true"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'signup-email-error' : undefined}
                />
                {emailError && (
                  <p id="signup-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {emailError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={magicLinkSubmitting || oauthLoading}
                  className="mt-4 w-full rounded-xl bg-amber-500 py-3.5 font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {magicLinkSubmitting ? t.magicLinkSending : t.magicLinkButton}
                </button>
              </form>
            )}

            {formError && (
              <p className="mt-5 text-center text-sm text-red-600 whitespace-pre-line" role="alert" aria-live="polite">
                {formError}
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-[#4a4a6a]">
            {t.loginPrompt}
            <Link
              href="/login"
              className="ml-1 font-semibold text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            >
              {t.loginLink}
            </Link>
          </p>
        </div>
      </main>

      <style>{LP_FOOTER_CSS}</style>
      <AppFooter />
    </div>
  )
}
