/**
 * Content Pipeline — Type Definitions
 *
 * Defines the content lifecycle: draft → validated → published → archived.
 * Applied to lesson blueprints, language packs, and generated content bundles.
 */

export type ContentStatus = 'draft' | 'validated' | 'published' | 'archived'

export type ValidationError = {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  checkedAt: string
}

export type ContentFlag = {
  code: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  detectedAt: string
}

export type ContentVersion<T> = {
  id: string
  version: number
  status: ContentStatus
  content: T
  validation: ValidationResult | null
  createdAt: string
  publishedAt: string | null
  archivedAt: string | null
  /** Safety flags attached by monitoring */
  flags?: ContentFlag[]
  /** Marked at-risk by anomaly detection */
  isAtRisk?: boolean
  /** Last health check timestamp */
  lastHealthCheckAt?: string | null
}

export type ContentBundle = {
  /** Unique bundle identifier */
  bundleId: string
  /** Target language code */
  languageCode: string
  /** Region slug */
  regionSlug: string | null
  /** All versions (newest first) */
  versions: ContentVersion<LessonContentPayload>[]
  /** Currently published version number (null if none) */
  publishedVersion: number | null
}

export type LessonContentPayload = {
  /** Scene keys in timeline order */
  scenes: string[]
  /** Scene labels */
  labels: string[]
  /** Block types */
  blockTypes: string[]
  /** Age group used */
  ageGroup: string | null
  /** Region used */
  region: string | null
  /** Block descriptions */
  descriptions: string[]
  /** Raw blueprint data for reconstruction */
  blueprintData: unknown
}
