'use client'

/**
 * Admin Announcements Page — create and manage announcements.
 * Protected: only admin users can access.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../../lib/admin-guard'

const supabase = getSupabaseBrowserClient()

type AnnouncementRow = {
  id: string
  title: string
  body: string
  type: 'normal' | 'urgent'
  urgent_until: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

type LogEntry = {
  id: number
  time: string
  type: 'info' | 'success' | 'error'
  message: string
}

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  // List
  const [items, setItems] = useState<AnnouncementRow[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<'normal' | 'urgent'>('normal')
  const [urgentUntil, setUrgentUntil] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [saving, setSaving] = useState(false)

  // Log
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = { current: 0 }

  const addLog = useCallback((logType: LogEntry['type'], message: string) => {
    const id = ++logIdRef.current
    const time = new Date().toLocaleTimeString('ja-JP')
    setLogs((prev) => [{ id, time, type: logType, message }, ...prev].slice(0, 30))
  }, [])

  // Auth
  useEffect(() => {
    checkIsAdmin(supabase).then(({ isAdmin, mfaRequired }) => {
      if (!isAdmin) { router.replace('/dashboard') }
      else if (mfaRequired) { router.replace('/admin/mfa-setup') }
      else { setAuthorized(true) }
      setAuthChecked(true)
    })
  }, [router])

  // Fetch list
  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, type, urgent_until, is_published, published_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data as AnnouncementRow[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (authorized) fetchItems()
  }, [authorized])

  // Create
  async function handleCreate() {
    if (!title.trim()) { addLog('error', 'タイトルは必須です'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        type,
        urgent_until: type === 'urgent' && urgentUntil ? new Date(urgentUntil).toISOString() : null,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
      }
      const { error } = await supabase.from('announcements').insert(payload)
      if (error) {
        addLog('error', `作成失敗: ${error.message}`)
      } else {
        addLog('success', `作成完了: ${title.trim()}`)
        setTitle('')
        setBody('')
        setType('normal')
        setUrgentUntil('')
        setIsPublished(true)
        fetchItems()
      }
    } catch (e) {
      addLog('error', `エラー: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setSaving(false)
    }
  }

  // Toggle publish
  async function handleTogglePublish(item: AnnouncementRow) {
    const newPublished = !item.is_published
    const { error } = await supabase
      .from('announcements')
      .update({
        is_published: newPublished,
        published_at: newPublished ? new Date().toISOString() : null,
      })
      .eq('id', item.id)
    if (error) {
      addLog('error', `更新失敗: ${error.message}`)
    } else {
      addLog('success', `${item.title}: ${newPublished ? '公開' : '非公開'}`)
      fetchItems()
    }
  }

  if (!authChecked || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">{authChecked ? 'Access denied.' : 'Verifying access...'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-black text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-500">お知らせの作成と管理</p>

        {/* Create form */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">新規作成</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="お知��せのタイトル"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">本文</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="お知らせの内容"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500">種別</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'normal' | 'urgent')}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="normal">通常</option>
                  <option value="urgent">緊急</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500">公開状態</label>
                <select
                  value={isPublished ? 'yes' : 'no'}
                  onChange={(e) => setIsPublished(e.target.value === 'yes')}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="yes">公開</option>
                  <option value="no">下書き</option>
                </select>
              </div>
            </div>
            {type === 'urgent' && (
              <div>
                <label className="block text-xs font-bold text-gray-500">緊急表示期限</label>
                <input
                  type="datetime-local"
                  value={urgentUntil}
                  onChange={(e) => setUrgentUntil(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  緊急のお知らせをダッシュボードに表示する期限を設定できます。未設定の場合は期限なしです。
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-gray-900 disabled:opacity-50"
            >
              {saving ? '作成中...' : '作成する'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">一覧</h2>
          {loading && <p className="mt-4 text-sm text-gray-400">読み込み中...</p>}
          {!loading && items.length === 0 && <p className="mt-4 text-sm text-gray-400">お知らせはありません</p>}
          <div className="mt-3 divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-gray-900">{item.title}</p>
                    {item.type === 'urgent' && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">緊急</span>
                    )}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${item.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.is_published ? '公開' : '下書き'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('ja-JP') : ''}
                    {item.type === 'urgent' && item.urgent_until && ` · 緊急期限: ${new Date(item.urgent_until).toLocaleDateString('ja-JP')}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePublish(item)}
                  className="shrink-0 rounded-md bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-200"
                >
                  {item.is_published ? '非公開にする' : '公開する'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Log */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-800">Activity Log</h2>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {logs.length === 0 && <p className="text-xs text-gray-400">No activity yet.</p>}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 text-xs">
                <span className="w-16 shrink-0 text-gray-400">{log.time}</span>
                <span className={log.type === 'error' ? 'font-bold text-red-600' : log.type === 'success' ? 'font-bold text-green-600' : 'text-gray-600'}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
