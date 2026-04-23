'use client'

/**
 * Admin Lesson Content — Scene Detail
 *
 * Shows all DB-backed content for a single scene:
 * - Scene metadata
 * - Base phrases (per level) — editable with save
 * - Enrichments (per region/age/level)
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '../../../../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../../../../lib/admin-guard'

const PHRASE_FIELDS = ['conversation_answer', 'typing_answer', 'native_hint', 'mix_hint', 'ai_question_text'] as const
type PhraseFieldKey = (typeof PHRASE_FIELDS)[number]

type SceneMeta = {
  scene_key: string
  label_ja: string
  label_en: string
  scene_category: string
  is_active: boolean
}

type PhraseRow = {
  id: string
  scene_key: string
  level_band: string
  language_code: string
  conversation_answer: string
  typing_answer: string
  native_hint: string
  mix_hint: string
  ai_question_text: string
}

type EnrichmentRow = {
  id: string
  scene_key: string
  region_slug: string
  age_group: string
  level_band: string
  ai_question_text: string
  ai_question_choices: { label: string; isCorrect: boolean }[] | null
  ai_conversation_opener: string
  typing_variations: string[]
  flavor: Record<string, unknown> | null
}

export default function AdminSceneDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sceneKey = params.sceneKey as string

  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [scene, setScene] = useState<SceneMeta | null>(null)
  const [phrases, setPhrases] = useState<PhraseRow[]>([])
  const [enrichments, setEnrichments] = useState<EnrichmentRow[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (!authorized || !sceneKey) return

    async function loadDetail() {
      setLoading(true)
      const supabase = getSupabaseBrowserClient()

      const [sceneResult, phraseResult, enrichmentResult] = await Promise.all([
        supabase
          .from('lesson_scenes')
          .select('scene_key, label_ja, label_en, scene_category, is_active')
          .eq('scene_key', sceneKey)
          .maybeSingle(),
        supabase
          .from('lesson_phrases')
          .select('id, scene_key, level_band, language_code, conversation_answer, typing_answer, native_hint, mix_hint, ai_question_text')
          .eq('scene_key', sceneKey)
          .eq('is_active', true)
          .order('level_band', { ascending: true }),
        supabase
          .from('lesson_conversation_enrichments')
          .select('id, scene_key, region_slug, age_group, level_band, ai_question_text, ai_question_choices, ai_conversation_opener, typing_variations, flavor')
          .eq('scene_key', sceneKey)
          .eq('is_active', true)
          .order('region_slug', { ascending: true }),
      ])

      setScene((sceneResult.data as SceneMeta | null) ?? null)
      setPhrases((phraseResult.data as PhraseRow[] | null) ?? [])
      setEnrichments((enrichmentResult.data as EnrichmentRow[] | null) ?? [])
      setLoading(false)
    }

    loadDetail()
  }, [authorized, sceneKey])

  if (!authChecked || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">{authChecked ? 'Access denied.' : 'Verifying access...'}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-gray-400">Loading scene data...</p>
        </div>
      </div>
    )
  }

  if (!scene) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-red-500">Scene not found: {sceneKey}</p>
          <Link href="/admin/lesson-content" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Back to scene list</Link>
        </div>
      </div>
    )
  }

  const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced']

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Link href="/admin/lesson-content" className="hover:text-blue-600">Lesson Content</Link>
          <span>/</span>
          <span className="font-mono text-gray-800">{sceneKey}</span>
        </div>

        {/* Scene Meta */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">Scene</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs font-bold text-gray-500">scene_key</p>
              <p className="mt-1 font-mono text-gray-800">{scene.scene_key}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500">Label (JA)</p>
              <p className="mt-1 text-gray-800">{scene.label_ja}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500">Label (EN)</p>
              <p className="mt-1 text-gray-800">{scene.label_en}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500">Category</p>
              <p className="mt-1 text-gray-800">{scene.scene_category}</p>
            </div>
          </div>
        </section>

        {/* Base Phrases — Editable */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">Base Phrases ({phrases.length})</h2>
          <div className="mt-4 space-y-4">
            {LEVEL_ORDER.map((level) => {
              const phrase = phrases.find((p) => p.level_band === level)
              if (!phrase) return null
              return (
                <PhraseEditor
                  key={phrase.id}
                  phrase={phrase}
                  level={level}
                />
              )
            })}
          </div>
        </section>

        {/* Enrichments */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">Enrichments ({enrichments.length})</h2>
          {enrichments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">No enrichments for this scene.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {enrichments.map((e) => (
                <div key={e.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{e.region_slug}</span>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600">{e.age_group}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{e.level_band}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div>
                      <span className="text-xs font-bold text-gray-500">ai_question_text</span>
                      <p className="text-gray-800">{e.ai_question_text}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-500">ai_conversation_opener</span>
                      <p className="text-gray-800">{e.ai_conversation_opener}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-500">typing_variations</span>
                      <p className="text-gray-800">{(e.typing_variations ?? []).join(' / ')}</p>
                    </div>
                    {e.ai_question_choices && (
                      <div>
                        <span className="text-xs font-bold text-gray-500">ai_question_choices</span>
                        <div className="mt-1 space-y-1">
                          {e.ai_question_choices.map((c, i) => (
                            <div key={i} className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${c.isCorrect ? 'bg-green-50 text-green-800 font-bold' : 'bg-white text-gray-600'}`}>
                              <span>{c.isCorrect ? '✓' : '—'}</span>
                              <span>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {e.flavor && (
                      <div>
                        <span className="text-xs font-bold text-gray-500">flavor</span>
                        <pre className="mt-1 max-h-24 overflow-auto rounded bg-white p-2 text-xs text-gray-600">{JSON.stringify(e.flavor, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Phrase Editor Component ──

function PhraseEditor({ phrase, level }: { phrase: PhraseRow; level: string }) {
  const [fields, setFields] = useState<Record<PhraseFieldKey, string>>({
    conversation_answer: phrase.conversation_answer,
    typing_answer: phrase.typing_answer,
    native_hint: phrase.native_hint,
    mix_hint: phrase.mix_hint,
    ai_question_text: phrase.ai_question_text,
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const isDirty = PHRASE_FIELDS.some((k) => fields[k] !== phrase[k])

  const handleSave = useCallback(async () => {
    if (!isDirty) return
    if (!fields.conversation_answer.trim()) {
      setFeedback({ type: 'error', message: 'conversation_answer cannot be blank' })
      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      const changed: Record<string, string> = {}
      for (const k of PHRASE_FIELDS) {
        if (fields[k] !== phrase[k]) changed[k] = fields[k]
      }

      const res = await fetch('/api/admin/lesson-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phraseId: phrase.id, fields: changed }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error ?? 'Save failed' })
      } else {
        setFeedback({ type: 'success', message: 'Saved' })
        // Update the phrase reference so isDirty resets
        for (const k of PHRASE_FIELDS) {
          (phrase as Record<string, string>)[k] = fields[k]
        }
      }
    } catch (e) {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }, [fields, phrase, isDirty])

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            level === 'beginner' ? 'bg-green-100 text-green-700'
            : level === 'intermediate' ? 'bg-blue-100 text-blue-700'
            : 'bg-purple-100 text-purple-700'
          }`}>{level}</span>
          <span className="text-xs text-gray-400">{phrase.language_code}</span>
          {isDirty && <span className="text-xs font-bold text-amber-600">unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          {feedback && (
            <span className={`text-xs font-bold ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {feedback.message}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-sm">
        {PHRASE_FIELDS.map((key) => (
          <div key={key}>
            <label className="block text-xs font-bold text-gray-500">{key}</label>
            <input
              type="text"
              value={fields[key]}
              onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
