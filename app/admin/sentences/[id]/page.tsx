'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { checkIsAdmin } from '../../../../lib/admin-guard'
import { type SentenceMaster, type SentenceLocalization, type RegenerationOutput } from '../../../../lib/admin/sentence-workbench'
import { getActiveLearningLanguageVariants, getLearningLanguageVariantById, type LearningLanguageVariant } from '../../../../lib/language-config'

const supabase = getSupabaseBrowserClient()

export default function SentenceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sentenceId = params.id as string

  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [master, setMaster] = useState<SentenceMaster | null>(null)
  const [localizations, setLocalizations] = useState<SentenceLocalization[]>([])

  // AI Workbench state
  const [targetVariantId, setTargetVariantId] = useState('en-us-nyc')
  const [instructionJa, setInstructionJa] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<RegenerationOutput | null>(null)
  const [genError, setGenError] = useState('')
  const [accessToken, setAccessToken] = useState('')

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

      const { data: { session } } = await supabase.auth.getSession()
      setAccessToken(session?.access_token ?? '')

      // Fetch master
      const { data: m } = await supabase
        .from('sentence_masters')
        .select('*')
        .eq('id', sentenceId)
        .single()
      setMaster(m as SentenceMaster | null)

      // Fetch localizations
      const { data: locs } = await supabase
        .from('sentence_localizations')
        .select('*')
        .eq('sentence_master_id', sentenceId)
        .order('language_code')
      setLocalizations((locs as SentenceLocalization[]) ?? [])

      setLoading(false)
    }
    init()
  }, [sentenceId])

  const allVariants = getActiveLearningLanguageVariants()
  const selectedVariant: LearningLanguageVariant | undefined = getLearningLanguageVariantById(targetVariantId)

  async function handleGenerate() {
    if (!instructionJa.trim() || !master || !selectedVariant) return
    setGenerating(true)
    setGenError('')
    setGenResult(null)

    try {
      const res = await fetch('/api/admin/sentences/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          sentenceMasterId: master.id,
          targetLanguageCode: selectedVariant.languageCode,
          targetRegionCode: selectedVariant.countryCode || null,
          instructionJa: instructionJa.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.message ?? 'Generation failed')
      } else {
        setGenResult({
          localizedText: data.localizedText ?? '',
          reviewJa: data.reviewJa ?? '',
          naturalnessScore: data.naturalnessScore ?? null,
          candidates: data.candidates ?? [],
        })
      }
    } catch {
      setGenError('Network error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleApproveResult() {
    if (!genResult || !master) return
    // Save as new localization with status 'draft'
    const { error } = await supabase.from('sentence_localizations').insert({
      sentence_master_id: master.id,
      language_code: selectedVariant?.languageCode ?? 'en',
      region_code: selectedVariant?.countryCode ?? null,
      localized_text: genResult.localizedText,
      review_ja: genResult.reviewJa,
      naturalness_score: genResult.naturalnessScore,
      status: 'approved',
      source: 'ai_regenerated',
    })
    if (!error) {
      // Refresh localizations
      const { data: locs } = await supabase
        .from('sentence_localizations')
        .select('*')
        .eq('sentence_master_id', master.id)
        .order('language_code')
      setLocalizations((locs as SentenceLocalization[]) ?? [])
      setGenResult(null)
      setInstructionJa('')
    }
  }

  async function handleLocalizationAction(locId: string, newStatus: SentenceLocalization['status']) {
    await supabase.from('sentence_localizations').update({ status: newStatus }).eq('id', locId)
    setLocalizations((prev) => prev.map((l) => l.id === locId ? { ...l, status: newStatus } : l))
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-gray-500">Loading...</p></div>
  if (!authorized) return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-red-500">Access denied</p></div>
  if (!master) return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-gray-500">Sentence not found</p></div>

  const statusColor = (s: string) =>
    s === 'approved' ? 'bg-green-50 text-green-700'
    : s === 'draft' ? 'bg-blue-50 text-blue-700'
    : s === 'needs_regeneration' ? 'bg-amber-50 text-amber-700'
    : 'bg-gray-50 text-gray-500'

  return (
    <div className="min-h-screen bg-[#faf9f6] px-6 py-8" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => router.push('/admin/sentences')} className="text-sm text-[#2563EB] hover:underline cursor-pointer">
          ← 一覧に戻る
        </button>

        {/* Master card */}
        <div className="mt-4 rounded-2xl border border-[#E8E4DF] bg-white px-6 py-5 shadow-sm">
          <h1 className="text-xl font-black text-[#1a1a2e]">{master.meaning_ja}</h1>
          <p className="mt-2 text-sm text-[#5a5a7a]">{master.base_text}</p>
          {master.structure_text && <p className="mt-1 text-xs text-[#9c9c9c]">{master.structure_text}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              master.difficulty === 'beginner' ? 'bg-green-50 text-green-700'
              : master.difficulty === 'intermediate' ? 'bg-blue-50 text-blue-700'
              : 'bg-purple-50 text-purple-700'
            }`}>{master.difficulty}</span>
            {master.tags?.map((t) => (
              <span key={t} className="rounded bg-[#F0ECE6] px-1.5 py-0.5 text-[10px] text-[#5a5a7a]">{t}</span>
            ))}
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${master.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {master.is_active ? '有効' : '無効'}
            </span>
          </div>
        </div>

        {/* Localizations */}
        <div className="mt-6">
          <h2 className="text-lg font-black text-[#1a1a2e]">ローカライゼーション</h2>
          {localizations.length === 0 ? (
            <p className="mt-3 text-sm text-[#9c9c9c]">ローカライゼーションはまだありません。</p>
          ) : (
            <div className="mt-3 space-y-3">
              {localizations.map((loc) => (
                <div key={loc.id} className="rounded-xl border border-[#E8E4DF] bg-white px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#5a5a7a]">{loc.language_code}{loc.region_code ? ` (${loc.region_code})` : ''}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(loc.status)}`}>{loc.status}</span>
                        <span className="text-[10px] text-[#9c9c9c]">{loc.source}</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-[#1a1a2e]">{loc.localized_text}</p>
                      {loc.review_ja && <p className="mt-1 text-xs text-[#7b7b94]">{loc.review_ja}</p>}
                      {loc.naturalness_score != null && (
                        <p className="mt-1 text-[10px] text-[#9c9c9c]">自然さ: {(loc.naturalness_score * 100).toFixed(0)}%</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {loc.status !== 'approved' && (
                        <button type="button" onClick={() => handleLocalizationAction(loc.id, 'approved')} className="rounded-lg bg-green-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-green-600 cursor-pointer">承認</button>
                      )}
                      {loc.status !== 'needs_regeneration' && (
                        <button type="button" onClick={() => handleLocalizationAction(loc.id, 'needs_regeneration')} className="rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-600 cursor-pointer">再生成</button>
                      )}
                      {loc.status !== 'archived' && (
                        <button type="button" onClick={() => handleLocalizationAction(loc.id, 'archived')} className="rounded-lg bg-gray-400 px-2 py-1 text-[10px] font-bold text-white hover:bg-gray-500 cursor-pointer">保存</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Workbench */}
        <div className="mt-8 rounded-2xl border border-[#2563EB]/20 bg-[#F8FBFF] px-6 py-6">
          <h2 className="text-lg font-black text-[#2563EB]">AI Workbench</h2>
          <p className="mt-1 text-xs text-[#5a5a7a]">日本語で指示を書いて、AIにローカライズを依頼できます。</p>

          <div className="mt-4">
            <label className="block text-xs font-bold text-[#5a5a7a]">ターゲット言語バリアント</label>
            <select
              value={targetVariantId}
              onChange={(e) => setTargetVariantId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none"
            >
              {allVariants.map((v) => (
                <option key={v.id} value={v.id}>{v.displayNameJa} — {v.nativeName}</option>
              ))}
            </select>
            {selectedVariant && (
              <p className="mt-1 text-[10px] text-[#9c9c9c]">
                {selectedVariant.languageCode} / {selectedVariant.countryCode ?? '—'} / {selectedVariant.cityCode ?? '—'}
                {selectedVariant.familyCode ? ` (${selectedVariant.familyCode})` : ''}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold text-[#5a5a7a]">指示（日本語）</label>
            <textarea
              value={instructionJa}
              onChange={(e) => setInstructionJa(e.target.value)}
              rows={3}
              placeholder="例: もっと初心者向けに短くしてください"
              className="mt-1 w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !instructionJa.trim()}
            className="mt-4 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            {generating ? '生成中...' : 'AIで生成'}
          </button>

          {genError && <p className="mt-3 text-sm text-red-600">{genError}</p>}

          {/* Result preview */}
          {genResult && (
            <div className="mt-5 rounded-xl border border-[#E8E4DF] bg-white px-5 py-4">
              <p className="text-xs font-bold text-[#9c9c9c]">生成結果</p>
              <p className="mt-2 text-sm font-bold text-[#1a1a2e]">{genResult.localizedText}</p>
              <p className="mt-2 text-xs text-[#7b7b94]">{genResult.reviewJa}</p>
              {genResult.naturalnessScore != null && (
                <p className="mt-1 text-[10px] text-[#9c9c9c]">自然さ: {(genResult.naturalnessScore * 100).toFixed(0)}%</p>
              )}
              {genResult.candidates.length > 0 && (
                <div className="mt-2 border-t border-[#F0ECE6] pt-2">
                  <p className="text-[10px] font-bold text-[#9c9c9c]">代替案:</p>
                  {genResult.candidates.map((c, i) => (
                    <p key={i} className="mt-1 text-xs text-[#5a5a7a]">・{c}</p>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleApproveResult}
                  className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-white hover:bg-green-600 cursor-pointer"
                >
                  承認して保存
                </button>
                <button
                  type="button"
                  onClick={() => setGenResult(null)}
                  className="rounded-lg border border-[#E8E4DF] bg-white px-4 py-2 text-sm font-bold text-[#5a5a7a] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  破棄
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
