/**
 * Centralized scene image resolver for NativeFlow lessons.
 *
 * All images follow:
 *   /images/scenes/{category}/{folderName}/
 *     base/base.webp
 *     variations/v1.webp, v2.webp
 *     gesture/g1.webp
 *     sequence/s1.webp, s2.webp, s3.webp
 *
 * Internal scene IDs (e.g. 'wake_up') are normalized to actual folder
 * names (e.g. 'scene-01-wake-up') via per-category lookup tables.
 *
 * Missing images are represented as undefined, never empty strings.
 */

export type StepType =
  | 'predict'
  | 'listen'
  | 'repeat'
  | 'ai_question'
  | 'typing'
  | 'conversation'

export type ImageSet = {
  base: string | undefined
  v1: string | undefined
  v2: string | undefined
  g1: string | undefined
  s1: string | undefined
  s2: string | undefined
  s3: string | undefined
}

// ── Scene ID → folder name mapping ─────────────────────────

/**
 * Maps internal scene IDs (from SCENE_CONTENT / daily-flow-config) to
 * the actual folder names under public/images/scenes/daily-flow/.
 *
 * Includes both:
 * - direct folder-name matches (e.g. wake_up → scene-01-wake-up)
 * - runtime sceneIds that map to the closest visual match
 */
const DAILY_FLOW_FOLDERS: Record<string, string> = {
  // Direct matches (folder name ≈ scene ID)
  wake_up:            'scene-01-wake-up',
  get_out_of_bed:     'scene-02-get-out-of-bed',
  make_bed:           'scene-03-make-bed',
  wash_face:          'scene-04-wash-face',
  brush_teeth:        'scene-05-brush-teeth',
  get_dressed:        'scene-06-get-dressed',
  eat_breakfast:      'scene-07-eat-breakfast',
  leave_home:         'scene-08-leave-home',
  commute:            'scene-09-commute',
  arrive:             'scene-10-arrive',
  start_work:         'scene-11-start-work',
  take_break:         'scene-12-take-break',
  have_lunch:         'scene-13-have-lunch',
  get_home:           'scene-14-get-home',
  relax:              'scene-15-relax',
  watch_videos:       'scene-16-watch-videos',
  take_shower:        'scene-17-take-shower',
  brush_teeth_night:  'scene-18-brush-teeth-night',
  go_to_bed:          'scene-19-go-to-bed',

  // Runtime sceneIds from daily-flow-config → best visual match
  make_breakfast:             'scene-07-eat-breakfast',
  get_ready_to_leave:         'scene-08-leave-home',
  arrive_at_work:             'scene-10-arrive',
  greet_coworkers:            'scene-11-start-work',
  go_to_a_convenience_store:  'scene-12-take-break',
  order_at_a_restaurant:      'scene-13-have-lunch',
  lunch_break:                'scene-13-have-lunch',
  talk_with_friends:          'scene-12-take-break',
  shop_at_the_supermarket:    'scene-14-get-home',
  come_home:                  'scene-14-get-home',
  make_dinner:                'scene-15-relax',
  take_a_bath:                'scene-17-take-shower',

  // Additional runtime sceneIds from SCENE_CONTENT
  alarm_clock:                'scene-01-wake-up',
  take_a_shower:              'scene-17-take-shower',
  clean_up_after_breakfast:   'scene-07-eat-breakfast',
  morning_grooming:           'scene-06-get-dressed',
  take_out_the_garbage:       'scene-08-leave-home',
  walk_to_station:            'scene-09-commute',
  take_the_train:             'scene-09-commute',
  take_the_bus:               'scene-09-commute',
  wait_for_the_bus:           'scene-09-commute',
  transfer_trains:            'scene-09-commute',
  ride_a_bike:                'scene-09-commute',
  commute_by_car:             'scene-09-commute',
  traffic_jam:                'scene-09-commute',
  school_attendance:          'scene-11-start-work',
  morning_meeting:            'scene-11-start-work',
  give_a_presentation:        'scene-11-start-work',
  phone_call_at_work:         'scene-11-start-work',
  send_an_email:              'scene-11-start-work',
  talk_with_a_manager:        'scene-11-start-work',
  eat_dinner:                 'scene-15-relax',
  wash_the_dishes:            'scene-15-relax',
  do_the_laundry:             'scene-15-relax',
  sort_the_garbage:           'scene-15-relax',
  prepare_for_tomorrow:       'scene-19-go-to-bed',
  play_games:                 'scene-16-watch-videos',
  read_a_book:                'scene-16-watch-videos',
  write_a_diary:              'scene-16-watch-videos',
  go_for_a_walk:              'scene-15-relax',
}

/** Social scenes use folder names that match the sceneId directly. */
const SOCIAL_FOLDERS: Record<string, string> = {
  talk:  'talk',
  cafe:  'cafe',
  greet: 'greet',
}

const CATEGORY_FOLDER_MAPS: Record<string, Record<string, string>> = {
  'daily-flow': DAILY_FLOW_FOLDERS,
  'social': SOCIAL_FOLDERS,
}

/**
 * Scene IDs whose visual content belongs to a different category than their
 * runtime assignment. Maps sceneId → { category, folder }.
 * Checked first by normalizeSceneFolder before falling back to the standard map.
 */
const CROSS_CATEGORY_OVERRIDES: Record<string, { category: string; folder: string }> = {
  talk_with_friends:          { category: 'social', folder: 'talk' },
  greet_coworkers:            { category: 'social', folder: 'greet' },
}

/**
 * Resolves a sceneId to { category, folder } for path construction.
 * Checks cross-category overrides first, then the standard category map.
 */
function resolveSceneFolder(
  category: string,
  sceneId: string
): { category: string; folder: string } | null {
  const override = CROSS_CATEGORY_OVERRIDES[sceneId]
  if (override) return override
  const folder = CATEGORY_FOLDER_MAPS[category]?.[sceneId]
  return folder ? { category, folder } : null
}

/**
 * Converts an internal scene ID to the actual filesystem folder name.
 * Returns null if no mapping exists for this category/sceneId pair.
 */
export function normalizeSceneFolder(
  category: string,
  sceneId: string
): string | null {
  return resolveSceneFolder(category, sceneId)?.folder ?? null
}

// ── Core resolvers ──────────────────────────────────────────

/**
 * Builds the full ImageSet for a scene.
 * Returns an all-undefined ImageSet if the scene folder cannot be resolved.
 * Callers must check for undefined before rendering.
 */
export function resolveSceneImages(
  category: string,
  sceneId: string
): ImageSet {
  const resolved = resolveSceneFolder(category, sceneId)
  if (!resolved) {
    return { base: undefined, v1: undefined, v2: undefined, g1: undefined, s1: undefined, s2: undefined, s3: undefined }
  }

  const p = `/images/scenes/${resolved.category}/${resolved.folder}`

  return {
    base: `${p}/base/base.webp`,
    v1:   `${p}/variations/v1.webp`,
    v2:   `${p}/variations/v2.webp`,
    g1:   `${p}/gesture/g1.webp`,
    s1:   `${p}/sequence/s1.webp`,
    s2:   `${p}/sequence/s2.webp`,
    s3:   `${p}/sequence/s3.webp`,
  }
}

// ── Safe fallback picker ────────────────────────────────────

/** Returns the first defined value, or undefined if all are missing. */
function pick(...paths: (string | undefined)[]): string | undefined {
  for (const p of paths) {
    if (p != null) return p
  }
  return undefined
}

// ── Step-based resolver ─────────────────────────────────────

/**
 * Returns the single best image for a given lesson step.
 * Returns undefined if no suitable image exists.
 *
 * Mapping:
 *   predict      → base
 *   listen       → base
 *   repeat       → base
 *   ai_question  → v1 → base
 *   typing       → v2 → v1 → base
 *   conversation → v1 → base
 */
export function getStepImage(
  images: ImageSet,
  step: StepType
): string | undefined {
  switch (step) {
    case 'predict':
    case 'listen':
    case 'repeat':
      return images.base

    case 'ai_question':
      return pick(images.v1, images.base)

    case 'typing':
      return pick(images.v2, images.v1, images.base)

    case 'conversation':
      return pick(images.v1, images.base)

    default:
      return images.base
  }
}

// ── Gesture helper ──────────────────────────────────────────

/**
 * Returns the gesture hint image, or undefined if not available.
 * Used only when: beginner mode = true OR user fails.
 */
export function getGestureImage(images: ImageSet): string | undefined {
  return images.g1
}

// ── Sequence helper ─────────────────────────────────────────

/**
 * Returns existing sequence images in order.
 * Used only when: zero-beginner mode = true.
 */
export function getSequence(images: ImageSet): string[] {
  return [images.s1, images.s2, images.s3].filter(
    (s): s is string => s != null
  )
}
