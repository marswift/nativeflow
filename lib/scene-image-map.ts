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
    path: '/images/backgrounds/greet_coworkers_01.webp',
    mobilePath: '/images/backgrounds/greet_coworkers_01_p.webp',
    status: 'exists',
  },
  go_to_a_convenience_store: {
    path: '/images/backgrounds/go_to_a_convenience_store_01.webp',
    mobilePath: '/images/backgrounds/go_to_a_convenience_store_01_p.webp',
    status: 'exists',
  },

  // ── Lunch ────────────────────────────────────────────────
  order_at_a_restaurant: {
    path: '/images/backgrounds/order_at_a_restaurant_01.webp',
    mobilePath: '/images/backgrounds/order_at_a_restaurant_01_p.webp',
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
