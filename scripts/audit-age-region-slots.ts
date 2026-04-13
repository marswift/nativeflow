/**
 * Cross-axis quality audit: age × region × slot
 *
 * Usage:
 *   npx tsx scripts/audit-age-region-slots.ts
 */

import { selectDailyFlowScenes, getRegionContext, getAgeContext, DAILY_FLOW_SLOTS } from '../lib/daily-timeline'

const AGES = ['toddler', 'child', 'teen', 'adult', 'senior'] as const
const REGIONS = ['en_us_general', 'en_gb_london', 'ko_kr_seoul'] as const
const SEED = 42

for (const age of AGES) {
  for (const region of REGIONS) {
    console.log(`\n=== ${age} × ${region} ===`)
    const scenes = selectDailyFlowScenes(4, age, SEED)
    const regionCtx = getRegionContext(region)

    scenes.forEach((s, i) => {
      const slot = DAILY_FLOW_SLOTS[i]
      const ageCtx = getAgeContext(age, s.key)
      const places = regionCtx?.storeExamples?.join(', ') ?? '-'
      const tone = regionCtx?.speechStyle ?? '-'

      // Quality flags
      const flags: string[] = []

      // Evening weakness: leisure over closure
      if (slot?.id === 'evening') {
        const weakEvening = ['play_games', 'watch_videos', 'go_for_a_walk', 'read_a_book']
        if (weakEvening.includes(s.sceneKey)) flags.push('WEAK_EVENING')
      }

      // Teen with grandparent/family-heavy scene
      if (age === 'teen' && ['talk_with_grandparents', 'family_discussion', 'talk_with_siblings'].includes(s.sceneKey)) {
        flags.push('TEEN_FAMILY_HEAVY')
      }

      // Toddler with work/commute scene
      if (age === 'toddler' && ['arrive_at_work', 'greet_coworkers', 'morning_meeting', 'give_a_presentation'].includes(s.sceneKey)) {
        flags.push('TODDLER_WORK')
      }

      // Senior with work scene
      if (age === 'senior' && ['arrive_at_work', 'morning_meeting', 'give_a_presentation', 'phone_call_at_work'].includes(s.sceneKey)) {
        flags.push('SENIOR_WORK')
      }

      const flagStr = flags.length > 0 ? ` ⚠️ ${flags.join(', ')}` : ''
      console.log(`  ${slot?.id?.padEnd(10) ?? '?'} ${s.label.padEnd(6)} → ${s.sceneKey.padEnd(25)} tone=${tone} places=${places} age_ctx=${ageCtx ?? '-'}${flagStr}`)
    })
  }
}
