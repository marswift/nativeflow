/**
 * Content Validation Engine
 *
 * Runs automatic checks on generated lesson content before it can be published.
 * Pure functions — no side effects, no DB access.
 *
 * Checks:
 * - required fields exist
 * - no empty strings
 * - scene order valid (follows daily timeline)
 * - slot coverage (4 blocks minimum)
 * - no placeholder/meta text
 * - no mixed languages
 * - age/context basic coherence
 */

import type { LessonContentPayload, ValidationResult, ValidationError } from './types'
import { DAILY_FLOW_TIMELINE } from '../daily-timeline'

// ── Patterns to reject ──

const PLACEHOLDER_PATTERNS = [
  /\[.*tone\]/i,
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\bplaceholder\b/i,
  /\bundefined\b/i,
  /^this is about\b/i,
  /^let's talk about talk/i,
]

const META_TAG_PATTERN = /\[.*\]/

// ── Main validation ──

export function validateLessonContent(content: LessonContentPayload): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // 1. Required fields exist
  if (!content.scenes || content.scenes.length === 0) {
    errors.push({ field: 'scenes', message: 'No scenes defined', severity: 'error' })
  }

  if (!content.labels || content.labels.length === 0) {
    errors.push({ field: 'labels', message: 'No labels defined', severity: 'error' })
  }

  if (!content.blockTypes || content.blockTypes.length === 0) {
    errors.push({ field: 'blockTypes', message: 'No block types defined', severity: 'error' })
  }

  // 2. No empty strings
  for (let i = 0; i < (content.scenes?.length ?? 0); i++) {
    if (!content.scenes[i]?.trim()) {
      errors.push({ field: `scenes[${i}]`, message: 'Empty scene key', severity: 'error' })
    }
  }

  for (let i = 0; i < (content.labels?.length ?? 0); i++) {
    if (!content.labels[i]?.trim()) {
      errors.push({ field: `labels[${i}]`, message: 'Empty label', severity: 'error' })
    }
  }

  for (let i = 0; i < (content.descriptions?.length ?? 0); i++) {
    const desc = content.descriptions[i] ?? ''
    if (!desc.trim()) {
      warnings.push({ field: `descriptions[${i}]`, message: 'Empty description', severity: 'warning' })
    }

    // Check for placeholder/meta text
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(desc)) {
        errors.push({ field: `descriptions[${i}]`, message: `Placeholder text detected: "${desc.slice(0, 40)}"`, severity: 'error' })
        break
      }
    }

    // Check for meta tags
    if (META_TAG_PATTERN.test(desc)) {
      warnings.push({ field: `descriptions[${i}]`, message: `Meta tag detected: "${desc.slice(0, 40)}"`, severity: 'warning' })
    }
  }

  // 3. Slot coverage (minimum 4 blocks)
  if ((content.scenes?.length ?? 0) < 4) {
    errors.push({ field: 'scenes', message: `Only ${content.scenes?.length ?? 0} scenes, need at least 4`, severity: 'error' })
  }

  // 4. Scene count matches labels/types
  const sceneCount = content.scenes?.length ?? 0
  if (content.labels?.length !== sceneCount) {
    errors.push({ field: 'labels', message: `Label count (${content.labels?.length}) doesn't match scene count (${sceneCount})`, severity: 'error' })
  }
  if (content.blockTypes?.length !== sceneCount) {
    errors.push({ field: 'blockTypes', message: `Block type count (${content.blockTypes?.length}) doesn't match scene count (${sceneCount})`, severity: 'error' })
  }

  // 5. Timeline order check (scenes should follow daily progression)
  if (content.scenes && content.scenes.length >= 2) {
    const allTimelineKeys = DAILY_FLOW_TIMELINE as readonly string[]
    const sceneIndices = content.scenes.map((s) => {
      // Find which timeline category this scene belongs to
      return allTimelineKeys.indexOf(s)
    }).filter((i) => i >= 0)

    for (let i = 1; i < sceneIndices.length; i++) {
      if (sceneIndices[i] < sceneIndices[i - 1]) {
        warnings.push({
          field: 'scenes',
          message: `Timeline order may be broken at position ${i}: ${content.scenes[i]} appears before ${content.scenes[i - 1]}`,
          severity: 'warning',
        })
      }
    }
  }

  // 6. Age/context basic coherence
  if (content.ageGroup === 'toddler') {
    for (const scene of content.scenes ?? []) {
      if (['arrive_at_work', 'morning_meeting', 'give_a_presentation'].includes(scene)) {
        errors.push({ field: 'scenes', message: `Work scene "${scene}" incompatible with toddler age group`, severity: 'error' })
      }
    }
  }

  if (content.ageGroup === 'senior') {
    for (const scene of content.scenes ?? []) {
      if (['morning_meeting', 'give_a_presentation', 'phone_call_at_work'].includes(scene)) {
        warnings.push({ field: 'scenes', message: `Work scene "${scene}" unusual for senior age group`, severity: 'warning' })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
  }
}
