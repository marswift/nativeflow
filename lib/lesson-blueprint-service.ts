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

function createBlock(
  type: LessonBlueprintBlockType,
  title: string,
  goal: string
): LessonBlueprintBlock {
  return { type, title, goal }
}

export type LessonBlueprintBlockType =
  | 'conversation'
  | 'typing'
  | 'review'
  | 'ai_conversation'

export type LessonBlueprintBlock = {
  type: LessonBlueprintBlockType
  title: string
  goal: string
}

export type LessonBlueprint = {
  theme: string
  level: CurrentLevel
  blocks: LessonBlueprintBlock[]
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

function selectScene(input: LessonSessionFactoryOutput): string {
  const pool = getScenePool(input.level)
  if (pool.length === 0) return 'wake_up'

  const seed = `${input.theme}::${input.level}`
  const index = hashString(seed) % pool.length
  return pool[index] ?? 'wake_up'
}

/**
 * Builds a Hybrid-C lesson blueprint from session config.
 * Returns exactly 4 blocks: conversation, typing, review, ai_conversation.
 */
export function createLessonBlueprint(
  input: LessonSessionFactoryOutput
): LessonBlueprint {
  const currentScene = selectScene(input)

  return {
    theme: input.theme,
    level: input.level,
    blocks: [
      createBlock('conversation', '聞き取りとリピート', currentScene),
      createBlock('typing', '書き取り', currentScene),
      createBlock('review', '復習', currentScene),
      createBlock('ai_conversation', 'AI会話', currentScene),
    ],
  }
}
