/**
 * Source Policy — Commercial Safety Evaluation
 *
 * Determines whether a corpus source + license combination is safe
 * for commercial use in production. Text and audio are evaluated separately.
 *
 * Rules:
 * - DailyDialog → BLOCKED (reference only, never import)
 * - Tatoeba → text OK (CC BY 2.0), audio BLOCKED (mixed licenses)
 * - MultiWOZ → OK (Apache 2.0)
 * - manual / generated → OK (owned content)
 * - Unknown license → REJECT
 */

import type { CorpusSource, LicenseEvaluation } from './types'

// ── License normalization ──

const LICENSE_ALIASES: Record<string, string> = {
  'apache 2.0': 'apache-2.0',
  'apache-2.0': 'apache-2.0',
  'apache license 2.0': 'apache-2.0',
  'cc by 2.0': 'cc-by-2.0',
  'cc-by-2.0': 'cc-by-2.0',
  'creative commons attribution 2.0': 'cc-by-2.0',
  'cc by-sa 4.0': 'cc-by-sa-4.0',
  'cc-by-sa-4.0': 'cc-by-sa-4.0',
  'cc by 4.0': 'cc-by-4.0',
  'cc-by-4.0': 'cc-by-4.0',
  'cc0': 'cc0',
  'cc0-1.0': 'cc0',
  'public domain': 'public-domain',
  'mit': 'mit',
  'proprietary': 'proprietary',
  'owned': 'owned',
}

export function normalizeLicenseName(raw: string): string {
  const key = raw.toLowerCase().trim()
  return LICENSE_ALIASES[key] ?? 'unknown'
}

// ── Commercially safe licenses (for text) ──

const COMMERCIAL_SAFE_TEXT_LICENSES = new Set([
  'apache-2.0',
  'cc-by-2.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'cc0',
  'public-domain',
  'mit',
  'owned',
])

// ── Commercially safe licenses (for audio — stricter) ──

const COMMERCIAL_SAFE_AUDIO_LICENSES = new Set([
  'apache-2.0',
  'cc0',
  'public-domain',
  'mit',
  'owned',
])

// ── Blocked sources (never import) ──

const BLOCKED_SOURCES = new Set<string>([
  'dailydialog',
])

// ── Source-specific overrides ──

/**
 * Evaluate whether a source + license allows commercial text and audio use.
 */
export function isCommerciallySafeSource(
  source: CorpusSource | string,
  rawLicense: string,
): LicenseEvaluation {
  const normalizedSource = source.toLowerCase().trim()
  const license = normalizeLicenseName(rawLicense)

  // Hard block
  if (BLOCKED_SOURCES.has(normalizedSource)) {
    return {
      textAllowed: false,
      audioAllowed: false,
      reason: `Source "${source}" is blocked for commercial use (reference only).`,
    }
  }

  // Unknown license → reject
  if (license === 'unknown') {
    return {
      textAllowed: false,
      audioAllowed: false,
      reason: `License "${rawLicense}" is unknown. Cannot verify commercial safety.`,
    }
  }

  // Tatoeba special case: text OK, audio BLOCKED (mixed contributor licenses)
  if (normalizedSource === 'tatoeba') {
    return {
      textAllowed: COMMERCIAL_SAFE_TEXT_LICENSES.has(license),
      audioAllowed: false,
      reason: 'Tatoeba audio has mixed contributor licenses; text under CC BY 2.0 is OK.',
    }
  }

  // General evaluation
  const textAllowed = COMMERCIAL_SAFE_TEXT_LICENSES.has(license)
  const audioAllowed = COMMERCIAL_SAFE_AUDIO_LICENSES.has(license)

  return {
    textAllowed,
    audioAllowed,
    reason: textAllowed
      ? audioAllowed
        ? `License "${license}" allows commercial text and audio use.`
        : `License "${license}" allows text but not audio for commercial use.`
      : `License "${license}" does not allow commercial text use.`,
  }
}

/**
 * Final gate: can this record be imported to production?
 * Returns true only if text is commercially safe.
 */
export function allowImportToProduction(
  source: CorpusSource | string,
  rawLicense: string,
): boolean {
  const evaluation = isCommerciallySafeSource(source, rawLicense)
  return evaluation.textAllowed
}
