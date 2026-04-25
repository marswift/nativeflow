'use client'

/**
 * Rewards — spend diamonds on perks and helpful items.
 *
 * Data sources:
 *   - user_profiles: total_diamonds, diamond_boost_until, streak_frozen_date
 *   - /api/diamonds/spend, /api/diamonds/restore-streak, /api/diamonds/activate-boost
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client'
import AppHeader from '@/components/header/app-header'
import AppFooter from '@/components/footer/app-footer'
import { trackEvent } from '@/lib/analytics'
import { useAuthProfile } from '@/lib/auth-profile-context'
import { getRewardsCopy, type RewardsCopy } from '@/lib/rewards-copy'
import { readUiLanguageFromStorage } from '@/lib/auth-copy'
import { DIAMOND_PACKS } from '@/lib/diamond-packs'

const supabase = getSupabaseBrowserClient()

const PAGE_SHELL = 'min-h-screen flex flex-col bg-[#faf9f6]'

// ── Shop items ──

type ShopItemStatus = 'available' | 'active' | 'coming_soon'

type ShopItem = {
  id: string
  name: string
  nameEn: string
  description: string
  cost: number
  icon: string
  accentColor: string
  accentBg: string
  status: ShopItemStatus
  apiAction?: string
  apiRoute?: string
}

function buildShopItems(boostActive: boolean, copy: RewardsCopy): ShopItem[] {
  const c = copy.items
  return [
    {
      id: 'streak_restore',
      name: c.streakShield.name,
      nameEn: c.streakShield.subtitle,
      description: c.streakShield.description,
      cost: 3,
      icon: '\u26A1',
      accentColor: 'text-amber-700',
      accentBg: 'bg-[#FFF8EE] border-[#F0DFC4]',
      status: 'available',
      apiRoute: '/api/diamonds/restore-streak',
    },
    {
      id: 'reward_boost',
      name: c.doubleBoost.name,
      nameEn: c.doubleBoost.subtitle,
      description: c.doubleBoost.description,
      cost: 5,
      icon: '\uD83D\uDD25',
      accentColor: 'text-orange-700',
      accentBg: 'bg-[#FFF4E8] border-[#F6D7AE]',
      status: boostActive ? 'active' : 'available',
      apiRoute: '/api/diamonds/activate-boost',
    },
    {
      id: 'premium_theme',
      name: c.premiumTheme.name,
      nameEn: c.premiumTheme.subtitle,
      description: c.premiumTheme.description,
      cost: 15,
      icon: '\uD83C\uDFA8',
      accentColor: 'text-violet-700',
      accentBg: 'bg-[#F5F0FF] border-[#DDD0F5]',
      status: 'coming_soon',
    },
    {
      id: 'event_ticket',
      name: c.eventTicket.name,
      nameEn: c.eventTicket.subtitle,
      description: c.eventTicket.description,
      cost: 10,
      icon: '\uD83C\uDF9F\uFE0F',
      accentColor: 'text-sky-700',
      accentBg: 'bg-[#EEF7FF] border-[#C4DFF5]',
      status: 'coming_soon',
    },
  ]
}

// ── Component ──

export default function RewardsPage() {
  const router = useRouter()
  const { profile: authProfile, loading: authLoading, refresh: refreshAuth } = useAuthProfile()
  const copy = getRewardsCopy(readUiLanguageFromStorage())
  const [diamonds, setDiamonds] = useState(0)
  const [boostUntil, setBoostUntil] = useState<string | null>(null)
  const [pageReady, setPageReady] = useState(false)
  const [purchaseStatus, setPurchaseStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({})
  const [purchaseMessage, setPurchaseMessage] = useState<Record<string, string>>({})
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [buyLoading, setBuyLoading] = useState<string | null>(null)
  const [buyError, setBuyError] = useState('')
  const [returnBanner, setReturnBanner] = useState<'success' | 'cancel' | null>(null)

  // Detect Stripe checkout return and refresh balance
  useEffect(() => {
    trackEvent('rewards_page_viewed')
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const result = params.get('purchase')
    if (result === 'success') {
      setReturnBanner('success')
      refreshAuth()
    } else if (result === 'cancel') {
      setReturnBanner('cancel')
    } else {
      return
    }
    // Clean query param from URL
    params.delete('purchase')
    const clean = params.toString()
    window.history.replaceState(null, '', clean ? `${window.location.pathname}?${clean}` : window.location.pathname)
    // Auto-dismiss after 6 seconds
    const timer = setTimeout(() => setReturnBanner(null), 6000)
    return () => clearTimeout(timer)
  }, [refreshAuth])

  // Redirect if not authenticated (from context)
  useEffect(() => {
    if (!authLoading && authProfile === undefined) router.replace('/login')
  }, [authLoading, authProfile, router])

  // Sync diamonds from context + fetch boost status (supplemental query only)
  useEffect(() => {
    if (!authProfile) return
    let active = true
    setDiamonds(authProfile.totalDiamonds)
    supabase
      .from('user_profiles')
      .select('diamond_boost_until')
      .eq('id', authProfile.userId)
      .maybeSingle()
      .then(({ data }: { data: { diamond_boost_until?: string | null } | null }) => {
        if (active) {
          setBoostUntil((data?.diamond_boost_until as string) ?? null)
          setPageReady(true)
        }
      })
      .catch(() => { if (active) setPageReady(true) })
    return () => { active = false }
  }, [authProfile])

  const handlePurchase = useCallback(async (item: ShopItem) => {
    if (!item.apiRoute) return
    setPurchaseStatus((prev) => ({ ...prev, [item.id]: 'loading' }))
    setPurchaseMessage((prev) => ({ ...prev, [item.id]: '' }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setPurchaseStatus((prev) => ({ ...prev, [item.id]: 'error' }))
        setPurchaseMessage((prev) => ({ ...prev, [item.id]: copy.loginRequired }))
        return
      }
      const res = await fetch(item.apiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: item.id }),
      })
      const data = await res.json()
      if (res.ok && data.success !== false) {
        setPurchaseStatus((prev) => ({ ...prev, [item.id]: 'success' }))
        setPurchaseMessage((prev) => ({ ...prev, [item.id]: 'OK' }))
        // Update local state + shared context
        if (typeof data.newDiamonds === 'number') setDiamonds(data.newDiamonds)
        if (data.boostUntil) setBoostUntil(data.boostUntil)
        if (typeof data.newTotal === 'number') setDiamonds(data.newTotal)
        refreshAuth()
      } else {
        setPurchaseStatus((prev) => ({ ...prev, [item.id]: 'error' }))
        setPurchaseMessage((prev) => ({ ...prev, [item.id]: data.message ?? data.error ?? copy.purchaseError }))
      }
    } catch {
      setPurchaseStatus((prev) => ({ ...prev, [item.id]: 'error' }))
      setPurchaseMessage((prev) => ({ ...prev, [item.id]: copy.networkError }))
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (authLoading || !pageReady) {
    return (
      <div className={PAGE_SHELL} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <AppHeader onLogout={handleLogout} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#8a8a9a]">{copy.loading}</p>
        </main>
        <AppFooter />
      </div>
    )
  }

  const boostActive = boostUntil ? new Date(boostUntil) > new Date() : false
  const shopItems = buildShopItems(boostActive, copy)

  return (
    <div className={PAGE_SHELL} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <AppHeader onLogout={handleLogout} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 pt-8 pb-10 sm:px-8 sm:pt-10">

          {/* Purchase result banner */}
          {returnBanner === 'success' && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-800">{copy.purchaseSuccess}</p>
              <button type="button" onClick={() => setReturnBanner(null)} className="text-xs text-emerald-600 hover:text-emerald-800">x</button>
            </div>
          )}
          {returnBanner === 'cancel' && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] px-4 py-3">
              <p className="text-sm text-[#7b7b94]">{copy.purchaseCanceled}</p>
              <button type="button" onClick={() => setReturnBanner(null)} className="text-xs text-[#9ca3af] hover:text-[#5a5a7a]">x</button>
            </div>
          )}

          {/* Hero */}
          <section className="relative overflow-hidden rounded-[24px] border border-[#E8E4DF] bg-[linear-gradient(135deg,#FFF9EC_0%,#FFFFFF_55%,#FFFDF8_100%)] px-6 py-7 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-7">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgba(245,166,35,0.10)]" />
            <span className="pointer-events-none absolute bottom-[-18px] right-[72px] h-24 w-24 rounded-full bg-[rgba(245,166,35,0.07)]" />
            <div className="relative z-10">
              <h1 className="text-xl font-black tracking-tight text-[#1a1a2e] sm:text-2xl">
                {copy.pageTitle}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#5a5a7a]">
                {copy.pageDescription}
              </p>

              {/* Diamond balance */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#E8E4DF] bg-white/80 px-4 py-2">
                <span className="text-xl" aria-hidden="true">{'\uD83D\uDC8E'}</span>
                <span className="text-xl font-extrabold tracking-tight text-[#1a1a2e]">{diamonds.toLocaleString()}</span>
                <span className="text-xs font-bold text-[#7b7b94]">{copy.diamondLabel}</span>
              </div>
            </div>
          </section>

          {/* Explanation */}
          <div className="mt-6 rounded-2xl border border-[#E8E4DF] bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-bold tracking-widest text-[#7b7b94]">{copy.aboutTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#5a5a7a]">
              {copy.aboutBody}
            </p>
          </div>

          {/* Shop grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {shopItems.map((item) => {
              const canAfford = diamonds >= item.cost
              const status = purchaseStatus[item.id] ?? 'idle'
              const message = purchaseMessage[item.id] ?? ''
              const isComingSoon = item.status === 'coming_soon'
              const isActive = item.status === 'active'
              const isSucceeded = status === 'success'

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl border border-[#EEE7DC] bg-gradient-to-b from-white to-[#FFFDF8] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 ${
                    isComingSoon ? 'opacity-70' : 'hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)]'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg ${item.accentBg}`}>
                      {item.icon}
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        {copy.badgeActive}
                      </span>
                    )}
                    {isComingSoon && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-500">
                        {copy.badgeComingSoon}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="mt-3 text-base font-bold text-[#1a1a2e]">{item.name}</h3>
                  <p className="text-xs text-[#9ca3af]">{item.nameEn}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5a5a7a]">{item.description}</p>

                  {/* Cost + action */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm" aria-hidden="true">{'\uD83D\uDC8E'}</span>
                      <span className={`text-lg font-extrabold ${isComingSoon ? 'text-gray-400' : item.accentColor}`}>
                        {item.cost}
                      </span>
                    </div>

                    {isComingSoon ? (
                      <button
                        type="button"
                        disabled
                        className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-2 text-sm font-bold text-gray-400 cursor-not-allowed"
                      >
                        {copy.buttonComingSoon}
                      </button>
                    ) : isActive ? (
                      <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-bold text-emerald-700">
                        {copy.buttonActive}
                      </span>
                    ) : isSucceeded ? (
                      <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-bold text-emerald-700">
                        OK
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford || status === 'loading'}
                        onClick={() => handlePurchase(item)}
                        className={`rounded-xl px-5 py-2 text-sm font-bold transition ${
                          canAfford
                            ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2'
                            : 'border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {status === 'loading'
                          ? '...'
                          : canAfford
                            ? copy.buttonUse
                            : copy.buttonNotEnough}
                      </button>
                    )}
                  </div>

                  {/* Feedback message */}
                  {message && status === 'error' && (
                    <p className="mt-2 text-xs text-red-600">{message}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Diamond Purchase CTA ── */}
          <div className="mt-8 rounded-2xl border border-dashed border-[#E8E4DF] bg-[#FFFDF8] px-5 py-5 text-center">
            <p className="text-sm font-semibold text-[#5a5a7a]">{copy.buyCtaQuestion}</p>
            <button
              type="button"
              onClick={() => setShowBuyModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#E8E4DF] bg-white px-5 py-2.5 text-sm font-bold text-[#1a1a2e] shadow-sm transition hover:bg-[#FFF9EC] hover:border-[#D4C9B8]"
            >
              <span aria-hidden="true">{'\uD83D\uDC8E'}</span>
              {copy.buyCtaButton}
            </button>
          </div>

        </div>
      </main>

      {/* Diamond purchase modal */}
      {showBuyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => { if (!buyLoading) { setShowBuyModal(false); setBuyError('') } }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E8E4DF] bg-white px-6 py-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={copy.buyModalTitle}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">{'\uD83D\uDC8E'}</span>
              <h2 className="text-lg font-black text-[#1a1a2e]">{copy.buyModalTitle}</h2>
            </div>
            <p className="mt-1 text-sm text-[#7b7b94]">{copy.buyModalSubtitle}</p>

            {/* Pack cards */}
            <div className="mt-4 space-y-3">
              {DIAMOND_PACKS.map((pack, idx) => {
                const isLoading = buyLoading === pack.id
                const badge = idx === 1 ? copy.buyModalPopular : idx === 2 ? copy.buyModalBestValue : null
                return (
                  <button
                    key={pack.id}
                    type="button"
                    disabled={!!buyLoading}
                    onClick={async () => {
                      setBuyLoading(pack.id)
                      setBuyError('')
                      try {
                        const { data: { session: authSession } } = await supabase.auth.getSession()
                        if (!authSession?.access_token) { setBuyError(copy.loginRequired); setBuyLoading(null); return }
                        const res = await fetch('/api/diamonds/checkout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` },
                          body: JSON.stringify({ packId: pack.id }),
                        })
                        const data = await res.json()
                        if (res.ok && data.url) {
                          window.location.assign(data.url)
                        } else {
                          setBuyError(data.message ?? copy.buyModalError)
                          setBuyLoading(null)
                        }
                      } catch {
                        setBuyError(copy.buyModalError)
                        setBuyLoading(null)
                      }
                    }}
                    className={`relative flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition ${
                      idx === 1
                        ? 'border-amber-300 bg-[#FFFDF8] hover:bg-[#FFF9EC] shadow-sm'
                        : 'border-[#E8E4DF] bg-white hover:bg-[#FAFAF8]'
                    } ${buyLoading ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl" aria-hidden="true">{'\uD83D\uDC8E'}</span>
                      <div>
                        <p className="text-sm font-bold text-[#1a1a2e]">{pack.diamonds} {copy.diamondLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {badge && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          idx === 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {badge}
                        </span>
                      )}
                      <span className="text-sm font-extrabold text-[#1a1a2e]">
                        {isLoading ? '...' : `¥${pack.priceJpy.toLocaleString()}`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {buyError && (
              <p className="mt-3 text-center text-xs text-red-600">{buyError}</p>
            )}

            {buyLoading && (
              <p className="mt-3 text-center text-xs text-[#7b7b94] animate-pulse">{copy.buyModalBuying}</p>
            )}

            <div className="mt-4 rounded-xl border border-[#E8E4DF] bg-[#FFFDF8] px-4 py-2.5">
              <p className="text-[11px] leading-relaxed text-[#9ca3af]">{copy.buyModalEarnTip}</p>
            </div>

            <button
              type="button"
              disabled={!!buyLoading}
              onClick={() => { setShowBuyModal(false); setBuyError('') }}
              className="mt-4 w-full rounded-xl bg-[#F5F3EF] py-3 text-sm font-bold text-[#5a5a7a] transition hover:bg-[#EDE9E2] disabled:opacity-50"
            >
              {copy.buyModalClose}
            </button>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  )
}
