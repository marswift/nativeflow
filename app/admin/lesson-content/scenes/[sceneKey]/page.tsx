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

  const loadDetail = useCallback(async () => {
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
  }, [sceneKey])

  useEffect(() => {
    if (!authorized || !sceneKey) return
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Scene</h2>
            {(() => {
              const status = !scene.is_active ? 'inactive'
                : phrases.length === 0 ? 'empty'
                : enrichments.length === 0 ? 'content-only'
                : 'published'
              const styles: Record<string, { label: string; cls: string }> = {
                published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
                'content-only': { label: 'Content Only', cls: 'bg-blue-100 text-blue-700' },
                empty: { label: 'Empty', cls: 'bg-gray-100 text-gray-400' },
                inactive: { label: 'Inactive', cls: 'bg-red-100 text-red-600' },
              }
              const s = styles[status]
              return <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>
            })()}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
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
            <div>
              <p className="text-xs font-bold text-gray-500">Content</p>
              <p className="mt-1 text-gray-600">{phrases.length} phrases / {enrichments.length} enrichments</p>
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
          <AddPhraseForm sceneKey={sceneKey} existingLevels={phrases.map((p) => p.level_band)} onCreated={loadDetail} />
        </section>

        {/* Enrichments — Editable */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">Enrichments ({enrichments.length})</h2>
          {enrichments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">No enrichments for this scene.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {enrichments.map((e) => (
                <EnrichmentEditor key={e.id} enrichment={e} />
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

// ── Enrichment Editor Component ──

function EnrichmentEditor({ enrichment }: { enrichment: EnrichmentRow }) {
  const e = enrichment
  const [aiQuestionText, setAiQuestionText] = useState(e.ai_question_text)
  const [aiConversationOpener, setAiConversationOpener] = useState(e.ai_conversation_opener)
  const [typingVariationsText, setTypingVariationsText] = useState((e.typing_variations ?? []).join('\n'))
  const [flavorText, setFlavorText] = useState(e.flavor ? JSON.stringify(e.flavor, null, 2) : '')
  const defaultChoices = e.ai_question_choices ?? [
    { label: '', isCorrect: true },
    { label: '', isCorrect: false },
    { label: '', isCorrect: false },
  ]
  const [choices, setChoices] = useState(defaultChoices.map((c) => ({ ...c })))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const choicesSnapshot = JSON.stringify(e.ai_question_choices ?? null)
  const choicesDirty = JSON.stringify(choices.map((c) => ({ label: c.label, isCorrect: c.isCorrect }))) !== choicesSnapshot

  const isDirty =
    aiQuestionText !== e.ai_question_text ||
    aiConversationOpener !== e.ai_conversation_opener ||
    typingVariationsText !== (e.typing_variations ?? []).join('\n') ||
    flavorText !== (e.flavor ? JSON.stringify(e.flavor, null, 2) : '') ||
    choicesDirty

  const handleSave = useCallback(async () => {
    if (!isDirty) return
    setSaving(true)
    setFeedback(null)

    const typingVariations = typingVariationsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    let flavor: Record<string, unknown> | null = null
    if (flavorText.trim()) {
      try {
        flavor = JSON.parse(flavorText.trim())
        if (typeof flavor !== 'object' || Array.isArray(flavor)) {
          setFeedback({ type: 'error', message: 'flavor must be a JSON object (not array)' })
          setSaving(false)
          return
        }
      } catch {
        setFeedback({ type: 'error', message: 'flavor is not valid JSON' })
        setSaving(false)
        return
      }
    }

    // Client-side choices validation
    if (choicesDirty) {
      const labels = choices.map((c) => c.label.trim())
      if (labels.some((l) => !l)) {
        setFeedback({ type: 'error', message: 'All choice labels must be non-empty' })
        setSaving(false)
        return
      }
      if (new Set(labels).size !== labels.length) {
        setFeedback({ type: 'error', message: 'Choice labels must not be duplicated' })
        setSaving(false)
        return
      }
      if (choices.filter((c) => c.isCorrect).length !== 1) {
        setFeedback({ type: 'error', message: 'Exactly one choice must be correct' })
        setSaving(false)
        return
      }
    }

    const fields: Record<string, unknown> = {}
    if (aiQuestionText !== e.ai_question_text) fields.ai_question_text = aiQuestionText
    if (aiConversationOpener !== e.ai_conversation_opener) fields.ai_conversation_opener = aiConversationOpener
    if (typingVariationsText !== (e.typing_variations ?? []).join('\n')) fields.typing_variations = typingVariations
    if (flavorText !== (e.flavor ? JSON.stringify(e.flavor, null, 2) : '')) fields.flavor = flavor
    if (choicesDirty) fields.ai_question_choices = choices.map((c) => ({ label: c.label.trim(), isCorrect: c.isCorrect }))

    try {
      const res = await fetch('/api/admin/lesson-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrichmentId: e.id, fields }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error ?? 'Save failed' })
      } else {
        setFeedback({ type: 'success', message: 'Saved' })
        e.ai_question_text = aiQuestionText
        e.ai_conversation_opener = aiConversationOpener
        e.typing_variations = typingVariations
        e.flavor = flavor as Record<string, unknown> | null
        if (choicesDirty) {
          e.ai_question_choices = choices.map((c) => ({ label: c.label.trim(), isCorrect: c.isCorrect }))
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }, [isDirty, aiQuestionText, aiConversationOpener, typingVariationsText, flavorText, choices, choicesDirty, e])

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{e.region_slug}</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600">{e.age_group}</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{e.level_band}</span>
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
        <div>
          <label className="block text-xs font-bold text-gray-500">ai_question_text</label>
          <input
            type="text"
            value={aiQuestionText}
            onChange={(ev) => setAiQuestionText(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500">ai_conversation_opener</label>
          <input
            type="text"
            value={aiConversationOpener}
            onChange={(ev) => setAiConversationOpener(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500">typing_variations (one per line)</label>
          <textarea
            value={typingVariationsText}
            onChange={(ev) => setTypingVariationsText(ev.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500">flavor (JSON)</label>
          <textarea
            value={flavorText}
            onChange={(ev) => setFlavorText(ev.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        {/* AI Question Choices — structured editor */}
        <div>
          <span className="text-xs font-bold text-gray-500">ai_question_choices</span>
          <div className="mt-1 space-y-2">
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChoices((prev) => prev.map((ch, j) => ({ ...ch, isCorrect: j === i })))}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                    c.isCorrect
                      ? 'border-green-400 bg-green-100 text-green-700'
                      : 'border-gray-300 bg-white text-gray-400 hover:border-green-300 hover:text-green-600'
                  }`}
                  title={c.isCorrect ? 'Correct answer' : 'Mark as correct'}
                >
                  {c.isCorrect ? '✓' : '—'}
                </button>
                <input
                  type="text"
                  value={c.label}
                  onChange={(ev) => setChoices((prev) => prev.map((ch, j) => j === i ? { ...ch, label: ev.target.value } : ch))}
                  placeholder={`Choice ${i + 1}`}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add Phrase Form ──

const ADD_PHRASE_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const

function AddPhraseForm({ sceneKey, existingLevels, onCreated }: {
  sceneKey: string
  existingLevels: string[]
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const availableLevels = ADD_PHRASE_LEVELS.filter((l) => !existingLevels.includes(l.value))
  const [level, setLevel] = useState<string>(availableLevels[0]?.value ?? '')
  const [conversationAnswer, setConversationAnswer] = useState('')
  const [typingAnswer, setTypingAnswer] = useState('')
  const [nativeHint, setNativeHint] = useState('')
  const [mixHint, setMixHint] = useState('')
  const [aiQuestionText, setAiQuestionText] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (availableLevels.length === 0 && !open) return null

  async function handleCreate() {
    if (!conversationAnswer.trim()) {
      setFeedback({ type: 'error', message: 'conversation_answer is required' })
      return
    }
    if (!level) {
      setFeedback({ type: 'error', message: 'Select a level' })
      return
    }

    setCreating(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/admin/lesson-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_phrase',
          scene_key: sceneKey,
          level_band: level,
          conversation_answer: conversationAnswer.trim(),
          typing_answer: typingAnswer.trim() || conversationAnswer.trim(),
          native_hint: nativeHint.trim(),
          mix_hint: mixHint.trim(),
          ai_question_text: aiQuestionText.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error ?? 'Create failed' })
      } else {
        setFeedback({ type: 'success', message: 'Phrase created' })
        setOpen(false)
        setConversationAnswer('')
        setTypingAnswer('')
        setNativeHint('')
        setMixHint('')
        setAiQuestionText('')
        onCreated()
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          + Add Phrase ({availableLevels.length} level{availableLevels.length !== 1 ? 's' : ''} available)
        </button>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-800">New Phrase</h3>
            <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
          <div className="mt-3 grid gap-3 text-sm">
            <div>
              <label className="block text-xs font-bold text-gray-500">level_band</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                {availableLevels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            {(['conversation_answer', 'typing_answer', 'native_hint', 'mix_hint', 'ai_question_text'] as const).map((field) => {
              const value = field === 'conversation_answer' ? conversationAnswer
                : field === 'typing_answer' ? typingAnswer
                : field === 'native_hint' ? nativeHint
                : field === 'mix_hint' ? mixHint
                : aiQuestionText
              const setter = field === 'conversation_answer' ? setConversationAnswer
                : field === 'typing_answer' ? setTypingAnswer
                : field === 'native_hint' ? setNativeHint
                : field === 'mix_hint' ? setMixHint
                : setAiQuestionText
              return (
                <div key={field}>
                  <label className="block text-xs font-bold text-gray-500">{field}{field === 'conversation_answer' ? ' *' : ''}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={field === 'typing_answer' ? '(defaults to conversation_answer)' : ''}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Phrase'}
            </button>
            {feedback && (
              <span className={`text-xs font-bold ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {feedback.message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
