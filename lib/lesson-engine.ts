import type { UserProfileRow } from './types'
import type { CurrentLevel, PreferredSessionLength } from './constants'

/** MVP block types: conversation, review, typing */
export type LessonBlockType = 'conversation' | 'review' | 'typing'

export type LessonBlockItem = {
  id: string
  prompt: string
  /** Optional so draft session items (answer: string | null) are assignable. */
  answer?: string | null
}

export type LessonBlock = {
  id: string
  type: LessonBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonBlockItem[]
}

export type LessonSession = {
  /** Optional so mapped draft session (no id at root) is assignable; engine can add id when needed. */
  id?: string
  theme: string
  level: CurrentLevel
  totalEstimatedMinutes: number
  blocks: LessonBlock[]
}

type BlockMinutes = { conversation: number; review: number; typing: number }

function createItem(
  sessionId: string,
  prefix: string,
  index: number,
  prompt: string,
  answer: string
): LessonBlockItem {
  return {
    id: `${sessionId}-${prefix}-${index}`,
    prompt,
    answer,
  }
}

function createBlock(
  sessionId: string,
  type: LessonBlockType,
  title: string,
  description: string,
  estimatedMinutes: number,
  items: LessonBlockItem[]
): LessonBlock {
  return {
    id: `${sessionId}-${type}`,
    type,
    title,
    description,
    estimatedMinutes,
    items,
  }
}

function getBlockMinutes(preferred: PreferredSessionLength): BlockMinutes {
  switch (preferred) {
    case 'short':
      return { conversation: 3, review: 2, typing: 2 }
    case 'deep':
      return { conversation: 7, review: 5, typing: 6 }
    case 'standard':
    default:
      return { conversation: 5, review: 4, typing: 4 }
  }
}

function getTheme(profile: UserProfileRow): string {
  if (profile.enable_dating_contexts) {
    return 'デートの待ち合わせ'
  }
  switch (profile.current_level) {
    case 'beginner':
      return 'カフェで注文'
    case 'advanced':
      return 'カフェでの会話と注文'
    case 'intermediate':
    default:
      return '朝のカフェ'
  }
}

function buildMockBlocks(
  sessionId: string,
  profile: UserProfileRow,
  minutes: BlockMinutes
): LessonBlock[] {
  const isDating = profile.enable_dating_contexts

  const conversationItems: LessonBlockItem[] = isDating
    ? [
        createItem(sessionId, 'conv', 1, 'Where should we meet?', 'How about in front of the station?'),
        createItem(sessionId, 'conv', 2, "What time works for you?", "Is 3 o'clock okay?"),
        createItem(sessionId, 'conv', 3, "I'm running a bit late.", "No problem. I'll wait."),
      ]
    : [
        createItem(sessionId, 'conv', 1, 'Greet and ask how they are.', "Hi! How are you doing today?"),
        createItem(sessionId, 'conv', 2, 'Order a drink.', "I'd like a coffee, please."),
        createItem(sessionId, 'conv', 3, 'Thank them and say goodbye.', "Thanks so much. Have a good one!"),
      ]

  const reviewItems: LessonBlockItem[] = isDating
    ? [
        createItem(sessionId, 'rev', 1, 'Where should we meet?', "How about the station?"),
        createItem(sessionId, 'rev', 2, "I'll be there in 10 minutes.", "See you soon!"),
      ]
    : [
        createItem(sessionId, 'rev', 1, "How are you doing today?", "I'm good, thanks!"),
        createItem(sessionId, 'rev', 2, "I'd like a coffee, please.", "Sure. For here or to go?"),
        createItem(sessionId, 'rev', 3, "Thanks so much. Have a good one!", "You too. Bye!"),
      ]

  const typingItems: LessonBlockItem[] = isDating
    ? [
        createItem(sessionId, 'typ', 1, "How about in front of the station?", "How about in front of the station?"),
        createItem(sessionId, 'typ', 2, "I'll be there in 10 minutes.", "I'll be there in 10 minutes."),
      ]
    : [
        createItem(sessionId, 'typ', 1, "I'd like a coffee, please.", "I'd like a coffee, please."),
        createItem(sessionId, 'typ', 2, "Can I get that to go?", "Can I get that to go?"),
        createItem(sessionId, 'typ', 3, "Thank you. Have a nice day.", "Thank you. Have a nice day."),
      ]

  return [
    createBlock(
      sessionId,
      'conversation',
      '会話',
      'AIと短い会話をします。日常のやりとりを自然に練習しましょう。',
      minutes.conversation,
      conversationItems
    ),
    createBlock(
      sessionId,
      'review',
      '復習',
      '会話で使ったキーフレーズを復習します。',
      minutes.review,
      reviewItems
    ),
    createBlock(
      sessionId,
      'typing',
      'タイピング',
      'フレーズを入力して、スペルと定着を確認します。',
      minutes.typing,
      typingItems
    ),
  ]
}

/**
 * Generates a mock lesson session from the user profile.
 * MVP: no DB; returns one session with conversation, review, and typing blocks.
 * totalEstimatedMinutes equals the sum of all block estimatedMinutes.
 * Content is daily-life oriented for Japanese speakers learning English.
 */
export function generateLessonSession(profile: UserProfileRow): LessonSession {
  const id = crypto.randomUUID()
  const minutes = getBlockMinutes(profile.preferred_session_length)
  const blocks = buildMockBlocks(id, profile, minutes)
  const totalEstimatedMinutes = blocks.reduce((sum, b) => sum + b.estimatedMinutes, 0)

  return {
    id,
    theme: getTheme(profile),
    level: profile.current_level,
    totalEstimatedMinutes,
    blocks,
  }
}
