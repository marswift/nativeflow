'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const MAIN_LOADING_CLASS = 'min-h-screen bg-[#faf8f5] flex items-center justify-center'
const MAIN_CONTENT_CLASS = 'min-h-screen bg-[#faf8f5] px-6 py-12'
const CONTAINER_CLASS = 'mx-auto max-w-md'
const CARD_CLASS = 'rounded-lg border border-[#e8e4df] bg-white px-4 py-4'
const INPUT_CLASS = 'mt-2 w-full rounded-lg border border-[#e8e4df] bg-white px-4 py-3 text-[#2c2c2c] placeholder:text-[#9c9c9c] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session?.user) {
          if (isActive) router.replace('/login')
          return
        }
        if (isActive) setEmail(session.user.email ?? '')
      } catch (err) {
        console.error(err)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadSession()
    return () => {
      isActive = false
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfoMessage('')
    setSubmitting(true)
    try {
      // Display name and profile photo URL are not in user_profiles; local state only.
      setInfoMessage('この項目は現在UI準備中です。まだ保存は永続化されません。')
    } catch (err) {
      console.error(err)
      setError('プロフィール設定の保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className={MAIN_LOADING_CLASS}>
        <p className="text-[#5c5c5c]">読み込み中...</p>
      </main>
    )
  }

  return (
    <main className={MAIN_CONTENT_CLASS}>
      <div className={CONTAINER_CLASS}>
        <h1 className="text-2xl font-semibold text-[#2c2c2c]">NativeFlow</h1>
        <p className="mt-1 text-[#5c5c5c]">Speak with AI. Learn like a native.</p>

        <h2 className="mt-8 text-lg font-semibold text-[#2c2c2c]">Profile</h2>

        <form onSubmit={handleSubmit} className={`mt-4 ${CARD_CLASS}`}>
          {error && (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {infoMessage && (
            <p className="mb-3 text-sm text-amber-700">
              {infoMessage}
            </p>
          )}
          <p className="mb-4 text-xs text-[#5c5c5c]">
            名前とプロフィール写真は現在UI準備中です。メールアドレスは確認用です。
          </p>
          <label className="block text-sm font-medium text-[#2c2c2c]">
            表示名
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="表示名を入力"
              className={INPUT_CLASS}
              disabled={submitting}
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-[#2c2c2c]">
            プロフィール写真 URL
            <input
              type="url"
              value={profilePhotoUrl}
              onChange={(e) => setProfilePhotoUrl(e.target.value)}
              placeholder="https://..."
              className={INPUT_CLASS}
              disabled={submitting}
            />
          </label>
          <div className="mt-4">
            <span className="block text-sm font-medium text-[#2c2c2c]">メールアドレス</span>
            <p className="mt-2 text-sm text-[#5c5c5c]">{email || '—'}</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-amber-500 py-3 font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#5c5c5c]">
          <Link
            href="/settings"
            className="font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded"
          >
            設定に戻る
          </Link>
        </p>
      </div>
    </main>
  )
}
