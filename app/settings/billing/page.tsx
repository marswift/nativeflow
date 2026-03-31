'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { UserProfileRow } from '../../../lib/types'
import AppHeader from '@/components/header/app-header'
import AppFooter from '@/components/footer/app-footer'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { useCurrentLanguage } from '@/lib/use-current-language'

const supabase = getSupabaseBrowserClient()

const PAGE_SHELL_CLASS = 'min-h-screen flex flex-col bg-[#faf9f6]'
const RADIUS = 'rounded-2xl'
const CONTAINER_CLASS = 'mx-auto w-full max-w-6xl px-6 py-8 sm:py-10 md:px-8 md:py-10 lg:px-10 lg:py-12'
const CARD_SHADOW = 'shadow-[0_10px_30px_rgba(15,23,42,0.06)]'
const CARD_BORDER = 'border border-[#E8E4DF]'
const CARD_BASE = `${RADIUS} ${CARD_BORDER} bg-white ${CARD_SHADOW}`
const LABEL_CLASS = 'block text-sm font-medium text-[#4a4a6a]'
const READONLY_VALUE_CLASS = 'mt-1.5 rounded-xl border border-[#ede9e2] bg-[#faf8f5] px-4 py-2.5 text-[15px] text-[#1a1a2e]'

function BillingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <p className={LABEL_CLASS}>{label}</p>
      <p className={READONLY_VALUE_CLASS} aria-readonly="true">
        {value}
      </p>
    </div>
  )
}

type BillingProfile = Pick<UserProfileRow,
  'planned_plan_code' | 'subscription_status' | 'current_period_end' | 'cancel_at_period_end'
> & { next_plan_code?: string | null }

function formatPlanLabel(plan: BillingProfile['planned_plan_code']): string {
  if (plan === 'yearly') return '年額プラン'
  if (plan === 'monthly') return '月額プラン'
  return '未設定'
}

function formatSubscriptionStatus(
  status: BillingProfile['subscription_status'],
  cancelAtPeriodEnd: BillingProfile['cancel_at_period_end']
): string {
  if (!status) return '未設定'
  if (cancelAtPeriodEnd) return '期間終了後に解約予定'
  if (status === 'trialing') return '無料トライアル中'
  if (status === 'active') return '有効'
  if (status === 'past_due') return 'お支払い確認中'
  if (status === 'unpaid') return 'お支払い未完了'
  if (status === 'canceled') return '解約済み'
  return status
}

function formatPeriodEnd(value: BillingProfile['current_period_end']): string {
  if (!value) return '未設定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未設定'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export default function BillingSettingsPage() {
  const router = useRouter()
  const { currentLanguage, handleChangeLanguage } = useCurrentLanguage()  // ← 追加
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<BillingProfile | null>(null)
  const [pageError, setPageError] = useState('')
  const [billingActionLoading, setBillingActionLoading] = useState(false)
  const [billingActionError, setBillingActionError] = useState('')

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  async function handleOpenStripePortal() {
    setBillingActionError('')
    setBillingActionLoading(true)
  
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setBillingActionError('ログイン情報を確認できませんでした。再度ログインしてください。')
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
  
      const data = (await res.json().catch(() => ({}))) as {
        url?: string
        message?: string
      }
  
      if (!res.ok || !data.url) {
        setBillingActionError(data.message ?? 'Stripe管理画面を開けませんでした。時間をおいて再度お試しください。')
        return
      }
  
      window.location.assign(data.url)
    } catch (err) {
      console.error(err)
      setBillingActionError('Stripe管理画面を開けませんでした。時間をおいて再度お試しください。')
    } finally {
      setBillingActionLoading(false)
    }
  }

  async function handleStartCheckout(plan: 'monthly' | 'yearly') {
    setBillingActionError('')
    setBillingActionLoading(true)
  
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setBillingActionError('ログイン情報を確認できませんでした。再度ログインしてください。')
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ plan }),
      })
  
      const data = (await res.json().catch(() => ({}))) as {
        url?: string
        message?: string
      }
  
      if (!res.ok || !data.url) {
        setBillingActionError(data.message ?? '決済画面を開けませんでした。時間をおいて再度お試しください。')
        return
      }
  
      window.location.assign(data.url)
    } catch (err) {
      console.error(err)
      setBillingActionError('決済画面を開けませんでした。時間をおいて再度お試しください。')
    } finally {
      setBillingActionLoading(false)
    }
  }
  
  useEffect(() => {
    let isActive = true
  
    async function checkSession() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        
        if (userError || !user) {
          if (isActive) router.replace('/login')
          return
        }
        
        const { data: row, error: fetchError } = await supabase
          .from('user_profiles')
          .select('planned_plan_code, subscription_status, current_period_end, cancel_at_period_end, next_plan_code')
          .eq('id', user.id)
          .maybeSingle()
  
        if (fetchError) {
          console.error(fetchError)
          if (isActive) setPageError('お支払い情報を読み込めませんでした。時間をおいて再度お試しください。')
          return
        }
  
        if (!row) {
          if (isActive) router.replace('/onboarding')
          return
        }
        
        if (isActive) {
          setProfile(row as BillingProfile)
        }
        
      } catch (err) {
        console.error(err)
        if (isActive) setPageError('お支払い情報を読み込めませんでした。時間をおいて再度お試しください。')
      } finally {
        if (isActive) setLoading(false)
      }
    }
  
    checkSession()
    return () => {
      isActive = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_BASE} px-6 py-8 text-center`}>
            <p className="text-[#4a4a6a]" aria-live="polite">
              読み込み中...
            </p>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  if (pageError) {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_BASE} px-6 py-8 text-center`}>
            <p className="text-sm text-red-600">{pageError}</p>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  const planLabel = formatPlanLabel(profile?.planned_plan_code ?? null)
  const statusLabel = formatSubscriptionStatus(
    profile?.subscription_status ?? null,
    profile?.cancel_at_period_end ?? null
  )
  const nextRenewalLabel = formatPeriodEnd(profile?.current_period_end ?? null)
  const canResumeSubscription =
    profile?.subscription_status === 'canceled' ||
    profile?.subscription_status === 'unpaid'

  return (
    <div
      className={PAGE_SHELL_CLASS}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          {/* Page header */}
          <section className="relative overflow-hidden rounded-[24px] border border-[#E8E4DF] bg-[linear-gradient(135deg,#FFF9EC_0%,#FFFFFF_55%,#FFFDF8_100%)] px-6 py-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-7 sm:py-7">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgba(245,166,35,0.10)]" />
            <span className="pointer-events-none absolute bottom-[-18px] right-[72px] h-24 w-24 rounded-full bg-[rgba(245,166,35,0.07)]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.14)] px-3 py-1 text-[13px] font-bold text-[#B7791F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
                Billing
              </div>

              <h1 className="mt-4 text-[1.9rem] font-black leading-[1.15] text-[#1a1a2e] sm:text-[2.2rem]">
                お支払いと契約状況を確認して
                <br className="hidden sm:block" />
                安心して学習を続けましょう
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5a5a7a]">
                現在のプラン、契約状況、次回決済日、支払い方法、請求履歴、
                <br className="hidden sm:block" />
                解約状況をまとめて確認できます。
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                  プラン: <strong className="text-[#1a1a2e]">{planLabel}</strong>
                </span>
                <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                  契約状況: <strong className="text-[#1a1a2e]">{statusLabel}</strong>
                </span>
                <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                  次回決済日: <strong className="text-[#1a1a2e]">{nextRenewalLabel}</strong>
                </span>
              </div>
            </div>
          </section>

          <div className="mt-8 space-y-6 md:space-y-8">
            <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6`} aria-label="次回決済日">
              <div className="mb-5 border-b border-[#F0ECE6] pb-4">
                <p className="text-[13px] font-bold tracking-[0.04em] text-[#7b7b94]">
                  RENEWAL
                </p>
                <h2 className="mt-2 text-[1.35rem] font-black leading-tight text-[#1a1a2e]">
                  次回決済日
                </h2>
              </div>
              <p className="mb-5 text-center text-sm text-[#5a5a7a]">
                次回の更新日、または最初の決済日を確認できます。
              </p>
              <BillingRow
                label={statusLabel === '無料トライアル中' ? '最初の決済日' : '次回決済日'}
                value={nextRenewalLabel}
              />
            </section>

            <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6`} aria-label="現在のプラン">
              <div className="mb-5 border-b border-[#F0ECE6] pb-4">
                <p className="text-[13px] font-bold tracking-[0.04em] text-[#7b7b94]">
                  PLAN
                </p>
                <h2 className="mt-2 text-[1.35rem] font-black leading-tight text-[#1a1a2e]">
                  現在のプラン
                </h2>
              </div>
              <p className="mb-5 text-center text-sm text-[#5a5a7a]">
                現在の契約内容と利用状態を確認できます。
              </p>
                <BillingRow label="プラン" value={planLabel} />
                {profile?.next_plan_code &&
                  profile.next_plan_code !== profile.planned_plan_code &&
                  (profile.next_plan_code === 'monthly' || profile.next_plan_code === 'yearly') && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      次回更新日より{formatPlanLabel(profile.next_plan_code)}に変更されます。
                    </p>
                )}
                <BillingRow label="契約状況" value={statusLabel} />
            </section>

            <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6`} aria-label="Stripe管理">
              <div className="mb-5 border-b border-[#F0ECE6] pb-4">
                <p className="text-[13px] font-bold tracking-[0.04em] text-[#7b7b94]">
                  PAYMENT
                </p>
                <h2 className="mt-2 text-[1.35rem] font-black leading-tight text-[#1a1a2e]">
                  支払い管理
                </h2>
              </div>

              <p className="text-sm text-[#5a5a7a] leading-relaxed">
                支払い方法、請求履歴、プラン変更、解約は決済管理画面から行えます。
              </p>

              <div className="mt-4 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenStripePortal}
                  
                  disabled={billingActionLoading}
                  className="inline-flex items-center rounded-[14px] bg-[#F5A623] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(245,166,35,0.28)] transition hover:-translate-y-px hover:bg-[#D4881A] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:opacity-70 cursor-pointer"
                >
                  {billingActionLoading ? '決済管理画面を開いています...' : '決済管理画面を確認する'}
                </button>
                  <div className="mt-3 rounded-lg border border-[#E8E4DF] bg-[#FAF8F5] px-4 py-3 text-xs text-[#5a5a7a] leading-relaxed w-full">
                    <p className="font-semibold text-[#1a1a2e] mb-1">決済管理画面の操作について</p>
                    <p>・「サブスクリプションを更新する」→ プラン変更</p>
                    <p>・「サブスクリプションをキャンセル」→ 解約</p>
                    <p className="mt-1 text-[#7b7b94]">変更は次回更新日から反映されます。</p>
                  </div>
                  {billingActionError ? (
                    <p className="text-sm text-red-600" role="alert">
                      {billingActionError}
                    </p>
                  ) : null}
              </div>
            </section>

            {canResumeSubscription && (
              <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6`} aria-label="プラン再開">
                <div className="mb-5 border-b border-[#F0ECE6] pb-4">
                  <p className="text-[13px] font-bold tracking-[0.04em] text-[#7b7b94]">
                    RESTART
                  </p>
                  <h2 className="mt-2 text-[1.35rem] font-black leading-tight text-[#1a1a2e]">
                    学習を再開する
                  </h2>
                </div>

                <p className="text-sm text-[#5a5a7a] leading-relaxed text-center">
                  ご希望のプランを選択すると、決済画面へ進みます。
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleStartCheckout('monthly')}
                    disabled={billingActionLoading}
                    className="inline-flex items-center justify-center rounded-[14px] bg-[#F5A623] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(245,166,35,0.28)] transition hover:-translate-y-px hover:bg-[#D4881A] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:opacity-70 cursor-pointer"
                  >
                    月額プランで再開
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartCheckout('yearly')}
                    disabled={billingActionLoading}
                    className="inline-flex items-center justify-center rounded-[14px] border border-amber-300 bg-white px-5 py-3 text-sm font-black text-amber-700 transition hover:-translate-y-px hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:opacity-70 cursor-pointer"
                  >
                    年額プランで再開
                  </button>
                </div>
              </section>
            )}

            <div className="rounded-[20px] border border-[#E8E4DF] bg-[#FAF8F5] px-6 py-5 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
              <p className="text-center text-sm font-semibold text-[#1a1a2e]">
                ご相談について
              </p>
              <p className="mt-2 text-center text-[13px] text-[#5a5a7a] leading-relaxed">
                契約内容について不明点がある場合は、
                <Link href="/contact" className="mx-1 font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800">
                  お問い合わせページ
                </Link>
                からご連絡ください。
              </p>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
