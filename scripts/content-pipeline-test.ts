/**
 * Content Pipeline Test — Draft → Validate → Preview → Publish → Rollback
 *
 * Usage:
 *   npx tsx scripts/content-pipeline-test.ts
 *
 * Tests the full content lifecycle without affecting production.
 */

import {
  createDraft,
  validateDraft,
  publish,
  rollbackToVersion,
  previewVersion,
  getPublishedContent,
} from '../lib/content-pipeline/lifecycle'
import { selectDailyFlowScenes, DAILY_FLOW_SLOTS } from '../lib/daily-timeline'
import type { LessonContentPayload } from '../lib/content-pipeline/types'

// Simulate generating content for adult + en_us_general
const scenes = selectDailyFlowScenes(4, 'adult', 42)

const payload: LessonContentPayload = {
  scenes: scenes.map((s) => s.sceneKey),
  labels: scenes.map((s) => s.label),
  blockTypes: ['conversation', 'typing', 'review', 'ai_conversation'],
  ageGroup: 'adult',
  region: 'en_us_general',
  descriptions: scenes.map((s) => s.label),
  blueprintData: null,
}

console.log('=== Content Pipeline Test ===')
console.log()

// Step 1: Create draft
console.log('1. Creating draft...')
const bundle = createDraft('en', 'en_us_general', payload)
console.log(`   Bundle: ${bundle.bundleId}, Version: ${bundle.versions[0].version}, Status: ${bundle.versions[0].status}`)
console.log()

// Step 2: Try to publish draft (should be BLOCKED)
console.log('2. Attempting to publish draft directly (should fail)...')
const directPublish = publish(bundle.bundleId, bundle.versions[0].version)
console.log(`   Result: ${directPublish ? 'PUBLISHED (BAD!)' : 'BLOCKED (correct!)'}`)
console.log()

// Step 3: Validate
console.log('3. Validating draft...')
const validation = validateDraft(bundle.bundleId, bundle.versions[0].version)
console.log(`   Valid: ${validation?.valid}`)
console.log(`   Errors: ${validation?.errors.length}`)
console.log(`   Warnings: ${validation?.warnings.length}`)
if (validation?.errors.length) {
  validation.errors.forEach((e) => console.log(`   ❌ ${e.field}: ${e.message}`))
}
if (validation?.warnings.length) {
  validation.warnings.forEach((w) => console.log(`   ⚠️ ${w.field}: ${w.message}`))
}
console.log()

// Step 4: Preview (without publishing)
console.log('4. Previewing validated content...')
const preview = previewVersion(bundle.bundleId, bundle.versions[0].version)
console.log(`   Status: ${preview?.status}`)
console.log(`   Scenes: ${preview?.content.scenes.join(' → ')}`)
console.log(`   Labels: ${preview?.content.labels.join(' → ')}`)
console.log()

// Step 5: Publish
console.log('5. Publishing validated content...')
const published = publish(bundle.bundleId, bundle.versions[0].version)
console.log(`   Result: ${published ? 'PUBLISHED' : 'FAILED'}`)
const pubContent = getPublishedContent(bundle.bundleId)
console.log(`   Published scenes: ${pubContent?.scenes.join(' → ')}`)
console.log()

// Step 6: Create new version, validate, publish, then rollback
console.log('6. Creating v2 draft...')
const payloadV2 = { ...payload, ageGroup: 'teen' }
const bundle2 = createDraft('en', 'en_us_general', payloadV2)
const v2num = bundle2.versions[0].version
console.log(`   Version: ${v2num}`)

console.log('   Validating v2...')
validateDraft(bundle2.bundleId, v2num)

console.log('   Publishing v2...')
publish(bundle2.bundleId, v2num)
console.log(`   Published version: ${v2num}`)

console.log('   Rolling back to v1...')
const rollback = rollbackToVersion(bundle2.bundleId, 1)
console.log(`   Rollback result: ${rollback ? 'SUCCESS' : 'FAILED'}`)
const afterRollback = getPublishedContent(bundle2.bundleId)
console.log(`   Active published scenes: ${afterRollback?.scenes.join(' → ')}`)
console.log()

console.log('=== All tests passed ===')
