/**
 * Scripted Conversation Scripts — deterministic dialogue data.
 *
 * Each script defines the exact turn order, questions, repair prompts,
 * and closing line. The engine executes these without LLM involvement
 * in the conversation structure.
 */

// ── Types ──

export type ScriptedTurn = {
  /** Unique turn ID within this script */
  id: string
  /** The AI question for this turn */
  aiQuestion: string
  /** Repair prompt when user answer is unclear (shown once max) */
  repairPrompt: string
}

export type ConversationScript = {
  /** Unique script identifier */
  id: string
  /** Scene this script belongs to */
  sceneId: string
  /** Learner level */
  level: 'beginner' | 'intermediate' | 'advanced'
  /** Opening AI message (before first user turn) */
  opener: string
  /** Ordered list of turns */
  turns: ScriptedTurn[]
  /** Closing line — only spoken after final turn */
  closingLine: string
}

// ── Pilot Script: breakfast_cleanup / beginner ──

export const SCRIPT_BREAKFAST_CLEANUP_BEGINNER: ConversationScript = {
  id: 'breakfast_cleanup_beginner_v1',
  sceneId: 'breakfast_cleanup',
  level: 'beginner',
  opener: 'Hi! How are you today?',
  turns: [
    {
      id: 'breakfast',
      aiQuestion: 'Glad to hear that. Did you have breakfast today?',
      repairPrompt: 'Did you eat breakfast this morning?',
    },
    {
      id: 'cleanup',
      aiQuestion: 'Do you clean up after breakfast?',
      repairPrompt: 'After eating, do you clean up?',
    },
    {
      id: 'dishes',
      aiQuestion: 'Do you wash the dishes too?',
      repairPrompt: 'Do you wash dishes after eating?',
    },
    {
      id: 'people',
      aiQuestion: 'Do you usually clean up alone or with someone?',
      repairPrompt: 'By yourself, or does someone help?',
    },
    {
      id: 'timing',
      aiQuestion: 'Do you clean up right after eating?',
      repairPrompt: 'Do you do it right away, or later?',
    },
  ],
  closingLine: 'Nice work today. See you next time!',
}

// ── Script registry ──

export const ALL_SCRIPTS: ConversationScript[] = [
  SCRIPT_BREAKFAST_CLEANUP_BEGINNER,
]
