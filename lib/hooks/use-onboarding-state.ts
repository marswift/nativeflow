'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'

/**
 * Onboarding wizard state — preserved across locale switches and sessions.
 *
 * Two-tier persistence:
 * - **Server** (critical progress): role, goal, language picks saved to
 *   `/api/onboarding/progress` on each step completion.
 * - **sessionStorage** (draft inputs): free-text fields saved locally for
 *   instant restore within the same browser tab. Versioned to invalidate
 *   stale drafts across devices.
 *
 * On mount: merge server data › sessionStorage draft.
 */

const DRAFT_VERSION = 1

export type OnboardingFormData = {
  username: string
  ageGroup: string
  targetLanguageCode: string
  targetRegionSlug: string
  originCountryCode: string
  currentLevel: string
  speakByDeadlineText: string
  targetOutcomeText: string
  plannedPlanCode: string
}

/** Fields persisted to server on each step (critical progress). */
type ServerFields = Pick<
  OnboardingFormData,
  'targetLanguageCode' | 'targetRegionSlug' | 'currentLevel' | 'plannedPlanCode'
>

const EMPTY_FORM: OnboardingFormData = {
  username: '',
  ageGroup: '',
  targetLanguageCode: 'en',
  targetRegionSlug: '',
  originCountryCode: '',
  currentLevel: '',
  speakByDeadlineText: '',
  targetOutcomeText: '',
  plannedPlanCode: 'monthly',
}

const SERVER_FIELD_KEYS: (keyof ServerFields)[] = [
  'targetLanguageCode',
  'targetRegionSlug',
  'currentLevel',
  'plannedPlanCode',
]

// ── SessionStorage (drafts) ───────────────────────────────────────────────

type DraftEnvelope = { version: number; data: Partial<OnboardingFormData> }

function getStorageKey(userId: string | null): string {
  return `nativeflow:onboarding:${userId ?? 'anon'}`
}

function loadDraft(userId: string | null): Partial<OnboardingFormData> {
  try {
    const raw = sessionStorage.getItem(getStorageKey(userId))
    if (!raw) return {}
    const envelope: DraftEnvelope = JSON.parse(raw)
    // Invalidate stale versions
    if (envelope.version !== DRAFT_VERSION) return {}
    return envelope.data ?? {}
  } catch {
    return {}
  }
}

function saveDraft(userId: string | null, data: OnboardingFormData): void {
  try {
    const envelope: DraftEnvelope = { version: DRAFT_VERSION, data }
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify(envelope))
  } catch { /* quota / private mode */ }
}

function clearDraft(userId: string | null): void {
  try {
    sessionStorage.removeItem(getStorageKey(userId))
  } catch { /* ignore */ }
}

// ── Server persist (critical fields) ──────────────────────────────────────

async function persistToServer(fields: ServerFields): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return false

    const res = await fetch('/api/onboarding/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(fields),
    })
    return res.ok
  } catch {
    return false
  }
}

async function loadFromServer(): Promise<Partial<OnboardingFormData>> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}

    const res = await fetch('/api/onboarding/progress', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

// ── Context ───────────────────────────────────────────────────────────────

type OnboardingStateContextValue = {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => void
  resetForm: () => void
  /** true while loading server state on mount */
  loading: boolean
}

export const OnboardingStateContext = createContext<OnboardingStateContextValue | null>(null)

export function useOnboardingState(): OnboardingStateContextValue {
  const ctx = useContext(OnboardingStateContext)
  if (!ctx) {
    throw new Error('useOnboardingState must be used within OnboardingStateProvider')
  }
  return ctx
}

/**
 * Hook for the provider component to manage onboarding form state.
 *
 * On mount: merges server data › sessionStorage draft › defaults.
 * On field update: saves draft to sessionStorage; if field is critical,
 * also persists to server (fire-and-forget).
 */
export function useOnboardingStateManager(userId: string | null) {
  const [formData, setFormData] = useState<OnboardingFormData>({ ...EMPTY_FORM })
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  // Merge: server › sessionStorage › defaults
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    async function init() {
      const draft = loadDraft(userId)
      const serverData = await loadFromServer()

      // Server data wins over draft for shared fields
      const merged: OnboardingFormData = {
        ...EMPTY_FORM,
        ...draft,
        ...serverData,
      }
      setFormData(merged)
      setLoading(false)
    }

    void init()
  }, [userId])

  const updateField = useCallback(
    <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => {
      setFormData((prev) => {
        const next = { ...prev, [key]: value }
        // Always save draft to sessionStorage
        saveDraft(userId, next)
        // Persist critical fields to server (fire-and-forget)
        if ((SERVER_FIELD_KEYS as string[]).includes(key)) {
          const serverFields: ServerFields = {
            targetLanguageCode: next.targetLanguageCode,
            targetRegionSlug: next.targetRegionSlug,
            currentLevel: next.currentLevel,
            plannedPlanCode: next.plannedPlanCode,
          }
          void persistToServer(serverFields)
        }
        return next
      })
    },
    [userId]
  )

  const resetForm = useCallback(() => {
    setFormData({ ...EMPTY_FORM })
    clearDraft(userId)
  }, [userId])

  return { formData, updateField, resetForm, loading }
}
