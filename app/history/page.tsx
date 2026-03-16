'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { HISTORY_COPY_JA } from '../../lib/history-copy'
import {
  getRecentLessonHistoryByUser,
  getDailyHistorySummariesByUser,
} from '../../lib/history-service'
import type { LessonHistoryItem, DailyHistorySummary } from '../../lib/history-types'

const RECENT_LESSONS_LIMIT = 20
const DAILY_SUMMARIES_LIMIT = 14

export default function HistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [lessonHistory, setLessonHistory] = useState<LessonHistoryItem[]>([])
  const [dailySummaries, setDailySummaries] = useState<DailyHistorySummary[]>([])

  const copy = HISTORY_COPY_JA

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        router.replace('/login')
        return
      }

      const userId = session.user.id
      const [lessonsRes, summariesRes] = await Promise.all([
        getRecentLessonHistoryByUser(userId, RECENT_LESSONS_LIMIT),
        getDailyHistorySummariesByUser(userId, DAILY_SUMMARIES_LIMIT),
      ])

      if (lessonsRes.error) console.error(lessonsRes.error)
      else setLessonHistory(lessonsRes.data ?? [])
      if (summariesRes.error) console.error(summariesRes.error)
      else setDailySummaries(summariesRes.data ?? [])

      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <p className="text-[#5c5c5c]">{copy.loading}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] px-6 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-[#2c2c2c]">NativeFlow</h1>
        <p className="mt-1 text-[#5c5c5c]">Speak with AI. Learn like a native.</p>

        <h2 className="mt-6 text-xl font-semibold text-[#2c2c2c]">
          {copy.pageTitle}
        </h2>
        <p className="mt-1 text-sm text-[#5c5c5c]">{copy.pageIntro}</p>

        <section className="mt-6">
          <p className="text-xs font-medium text-[#7c7c7c]">
            {copy.sectionTitles.recentLessons}
          </p>
          {lessonHistory.length === 0 ? (
            <p className="mt-2 text-sm text-[#5c5c5c]">{copy.emptyState}</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {lessonHistory.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-[#e8e4df] bg-white px-4 py-3"
                >
                  <p className="text-sm font-medium text-[#2c2c2c]">
                    {item.theme} · {item.level}
                  </p>
                  <p className="mt-0.5 text-xs text-[#7c7c7c]">
                    {copy.statusLabels[item.status]} · {copy.labels.progressPercent}{' '}
                    {item.progressPercent}%
                  </p>
                  <p className="mt-1 text-xs text-[#2c2c2c]">
                    {copy.labels.completedItems} {item.completedItems}/{item.totalItems} ·{' '}
                    {copy.labels.typingCorrect} {item.correctTypingItems}/{item.totalTypingItems}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <p className="text-xs font-medium text-[#7c7c7c]">
            {copy.sectionTitles.dailySummaries}
          </p>
          {dailySummaries.length === 0 ? (
            <p className="mt-2 text-sm text-[#5c5c5c]">{copy.emptyState}</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {dailySummaries.map((day) => (
                <li
                  key={day.statDate}
                  className="rounded-lg border border-[#e8e4df] bg-white px-4 py-3"
                >
                  <p className="text-sm font-medium text-[#2c2c2c]">{day.statDate}</p>
                  <p className="mt-1 text-xs text-[#2c2c2c]">
                    {copy.labels.lessonRunsStarted} {day.lessonRunsStarted} ·{' '}
                    {copy.labels.lessonRunsCompleted} {day.lessonRunsCompleted}
                  </p>
                  <p className="mt-0.5 text-xs text-[#2c2c2c]">
                    {copy.labels.lessonItemsCompleted} {day.lessonItemsCompleted} ·{' '}
                    {copy.labels.typingItemsCorrect} {day.typingItemsCorrect} ·{' '}
                    {copy.labels.studyMinutes} {day.studyMinutes ?? 0}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          href="/dashboard"
          className="mt-8 inline-block text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded"
        >
          {copy.backToDashboard}
        </Link>
      </div>
    </main>
  )
}
