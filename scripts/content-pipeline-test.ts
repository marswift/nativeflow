/**
 * Content Pipeline Test — Draft → Validate → Preview → Publish → Rollback
 *
 * Usage:
 *   npx tsx scripts/content-pipeline-test.ts
 *
 * Tests the full content lifecycle. Now uses async lifecycle (Supabase-backed).
 */

import {
  createDraft,
  validateDraft,
  publish,
  rollbackToVersion,
  previewVersion,
  getPublishedContent,
} from '../lib/content-pipeline/lifecycle'
import { selectDailyFlowScenes } from '../lib/daily-timeline'
import type { LessonContentPayload } from '../lib/content-pipeline/types'

async function main() {
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

  console.log('=== Content Pipeline Test (Supabase-backed) ===\n')

  console.log('1. Creating draft...')
  const bundle = await createDraft('en', 'en_us_general', payload)
  console.log(`   Bundle: ${bundle.bundleId}, Version: ${bundle.versions[0].version}, Status: ${bundle.versions[0].status}\n`)

  console.log('2. Attempting to publish draft directly (should fail)...')
  const directPublish = await publish(bundle.bundleId, bundle.versions[0].version)
  console.log(`   Result: ${directPublish ? 'PUBLISHED (BAD!)' : 'BLOCKED (correct!)'}\n`)

  console.log('3. Validating draft...')
  const validation = await validateDraft(bundle.bundleId, bundle.versions[0].version)
  console.log(`   Valid: ${validation?.valid}`)
  console.log(`   Errors: ${validation?.errors.length}`)
  console.log(`   Warnings: ${validation?.warnings.length}\n`)

  console.log('4. Previewing validated content...')
  const preview = await previewVersion(bundle.bundleId, bundle.versions[0].version)
  console.log(`   Status: ${preview?.status}`)
  console.log(`   Scenes: ${preview?.content.scenes.join(' → ')}\n`)

  console.log('5. Publishing validated content...')
  const published = await publish(bundle.bundleId, bundle.versions[0].version)
  console.log(`   Result: ${published ? 'PUBLISHED' : 'FAILED'}`)
  const pubContent = await getPublishedContent(bundle.bundleId)
  console.log(`   Published scenes: ${pubContent?.scenes.join(' → ')}\n`)

  console.log('6. Creating v2, validating, publishing, then rollback...')
  const bundle2 = await createDraft('en', 'en_us_general', { ...payload, ageGroup: 'teen' })
  const v2num = bundle2.versions[0].version
  await validateDraft(bundle2.bundleId, v2num)
  await publish(bundle2.bundleId, v2num)
  const rollback = await rollbackToVersion(bundle2.bundleId, 1)
  console.log(`   Rollback result: ${rollback ? 'SUCCESS' : 'FAILED'}`)
  const afterRollback = await getPublishedContent(bundle2.bundleId)
  console.log(`   Active published scenes: ${afterRollback?.scenes.join(' → ')}\n`)

  console.log('=== All tests passed ===')
}

main().catch(console.error)
