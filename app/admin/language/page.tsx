'use client'

/**
 * Admin Language Expansion Panel
 *
 * Internal-only page for managing language content bundles.
 * Create → Validate → Preview → Publish → Rollback → Health
 *
 * Calls existing admin API routes. No lifecycle logic duplication.
 * Protected: only users with is_admin=true can access.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../../lib/admin-guard'

// ── Types ──

type BundleSummary = {
  bundleId: string
  version: number
  status: string
}

type VersionInfo = {
  version: number
  status: string
  flags: { code: string; message: string; severity: string; detectedAt: string }[]
  isAtRisk: boolean
  lastHealthCheckAt: string | null
  createdAt: string
  publishedAt: string | null
  archivedAt: string | null
}

type HealthData = {
  bundleId: string
  languageCode: string
  regionSlug: string | null
  publishedVersion: number | null
  versions: VersionInfo[]
  publishedContent: {
    scenes: string[]
    labels: string[]
    ageGroup: string | null
    region: string | null
  } | null
}

type PreviewData = {
  bundleId: string
  versionNumber: number
  status: string
  content: {
    scenes: string[]
    labels: string[]
    blockTypes: string[]
    ageGroup: string | null
    region: string | null
    descriptions: string[]
  }
  validation: {
    valid: boolean
    errors: { field: string; message: string; severity: string }[]
    warnings: { field: string; message: string; severity: string }[]
  } | null
  flags: { code: string; message: string; severity: string }[]
  isAtRisk: boolean
}

type ValidationResult = {
  valid: boolean
  errors: { field: string; message: string }[]
  warnings: { field: string; message: string }[]
  checkedAt: string
}

type LogEntry = {
  id: number
  time: string
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
}

// ── Helpers ──

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  validated: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700',
}

function StatusBadge({ status, isAtRisk }: { status: string; isAtRisk?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {isAtRisk && <span className="text-red-500">!</span>}
      {status}
    </span>
  )
}

function FlagBadge({ severity, count }: { severity: string; count: number }) {
  if (count === 0) return null
  const color = severity === 'critical' ? 'bg-red-100 text-red-700' : severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{count} {severity}</span>
}

// ── API calls ──

async function apiCreate(body: { baseLanguage: string; targetLanguage: string; region: string; ageGroups: string[] }) {
  const res = await fetch('/api/admin/language/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}

async function apiValidate(bundleId: string, versionNumber: number) {
  const res = await fetch('/api/admin/language/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bundleId, versionNumber }) })
  return res.json()
}

async function apiPreview(bundleId: string, version: number): Promise<PreviewData> {
  const res = await fetch(`/api/admin/language/preview?bundleId=${encodeURIComponent(bundleId)}&version=${version}`)
  return res.json()
}

async function apiPublish(bundleId: string, versionNumber: number) {
  const res = await fetch('/api/admin/language/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bundleId, versionNumber }) })
  return res.json()
}

async function apiRollback(bundleId: string, targetVersion: number) {
  const res = await fetch('/api/admin/language/rollback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bundleId, targetVersion }) })
  return res.json()
}

async function apiHealth(bundleId: string): Promise<HealthData> {
  const res = await fetch(`/api/admin/language/health?bundleId=${encodeURIComponent(bundleId)}`)
  return res.json()
}

// ── Constants (fallback when DB is empty) ──

const AGE_GROUPS = ['toddler', 'child', 'teen', 'adult', 'senior']
const REGIONS: Record<string, string[]> = {
  en: ['en_us_general', 'en_us_ny', 'en_gb_london'],
  ko: ['ko_kr_seoul'],
}
const FALLBACK_LANGUAGES = [
  { code: 'ja', english_name: 'Japanese', enabled_for_ui: true, enabled_for_learning: false, status: 'active' },
  { code: 'en', english_name: 'English', enabled_for_ui: true, enabled_for_learning: true, status: 'active' },
  { code: 'ko', english_name: 'Korean', enabled_for_ui: false, enabled_for_learning: true, status: 'beta' },
]

type LanguageRegistryRow = {
  code: string
  english_name: string
  native_name?: string | null
  enabled_for_ui: boolean
  enabled_for_learning: boolean
  status: string
}

// ── Main Component ──

export default function AdminLanguagePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

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

  // Language registry from DB
  const [registryLanguages, setRegistryLanguages] = useState<LanguageRegistryRow[]>([])

  useEffect(() => {
    if (!authorized) return
    const supabase = getSupabaseBrowserClient()
    supabase
      .from('language_registry')
      .select('code, english_name, native_name, enabled_for_ui, enabled_for_learning, status')
      .in('status', ['active', 'beta'])
      .order('sort_order', { ascending: true })
      .then(({ data }: { data: LanguageRegistryRow[] | null }) => {
        if (data && data.length > 0) setRegistryLanguages(data)
      })
  }, [authorized])

  const uiLanguages = registryLanguages.length > 0
    ? registryLanguages.filter((l) => l.enabled_for_ui)
    : FALLBACK_LANGUAGES.filter((l) => l.enabled_for_ui)
  const learningLanguages = registryLanguages.length > 0
    ? registryLanguages.filter((l) => l.enabled_for_learning)
    : FALLBACK_LANGUAGES.filter((l) => l.enabled_for_learning)

  // Create form
  const [baseLanguage, setBaseLanguage] = useState('ja')
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [region, setRegion] = useState('en_us_general')
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>(['adult'])
  const [creating, setCreating] = useState(false)

  // Bundle inspection
  const [inspectBundleId, setInspectBundleId] = useState('')
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)

  // Preview
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Validation
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  // Created bundles
  const [createdBundles, setCreatedBundles] = useState<BundleSummary[]>([])

  // Activity log
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = { current: 0 }

  // Busy states
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const id = ++logIdRef.current
    const time = new Date().toLocaleTimeString('ja-JP')
    setLogs((prev) => [{ id, time, type, message }, ...prev].slice(0, 50))
  }, [])

  // ── Handlers ──

  async function handleCreate() {
    if (!targetLanguage || !region || selectedAgeGroups.length === 0) return
    setCreating(true)
    addLog('info', `Creating bundle: ${targetLanguage} / ${region} / ${selectedAgeGroups.join(',')}`)
    try {
      const result = await apiCreate({ baseLanguage, targetLanguage, region, ageGroups: selectedAgeGroups })
      if (result.error) {
        addLog('error', `Create failed: ${result.error}`)
      } else {
        setCreatedBundles(result.bundles ?? [])
        addLog('success', `Created ${result.bundleCount} bundle(s)`)
        // Auto-inspect the first bundle
        if (result.bundles?.[0]?.bundleId) {
          setInspectBundleId(result.bundles[0].bundleId)
        }
      }
    } catch (e) {
      addLog('error', `Create error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleLoadHealth() {
    if (!inspectBundleId.trim()) return
    setLoadingHealth(true)
    setHealthData(null)
    setPreviewData(null)
    setValidationResult(null)
    addLog('info', `Loading health for: ${inspectBundleId}`)
    try {
      const data = await apiHealth(inspectBundleId.trim())
      if ((data as unknown as { error: string }).error) {
        addLog('error', `Health load failed: ${(data as unknown as { error: string }).error}`)
      } else {
        setHealthData(data)
        addLog('success', `Loaded ${data.versions?.length ?? 0} version(s)`)
      }
    } catch (e) {
      addLog('error', `Health error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setLoadingHealth(false)
    }
  }

  async function handleValidate(bundleId: string, version: number) {
    setBusyAction(`validate-${version}`)
    addLog('info', `Validating ${bundleId} v${version}`)
    try {
      const result = await apiValidate(bundleId, version)
      if (result.error) {
        addLog('error', `Validate failed: ${result.error}`)
      } else {
        setValidationResult(result)
        addLog(result.valid ? 'success' : 'warning', `Validation: ${result.valid ? 'PASSED' : 'FAILED'} (${result.errors?.length ?? 0} errors, ${result.warnings?.length ?? 0} warnings)`)
        // Refresh health
        handleLoadHealth()
      }
    } catch (e) {
      addLog('error', `Validate error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setBusyAction(null)
    }
  }

  async function handlePreview(bundleId: string, version: number) {
    setLoadingPreview(true)
    setPreviewData(null)
    addLog('info', `Previewing ${bundleId} v${version}`)
    try {
      const data = await apiPreview(bundleId, version)
      if ((data as unknown as { error: string }).error) {
        addLog('error', `Preview failed: ${(data as unknown as { error: string }).error}`)
      } else {
        setPreviewData(data)
        addLog('success', `Preview loaded: ${data.content?.scenes?.length ?? 0} scenes`)
      }
    } catch (e) {
      addLog('error', `Preview error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handlePublish(bundleId: string, version: number) {
    if (!confirm(`Publish ${bundleId} v${version}? This will archive the current published version.`)) return
    setBusyAction(`publish-${version}`)
    addLog('info', `Publishing ${bundleId} v${version}`)
    try {
      const result = await apiPublish(bundleId, version)
      if (result.error) {
        addLog('error', `Publish failed: ${result.error}`)
      } else {
        addLog('success', `Published ${bundleId} v${version}`)
        handleLoadHealth()
      }
    } catch (e) {
      addLog('error', `Publish error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRollback(bundleId: string, targetVersion: number) {
    if (!confirm(`Rollback ${bundleId} to v${targetVersion}? Current published version will be archived.`)) return
    setBusyAction(`rollback-${targetVersion}`)
    addLog('info', `Rolling back ${bundleId} to v${targetVersion}`)
    try {
      const result = await apiRollback(bundleId, targetVersion)
      if (result.error) {
        addLog('error', `Rollback failed: ${result.error}`)
      } else {
        addLog('success', `Rolled back to v${targetVersion}`)
        handleLoadHealth()
      }
    } catch (e) {
      addLog('error', `Rollback error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setBusyAction(null)
    }
  }

  // ── Region options ──
  const regionOptions = REGIONS[targetLanguage] ?? []

  if (!authChecked || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">{authChecked ? 'Access denied.' : 'Verifying access...'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-black text-gray-900">Language Expansion Admin</h1>
        <p className="text-sm text-gray-500">Internal admin panel for managing content bundles.</p>

        {/* ── A. Create Bundle ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">Create Bundle</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-bold text-gray-500">Base Language</label>
              <select value={baseLanguage} onChange={(e) => setBaseLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {uiLanguages.map((l) => <option key={l.code} value={l.code}>{l.english_name} ({l.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">Target Language</label>
              <select value={targetLanguage} onChange={(e) => { setTargetLanguage(e.target.value); setRegion(REGIONS[e.target.value]?.[0] ?? '') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {learningLanguages.map((l) => <option key={l.code} value={l.code}>{l.english_name} ({l.code}){l.status === 'beta' ? ' [beta]' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500">Age Groups</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {AGE_GROUPS.map((ag) => (
                  <button
                    key={ag}
                    type="button"
                    onClick={() => setSelectedAgeGroups((prev) => prev.includes(ag) ? prev.filter((x) => x !== ag) : [...prev, ag])}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${selectedAgeGroups.includes(ag) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {ag}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || selectedAgeGroups.length === 0}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Draft Bundle'}
          </button>

          {createdBundles.length > 0 && (
            <div className="mt-3 rounded-lg bg-green-50 px-4 py-3">
              <p className="text-xs font-bold text-green-700">Created bundles:</p>
              {createdBundles.map((b, i) => (
                <p key={i} className="mt-1 text-xs text-green-800">
                  {b.bundleId} v{b.version} — <StatusBadge status={b.status} />
                </p>
              ))}
            </div>
          )}
        </section>

        {/* ── B. Bundle Inspector ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">Bundle Inspector</h2>
          <div className="mt-3 flex gap-3">
            <input
              type="text"
              value={inspectBundleId}
              onChange={(e) => setInspectBundleId(e.target.value)}
              placeholder="Bundle ID (e.g. en-en_us_general)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleLoadHealth}
              disabled={loadingHealth || !inspectBundleId.trim()}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-900 disabled:opacity-50"
            >
              {loadingHealth ? 'Loading...' : 'Inspect'}
            </button>
          </div>

          {/* Version list */}
          {healthData && (
            <div className="mt-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700">{healthData.bundleId}</span>
                <span className="text-xs text-gray-500">lang: {healthData.languageCode}</span>
                <span className="text-xs text-gray-500">region: {healthData.regionSlug ?? 'default'}</span>
                {healthData.publishedVersion != null && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">published: v{healthData.publishedVersion}</span>
                )}
              </div>

              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {healthData.versions.map((v) => {
                  const criticalCount = v.flags.filter((f) => f.severity === 'critical').length
                  const warningCount = v.flags.filter((f) => f.severity === 'warning').length
                  const canPublish = v.status === 'validated'
                  const canRollback = v.status === 'validated' || v.status === 'archived'
                  const canValidate = v.status === 'draft'
                  const isBusy = busyAction !== null

                  return (
                    <div key={v.version} className={`flex items-center gap-3 px-4 py-3 ${v.isAtRisk ? 'bg-red-50' : ''}`}>
                      <span className="w-10 text-sm font-bold text-gray-800">v{v.version}</span>
                      <StatusBadge status={v.status} isAtRisk={v.isAtRisk} />
                      <FlagBadge severity="critical" count={criticalCount} />
                      <FlagBadge severity="warning" count={warningCount} />
                      <span className="flex-1 text-xs text-gray-400">
                        {v.publishedAt ? `pub: ${new Date(v.publishedAt).toLocaleDateString('ja-JP')}` : v.createdAt ? `created: ${new Date(v.createdAt).toLocaleDateString('ja-JP')}` : ''}
                      </span>

                      <div className="flex gap-1.5">
                        {canValidate && (
                          <button type="button" onClick={() => handleValidate(healthData.bundleId, v.version)} disabled={isBusy} className="rounded-md bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-200 disabled:opacity-50">
                            Validate
                          </button>
                        )}
                        <button type="button" onClick={() => handlePreview(healthData.bundleId, v.version)} disabled={loadingPreview} className="rounded-md bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50">
                          Preview
                        </button>
                        {canPublish && (
                          <button type="button" onClick={() => handlePublish(healthData.bundleId, v.version)} disabled={isBusy} className="rounded-md bg-green-100 px-3 py-1 text-xs font-bold text-green-700 transition hover:bg-green-200 disabled:opacity-50">
                            Publish
                          </button>
                        )}
                        {canRollback && (
                          <button type="button" onClick={() => handleRollback(healthData.bundleId, v.version)} disabled={isBusy} className="rounded-md bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-200 disabled:opacity-50">
                            Rollback
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── C. Preview Panel ── */}
        {previewData && (
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-800">Preview</h2>
              <StatusBadge status={previewData.status} isAtRisk={previewData.isAtRisk} />
              <span className="text-xs text-gray-500">{previewData.bundleId} v{previewData.versionNumber}</span>
            </div>

            {/* Content */}
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <h3 className="text-xs font-bold text-gray-500">CONTENT</h3>
              <div className="mt-2 space-y-2">
                {previewData.content.scenes.map((scene, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-right text-xs text-gray-400">{i + 1}</span>
                    <span className="font-bold text-gray-700">{scene}</span>
                    <span className="text-gray-500">{previewData.content.labels[i]}</span>
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">{previewData.content.blockTypes[i]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-3 text-xs text-gray-500">
                <span>Age: {previewData.content.ageGroup ?? 'none'}</span>
                <span>Region: {previewData.content.region ?? 'none'}</span>
              </div>
            </div>

            {/* Validation */}
            {previewData.validation && (
              <div className={`mt-4 rounded-lg p-4 ${previewData.validation.valid ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className="text-xs font-bold text-gray-500">VALIDATION</h3>
                <p className={`mt-1 text-sm font-bold ${previewData.validation.valid ? 'text-green-700' : 'text-red-700'}`}>
                  {previewData.validation.valid ? 'PASSED' : 'FAILED'}
                </p>
                {previewData.validation.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {previewData.validation.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-700">
                        {e.field}: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
                {previewData.validation.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {previewData.validation.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-700">
                        {w.field}: {w.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Flags */}
            {previewData.flags.length > 0 && (
              <div className="mt-4 rounded-lg bg-red-50 p-4">
                <h3 className="text-xs font-bold text-gray-500">FLAGS</h3>
                <ul className="mt-2 space-y-1">
                  {previewData.flags.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <FlagBadge severity={f.severity} count={1} />
                      <span className="text-gray-700">{f.code}: {f.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ── D. Validation Result ── */}
        {validationResult && !previewData && (
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-800">Validation Result</h2>
            <p className={`mt-2 text-sm font-bold ${validationResult.valid ? 'text-green-700' : 'text-red-700'}`}>
              {validationResult.valid ? 'PASSED' : 'FAILED'}
            </p>
            {validationResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {validationResult.errors.map((e, i) => <li key={i} className="text-xs text-red-700">{e.field}: {e.message}</li>)}
              </ul>
            )}
            {validationResult.warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {validationResult.warnings.map((w, i) => <li key={i} className="text-xs text-amber-700">{w.field}: {w.message}</li>)}
              </ul>
            )}
          </section>
        )}

        {/* ── E. Activity Log ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">Activity Log</h2>
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {logs.length === 0 && <p className="text-xs text-gray-400">No activity yet.</p>}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 text-xs">
                <span className="w-16 shrink-0 text-gray-400">{log.time}</span>
                <span className={
                  log.type === 'error' ? 'font-bold text-red-600'
                  : log.type === 'success' ? 'font-bold text-green-600'
                  : log.type === 'warning' ? 'font-bold text-amber-600'
                  : 'text-gray-600'
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
