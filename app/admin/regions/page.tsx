'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { checkIsAdmin } from '../../../lib/admin-guard'
import { UI_LANGUAGE_OPTIONS } from '../../../lib/language-config'
import type { RegionDraft } from '../../../lib/admin/region-draft'

const supabase = getSupabaseBrowserClient()

// Country options per language (practical subset)
const COUNTRY_OPTIONS: Record<string, { code: string; labelJa: string }[]> = {
  en: [{ code: 'us', labelJa: 'アメリカ' }, { code: 'gb', labelJa: 'イギリス' }, { code: 'au', labelJa: 'オーストラリア' }, { code: 'ca', labelJa: 'カナダ' }],
  es: [{ code: 'es', labelJa: 'スペイン' }, { code: 'mx', labelJa: 'メキシコ' }, { code: 'ar', labelJa: 'アルゼンチン' }, { code: 'co', labelJa: 'コロンビア' }],
  fr: [{ code: 'fr', labelJa: 'フランス' }, { code: 'ca', labelJa: 'カナダ' }, { code: 'be', labelJa: 'ベルギー' }],
  pt: [{ code: 'br', labelJa: 'ブラジル' }, { code: 'pt', labelJa: 'ポルトガル' }],
  ja: [{ code: 'jp', labelJa: '日本' }],
  ko: [{ code: 'kr', labelJa: '韓国' }],
  de: [{ code: 'de', labelJa: 'ドイツ' }, { code: 'at', labelJa: 'オーストリア' }, { code: 'ch', labelJa: 'スイス' }],
  nl: [{ code: 'nl', labelJa: 'オランダ' }, { code: 'be', labelJa: 'ベルギー' }],
  it: [{ code: 'it', labelJa: 'イタリア' }],
  ru: [{ code: 'ru', labelJa: 'ロシア' }],
  tr: [{ code: 'tr', labelJa: 'トルコ' }],
  'zh-mandarin': [{ code: 'cn', labelJa: '中国' }, { code: 'tw', labelJa: '台湾' }],
  yue: [{ code: 'cn', labelJa: '中国' }, { code: 'hk', labelJa: '香港' }],
  'ar-msa': [{ code: 'sa', labelJa: 'サウジアラビア' }, { code: 'ae', labelJa: 'UAE' }],
  'ar-eg': [{ code: 'eg', labelJa: 'エジプト' }],
  'ar-gulf': [{ code: 'sa', labelJa: 'サウジアラビア' }, { code: 'ae', labelJa: 'UAE' }, { code: 'kw', labelJa: 'クウェート' }],
  hi: [{ code: 'in', labelJa: 'インド' }],
  bn: [{ code: 'in', labelJa: 'インド' }, { code: 'bd', labelJa: 'バングラデシュ' }],
  ta: [{ code: 'in', labelJa: 'インド' }, { code: 'lk', labelJa: 'スリランカ' }],
  th: [{ code: 'th', labelJa: 'タイ' }],
  vi: [{ code: 'vn', labelJa: 'ベトナム' }],
  id: [{ code: 'id', labelJa: 'インドネシア' }],
  ms: [{ code: 'my', labelJa: 'マレーシア' }],
  tl: [{ code: 'ph', labelJa: 'フィリピン' }],
}

export default function AdminRegionsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState('')

  // Form
  const [langCode, setLangCode] = useState('ja')
  const [countryCode, setCountryCode] = useState('jp')
  const [regionInput, setRegionInput] = useState('')

  // Generation
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<RegionDraft | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function init() {
      const { isAdmin, mfaRequired } = await checkIsAdmin(supabase)
      if (!isAdmin) { router.replace('/dashboard'); setLoading(false); return }
      if (mfaRequired) { router.replace('/admin/mfa-setup'); setLoading(false); return }
      setAuthorized(true)
      const { data: { session } } = await supabase.auth.getSession()
      setAccessToken(session?.access_token ?? '')
      setLoading(false)
    }
    init()
  }, [])

  const countries = COUNTRY_OPTIONS[langCode] ?? []

  async function handleGenerate() {
    if (!regionInput.trim()) return
    setGenerating(true)
    setError('')
    setDraft(null)
    setSaved(false)

    try {
      const res = await fetch('/api/admin/regions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ languageCode: langCode, countryCode, regionInput: regionInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? 'Generation failed')
      } else {
        setDraft(data.draft as RegionDraft)
      }
    } catch {
      setError('Network error')
    } finally {
      setGenerating(false)
    }
  }

  function handleSave() {
    if (!draft) return
    // Save to localStorage for now — structured for DB migration
    try {
      const key = 'nf_region_drafts'
      const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as RegionDraft[]
      const updated = [...existing.filter((d) => d.id !== draft.id), draft]
      localStorage.setItem(key, JSON.stringify(updated))
      setSaved(true)
    } catch {
      setError('Save failed')
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-gray-500">Loading...</p></div>
  if (!authorized) return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-red-500">Access denied</p></div>

  const confidenceStyle = (c: number) =>
    c >= 0.8 ? 'text-green-700 bg-green-50 border-green-200'
    : c >= 0.5 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200'

  return (
    <div className="min-h-screen bg-[#faf9f6] px-6 py-8" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-black text-[#1a1a2e]">Region Draft Generator</h1>
        <p className="mt-1 text-sm text-[#5a5a7a]">地域コンテンツドラフト生成</p>

        {/* Input form */}
        <div className="mt-6 rounded-2xl border border-[#E8E4DF] bg-white px-6 py-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-[#5a5a7a]">言語</label>
              <select
                value={langCode}
                onChange={(e) => { setLangCode(e.target.value); setCountryCode(COUNTRY_OPTIONS[e.target.value]?.[0]?.code ?? '') }}
                className="mt-1 w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none"
              >
                {UI_LANGUAGE_OPTIONS.filter((l) => l.isActive).map((l) => (
                  <option key={l.code} value={l.code}>{l.displayNameJa}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a5a7a]">国</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.labelJa} ({c.code})</option>
                ))}
                {countries.length === 0 && <option value="">（国を選択）</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a5a7a]">地域名</label>
              <input
                type="text"
                value={regionInput}
                onChange={(e) => setRegionInput(e.target.value)}
                placeholder="例: 北海道, Istanbul, 서울"
                className="mt-1 w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !regionInput.trim() || !countryCode}
            className="mt-4 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            {generating ? '生成中...' : 'ドラフト生成'}
          </button>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {/* Draft preview */}
        {draft && (
          <div className="mt-6 rounded-2xl border border-[#E8E4DF] bg-white px-6 py-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1a1a2e]">{draft.displayNameJa}</h2>
                <p className="text-sm text-[#5a5a7a]">{draft.displayNameEn}</p>
                {draft.nativeName && <p className="text-xs text-[#9c9c9c]">{draft.nativeName}</p>}
              </div>
              <span className="rounded-full bg-[#F0ECE6] px-2 py-0.5 text-[10px] font-bold text-[#5a5a7a]">{draft.id}</span>
            </div>

            {/* Aliases */}
            <div className="mt-3">
              <p className="text-[10px] font-bold text-[#9c9c9c]">別名</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {draft.aliases.map((a, i) => (
                  <span key={i} className="rounded bg-[#F0ECE6] px-1.5 py-0.5 text-[10px] text-[#5a5a7a]">{a}</span>
                ))}
              </div>
            </div>

            {/* Immersion content */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: 'ランドマーク', items: draft.landmarkExamples },
                { label: '食文化', items: draft.foodExamples },
                { label: '場所', items: draft.placeExamples },
                { label: 'トピック', items: draft.topicExamples },
              ].map(({ label, items }) => (
                <div key={label} className="rounded-lg bg-[#FAF8F5] px-3 py-2">
                  <p className="text-[10px] font-bold text-[#9c9c9c]">{label}</p>
                  {items.map((item, i) => (
                    <p key={i} className="mt-0.5 text-xs text-[#1a1a2e]">・{item}</p>
                  ))}
                  {items.length === 0 && <p className="mt-0.5 text-xs text-[#9c9c9c]">（なし）</p>}
                </div>
              ))}
            </div>

            {/* Vibe + settings */}
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.vibeTags.map((t, i) => (
                <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{t}</span>
              ))}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-[#5a5a7a]">丁寧さ: {draft.politeness}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-[#5a5a7a]">スラング: {draft.slangLevel}</span>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-700">方言回避: ON</span>
            </div>

            {/* Validation */}
            <div className="mt-4 rounded-lg border border-[#E8E4DF] bg-[#FAFDF7] px-4 py-3">
              <p className="text-xs font-bold text-[#5a5a7a]">検証結果</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span className={draft.validation.canonicalMatch ? 'text-green-700' : 'text-red-700'}>
                  正規名一致: {draft.validation.canonicalMatch ? '✓' : '✗'}
                </span>
                <span className={draft.validation.aliasConsistency ? 'text-green-700' : 'text-amber-700'}>
                  別名整合性: {draft.validation.aliasConsistency ? '✓' : '✗'}
                </span>
                <span className={`rounded-md border px-2 py-0.5 font-bold ${confidenceStyle(draft.validation.confidence)}`}>
                  信頼度: {(draft.validation.confidence * 100).toFixed(0)}%
                </span>
              </div>
              {draft.validation.notes.length > 0 && (
                <div className="mt-2">
                  {draft.validation.notes.map((n, i) => (
                    <p key={i} className="text-[10px] text-amber-700">⚠ {n}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              {!saved ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={draft.validation.confidence < 0.3}
                    className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50 cursor-pointer"
                  >
                    承認して保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="rounded-lg border border-[#E8E4DF] bg-white px-4 py-2 text-sm font-bold text-[#5a5a7a] hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    破棄
                  </button>
                </>
              ) : (
                <p className="text-sm font-bold text-green-600">保存しました</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
