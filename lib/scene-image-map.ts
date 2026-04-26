/**
 * Scene-specific image mapping for Daily Flow scenes.
 *
 * Rules:
 * 1. An image must visually match the scene action
 * 2. If no correct image exists → return null (never show mismatched image)
 * 3. Same scene variations share the same image
 * 4. Mobile variants use `_p` suffix (e.g. home_01_p.webp)
 *
 * All paths are relative to /public.
 */

export type SceneImageEntry = {
  /** Full path from web root, e.g. '/images/backgrounds/home_01.webp' */
  path: string
  /** Mobile-optimized variant, or null if not available */
  mobilePath: string | null
  /** 'exists' = file confirmed, 'missing' = placeholder, needs asset */
  status: 'exists' | 'missing'
}

/**
 * Maps Daily Flow scene IDs to their best-match background image.
 * Only scenes with a visually correct image are included.
 * Scenes NOT in this map will show no image (by design).
 */
const DAILY_FLOW_SCENE_IMAGES: Record<string, SceneImageEntry> = {
  // ── Morning ──────────────────────────────────────────────
  wake_up: {
    path: '/images/backgrounds/wake_up_01.webp',
    mobilePath: '/images/backgrounds/wake_up_01_p.webp',
    status: 'exists',
  },
  wash_face: {
    path: '/images/scenes/daily-flow/scene-04-wash-face/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  brush_teeth: {
    path: '/images/scenes/daily-flow/scene-05-brush-teeth/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  get_dressed: {
    path: '/images/scenes/daily-flow/scene-06-get-dressed/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  eat_breakfast: {
    path: '/images/scenes/daily-flow/scene-07-eat-breakfast/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  make_breakfast: {
    path: '/images/backgrounds/make_breakfast_01.webp',
    mobilePath: '/images/backgrounds/make_breakfast_01_p.webp',
    status: 'exists',
  },
  get_ready_to_leave: {
    path: '/images/backgrounds/get_ready_to_leave_01.webp',
    mobilePath: '/images/backgrounds/get_ready_to_leave_01_p.webp',
    status: 'exists',
  },

  // ── Daytime ──────────────────────────────────────────────
  arrive_at_work: {
    path: '/images/backgrounds/arrive_at_work_01.webp',
    mobilePath: '/images/backgrounds/arrive_at_work_01_p.webp',
    status: 'exists',
  },
  greet_coworkers: {
    path: '/images/scenes/social/greet/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  go_to_a_convenience_store: {
    path: '/images/scenes/shopping/shop/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  take_the_train: {
    path: '/images/scenes/travel/train/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },

  // ── Lunch ────────────────────────────────────────────────
  order_at_a_restaurant: {
    path: '/images/scenes/shopping/order_food/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  lunch_break: {
    path: '/images/backgrounds/lunch_break_01.webp',
    mobilePath: '/images/backgrounds/lunch_break_01_p.webp',
    status: 'exists',
  },
  talk_with_friends: {
    path: '/images/backgrounds/talk_with_friends_01.webp',
    mobilePath: '/images/backgrounds/talk_with_friends_01_p.webp',
    status: 'exists',
  },

  // ── Evening ──────────────────────────────────────────────
  shop_at_the_supermarket: {
    path: '/images/backgrounds/shop_at_the_supermarket_01.webp',
    mobilePath: '/images/backgrounds/shop_at_the_supermarket_01_p.webp',
    status: 'exists',
  },
  come_home: {
    path: '/images/backgrounds/come_home_01.webp',
    mobilePath: '/images/backgrounds/come_home_01_p.webp',
    status: 'exists',
  },
  make_dinner: {
    path: '/images/backgrounds/make_dinner_01.webp',
    mobilePath: '/images/backgrounds/make_dinner_01_p.webp',
    status: 'exists',
  },

  // ── Night ────────────────────────────────────────────────
  take_a_bath: {
    path: '/images/backgrounds/take_a_bath_01.webp',
    mobilePath: '/images/backgrounds/take_a_bath_01_p.webp',
    status: 'exists',
  },
  watch_videos: {
    path: '/images/backgrounds/watch_videos_01.webp',
    mobilePath: '/images/backgrounds/watch_videos_01_p.webp',
    status: 'exists',
  },
  go_to_bed: {
    path: '/images/backgrounds/go_to_bed_01.webp',
    mobilePath: '/images/backgrounds/go_to_bed_01_p.webp',
    status: 'exists',
  },

  // ── Aliases (share image with a related scene) ──
  eat_dinner: {
    path: '/images/backgrounds/make_dinner_01.webp',
    mobilePath: '/images/backgrounds/make_dinner_01_p.webp',
    status: 'exists',
  },
  clean_up_after_breakfast: {
    path: '/images/scenes/daily-flow/scene-07-eat-breakfast/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  take_a_shower: {
    path: '/images/scenes/daily-flow/scene-17-take-shower/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  commute_by_car: {
    path: '/images/scenes/daily-flow/scene-09-commute/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },

  // ── Social / Travel / Leisure (reused existing assets) ──
  date_at_a_cafe: {
    path: '/images/scenes/social/cafe/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  go_to_a_movie: {
    path: '/images/scenes/leisure/movie/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  hotel_checkin: {
    path: '/images/scenes/travel/hotel/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
  airport_checkin: {
    path: '/images/scenes/travel/airport/base/base.webp',
    mobilePath: null,
    status: 'exists',
  },
}

/**
 * Returns true if this scene is managed by the scene-image-map.
 * When true, callers should NOT use legacy fallback images — even if
 * the scene's status is 'missing' (the correct behavior is no image).
 */
export function isSceneMapped(sceneId: string): boolean {
  return sceneId in DAILY_FLOW_SCENE_IMAGES
}

/**
 * Resolves a scene-specific image. Returns null if no correct image exists.
 * Never returns a mismatched fallback.
 */
export function getSceneImage(sceneId: string): SceneImageEntry | null {
  return DAILY_FLOW_SCENE_IMAGES[sceneId] ?? null
}

/**
 * Returns the image path for a scene, or null.
 * Use this as the primary resolver for lesson images.
 */
export function getSceneImagePath(sceneId: string): string | null {
  const entry = DAILY_FLOW_SCENE_IMAGES[sceneId]
  if (!entry || entry.status === 'missing') return null
  return entry.path
}

/**
 * Returns the mobile-optimized image path, falling back to desktop path.
 */
export function getSceneImageMobilePath(sceneId: string): string | null {
  const entry = DAILY_FLOW_SCENE_IMAGES[sceneId]
  if (!entry || entry.status === 'missing') return null
  return entry.mobilePath ?? entry.path
}

/**
 * Lists all Daily Flow scenes that are missing a proper image.
 */
export function getMissingSceneImages(): string[] {
  return Object.entries(DAILY_FLOW_SCENE_IMAGES)
    .filter(([, entry]) => entry.status === 'missing')
    .map(([sceneId]) => sceneId)
}
