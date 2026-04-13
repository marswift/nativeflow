/**
 * Daily Timeline — Fixed daily-flow scene order + age/region context templates
 *
 * Provides the upper-layer generation templates that guide lesson scene
 * selection, labeling, and contextual emphasis.
 *
 * This is additive — existing conversation data is preserved.
 * These templates guide content selection and block labeling only.
 */

// ── Daily Flow Timeline (fixed order) ──

export const DAILY_FLOW_TIMELINE = [
  'wake_up',
  'morning_prep',
  'breakfast',
  'go_out',
  'commute',
  'arrival',
  'daytime_activity',
  'lunch',
  'conversation',
  'return_home',
  'evening',
  'sleep',
] as const

export type DailyFlowKey = (typeof DAILY_FLOW_TIMELINE)[number]

// ── Scene labels (Japanese) ──

export const DAILY_FLOW_LABELS_JA: Record<DailyFlowKey, string> = {
  wake_up: '起床',
  morning_prep: '朝の準備',
  breakfast: '朝食',
  go_out: '外出',
  commute: '移動',
  arrival: '到着',
  daytime_activity: '日中活動',
  lunch: '昼食',
  conversation: '会話',
  return_home: '帰宅',
  evening: '夜',
  sleep: '就寝',
}

export const DAILY_FLOW_LABELS_EN: Record<DailyFlowKey, string> = {
  wake_up: 'Waking Up',
  morning_prep: 'Getting Ready',
  breakfast: 'Breakfast',
  go_out: 'Heading Out',
  commute: 'Commute',
  arrival: 'Arrival',
  daytime_activity: 'Daytime Activity',
  lunch: 'Lunch',
  conversation: 'Conversation',
  return_home: 'Going Home',
  evening: 'Evening',
  sleep: 'Bedtime',
}

export function getDailyFlowLabel(key: string, locale = 'ja'): string {
  const k = key as DailyFlowKey
  if (locale === 'en') return DAILY_FLOW_LABELS_EN[k] ?? key
  return DAILY_FLOW_LABELS_JA[k] ?? key
}

// ── Age Context Templates ──

export type AgeGroup = 'toddler' | 'child' | 'teen' | 'adult' | 'senior'

type AgeContextEntry = Partial<Record<DailyFlowKey, string>>

export const AGE_CONTEXT: Record<AgeGroup, AgeContextEntry> = {
  toddler: {
    wake_up: 'parents wake the child up',
    breakfast: 'favorite food with family',
    daytime_activity: 'play / anime / family time',
    conversation: 'talking with mom or dad',
    evening: 'playing at home',
    sleep: 'getting ready for bed with family',
  },
  child: {
    wake_up: 'getting ready for school',
    morning_prep: 'packing school bag',
    breakfast: 'quick breakfast before school',
    daytime_activity: 'school / class / recess',
    lunch: 'school lunch',
    conversation: 'friends / teacher / family',
    return_home: 'walking home from school',
    evening: 'homework / playing',
  },
  teen: {
    wake_up: 'school preparation',
    morning_prep: 'getting dressed for school',
    commute: 'going to school',
    arrival: 'arriving at school',
    daytime_activity: 'school / club activities / part-time work',
    lunch: 'cafeteria / convenience store',
    conversation: 'friends / teachers',
    return_home: 'heading home after school',
    evening: 'studying / social media / gaming',
    sleep: 'getting ready for bed',
  },
  adult: {
    wake_up: 'getting ready for work',
    commute: 'going to work',
    arrival: 'arriving at the office',
    daytime_activity: 'work / meetings / tasks',
    lunch: 'lunch break with coworkers',
    conversation: 'coworkers / manager / clients',
    return_home: 'commuting home',
    evening: 'relaxing after work',
  },
  senior: {
    wake_up: 'health-conscious morning routine',
    morning_prep: 'light exercise / stretching',
    breakfast: 'healthy breakfast',
    go_out: 'going for a morning walk',
    commute: 'walking to the park or community center',
    daytime_activity: 'walk / hobby / community center',
    lunch: 'lunch at home or with friends',
    conversation: 'friends / family / neighbors',
    return_home: 'returning home in the afternoon',
    evening: 'quiet time / reading / TV',
    sleep: 'early bedtime routine',
  },
}

/**
 * Get age-context emphasis for a timeline scene.
 * Returns a short contextual description or null.
 */
export function getAgeContext(ageGroup: string | null, sceneKey: string): string | null {
  if (!ageGroup) return null
  const ctx = AGE_CONTEXT[ageGroup as AgeGroup]
  if (!ctx) return null
  return ctx[sceneKey as DailyFlowKey] ?? null
}

// ── Region Context (lightweight scaffold for future expansion) ──

export type RegionContext = {
  speechStyle: string
  atmosphere: string
  storeExamples: string[]
  cultureNotes: string[]
}

export const REGION_CONTEXT: Record<string, RegionContext> = {
  en_us_general: {
    speechStyle: 'casual',
    atmosphere: 'direct / casual / practical',
    storeExamples: ['cafe', 'grocery store', 'drive-through'],
    cultureNotes: ['casual greeting', 'small talk', 'ordering style'],
  },
  en_us_ny: {
    speechStyle: 'casual-fast',
    atmosphere: 'fast-paced / direct / diverse',
    storeExamples: ['deli', 'bodega', 'coffee cart'],
    cultureNotes: ['fast speech', 'direct style', 'subway talk'],
  },
  en_gb_london: {
    speechStyle: 'polite',
    atmosphere: 'soft / polite / reserved',
    storeExamples: ['cafe', 'high street shop', 'pub'],
    cultureNotes: ['polite phrasing', 'British everyday routines'],
  },
  ko_kr_seoul: {
    speechStyle: 'polite',
    atmosphere: 'respectful / social / fast-paced',
    storeExamples: ['convenience store', 'cafe', 'street food'],
    cultureNotes: ['respect level', 'social hierarchy', 'Korean daily life'],
  },
}

export function getRegionContext(regionSlug: string | null): RegionContext | null {
  if (!regionSlug) return null
  return REGION_CONTEXT[regionSlug] ?? null
}

// ── Scene mapping: daily flow key → existing scene keys ──

/**
 * Map daily flow timeline keys to existing SCENE_CONTENT keys.
 * This bridges the new timeline structure with existing conversation data.
 */
export const DAILY_FLOW_TO_SCENE_KEY: Record<DailyFlowKey, string[]> = {
  wake_up: ['wake_up', 'alarm_clock'],
  morning_prep: ['wash_face', 'brush_teeth', 'take_a_shower', 'get_dressed', 'morning_grooming'],
  breakfast: ['make_breakfast', 'eat_breakfast', 'clean_up_after_breakfast'],
  go_out: ['get_ready_to_leave', 'take_out_the_garbage'],
  commute: ['walk_to_station', 'ride_a_bike', 'take_the_train', 'take_the_bus', 'wait_for_the_bus', 'transfer_trains'],
  arrival: ['arrive_at_work', 'greet_coworkers', 'school_attendance'],
  daytime_activity: ['morning_meeting', 'give_a_presentation', 'phone_call_at_work', 'send_an_email', 'talk_with_a_manager', 'study_for_an_exam', 'club_activity'],
  lunch: ['lunch_break', 'go_to_a_convenience_store', 'shop_at_the_supermarket'],
  conversation: ['talk_with_friends', 'talk_with_siblings', 'talk_with_grandparents', 'family_discussion'],
  return_home: ['come_home'],
  evening: ['make_dinner', 'eat_dinner', 'wash_the_dishes', 'do_the_laundry', 'take_a_bath', 'watch_videos', 'play_games', 'go_for_a_walk', 'read_a_book'],
  sleep: ['prepare_for_tomorrow', 'write_a_diary', 'go_to_bed'],
}

/**
 * Select a concrete scene key for a daily flow step, considering age context.
 * Uses deterministic selection based on seed for reproducibility.
 */
export function resolveSceneForTimelineStep(
  step: DailyFlowKey,
  ageGroup: string | null,
  seed: number,
): string {
  const candidates = DAILY_FLOW_TO_SCENE_KEY[step]
  if (!candidates || candidates.length === 0) return 'wake_up'
  const index = Math.abs(seed) % candidates.length
  return candidates[index]
}

// ── Semantic slots (fixed 4-part daily structure) ──

export type DailyFlowSlot = {
  id: string
  label: string
  scenes: DailyFlowKey[]
}

export const DAILY_FLOW_SLOTS: DailyFlowSlot[] = [
  { id: 'morning', label: '朝', scenes: ['wake_up', 'morning_prep', 'breakfast'] },
  { id: 'outgoing', label: '外出', scenes: ['go_out', 'commute', 'arrival'] },
  { id: 'daytime', label: '日中', scenes: ['daytime_activity', 'lunch', 'conversation'] },
  { id: 'evening', label: '夜', scenes: ['return_home', 'evening', 'sleep'] },
]

function simpleHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// ── Age-aware strict scene preference (two layers) ──

type SlotId = 'morning' | 'outgoing' | 'daytime' | 'evening'

/**
 * Layer 1: Strict age-specific SCENE KEY preferences per slot.
 * These are the actual scene keys from SCENE_CONTENT / DAILY_FLOW_TO_SCENE_KEY.
 * First item = strongest. Only candidates that exist in the slot's mapped scene keys are used.
 */
const STRICT_SCENE_PREFERENCE: Record<string, Partial<Record<SlotId, string[]>>> = {
  toddler: {
    morning: ['wake_up', 'eat_breakfast', 'make_breakfast'],
    outgoing: ['get_ready_to_leave'],
    daytime: ['talk_with_friends', 'family_discussion', 'lunch_break'],
    evening: ['take_a_bath', 'go_to_bed', 'come_home'],
  },
  child: {
    morning: ['wake_up', 'eat_breakfast', 'brush_teeth', 'get_dressed'],
    outgoing: ['get_ready_to_leave', 'walk_to_station', 'school_attendance'],
    daytime: ['school_attendance', 'study_for_an_exam', 'talk_with_friends', 'lunch_break', 'club_activity'],
    evening: ['come_home', 'eat_dinner', 'take_a_bath', 'go_to_bed'],
  },
  teen: {
    morning: ['wake_up', 'eat_breakfast', 'get_dressed', 'brush_teeth'],
    outgoing: ['walk_to_station', 'take_the_train', 'take_the_bus', 'school_attendance'],
    daytime: ['study_for_an_exam', 'club_activity', 'talk_with_friends', 'lunch_break'],
    evening: ['come_home', 'eat_dinner', 'prepare_for_tomorrow', 'go_to_bed'],
  },
  adult: {
    morning: ['wake_up', 'eat_breakfast', 'take_a_shower', 'get_dressed'],
    outgoing: ['walk_to_station', 'take_the_train', 'arrive_at_work', 'greet_coworkers'],
    daytime: ['morning_meeting', 'phone_call_at_work', 'talk_with_a_manager', 'lunch_break', 'send_an_email'],
    evening: ['come_home', 'make_dinner', 'eat_dinner', 'prepare_for_tomorrow', 'go_to_bed'],
  },
  senior: {
    morning: ['wake_up', 'eat_breakfast', 'wash_face'],
    outgoing: ['go_for_a_walk', 'get_ready_to_leave'],
    daytime: ['talk_with_friends', 'family_discussion', 'go_to_a_convenience_store', 'talk_with_grandparents'],
    evening: ['come_home', 'eat_dinner', 'take_a_bath', 'read_a_book', 'go_to_bed'],
  },
  '20s': {
    morning: ['wake_up', 'eat_breakfast', 'take_a_shower'],
    outgoing: ['walk_to_station', 'take_the_train', 'arrive_at_work'],
    daytime: ['morning_meeting', 'lunch_break', 'talk_with_friends'],
    evening: ['come_home', 'eat_dinner', 'prepare_for_tomorrow', 'go_to_bed'],
  },
}

/**
 * Layer 2: Broader flow-key preference (fallback).
 */
const SLOT_AGE_PREFERENCE: Record<string, Partial<Record<SlotId, DailyFlowKey[]>>> = {
  toddler: {
    morning: ['wake_up', 'breakfast'],
    outgoing: ['go_out'],
    daytime: ['conversation', 'lunch'],
    evening: ['sleep', 'evening'],
  },
  child: {
    morning: ['wake_up', 'breakfast', 'morning_prep'],
    outgoing: ['go_out', 'arrival', 'commute'],
    daytime: ['daytime_activity', 'conversation', 'lunch'],
    evening: ['return_home', 'sleep', 'evening'],
  },
  teen: {
    morning: ['wake_up', 'morning_prep', 'breakfast'],
    outgoing: ['commute', 'arrival', 'go_out'],
    daytime: ['daytime_activity', 'conversation', 'lunch'],
    evening: ['return_home', 'sleep', 'evening'],
  },
  adult: {
    morning: ['wake_up', 'breakfast', 'morning_prep'],
    outgoing: ['commute', 'arrival', 'go_out'],
    daytime: ['daytime_activity', 'lunch', 'conversation'],
    evening: ['return_home', 'sleep', 'evening'],
  },
  senior: {
    morning: ['wake_up', 'breakfast', 'morning_prep'],
    outgoing: ['go_out', 'commute'],
    daytime: ['conversation', 'daytime_activity', 'lunch'],
    evening: ['evening', 'sleep', 'return_home'],
  },
  '20s': {
    morning: ['wake_up', 'breakfast', 'morning_prep'],
    outgoing: ['commute', 'arrival', 'go_out'],
    daytime: ['daytime_activity', 'lunch', 'conversation'],
    evening: ['return_home', 'sleep', 'evening'],
  },
}

/**
 * Get all mapped scene keys for a set of flow keys.
 */
function getAllSceneKeysForFlowKeys(flowKeys: DailyFlowKey[]): string[] {
  const result: string[] = []
  for (const fk of flowKeys) {
    const mapped = DAILY_FLOW_TO_SCENE_KEY[fk]
    if (mapped) result.push(...mapped)
  }
  return result
}

/**
 * Select 4 scenes — one per semantic slot (morning/outgoing/daytime/evening).
 * Two-layer age preference: strict scene keys first, then broader flow-key preference.
 * Always produces: 朝 → 外出 → 日中 → 夜
 */
export function selectDailyFlowScenes(
  _count: number,
  ageGroup: string | null,
  seed: number,
): { key: DailyFlowKey; sceneKey: string; label: string }[] {
  return DAILY_FLOW_SLOTS.map((slot) => {
    const slotId = slot.id as SlotId

    // All possible scene keys for this slot
    const allSlotSceneKeys = getAllSceneKeysForFlowKeys(slot.scenes)

    // Layer 1: strict age-specific scene preference
    const strictPrefs = ageGroup ? STRICT_SCENE_PREFERENCE[ageGroup]?.[slotId] : null
    if (strictPrefs) {
      const strictPool = strictPrefs.filter((sk) => allSlotSceneKeys.includes(sk))
      if (strictPool.length > 0) {
        const idx = simpleHash(`${seed}:${slot.id}`) % strictPool.length
        const sceneKey = strictPool[idx]
        // Find which flow key this scene belongs to
        const flowKey = slot.scenes.find((fk) =>
          (DAILY_FLOW_TO_SCENE_KEY[fk] ?? []).includes(sceneKey)
        ) ?? slot.scenes[0]
        return { key: flowKey, sceneKey, label: DAILY_FLOW_LABELS_JA[flowKey] }
      }
    }

    // Layer 2: broader flow-key preference
    const broadPrefs = ageGroup ? SLOT_AGE_PREFERENCE[ageGroup]?.[slotId] : null
    if (broadPrefs) {
      const filteredFlowKeys = broadPrefs.filter((k) => slot.scenes.includes(k))
      if (filteredFlowKeys.length > 0) {
        const idx = simpleHash(`${seed}:${slot.id}`) % filteredFlowKeys.length
        const flowKey = filteredFlowKeys[idx]
        const sceneKey = resolveSceneForTimelineStep(flowKey, ageGroup, seed)
        return { key: flowKey, sceneKey, label: DAILY_FLOW_LABELS_JA[flowKey] }
      }
    }

    // Layer 3: fallback to original slot candidates
    const idx = simpleHash(`${seed}:${slot.id}`) % slot.scenes.length
    const flowKey = slot.scenes[idx]
    const sceneKey = resolveSceneForTimelineStep(flowKey, ageGroup, seed)
    return { key: flowKey, sceneKey, label: DAILY_FLOW_LABELS_JA[flowKey] }
  })
}
