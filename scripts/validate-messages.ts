#!/usr/bin/env tsx
/**
 * Validate that all message keys exist across all locale files.
 *
 * Usage:
 *   npx tsx scripts/validate-messages.ts          # CI: exits 1 on missing keys
 *   npx tsx scripts/validate-messages.ts --warn   # dev: prints warnings, exits 0
 *
 * Hookable into:
 *   - lint-staged pre-commit  (strict mode)
 *   - npm run dev             (--warn mode, non-blocking)
 *   - CI pipeline             (strict mode)
 */

import fs from 'fs'
import path from 'path'

const MESSAGES_DIR = path.resolve(__dirname, '..', 'messages')
const DEFAULT_LOCALE = 'ja'
const WARN_ONLY = process.argv.includes('--warn')

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

const files = fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json'))
const locales: Record<string, string[]> = {}

for (const file of files) {
  const locale = file.replace('.json', '')
  const content = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, file), 'utf-8'))
  locales[locale] = flattenKeys(content)
}

const defaultKeys = locales[DEFAULT_LOCALE]
if (!defaultKeys) {
  console.error(`Default locale '${DEFAULT_LOCALE}' not found in ${MESSAGES_DIR}`)
  process.exit(1)
}

let hasMissing = false

for (const [locale, keys] of Object.entries(locales)) {
  if (locale === DEFAULT_LOCALE) continue

  const keySet = new Set(keys)
  const missing = defaultKeys.filter((k) => !keySet.has(k))

  if (missing.length > 0) {
    hasMissing = true
    const prefix = WARN_ONLY ? '⚠️' : '❌'
    console.error(`\n${prefix} [${locale}] Missing ${missing.length} keys:`)
    for (const key of missing) {
      console.error(`  - ${key}`)
    }
  }

  // Extra keys (info only)
  const defaultKeySet = new Set(defaultKeys)
  const extra = keys.filter((k) => !defaultKeySet.has(k))
  if (extra.length > 0) {
    console.warn(`\nℹ️  [${locale}] ${extra.length} extra keys (not in ${DEFAULT_LOCALE}):`)
    for (const key of extra) {
      console.warn(`  + ${key}`)
    }
  }
}

if (hasMissing && !WARN_ONLY) {
  console.error('\n❌ Validation FAILED: missing translation keys detected.')
  process.exit(1)
} else if (hasMissing && WARN_ONLY) {
  console.warn('\n⚠️  Missing keys detected (warn mode — not blocking).')
  process.exit(0)
} else {
  console.log(`✅ All ${files.length} locale files consistent (${defaultKeys.length} keys each).`)
  process.exit(0)
}
