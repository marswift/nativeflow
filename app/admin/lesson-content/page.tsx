'use client'

/**
 * Admin Lesson Content — Scene List
 *
 * Read-only list of all lesson scenes with phrase/enrichment counts.
 * Admin-only access via existing RBAC pattern.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../../lib/admin-guard'

type SceneRow = {
  scene_key: string
  label_ja: string
  label_en: string
  scene_category: string
  is_active: boolean
  updated_at: string
}

type SceneSummary = SceneRow & {
  phrase_count: number
  enrichment_count: number
}

type ContentStatus = 'published' | 'content-only' | 'empty' | 'inactive'

function getContentStatus(s: SceneSummary): ContentStatus {
  if (!s.is_active) return 'inactive'
  if (s.phrase_count === 0) return 'empty'
  if (s.enrichment_count === 0) return 'content-only'
  return 'published'
}

const STATUS_STYLE: Record<ContentStatus, { label: string; className: string }> = {
  published: { label: 'Published', className: 'bg-green-100 text-green-700' },
  'content-only': { label: 'Content Only', className: 'bg-blue-100 text-blue-700' },
  empty: { label: 'Empty', className: 'bg-gray-100 text-gray-400' },
  inactive: { label: 'Inactive', className: 'bg-red-100 text-red-600' },
}

export default function AdminLessonContentPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [scenes, setScenes] = useState<SceneSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createKey, setCreateKey] = useState('')
  const [createLabelJa, setCreateLabelJa] = useState('')
  const [createLabelEn, setCreateLabelEn] = useState('')
  const [createCategory, setCreateCategory] = useState('daily-flow')
  const [creating, setCreating] = useState(false)
  const [createFeedback, setCreateFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const keyInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    checkIsAdmin(supabase).then(({ isAdmin, mfaRequired }) => {
      if (!isAdmin) {
        router.replace('/dashboard')
      } else if (mfaRequired) {
        router.replace('/admin/mfa-setup')
      } else {
        setAuthorized(true)
      }
      setAuthChecked(true)
    })
  }, [router])

  const loadScenes = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    const { data: sceneRows } = await supabase
      .from('lesson_scenes')
      .select('scene_key, label_ja, label_en, scene_category, is_active, updated_at')
      .eq('is_active', true)
      .order('scene_key', { ascending: true })

    if (!sceneRows) {
      setLoading(false)
      return
    }

    // Get counts per scene
    const { data: phraseCounts } = await supabase
      .from('lesson_phrases')
      .select('scene_key')
      .eq('is_active', true)

    const { data: enrichmentCounts } = await supabase
      .from('lesson_conversation_enrichments')
      .select('scene_key')
      .eq('is_active', true)

    const phraseMap = new Map<string, number>()
    for (const p of phraseCounts ?? []) {
      phraseMap.set(p.scene_key, (phraseMap.get(p.scene_key) ?? 0) + 1)
    }

    const enrichmentMap = new Map<string, number>()
    for (const e of enrichmentCounts ?? []) {
      enrichmentMap.set(e.scene_key, (enrichmentMap.get(e.scene_key) ?? 0) + 1)
    }

    const summaries: SceneSummary[] = (sceneRows as SceneRow[]).map((s) => ({
      ...s,
      phrase_count: phraseMap.get(s.scene_key) ?? 0,
      enrichment_count: enrichmentMap.get(s.scene_key) ?? 0,
    }))

    setScenes(summaries)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authorized) loadScenes()
  }, [authorized, loadScenes])

  async function handleCreate() {
    const key = createKey.trim()
    const ja = createLabelJa.trim()
    const en = createLabelEn.trim()

    if (!key || !ja || !en) {
      setCreateFeedback({ type: 'error', message: 'All fields are required' })
      return
    }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      setCreateFeedback({ type: 'error', message: 'scene_key: lowercase letters, numbers, underscores only (start with letter)' })
      return
    }

    setCreating(true)
    setCreateFeedback(null)

    try {
      const res = await fetch('/api/admin/lesson-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene_key: key, label_ja: ja, label_en: en, scene_category: createCategory }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateFeedback({ type: 'error', message: data.error ?? 'Create failed' })
      } else {
        router.push(`/admin/lesson-content/scenes/${key}`)
      }
    } catch (err) {
      setCreateFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setCreating(false)
    }
  }

  if (!authChecked || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">{authChecked ? 'Access denied.' : 'Verifying access...'}</p>
      </div>
    )
  }

  const filtered = search.trim()
    ? scenes.filter((s) =>
        s.scene_key.includes(search.trim().toLowerCase()) ||
        s.label_ja.includes(search.trim()) ||
        s.label_en.toLowerCase().includes(search.trim().toLowerCase())
      )
    : scenes

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Lesson Content</h1>
            <p className="text-sm text-gray-500">{scenes.length} scenes in database</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowCreate(!showCreate); setTimeout(() => keyInputRef.current?.focus(), 100) }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              {showCreate ? 'Cancel' : 'Create Scene'}
            </button>
            <Link
              href="/admin"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Admin Top
            </Link>
          </div>
        </div>

        {showCreate && (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="text-sm font-bold text-blue-800">New Scene</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-gray-500">scene_key</label>
                <input
                  ref={keyInputRef}
                  type="text"
                  value={createKey}
                  onChange={(e) => setCreateKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="new_scene"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500">Label (JA)</label>
                <input
                  type="text"
                  value={createLabelJa}
                  onChange={(e) => setCreateLabelJa(e.target.value)}
                  placeholder="新しいシーン"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500">Label (EN)</label>
                <input
                  type="text"
                  value={createLabelEn}
                  onChange={(e) => setCreateLabelEn(e.target.value)}
                  placeholder="New Scene"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500">Category</label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                >
                  <option value="daily-flow">daily-flow</option>
                  <option value="social">social</option>
                  <option value="travel">travel</option>
                  <option value="work">work</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              {createFeedback && (
                <span className={`text-xs font-bold ${createFeedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                  {createFeedback.message}
                </span>
              )}
            </div>
          </section>
        )}

        <div>
          <input
            type="text"
            placeholder="Search by scene key or label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading scenes...</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-gray-600">scene_key</th>
                  <th className="px-4 py-3 font-bold text-gray-600">Label (JA)</th>
                  <th className="px-4 py-3 font-bold text-gray-600">Label (EN)</th>
                  <th className="px-4 py-3 font-bold text-gray-600 text-center">Phrases</th>
                  <th className="px-4 py-3 font-bold text-gray-600 text-center">Enrichments</th>
                  <th className="px-4 py-3 font-bold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-bold text-gray-600">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <tr
                    key={s.scene_key}
                    className="cursor-pointer transition hover:bg-blue-50"
                    onClick={() => router.push(`/admin/lesson-content/scenes/${s.scene_key}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{s.scene_key}</td>
                    <td className="px-4 py-3 text-gray-800">{s.label_ja}</td>
                    <td className="px-4 py-3 text-gray-600">{s.label_en}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block min-w-[2rem] rounded-full px-2 py-0.5 text-xs font-bold ${s.phrase_count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {s.phrase_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block min-w-[2rem] rounded-full px-2 py-0.5 text-xs font-bold ${s.enrichment_count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                        {s.enrichment_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => { const st = STATUS_STYLE[getContentStatus(s)]; return (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${st.className}`}>{st.label}</span>
                      ) })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.updated_at).toLocaleDateString('ja-JP')}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                      No scenes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
