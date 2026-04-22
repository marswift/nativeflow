/**
 * Defines the lesson structure for NativeFlow's Hybrid-C format.
 * Conversation → Typing → Review → AI Conversation.
 * Bridge layer before full AI lesson generation is connected.
 * Pure logic only; no React, Supabase, or OpenAI.
 *
 * Scene goals are internal English keys.
 * UI labels should be resolved later by adapter / copy layers.
 */

import type { CurrentLevel } from './constants'
import type { LessonSessionFactoryOutput } from './lesson-session-factory'
import { getSceneImagePath, isSceneMapped } from './scene-image-map'
import { selectDailyFlowScenes } from './daily-timeline'

export type LessonBlueprintBlockType =
  | 'conversation'
  | 'typing'
  | 'review'
  | 'ai_conversation'

export type LessonBlueprintBlock = {
  type: LessonBlueprintBlockType
  title: string
  goal: string
  scenarioLabel: string
  /** Short noun for title composition (e.g. "友人" not "友人との会話"). */
  sceneTitleLabel: string
  image_prompt: string | null
  image_url: string | null
  /** Scene category for image resolution (e.g. 'daily-flow', 'social'). */
  sceneCategory: string
}

export type LessonBlueprint = {
  theme: string
  level: CurrentLevel
  blocks: LessonBlueprintBlock[]
  /** Scene category for image resolution (e.g. 'daily-flow'). */
  sceneCategory: string
  /** Target region slug for locale-aware content (e.g. 'en_us_general'). */
  targetRegionSlug: string | null
}

// ——— Scene label & image prompt helpers ———

const SCENE_LABEL_JA: Record<string, string> = {
  wake_up: '起床', alarm_clock: '目覚まし', make_bed: '布団をたたむ',
  wash_face: '洗顔', brush_teeth: '歯磨き', take_a_shower: 'シャワー',
  get_dressed: '着替え', make_breakfast: '朝食を作る', eat_breakfast: '朝食',
  clean_up_after_breakfast: '朝食の片付け', morning_grooming: '身だしなみ',
  get_ready_to_leave: '出発準備', take_out_the_garbage: 'ゴミ出し',
  walk_to_station: '駅まで歩く', ride_a_bike: '自転車', take_the_train: '電車',
  take_the_bus: 'バス', wait_for_the_bus: 'バス待ち', transfer_trains: '乗り換え',
  arrive_at_work: '出勤', greet_coworkers: '職場の挨拶',
  school_attendance: '授業', talk_with_friends: '友人との会話',
  go_to_a_convenience_store: 'コンビニ', shop_at_the_supermarket: 'スーパー',
  go_to_a_drugstore: 'ドラッグストア', use_an_atm: 'ATM',
  go_to_the_post_office: '郵便局', go_to_a_hospital: '病院',
  go_to_a_pharmacy: '薬局', come_home: '帰宅',
  make_dinner: '夕食を作る', eat_dinner: '夕食', wash_the_dishes: '食器洗い',
  do_the_laundry: '洗濯', take_a_bath: '入浴', sort_the_garbage: 'ゴミ分別',
  watch_videos: '動画を見る', play_games: 'ゲーム', go_for_a_walk: '散歩',
  read_a_book: '読書', prepare_for_tomorrow: '翌日の準備',
  write_a_diary: '日記', go_to_bed: '就寝',
  commute_by_car: '車通勤', traffic_jam: '渋滞', parking_a_car: '駐車',
  morning_meeting: '朝礼', give_a_presentation: 'プレゼン', lunch_break: '昼休み',
  phone_call_at_work: '仕事の電話', send_an_email: 'メール作成',
  talk_with_a_manager: '上司と話す', talk_with_a_teacher: '先生と話す',
  study_for_an_exam: '試験勉強', club_activity: '部活',
  school_festival: '文化祭', sports_festival: '体育祭',
  online_shopping: 'ネット買い物', go_to_a_hair_salon: '美容院',
  pick_up_dry_cleaning: 'クリーニング', pick_up_a_child: '子どもの迎え',
  help_with_homework: '宿題を手伝う', take_a_child_to_lessons: '習い事の送迎',
  read_a_story_to_a_child: '読み聞かせ', family_discussion: '家族の話し合い',
  talk_with_siblings: '兄弟との会話', talk_with_grandparents: '祖父母と話す',
  ask_someone_out: 'デートに誘う', plan_a_date: 'デートの計画',
  date_at_a_cafe: 'カフェデート', date_at_a_restaurant: 'レストランデート',
  go_to_a_movie: '映画を観る', choose_a_gift: 'プレゼント選び',
  make_weekend_plans: '週末の予定', talk_on_social_media: 'SNSで会話',
  birthday_party: '誕生日パーティー', hobby_circle: '趣味の集まり',
  plan_a_trip: '旅行の計画', airport_checkin: '空港チェックイン',
  station_conversation: '駅での会話', hotel_checkin: 'ホテル受付',
  order_at_a_restaurant: 'レストランで注文', buy_souvenirs: 'お土産を買う',
  talk_with_locals: '現地の人と話す', health_checkup: '健康診断',
  exercise_habit: '運動習慣', diet_and_meal_control: '食事管理',
  improve_sleep: '睡眠の改善', stress_relief: 'ストレス解消',
  doctor_consultation: '診察',
  deadline_discussion: '締切の相談', overtime_discussion: '残業の相談',
  career_consultation: 'キャリア相談', job_interview_preparation: '面接準備',
  receiving_a_job_offer: '内定', career_change_discussion: '転職の相談',
  study_abroad_planning: '留学の計画', qualification_planning: '資格の計画',
  startup_consultation: '起業の相談', mentor_conversation: 'メンターと話す',
  confession_of_love: '告白', start_a_relationship: '交際を始める',
  long_distance_relationship: '遠距離恋愛', argument_and_reconciliation: '仲直り',
  talk_about_the_future_together: '将来の話', proposal: 'プロポーズ',
  engagement_and_ring_shopping: '指輪選び', meeting_the_parents: '両親に挨拶',
  wedding_preparation: '結婚準備', wedding_venue_selection: '式場選び',
  sending_invitations: '招待状', honeymoon_planning: '新婚旅行の計画',
  looking_for_a_new_home: '家探し', moving_house: '引っ越し',
  household_budget_discussion: '家計の相談', sharing_household_roles: '家事分担',
  anniversary_planning: '記念日の計画', caregiving_support: '介護の相談',
  financial_planning: '資金計画', saving_consultation: '貯蓄の相談',
  insurance_consultation: '保険の相談', home_purchase_consultation: '住宅購入の相談',
  investment_basics: '投資の基礎', tax_procedure: '税金の手続き',
  cultural_difference_discussion: '文化の違い', future_goals_discussion: '目標の話',
  share_past_experience: '過去の体験', problem_solving_discussion: '問題解決',
  schedule_change_negotiation: '予定変更の交渉', explain_your_opinion: '意見を伝える',
}

const SCENE_IMAGE_PROMPT: Record<string, string> = {
  // Home / morning
  wake_up:
    'anime style, a mascot character stretching in bed on the left side, bright bedroom with curtains and morning sunlight on the right, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  wash_face:
    'anime style, a mascot character washing face at a bathroom sink on the left side, bathroom mirror and toiletries on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  brush_teeth:
    'anime style, a mascot character brushing teeth on the left side, bathroom interior with mirror and shelf on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  make_bed:
    'anime style, a mascot character making the bed on the left side, tidy bedroom with furniture on the right, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  get_dressed:
    'anime style, a mascot character choosing clothes from a closet on the left side, bedroom with wardrobe on the right, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  make_breakfast:
    'anime style, a mascot character cooking at a kitchen counter on the left side, kitchen with stove and utensils on the right, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  eat_breakfast:
    'anime style, a mascot character eating breakfast at a kitchen table on the left side, another character sitting across on the right, kitchen with plates and cups, medium-wide shot, full scene visible, warm morning lighting, clean composition, --ar 16:9 --niji 6',
  come_home:
    'anime style, a mascot character opening the front door on the left side, cozy home entrance with shoes and coat rack on the right, medium-wide shot, full scene visible, warm evening lighting, clean composition, --ar 16:9 --niji 6',
  eat_dinner:
    'anime style, a mascot character sitting at a dinner table on the left side, another character across the table on the right, home dining room with dishes and warm lighting, medium-wide shot, full scene visible, clean composition, --ar 16:9 --niji 6',
  take_a_bath:
    'anime style, a cozy bathroom interior with a bathtub on the right side, towels and steam on the left, medium-wide shot, full scene visible, warm soft lighting, clean composition, --ar 16:9 --niji 6',
  go_to_bed:
    'anime style, a mascot character sitting on a bed on the left side, dimly lit bedroom with lamp and pillow on the right, medium-wide shot, full scene visible, soft warm lighting, clean composition, --ar 16:9 --niji 6',
  // Commute / train
  walk_to_station:
    'anime style, a mascot character walking on a sidewalk on the left side, train station entrance visible in the background on the right, medium-wide shot, full scene visible, bright morning lighting, clean composition, --ar 16:9 --niji 6',
  take_the_train:
    'anime style, a mascot character standing on a train platform on the left side, train doors and other passengers on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  transfer_trains:
    'anime style, a mascot character looking at a station signboard on the left side, busy station platform with trains on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  commute_by_car:
    'anime style, a mascot character driving a car on the left side, road and city scenery through the windshield on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  // Office / work
  arrive_at_work:
    'anime style, a mascot character entering an office on the left side, office lobby with desks and coworkers on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  greet_coworkers:
    'anime style, a mascot character waving on the left side, coworkers at desks in an office on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  morning_meeting:
    'anime style, a mascot character standing at a whiteboard on the left side, coworkers sitting at a meeting table on the right, medium-wide shot, full scene visible, bright office lighting, clean composition, --ar 16:9 --niji 6',
  give_a_presentation:
    'anime style, a mascot character presenting at a screen on the left side, audience sitting in a meeting room on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  lunch_break:
    'anime style, a mascot character eating lunch on the left side, office break room with tables and vending machines on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  // School
  school_attendance:
    'anime style, a mascot character sitting at a school desk on the left side, classroom with blackboard and students on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  talk_with_a_teacher:
    'anime style, a mascot character standing on the left side, teacher at a desk in a school hallway on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  // Cafe
  date_at_a_cafe:
    'anime style, a mascot character ordering coffee at a cafe counter, character standing on left side, barista on right side, clear cafe interior with counter, menu, and cups, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  talk_with_friends:
    'anime style, a mascot character chatting at a cafe table on the left side, a friend character on the right side, cafe interior with drinks and pastries, medium-wide shot, full scene visible, bright warm lighting, clean composition, --ar 16:9 --niji 6',
  // Restaurant
  order_at_a_restaurant:
    'anime style, a mascot character sitting at a restaurant table on the left side, waiter standing with a notepad on the right side, clear restaurant interior with tables and menu, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  date_at_a_restaurant:
    'anime style, a mascot character sitting at a restaurant table on the left side, another character sitting across on the right, restaurant interior with candles and plates, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  birthday_party:
    'anime style, a mascot character holding a gift on the left side, friends around a table with a birthday cake on the right, restaurant interior with decorations, medium-wide shot, full scene visible, warm festive lighting, clean composition, --ar 16:9 --niji 6',
  // Shopping
  go_to_a_convenience_store:
    'anime style, a mascot character browsing shelves on the left side, convenience store interior with snacks and drinks on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  shop_at_the_supermarket:
    'anime style, a mascot character pushing a cart on the left side, supermarket aisle with produce and shelves on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  go_to_a_drugstore:
    'anime style, a mascot character looking at products on the left side, drugstore interior with shelves and counter on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  // Travel
  airport_checkin:
    'anime style, a mascot character with luggage on the left side, airport check-in counter with staff on the right side, clear airport terminal interior, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  hotel_checkin:
    'anime style, a mascot character at a hotel front desk on the left side, receptionist on the right side, hotel lobby with luggage and key cards, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  station_conversation:
    'anime style, a mascot character asking for directions on the left side, station staff pointing at a map on the right side, train station interior with signs, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  talk_with_locals:
    'anime style, a mascot character chatting with a local person on the left side, park scenery with trees and benches on the right, medium-wide shot, full scene visible, bright natural lighting, clean composition, --ar 16:9 --niji 6',
  // Medical
  go_to_a_hospital:
    'anime style, a mascot character sitting in a waiting room on the left side, hospital reception desk and nurse on the right, medium-wide shot, full scene visible, bright clean lighting, clean composition, --ar 16:9 --niji 6',
  doctor_consultation:
    'anime style, a mascot character sitting across from a doctor on the left side, doctor at a desk with medical charts on the right, clinic room interior, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  // Career
  career_consultation:
    'anime style, a mascot character sitting at a desk on the left side, mentor or advisor sitting across on the right side, professional office interior with bookshelves, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  job_interview_preparation:
    'anime style, a mascot character practicing interview answers on the left side, office interior with whiteboard and desk on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
  mentor_conversation:
    'anime style, a mascot character talking with a mentor at a cafe table on the left side, cafe interior with drinks on the right, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  // Leisure
  go_for_a_walk:
    'anime style, a mascot character walking on a path on the left side, park with trees and benches on the right, medium-wide shot, full scene visible, bright natural lighting, clean composition, --ar 16:9 --niji 6',
  go_to_a_movie:
    'anime style, a mascot character buying tickets at a movie theater counter on the left side, movie posters and lobby on the right, medium-wide shot, full scene visible, warm lighting, clean composition, --ar 16:9 --niji 6',
  exercise_habit:
    'anime style, a mascot character stretching at a gym on the left side, gym equipment and mirrors on the right, medium-wide shot, full scene visible, bright lighting, clean composition, --ar 16:9 --niji 6',
}

/** Short Japanese label for a scene key. */
export function buildScenarioLabel(sceneKey: string): string {
  return SCENE_LABEL_JA[sceneKey] ?? sceneKey.replace(/_/g, ' ')
}

/**
 * Short noun form for title composition (e.g. "友人" not "友人との会話").
 * Falls back to scenarioLabel when no dedicated short form exists.
 */
const SCENE_TITLE_NOUN: Record<string, string> = {
  talk_with_friends: 'friends',
  greet_coworkers: 'coworkers',
  talk_with_a_manager: 'manager',
  talk_with_a_teacher: 'teacher',
  talk_with_siblings: 'siblings',
  talk_with_grandparents: 'grandparents',
  talk_with_locals: 'locals',
  station_conversation: 'station',
}

const SCENE_TITLE_NOUN_JA: Record<string, string> = {
  talk_with_friends: '友人',
  greet_coworkers: '同僚',
  talk_with_a_manager: '上司',
  talk_with_a_teacher: '先生',
  talk_with_siblings: '兄弟',
  talk_with_grandparents: '祖父母',
  talk_with_locals: '現地の人',
  station_conversation: '駅',
}

export function buildSceneTitleLabel(sceneKey: string): string {
  return SCENE_TITLE_NOUN_JA[sceneKey] ?? buildScenarioLabel(sceneKey)
}

export function buildSceneTitleLabelEn(sceneKey: string): string {
  return SCENE_TITLE_NOUN[sceneKey] ?? sceneKey.replace(/_/g, ' ')
}

/** Optional image generation prompt for a scene. */
function buildImagePrompt(sceneKey: string): string | null {
  return SCENE_IMAGE_PROMPT[sceneKey] ?? null
}

/** Maps scene keys to local background images at /images/backgrounds/. */
const SCENE_IMAGE_URL: Record<string, string> = {
  // Morning / home
  wake_up: '/images/backgrounds/home_01.webp',
  alarm_clock: '/images/backgrounds/home_01.webp',
  make_bed: '/images/backgrounds/home_01.webp',
  wash_face: '/images/backgrounds/home_01.webp',
  brush_teeth: '/images/backgrounds/home_01.webp',
  take_a_shower: '/images/backgrounds/home_01.webp',
  get_dressed: '/images/backgrounds/home_01.webp',
  make_breakfast: '/images/backgrounds/home_01.webp',
  eat_breakfast: '/images/backgrounds/home_01.webp',
  clean_up_after_breakfast: '/images/backgrounds/home_01.webp',
  morning_grooming: '/images/backgrounds/home_01.webp',
  get_ready_to_leave: '/images/backgrounds/home_01.webp',
  take_out_the_garbage: '/images/backgrounds/home_01.webp',
  // Commute
  walk_to_station: '/images/backgrounds/train_01.webp',
  ride_a_bike: '/images/backgrounds/park_01.webp',
  take_the_train: '/images/backgrounds/train_01.webp',
  take_the_bus: '/images/backgrounds/train_01.webp',
  wait_for_the_bus: '/images/backgrounds/train_01.webp',
  transfer_trains: '/images/backgrounds/train_01.webp',
  commute_by_car: '/images/backgrounds/car_01.webp',
  traffic_jam: '/images/backgrounds/car_01.webp',
  parking_a_car: '/images/backgrounds/car_01.webp',
  // Work / school
  arrive_at_work: '/images/backgrounds/office_01.webp',
  greet_coworkers: '/images/backgrounds/office_01.webp',
  morning_meeting: '/images/backgrounds/office_01.webp',
  give_a_presentation: '/images/backgrounds/office_01.webp',
  phone_call_at_work: '/images/backgrounds/office_01.webp',
  send_an_email: '/images/backgrounds/office_01.webp',
  talk_with_a_manager: '/images/backgrounds/office_01.webp',
  lunch_break: '/images/backgrounds/restaurant_01.webp',
  school_attendance: '/images/backgrounds/school_01.webp',
  talk_with_a_teacher: '/images/backgrounds/school_01.webp',
  study_for_an_exam: '/images/backgrounds/school_01.webp',
  club_activity: '/images/backgrounds/school_01.webp',
  school_festival: '/images/backgrounds/school_01.webp',
  sports_festival: '/images/backgrounds/school_01.webp',
  talk_with_friends: '/images/backgrounds/cafe_01.webp',
  // Shopping / errands
  go_to_a_convenience_store: '/images/backgrounds/grocery_store_01.webp',
  shop_at_the_supermarket: '/images/backgrounds/grocery_store_01.webp',
  go_to_a_drugstore: '/images/backgrounds/shopping_mall_01.webp',
  online_shopping: '/images/backgrounds/home_01.webp',
  go_to_a_hair_salon: '/images/backgrounds/shopping_mall_01.webp',
  buy_souvenirs: '/images/backgrounds/shopping_mall_01.webp',
  // Evening / home
  come_home: '/images/backgrounds/home_01.webp',
  make_dinner: '/images/backgrounds/home_01.webp',
  eat_dinner: '/images/backgrounds/home_01.webp',
  wash_the_dishes: '/images/backgrounds/home_01.webp',
  do_the_laundry: '/images/backgrounds/home_01.webp',
  take_a_bath: '/images/backgrounds/home_01.webp',
  sort_the_garbage: '/images/backgrounds/home_01.webp',
  watch_videos: '/images/backgrounds/home_01.webp',
  play_games: '/images/backgrounds/home_01.webp',
  read_a_book: '/images/backgrounds/home_01.webp',
  prepare_for_tomorrow: '/images/backgrounds/home_01.webp',
  write_a_diary: '/images/backgrounds/home_01.webp',
  go_to_bed: '/images/backgrounds/home_01.webp',
  // Leisure
  go_for_a_walk: '/images/backgrounds/park_01.webp',
  go_to_a_movie: '/images/backgrounds/movie_theater_01.webp',
  exercise_habit: '/images/backgrounds/gym_01.webp',
  // Dating / social
  date_at_a_cafe: '/images/backgrounds/cafe_01.webp',
  date_at_a_restaurant: '/images/backgrounds/restaurant_01.webp',
  order_at_a_restaurant: '/images/backgrounds/restaurant_01.webp',
  birthday_party: '/images/backgrounds/restaurant_01.webp',
  // Travel
  plan_a_trip: '/images/backgrounds/home_01.webp',
  airport_checkin: '/images/backgrounds/airport_01.webp',
  hotel_checkin: '/images/backgrounds/hotel_01.webp',
  station_conversation: '/images/backgrounds/train_01.webp',
  talk_with_locals: '/images/backgrounds/park_01.webp',
  // Medical
  go_to_a_hospital: '/images/backgrounds/home_01.webp',
  go_to_a_pharmacy: '/images/backgrounds/home_01.webp',
  health_checkup: '/images/backgrounds/home_01.webp',
  doctor_consultation: '/images/backgrounds/home_01.webp',
  // Career
  career_consultation: '/images/backgrounds/office_01.webp',
  job_interview_preparation: '/images/backgrounds/office_01.webp',
  mentor_conversation: '/images/backgrounds/cafe_01.webp',
}

/** Static image URL for a scene, or null if unmapped.
 *  Prefers the scene-image-map (exact match, no wrong fallback).
 *  If scene is managed by scene-image-map but has status 'missing',
 *  returns null (no image) — never falls back to a generic image.
 *  Legacy SCENE_IMAGE_URL is only used for scenes NOT in scene-image-map.
 */
function buildImageUrl(sceneKey: string): string | null {
  // If scene is managed by scene-image-map, use it exclusively
  if (isSceneMapped(sceneKey)) {
    return getSceneImagePath(sceneKey) // null for status:'missing'
  }
  // Legacy fallback for non-Daily-Flow scenes only
  return SCENE_IMAGE_URL[sceneKey] ?? null
}

function createBlock(
  type: LessonBlueprintBlockType,
  title: string,
  goal: string,
  sceneCategory: string
): LessonBlueprintBlock {
  return {
    type,
    title,
    goal,
    sceneCategory,
    scenarioLabel: buildScenarioLabel(goal),
    sceneTitleLabel: buildSceneTitleLabel(goal),
    image_prompt: buildImagePrompt(goal),
    image_url: buildImageUrl(goal),
  }
}

const BEGINNER_SCENES = [
  'wake_up',
  'alarm_clock',
  'make_bed',
  'wash_face',
  'brush_teeth',
  'take_a_shower',
  'get_dressed',
  'make_breakfast',
  'eat_breakfast',
  'clean_up_after_breakfast',
  'morning_grooming',
  'get_ready_to_leave',
  'take_out_the_garbage',
  'walk_to_station',
  'ride_a_bike',
  'take_the_train',
  'take_the_bus',
  'wait_for_the_bus',
  'transfer_trains',
  'arrive_at_work',
  'greet_coworkers',
  'school_attendance',
  'talk_with_friends',
  'go_to_a_convenience_store',
  'shop_at_the_supermarket',
  'go_to_a_drugstore',
  'use_an_atm',
  'go_to_the_post_office',
  'go_to_a_hospital',
  'go_to_a_pharmacy',
  'come_home',
  'make_dinner',
  'eat_dinner',
  'wash_the_dishes',
  'do_the_laundry',
  'take_a_bath',
  'sort_the_garbage',
  'watch_videos',
  'play_games',
  'go_for_a_walk',
  'read_a_book',
  'prepare_for_tomorrow',
  'write_a_diary',
  'go_to_bed',
] as const

const INTERMEDIATE_SCENES = [
  'commute_by_car',
  'traffic_jam',
  'parking_a_car',
  'morning_meeting',
  'give_a_presentation',
  'lunch_break',
  'phone_call_at_work',
  'send_an_email',
  'talk_with_a_manager',
  'talk_with_a_teacher',
  'study_for_an_exam',
  'club_activity',
  'school_festival',
  'sports_festival',
  'online_shopping',
  'go_to_a_hair_salon',
  'pick_up_dry_cleaning',
  'pick_up_a_child',
  'help_with_homework',
  'take_a_child_to_lessons',
  'read_a_story_to_a_child',
  'family_discussion',
  'talk_with_siblings',
  'talk_with_grandparents',
  'ask_someone_out',
  'plan_a_date',
  'date_at_a_cafe',
  'date_at_a_restaurant',
  'go_to_a_movie',
  'choose_a_gift',
  'make_weekend_plans',
  'talk_on_social_media',
  'birthday_party',
  'hobby_circle',
  'plan_a_trip',
  'airport_checkin',
  'station_conversation',
  'hotel_checkin',
  'order_at_a_restaurant',
  'buy_souvenirs',
  'talk_with_locals',
  'health_checkup',
  'exercise_habit',
  'diet_and_meal_control',
  'improve_sleep',
  'stress_relief',
  'doctor_consultation',
] as const

const ADVANCED_SCENES = [
  'deadline_discussion',
  'overtime_discussion',
  'career_consultation',
  'job_interview_preparation',
  'receiving_a_job_offer',
  'career_change_discussion',
  'study_abroad_planning',
  'qualification_planning',
  'startup_consultation',
  'mentor_conversation',
  'confession_of_love',
  'start_a_relationship',
  'long_distance_relationship',
  'argument_and_reconciliation',
  'talk_about_the_future_together',
  'proposal',
  'engagement_and_ring_shopping',
  'meeting_the_parents',
  'wedding_preparation',
  'wedding_venue_selection',
  'sending_invitations',
  'honeymoon_planning',
  'looking_for_a_new_home',
  'moving_house',
  'household_budget_discussion',
  'sharing_household_roles',
  'anniversary_planning',
  'caregiving_support',
  'financial_planning',
  'saving_consultation',
  'insurance_consultation',
  'home_purchase_consultation',
  'investment_basics',
  'tax_procedure',
  'cultural_difference_discussion',
  'future_goals_discussion',
  'share_past_experience',
  'problem_solving_discussion',
  'schedule_change_negotiation',
  'explain_your_opinion',
] as const

function normalizeLevel(level: CurrentLevel): string {
  return String(level ?? '').trim().toLowerCase()
}

function getScenePool(level: CurrentLevel): readonly string[] {
  const normalized = normalizeLevel(level)

  if (
    normalized.includes('c2') ||
    normalized.includes('c1') ||
    normalized.includes('advanced')
  ) {
    return [...BEGINNER_SCENES, ...INTERMEDIATE_SCENES, ...ADVANCED_SCENES]
  }

  if (
    normalized.includes('b2') ||
    normalized.includes('b1') ||
    normalized.includes('intermediate')
  ) {
    return [...BEGINNER_SCENES, ...INTERMEDIATE_SCENES]
  }

  return BEGINNER_SCENES
}

function hashString(value: string): number {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }

  return hash
}

function selectScenes(input: LessonSessionFactoryOutput, count: number): string[] {
  const pool = getScenePool(input.level)
  if (pool.length === 0) return Array.from({ length: count }, () => 'wake_up')

  const baseSeed = `${input.theme}::${input.level}`
  const baseIndex = hashString(baseSeed) % pool.length
  const scenes: string[] = []

  for (let i = 0; i < count; i++) {
    const index = (baseIndex + i) % pool.length
    scenes.push(pool[index] ?? 'wake_up')
  }

  return scenes
}

/**
 * Builds a Hybrid-C lesson blueprint from session config.
 * Returns exactly 4 blocks: conversation, typing, review, ai_conversation.
 * Each block gets a different scene from the pool.
 */
export function createLessonBlueprint(
  input: LessonSessionFactoryOutput
): LessonBlueprint {
  // Daily timeline: select 4 scenes following the daily flow order
  const seed = hashString(`${input.theme}::${input.level}`)
  const ageGroup = (input as { ageGroup?: string }).ageGroup ?? null
  const dailyScenes = selectDailyFlowScenes(4, ageGroup, seed)

  // Use daily flow scene keys, with daily flow labels as block descriptions
  const scenes = dailyScenes.map((s) => s.sceneKey)

  return {
    theme: input.theme,
    level: input.level,
    sceneCategory: 'daily-flow',
    targetRegionSlug: input.targetRegionSlug ?? null,
    blocks: [
      createBlock('conversation', '聞き取りとリピート', scenes[0], 'daily-flow'),
      createBlock('typing', '書き取り', scenes[1], 'daily-flow'),
      createBlock('review', '復習', scenes[2], 'daily-flow'),
      createBlock('ai_conversation', 'AI会話', scenes[3], 'daily-flow'),
    ],
  }
}

/**
 * Builds a lesson blueprint from user-selected scenes (Daily Flow mode).
 * Accepts any number of scenes; assigns block types cyclically.
 */
export function createLessonBlueprintFromScenes(
  scenes: string[],
  level: CurrentLevel,
  theme: string,
  targetRegionSlug: string | null = null
): LessonBlueprint {
  const blockTypes: LessonBlueprintBlockType[] = [
    'conversation', 'typing', 'review', 'ai_conversation',
  ]
  const titles = [
    '聞き取りとリピート', '書き取り', '復習', 'AI会話',
  ]

  return {
    theme,
    level,
    sceneCategory: 'daily-flow',
    targetRegionSlug,
    blocks: scenes.map((scene, i) => {
      const blockType = blockTypes[i % blockTypes.length]
      const isConversation = blockType === 'ai_conversation'
      return createBlock(
        blockType,
        titles[i % titles.length],
        scene,
        isConversation ? 'social' : 'daily-flow'
      )
    }),
  }
}
