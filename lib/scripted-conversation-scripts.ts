/**
 * Scripted Conversation Scripts — deterministic dialogue data.
 *
 * Each script defines the exact turn order, questions, expected answer types,
 * repair prompts, and closing line. The engine executes these without LLM
 * involvement in the conversation structure.
 */

import type { ScriptMeaningType } from './scripted-conversation-engine'

// ── Types ──

export type ScriptedTurn = {
  /** Unique turn ID within this script */
  id: string
  /** The AI question for this turn */
  aiQuestion: string
  /** Repair prompt when user answer is unclear or wrong type (shown once max) */
  repairPrompt: string
  /** Which meaning types count as a valid answer for this turn */
  expectedTypes: ScriptMeaningType[]
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
      expectedTypes: ['yes', 'no', 'social', 'frequency'],
    },
    {
      id: 'cleanup',
      aiQuestion: 'Do you clean up after breakfast?',
      repairPrompt: 'After eating, do you clean up?',
      expectedTypes: ['yes', 'no', 'frequency'],
    },
    {
      id: 'dishes',
      aiQuestion: 'Do you wash the dishes too?',
      repairPrompt: 'Do you wash dishes after eating?',
      expectedTypes: ['yes', 'no', 'frequency'],
    },
    {
      id: 'people',
      aiQuestion: 'Do you usually clean up alone or with someone?',
      repairPrompt: 'By yourself, or does someone help?',
      expectedTypes: ['person'],
    },
    {
      id: 'timing',
      aiQuestion: 'Do you clean up right after eating?',
      repairPrompt: 'Do you do it right away, or later?',
      expectedTypes: ['yes', 'no', 'time', 'frequency'],
    },
  ],
  closingLine: 'Nice work today. See you next time!',
}

// ── Script registry ──

export const ALL_SCRIPTS: ConversationScript[] = [
  SCRIPT_BREAKFAST_CLEANUP_BEGINNER,
]
