/**
 * Content Lifecycle Manager
 *
 * Manages the draft → validated → published → archived lifecycle.
 * Uses localStorage for MVP persistence. No DB schema changes.
 *
 * Rules:
 * - draft → validated (only if validation passes)
 * - validated → published (explicit publish step)
 * - published → archived (when new version is published)
 * - NEVER: draft → published (direct)
 * - Rollback: re-publish a previous validated version
 */

import type {
  ContentBundle,
  ContentStatus,
  ContentVersion,
  LessonContentPayload,
  ValidationResult,
} from './types'
import { validateLessonContent } from './validation'

const STORAGE_KEY_PREFIX = 'nativeflow:content-bundle:'

// ── ID generation ──

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ── Storage (localStorage in browser, in-memory fallback for scripts/SSR) ──

const memoryStore = new Map<string, string>()

function loadBundle(bundleId: string): ContentBundle | null {
  try {
    const key = STORAGE_KEY_PREFIX + bundleId
    const raw = typeof window !== 'undefined'
      ? window.localStorage.getItem(key)
      : memoryStore.get(key) ?? null
    if (!raw) return null
    return JSON.parse(raw) as ContentBundle
  } catch {
    return null
  }
}

function saveBundle(bundle: ContentBundle): void {
  try {
    const key = STORAGE_KEY_PREFIX + bundle.bundleId
    const value = JSON.stringify(bundle)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value)
    } else {
      memoryStore.set(key, value)
    }
  } catch { /* non-blocking */ }
}

// ── Create draft ──

export function createDraft(
  languageCode: string,
  regionSlug: string | null,
  content: LessonContentPayload,
): ContentBundle {
  const bundleId = `${languageCode}-${regionSlug ?? 'default'}`
  const existing = loadBundle(bundleId)

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

  saveBundle(bundle)
  return bundle
}

// ── Validate ──

export function validateDraft(bundleId: string, versionNumber: number): ValidationResult | null {
  const bundle = loadBundle(bundleId)
  if (!bundle) return null

  const version = bundle.versions.find((v) => v.version === versionNumber)
  if (!version || version.status !== 'draft') return null

  const result = validateLessonContent(version.content)
  version.validation = result

  if (result.valid) {
    version.status = 'validated'
  }

  saveBundle(bundle)

  // eslint-disable-next-line no-console
  console.log('[content-pipeline][validate]', {
    bundleId,
    version: versionNumber,
    valid: result.valid,
    errors: result.errors.length,
    warnings: result.warnings.length,
  })

  return result
}

// ── Publish ──

export function publish(bundleId: string, versionNumber: number): boolean {
  const bundle = loadBundle(bundleId)
  if (!bundle) return false

  const version = bundle.versions.find((v) => v.version === versionNumber)
  if (!version) return false

  // NEVER allow draft → published directly
  if (version.status !== 'validated') {
    // eslint-disable-next-line no-console
    console.error('[content-pipeline][publish] BLOCKED: only validated content can be published', {
      bundleId,
      version: versionNumber,
      currentStatus: version.status,
    })
    return false
  }

  // Archive current published version
  if (bundle.publishedVersion !== null) {
    const current = bundle.versions.find((v) => v.version === bundle.publishedVersion)
    if (current && current.status === 'published') {
      current.status = 'archived'
      current.archivedAt = new Date().toISOString()
    }
  }

  // Publish new version
  version.status = 'published'
  version.publishedAt = new Date().toISOString()
  bundle.publishedVersion = versionNumber

  saveBundle(bundle)

  // eslint-disable-next-line no-console
  console.log('[content-pipeline][publish]', {
    bundleId,
    version: versionNumber,
    publishedAt: version.publishedAt,
  })

  return true
}

// ── Rollback ──

export function rollbackToVersion(bundleId: string, targetVersion: number): boolean {
  const bundle = loadBundle(bundleId)
  if (!bundle) return false

  const target = bundle.versions.find((v) => v.version === targetVersion)
  if (!target) return false

  // Target must be validated or previously published (archived)
  if (target.status !== 'validated' && target.status !== 'archived') {
    // eslint-disable-next-line no-console
    console.error('[content-pipeline][rollback] BLOCKED: target must be validated or archived', {
      bundleId,
      targetVersion,
      currentStatus: target.status,
    })
    return false
  }

  // Archive current published version
  if (bundle.publishedVersion !== null) {
    const current = bundle.versions.find((v) => v.version === bundle.publishedVersion)
    if (current && current.status === 'published') {
      current.status = 'archived'
      current.archivedAt = new Date().toISOString()
    }
  }

  // Re-publish target
  target.status = 'published'
  target.publishedAt = new Date().toISOString()
  target.archivedAt = null
  bundle.publishedVersion = targetVersion

  saveBundle(bundle)

  // eslint-disable-next-line no-console
  console.log('[content-pipeline][rollback]', {
    bundleId,
    rolledBackTo: targetVersion,
  })

  return true
}

// ── Preview ──

export function previewVersion(bundleId: string, versionNumber: number): ContentVersion<LessonContentPayload> | null {
  const bundle = loadBundle(bundleId)
  if (!bundle) return null
  return bundle.versions.find((v) => v.version === versionNumber) ?? null
}

// ── Get published ──

export function getPublishedContent(bundleId: string): LessonContentPayload | null {
  const bundle = loadBundle(bundleId)
  if (!bundle || bundle.publishedVersion === null) return null
  const published = bundle.versions.find((v) => v.version === bundle.publishedVersion && v.status === 'published')
  return published?.content ?? null
}

// ── Get bundle info ──

export function getBundleInfo(bundleId: string): ContentBundle | null {
  return loadBundle(bundleId)
}
