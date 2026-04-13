/**
 * Daily Life Flow — "Live your day in English"
 *
 * Defines time-of-day blocks with 2-3 scene choices each.
 * Users pick one action per block, and those scenes feed
 * into the lesson blueprint as block goals.
 */

export type DailyFlowChoice = {
  label: string
  labelEn: string
  sceneId: string
}

export type DailyFlowBlock = {
  id: string
  emoji: string
  label: string
  labelEn: string
  choices: readonly DailyFlowChoice[]
}

export const DAILY_FLOW_BLOCKS: readonly DailyFlowBlock[] = [
  {
    id: 'morning',
    emoji: '🌅',
    label: '朝の時間',
    labelEn: 'Morning',
    choices: [
      { label: '起きて準備する', labelEn: 'Wake up & get ready', sceneId: 'wake_up' },
      { label: '朝ごはんを作る', labelEn: 'Make breakfast', sceneId: 'make_breakfast' },
      { label: '出かける準備', labelEn: 'Head out', sceneId: 'get_ready_to_leave' },
    ],
  },
  {
    id: 'daytime',
    emoji: '☀️',
    label: 'お昼の時間',
    labelEn: 'Daytime',
    choices: [
      { label: '職場に着く', labelEn: 'Get to work', sceneId: 'arrive_at_work' },
      { label: 'みんなに挨拶', labelEn: 'Say hello', sceneId: 'greet_coworkers' },
      { label: 'コンビニに寄る', labelEn: 'Stop at the store', sceneId: 'go_to_a_convenience_store' },
    ],
  },
  {
    id: 'lunch',
    emoji: '🍽️',
    label: 'ランチ',
    labelEn: 'Lunch',
    choices: [
      { label: 'レストランで注文', labelEn: 'Order food', sceneId: 'order_at_a_restaurant' },
      { label: '昼休み', labelEn: 'Lunch break', sceneId: 'lunch_break' },
      { label: '友達とおしゃべり', labelEn: 'Chat with a friend', sceneId: 'talk_with_friends' },
    ],
  },
  {
    id: 'evening',
    emoji: '🌆',
    label: '夕方の時間',
    labelEn: 'Evening',
    choices: [
      { label: 'スーパーに寄る', labelEn: 'Stop by the supermarket', sceneId: 'shop_at_the_supermarket' },
      { label: '家に帰る', labelEn: 'Get home', sceneId: 'come_home' },
      { label: '晩ごはんを作る', labelEn: 'Make dinner', sceneId: 'make_dinner' },
    ],
  },
  {
    id: 'night',
    emoji: '🌙',
    label: '夜の時間',
    labelEn: 'Night',
    choices: [
      { label: 'お風呂に入る', labelEn: 'Take a bath', sceneId: 'take_a_bath' },
      { label: '動画を見る', labelEn: 'Watch videos', sceneId: 'watch_videos' },
      { label: '寝る準備', labelEn: 'Get ready for bed', sceneId: 'go_to_bed' },
    ],
  },
] as const

/** Block types to assign to each selected scene (cycles if more than 4). */
const BLOCK_TYPES = ['conversation', 'typing', 'review', 'ai_conversation', 'conversation'] as const

export type DailyFlowBlockType = (typeof BLOCK_TYPES)[number]

export function getBlockTypeForIndex(index: number): DailyFlowBlockType {
  return BLOCK_TYPES[index % BLOCK_TYPES.length] ?? 'conversation'
}
