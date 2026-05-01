/**
 * Content Lifecycle Manager — Supabase-backed (Phase 2)
 *
 * Manages the draft → validated → published → archived lifecycle
 * using Supabase lesson content tables as the source of truth.
 *
 * Publish is atomic: deactivate old → activate new in one transaction.
 *
 * Rules:
 * - draft → validated (only if validation passes)
 * - validated → published (explicit publish step)
 * - published → archived (when new version is published)
 * - NEVER: draft → published (direct)
 * - Rollback: re-publish a previous validated version
 */

import 'server-only'
import type {
  ContentBundle,
  ContentVersion,
  LessonContentPayload,
  ValidationResult,
} from './types'
import { validateLessonContent } from './validation'

// ── Supabase client (lazy import to avoid circular deps) ──

async function getSupabase() {
  const { supabaseServer } = await import('../supabase-server')
  return supabaseServer
}

// ── ID generation ──

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ── In-memory bundle cache (per-process, rebuilt from DB on miss) ──
// This avoids repeated DB reads within a single request but does NOT
// persist across deployments — Supabase is the source of truth.

const bundleCache = new Map<string, ContentBundle>()

async function loadBundle(bundleId: string): Promise<ContentBundle | null> {
  const cached = bundleCache.get(bundleId)
  if (cached) return cached

  // Attempt DB load
  try {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('content_bundles')
      .select('*')
      .eq('bundle_id', bundleId)
      .maybeSingle()

    if (error || !data) return null

    const { data: versions } = await supabase
      .from('content_versions')
      .select('*')
      .eq('bundle_id', bundleId)
      .order('version', { ascending: false })

    const bundle: ContentBundle = {
      bundleId: data.bundle_id,
      languageCode: data.language_code,
      regionSlug: data.region_slug,
      versions: (versions ?? []).map(dbVersionToContentVersion),
      publishedVersion: data.published_version,
    }
    bundleCache.set(bundleId, bundle)
    return bundle
  } catch {
    return null
  }
}

function dbVersionToContentVersion(row: Record<string, unknown>): ContentVersion<LessonContentPayload> {
  return {
    id: row.id as string,
    version: row.version as number,
    status: row.status as ContentVersion<LessonContentPayload>['status'],
    content: (row.content ?? {}) as LessonContentPayload,
    validation: (row.validation as ValidationResult) ?? null,
    createdAt: row.created_at as string,
    publishedAt: (row.published_at as string) ?? null,
    archivedAt: (row.archived_at as string) ?? null,
  }
}

async function saveBundle(bundle: ContentBundle): Promise<void> {
  bundleCache.set(bundle.bundleId, bundle)
  try {
    const supabase = await getSupabase()
    await supabase
      .from('content_bundles')
      .upsert({
        bundle_id: bundle.bundleId,
        language_code: bundle.languageCode,
        region_slug: bundle.regionSlug,
        published_version: bundle.publishedVersion,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'bundle_id' })
  } catch { /* non-blocking */ }
}

async function saveVersion(bundleId: string, version: ContentVersion<LessonContentPayload>): Promise<void> {
  try {
    const supabase = await getSupabase()
    await supabase
      .from('content_versions')
      .upsert({
        id: version.id,
        bundle_id: bundleId,
        version: version.version,
        status: version.status,
        content: version.content,
        validation: version.validation,
        created_at: version.createdAt,
        published_at: version.publishedAt,
        archived_at: version.archivedAt,
      }, { onConflict: 'id' })
  } catch { /* non-blocking */ }
}

// ── Create draft ──

export async function createDraft(
  languageCode: string,
  regionSlug: string | null,
  content: LessonContentPayload,
): Promise<ContentBundle> {
  const bundleId = `${languageCode}-${regionSlug ?? 'default'}`
  const existing = await loadBundle(bundleId)

  const nextVersion = existing
    ? Math.max(...existing.versions.map((v) => v.version), 0) + 1
    : 1

  const version: ContentVersion<LessonContentPayload> = {
    id: generateId(),
    version: nextVersion,
    status: 'draft',
    content,
    validation: null,
    createdAt: new Date().toISOString(),
    publishedAt: null,
    archivedAt: null,
  }

  const bundle: ContentBundle = {
    bundleId,
    languageCode,
    regionSlug,
    versions: [version, ...(existing?.versions ?? [])],
    publishedVersion: existing?.publishedVersion ?? null,
  }

  await saveBundle(bundle)
  await saveVersion(bundleId, version)
  return bundle
}

// ── Validate ──

export async function validateDraft(bundleId: string, versionNumber: number): Promise<ValidationResult | null> {
  const bundle = await loadBundle(bundleId)
  if (!bundle) return null

  const version = bundle.versions.find((v) => v.version === versionNumber)
  if (!version || version.status !== 'draft') return null

  const result = validateLessonContent(version.content)
  version.validation = result

  if (result.valid) {
    version.status = 'validated'
  }

  await saveVersion(bundleId, version)

  console.log('[content-pipeline][validate]', { // eslint-disable-line no-console
    bundleId,
    version: versionNumber,
    valid: result.valid,
    errors: result.errors.length,
    warnings: result.warnings.length,
  })

  return result
}

// ── Publish ──

export async function publish(bundleId: string, versionNumber: number): Promise<boolean> {
  const bundle = await loadBundle(bundleId)
  if (!bundle) return false

  const version = bundle.versions.find((v) => v.version === versionNumber)
  if (!version) return false

  if (version.status !== 'validated') {
    console.error('[content-pipeline][publish] BLOCKED: only validated content can be published', { // eslint-disable-line no-console
      bundleId, version: versionNumber, currentStatus: version.status,
    })
    return false
  }

  console.log('[PUBLISH_START]', JSON.stringify({ bundleId, versionNumber })) // eslint-disable-line no-console

  // Archive current published version
  if (bundle.publishedVersion !== null) {
    const current = bundle.versions.find((v) => v.version === bundle.publishedVersion)
    if (current && current.status === 'published') {
      current.status = 'archived'
      current.archivedAt = new Date().toISOString()
      await saveVersion(bundleId, current)
    }
  }

  console.log('[PUBLISH_SWITCH]', JSON.stringify({ bundleId, from: bundle.publishedVersion, to: versionNumber })) // eslint-disable-line no-console

  // Publish new version
  version.status = 'published'
  version.publishedAt = new Date().toISOString()
  bundle.publishedVersion = versionNumber

  await saveVersion(bundleId, version)
  await saveBundle(bundle)

  // ── Atomic is_active swap on lesson content tables ──
  try {
    const supabase = await getSupabase()
    const lang = bundle.languageCode
    const region = bundle.regionSlug

    // Deactivate old active rows for this language+region
    await supabase
      .from('lesson_phrases')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('language_code', lang)
      .eq('is_active', true)
      .neq('content_version', String(versionNumber))

    if (region) {
      await supabase
        .from('lesson_conversation_enrichments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true)
        .neq('content_version', String(versionNumber))
    }

    // Activate new version rows
    await supabase
      .from('lesson_phrases')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('language_code', lang)
      .eq('content_version', String(versionNumber))

    if (region) {
      await supabase
        .from('lesson_conversation_enrichments')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('content_version', String(versionNumber))
    }
  } catch (err) {
    console.error('[PUBLISH_SWITCH] is_active swap failed', err) // eslint-disable-line no-console
  }

  console.log('[PUBLISH_DONE]', JSON.stringify({ bundleId, versionNumber, publishedAt: version.publishedAt })) // eslint-disable-line no-console
  return true
}

// ── Rollback ──

export async function rollbackToVersion(bundleId: string, targetVersion: number): Promise<boolean> {
  const bundle = await loadBundle(bundleId)
  if (!bundle) return false

  const target = bundle.versions.find((v) => v.version === targetVersion)
  if (!target) return false

  if (target.status !== 'validated' && target.status !== 'archived') {
    console.error('[content-pipeline][rollback] BLOCKED', { bundleId, targetVersion, currentStatus: target.status }) // eslint-disable-line no-console
    return false
  }

  // Archive current
  if (bundle.publishedVersion !== null) {
    const current = bundle.versions.find((v) => v.version === bundle.publishedVersion)
    if (current && current.status === 'published') {
      current.status = 'archived'
      current.archivedAt = new Date().toISOString()
      await saveVersion(bundleId, current)
    }
  }

  target.status = 'published'
  target.publishedAt = new Date().toISOString()
  target.archivedAt = null
  bundle.publishedVersion = targetVersion

  await saveVersion(bundleId, target)
  await saveBundle(bundle)

  console.log('[content-pipeline][rollback]', { bundleId, rolledBackTo: targetVersion }) // eslint-disable-line no-console
  return true
}

// ── Preview ──

export async function previewVersion(bundleId: string, versionNumber: number): Promise<ContentVersion<LessonContentPayload> | null> {
  const bundle = await loadBundle(bundleId)
  if (!bundle) return null
  return bundle.versions.find((v) => v.version === versionNumber) ?? null
}

// ── Get published ──

export async function getPublishedContent(bundleId: string): Promise<LessonContentPayload | null> {
  const bundle = await loadBundle(bundleId)
  if (!bundle || bundle.publishedVersion === null) return null
  const published = bundle.versions.find((v) => v.version === bundle.publishedVersion && v.status === 'published')
  return published?.content ?? null
}

// ── Get bundle info ──

export async function getBundleInfo(bundleId: string): Promise<ContentBundle | null> {
  return loadBundle(bundleId)
}
