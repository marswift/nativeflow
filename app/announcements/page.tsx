'use client'

/**
 * Announcements Page — paginated list of published announcements.
 */

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client'
import AppHeader from '@/components/header/app-header'
import AppFooter from '@/components/footer/app-footer'
import { useCurrentLanguage } from '@/lib/use-current-language'

const supabase = getSupabaseBrowserClient()
const PAGE_SIZE = 20

type Announcement = {
  id: string
  title: string
  body: string
  type: string | null
  published_at: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

function isNewAnnouncement(iso: string): boolean {
  const published = new Date(iso).getTime()
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
  return published > threeDaysAgo
}

export default function AnnouncementsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [items, setItems] = useState<Announcement[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { currentLanguage, handleChangeLanguage } = useCurrentLanguage()

  const rawPage = parseInt(searchParams.get('page') ?? '1', 10)
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  useEffect(() => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const cutoff = threeMonthsAgo.toISOString()

    Promise.all([
      supabase
        .from('announcements')
        .select('id, title, body, type, published_at')
        .eq('is_published', true)
        .gte('published_at', cutoff)
        .order('published_at', { ascending: false })
        .range(from, to),
      supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .gte('published_at', cutoff),
    ]).then(([dataRes, countRes]) => {
      setItems((dataRes.data as Announcement[] | null) ?? [])
      setTotalCount((countRes.count as number | null) ?? 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [page])

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return
    router.push(p === 1 ? '/announcements' : `/announcements?page=${p}`)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 pt-8 pb-10">
          <section className="relative overflow-hidden rounded-[24px] border border-[#E8E4DF] bg-[linear-gradient(135deg,#FFF9EC_0%,#FFFFFF_55%,#FFFDF8_100%)] px-6 py-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-7 sm:py-7">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgba(245,166,35,0.10)]" />
            <span className="pointer-events-none absolute bottom-[-18px] right-[72px] h-24 w-24 rounded-full bg-[rgba(245,166,35,0.07)]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.14)] px-3 py-1 text-[13px] font-bold text-[#B7791F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
                News
              </div>
              <h1 className="mt-4 text-[1.9rem] font-black leading-[1.15] text-[#1a1a2e] sm:text-[2.2rem]">
                NativeFlowの最新情報
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5a5a7a]">
                アップデート情報、お知らせ、機能追加、重要なご案内をまとめて確認できます。<br className="hidden sm:block" />
                学習前に新しい情報をすぐ把握できるようにします。
              </p>
            </div>
          </section>

          {loading && <p className="mt-8 text-center text-sm text-[#8a8a9a]">読み込み中...</p>}

          {!loading && items.length === 0 && (
            <p className="mt-8 text-center text-sm text-[#8a8a9a]">お知らせはまだありません。</p>
          )}

          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/announcements/${item.id}`}
                className="block rounded-[16px] border border-[#E8E4DF] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition hover:bg-[#FAFAF8]"
              >
                <div className="flex items-center gap-2">
                  {item.type === 'urgent' && (
                    <span className="shrink-0 rounded-full bg-[#FFF1F0] px-2.5 py-[3px] text-[11px] font-bold text-[#D14343]">
                      緊急
                    </span>
                  )}
                  {isNewAnnouncement(item.published_at) && item.type !== 'urgent' && (
                    <span className="shrink-0 rounded-full bg-[#E8FFF3] px-2.5 py-[3px] text-[11px] font-bold text-[#16A34A]">
                      NEW
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-[#8a8a9a]">{formatDate(item.published_at)}</span>
                  <h2 className="min-w-0 truncate text-base font-bold text-[#1a1a2e]">{item.title}</h2>
                </div>
                {item.body && (
                  <p className="mt-1 truncate text-sm text-[#5a5a7a]">{item.body}</p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-[#E8E4DF] bg-white px-4 py-2 text-sm font-bold text-[#5a5a7a] transition hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                前へ
              </button>
              <span className="text-sm text-[#8a8a9a]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-[#E8E4DF] bg-white px-4 py-2 text-sm font-bold text-[#5a5a7a] transition hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          )}

        </div>
      </main>
      <AppFooter />
    </div>
  )
}
