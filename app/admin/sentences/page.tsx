'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import type { SentenceMaster } from '../../../lib/admin/sentence-workbench'
import { checkIsAdmin } from '../../../lib/admin-guard'

const supabase = getSupabaseBrowserClient()

type FilterDifficulty = 'all' | 'beginner' | 'intermediate' | 'advanced'

export default function AdminSentencesPage() {
  const router = useRouter()
  const [sentences, setSentences] = useState<SentenceMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<FilterDifficulty>('all')

  useEffect(() => {
    async function init() {
      const { isAdmin, mfaRequired } = await checkIsAdmin(supabase)
      if (!isAdmin) {
        router.replace('/dashboard')
        setLoading(false)
        return
      }
      if (mfaRequired) {
        router.replace('/admin/mfa-setup')
        setLoading(false)
        return
      }
      setAuthorized(true)

      let query = supabase
        .from('sentence_masters')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200)

      if (difficulty !== 'all') {
        query = query.eq('difficulty', difficulty)
      }

      const { data } = await query
      setSentences((data as SentenceMaster[]) ?? [])
      setLoading(false)
    }
    init()
  }, [difficulty])

  const filtered = sentences.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.meaning_ja.toLowerCase().includes(q)
      || s.base_text.toLowerCase().includes(q)
      || s.tags?.some((t) => t.toLowerCase().includes(q))
  })

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-gray-500">Loading...</p></div>
  }

  if (!authorized) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-red-500">Access denied</p></div>
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] px-6 py-8" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-black text-[#1a1a2e]">Sentence Masters</h1>
        <p className="mt-1 text-sm text-[#5a5a7a]">文章マスター管理</p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="検索..."
            className="rounded-xl border border-[#E8E4DF] bg-white px-4 py-2 text-sm focus:outline-none"
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as FilterDifficulty)}
            className="rounded-xl border border-[#E8E4DF] bg-white px-4 py-2 text-sm focus:outline-none"
          >
            <option value="all">全レベル</option>
            <option value="beginner">初級</option>
            <option value="intermediate">中級</option>
            <option value="advanced">上級</option>
          </select>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#E8E4DF] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E4DF] bg-[#FAF8F5]">
                <th className="px-4 py-3 text-left font-bold text-[#5a5a7a]">日本語の意味</th>
                <th className="px-4 py-3 text-left font-bold text-[#5a5a7a]">英語ベース文</th>
                <th className="px-4 py-3 text-left font-bold text-[#5a5a7a]">レベル</th>
                <th className="px-4 py-3 text-left font-bold text-[#5a5a7a]">タグ</th>
                <th className="px-4 py-3 text-center font-bold text-[#5a5a7a]">有効</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-[#F0ECE6] transition hover:bg-[#FAF8F5]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/sentences/${s.id}`} className="font-bold text-[#2563EB] underline-offset-2 hover:underline">
                      {s.meaning_ja}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#1a1a2e]">{s.base_text}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      s.difficulty === 'beginner' ? 'bg-green-50 text-green-700'
                      : s.difficulty === 'intermediate' ? 'bg-blue-50 text-blue-700'
                      : 'bg-purple-50 text-purple-700'
                    }`}>{s.difficulty}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.tags?.map((t) => (
                        <span key={t} className="rounded bg-[#F0ECE6] px-1.5 py-0.5 text-[10px] text-[#5a5a7a]">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{s.is_active ? '✓' : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#9c9c9c]">No sentences found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
