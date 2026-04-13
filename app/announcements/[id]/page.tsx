'use client'

/**
 * Announcement Detail Page — full content view for a single announcement.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import AppHeader from '@/components/header/app-header'
import AppFooter from '@/components/footer/app-footer'
import { useCurrentLanguage } from '@/lib/use-current-language'

const supabase = getSupabaseBrowserClient()

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

export default function AnnouncementDetailPage() {
  const params = useParams()
  const announcementId = params.id as string
  const [item, setItem] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const { currentLanguage, handleChangeLanguage } = useCurrentLanguage()

  useEffect(() => {
    if (!announcementId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    supabase
      .from('announcements')
      .select('id, title, body, type, published_at')
      .eq('id', announcementId)
      .eq('is_published', true)
      .maybeSingle()
      .then(({ data }: { data: Announcement | null }) => {
        if (data) {
          setItem(data)
        } else {
          setNotFound(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setNotFound(true)
        setLoading(false)
      })
  }, [announcementId])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 pt-8 pb-10">

          {/* Hero */}
          <section className="relative overflow-hidden rounded-[24px] border border-[#E8E4DF] bg-[linear-gradient(135deg,#FFF9EC_0%,#FFFFFF_55%,#FFFDF8_100%)] px-6 py-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-7 sm:py-7">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgba(245,166,35,0.10)]" />
            <span className="pointer-events-none absolute bottom-[-18px] right-[72px] h-24 w-24 rounded-full bg-[rgba(245,166,35,0.07)]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.14)] px-3 py-1 text-[13px] font-bold text-[#B7791F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
                News
              </div>
              {item && (
                <>
                  {item.type === 'urgent' && (
                    <span className="mt-3 ml-4 inline-block rounded-full bg-[#FFF1F0] px-2.5 py-[3px] text-[13px] font-bold text-[#D14343]">
                      緊急
                    </span>
                  )}
                  <h1 className={`${item.type === 'urgent' ? 'mt-3' : 'mt-4'} text-[1.9rem] font-black leading-[1.15] text-[#1a1a2e] sm:text-[2.2rem]`}>
                    {item.title}
                  </h1>
                  <p className="mt-3 text-sm text-[#8a8a9a]">{formatDate(item.published_at)}</p>
                </>
              )}
              {!item && !loading && (
                <h1 className="mt-4 text-[1.9rem] font-black leading-[1.15] text-[#1a1a2e] sm:text-[2.2rem]">
                  お知らせ
                </h1>
              )}
            </div>
          </section>

          {/* Content */}
          {loading && (
            <p className="mt-8 text-center text-sm text-[#8a8a9a]">読み込み中...</p>
          )}

          {notFound && !loading && (
            <div className="mt-8 rounded-[16px] border border-[#E8E4DF] bg-white px-5 py-8 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <p className="text-sm text-[#8a8a9a]">お知らせが見つかりませんでした</p>
            </div>
          )}

          {item && !loading && (
            <article className="mt-6 rounded-[16px] border border-[#E8E4DF] bg-white px-6 py-6 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <div className="whitespace-pre-wrap text-sm leading-7 text-[#3a3a5a]">
                {item.body}
              </div>
            </article>
          )}

          <div className="mt-6 flex justify-center">
            <Link
              href="/announcements"
              className="text-sm font-bold text-[#F5A623] underline underline-offset-2"
            >
              お知らせ一覧に戻る
            </Link>
          </div>

        </div>
      </main>
      <AppFooter />
    </div>
  )
}
