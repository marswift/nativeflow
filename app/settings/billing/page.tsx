'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { UserProfileRow } from '../../../lib/types'
import { SettingsPageHeader } from '@/components/settings/SettingsPageHeader'
import { SettingsPageFooter } from '@/components/settings/SettingsPageFooter'
import { supabase } from '@/lib/supabase'

const PAGE_SHELL_CLASS = 'min-h-screen flex flex-col bg-[#faf9f6]'
const CONTAINER_CLASS = 'mx-auto w-full max-w-md px-6 py-8 sm:py-10 md:max-w-5xl md:px-8 md:py-10 lg:px-10 lg:py-12'
const RADIUS = 'rounded-2xl'
const CARD_SHADOW = 'shadow-[0_6px_24px_rgba(0,0,0,.06)]'
const CARD_BORDER = 'border border-[#e8e4de]'
const CARD_BASE = `${RADIUS} ${CARD_BORDER} bg-white ${CARD_SHADOW}`
const LINK_CLASS = 'text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded'
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

type BillingProfile = Pick<
  UserProfileRow,
  'planned_plan_code' | 'subscription_status' | 'current_period_end' | 'cancel_at_period_end'
>

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

function formatRenewalStatus(cancelAtPeriodEnd: BillingProfile['cancel_at_period_end']): string {
  if (cancelAtPeriodEnd == null) return '未設定'
  return cancelAtPeriodEnd ? '期間終了時に解約予定' : '自動更新あり'
}

export default function BillingSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<BillingProfile | null>(null)
  const [pageError, setPageError] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState('')

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  async function handleOpenStripePortal() {
    setPortalError('')
    setPortalLoading(true)
  
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
  
      if (sessionError || !session?.access_token) {
        setPortalError('ログイン情報を確認できませんでした。再度ログインしてください。')
        return
      }
  
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
  
      const data = (await res.json().catch(() => ({}))) as {
        url?: string
        message?: string
      }
  
      if (!res.ok || !data.url) {
        setPortalError(data.message ?? 'Stripe管理画面を開けませんでした。時間をおいて再度お試しください。')
        return
      }
  
      window.location.assign(data.url)
    } catch (err) {
      console.error(err)
      setPortalError('Stripe管理画面を開けませんでした。時間をおいて再度お試しください。')
    } finally {
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session?.user) {
          if (isActive) router.replace('/login')
          return
        }

        const { data: row, error: fetchError } = await supabase
          .from('user_profiles')
          .select('planned_plan_code, subscription_status, current_period_end, cancel_at_period_end')
          .eq('id', session.user.id)
          .maybeSingle()

        if (fetchError) {
          console.error(fetchError)
          if (isActive) setPageError('お支払い情報を読み込めませんでした。時間をおいて再度お試しください。')
          return
        }

        if (isActive) {
          setProfile((row ?? null) as BillingProfile | null)
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
  }, [router])

  if (loading) {
    return (
      <div className={PAGE_SHELL_CLASS} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <SettingsPageHeader onLogout={handleLogout} />
        <main className="flex-1 flex items-center justify-center px-6">
          <p className="text-[#4a4a6a]" aria-live="polite">読み込み中...</p>
        </main>
        <SettingsPageFooter />
      </div>
    )
  }

  if (pageError) {
    return (
      <div className={PAGE_SHELL_CLASS} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <SettingsPageHeader onLogout={handleLogout} />
        <main className="flex-1">
          <div className={CONTAINER_CLASS}>
            <div className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6`}>
              <p className="text-sm text-red-600">{pageError}</p>
              <p className="mt-4">
                <Link href="/settings" className={LINK_CLASS}>
                  マイページに戻る
                </Link>
              </p>
            </div>
          </div>
        </main>
        <SettingsPageFooter />
      </div>
    )
  }

  const planLabel = formatPlanLabel(profile?.planned_plan_code ?? null)
  const statusLabel = formatSubscriptionStatus(
    profile?.subscription_status ?? null,
    profile?.cancel_at_period_end ?? null
  )
  const nextRenewalLabel = formatPeriodEnd(profile?.current_period_end ?? null)
  const renewalStatusLabel = formatRenewalStatus(profile?.cancel_at_period_end ?? null)

  return (
    <div
      className={PAGE_SHELL_CLASS}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <SettingsPageHeader onLogout={handleLogout} />

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          {/* Page header */}
          <div className="text-center mt-6 md:mt-8 mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
              お支払い・契約管理
            </h1>
            <p className="mt-2 text-sm text-[#5a5a7a]">
              プラン・支払い方法・請求履歴
            </p>
          </div>

          <div className="space-y-6 md:space-y-8">
            <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6`} aria-label="現在のプラン">
              <h2 className="text-center text-lg font-extrabold text-[#1a1a2e] tracking-tight pb-3 mb-5 border-b-2 border-[#f0eeea]">
                現在のプラン
              </h2>
                <BillingRow label="プラン" value={planLabel} />
                <BillingRow label="契約状況" value={statusLabel} />
            </section>

            <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6`} aria-label="次回決済日">
              <h2 className="text-center text-lg font-extrabold text-[#1a1a2e] tracking-tight pb-3 mb-5 border-b-2 border-[#f0eeea]">
                次回決済日
              </h2>
              <BillingRow
                label={statusLabel === '無料トライアル中' ? '最初の決済日' : '次回決済日'}
                value={nextRenewalLabel}
              />
              <BillingRow label="自動更新" value={renewalStatusLabel} />
            </section>

            <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6`} aria-label="お支払い方法">
              <h2 className="text-center text-lg font-extrabold text-[#1a1a2e] tracking-tight pb-3 mb-5 border-b-2 border-[#f0eeea]">
                お支払い方法
              </h2>
              <p className={READONLY_VALUE_CLASS} aria-readonly="true">
                クレジットカード
              </p>

              <div className="mt-4 flex flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={handleOpenStripePortal}
                  disabled={portalLoading}
                  className="inline-flex items-center rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:opacity-70 transition-colors"
                >
                  {portalLoading ? '決済管理画面を開いています...' : '支払い方法・解約・請求履歴を確認'}
                </button>
                {portalError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {portalError}
                  </p>
                ) : null}
              </div>
            </section>

            <div className={`${RADIUS} border-2 border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-white px-6 py-5 ${CARD_SHADOW}`}>
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

            <p className="text-center pt-2">
              <Link href="/settings" className={LINK_CLASS}>
                マイページに戻る
              </Link>
            </p>
          </div>
        </div>
      </main>

      <SettingsPageFooter />
    </div>
  )
}
