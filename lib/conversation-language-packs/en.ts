/**
 * English Conversation Language Pack
 *
 * Templates mirror the current stable inline constants in ai-conversation-prompt.ts.
 * When Phase 3 integration connects this to assembleReplyV25, these templates
 * will replace the inline ACKS, REACTION_BY_MEANING, and wrap pools.
 */

import type { ConversationLanguagePack } from './index'

export const englishConversationLanguagePack: ConversationLanguagePack = {
  code: 'en',

  // Social reply templates
  reciprocalGreeting: [
    "I'm good too, thanks!",
    "Doing well, thanks!",
    "I'm great, thanks for asking!",
  ],
  greeting: [
    "Hey!",
    "Hi there!",
    "Hello!",
  ],
  thanks: [
    "You're welcome!",
    "No problem!",
    "Anytime!",
  ],
  apology: [
    "No worries!",
    "That's okay!",
    "No problem at all.",
  ],
  farewell: [
    "See you later!",
    "Bye!",
    "Take care!",
  ],
  confusion: [
    "No worries. Let's keep it simple.",
    "That's okay. Let me try again.",
    "No problem. Let's take it step by step.",
  ],
  continuation: [
    "Sure.",
    "Of course.",
    "Go ahead.",
  ],

  // Acknowledgment pool — 10 items for better variety across turns
  acks: [
    'Got it.',
    'I see.',
    'Okay.',
    'Right.',
    'Sure.',
    'Nice.',
    'Alright.',
    'Ah.',
    'Oh.',
    'Mm-hm.',
  ],

  // Reaction pools — warm, varied, beginner-friendly
  reactions: {
    yes:       ["That's good.", "Good to hear.", "Great.", "Sounds like it.", "Oh, nice.", "Good.", "Cool."],
    no:        ["No problem.", "Fair enough.", "That's fine.", "No worries.", "All good.", "That's okay.", "Got it, no worries."],
    object:    ["Sounds good.", "Interesting.", "Good to know.", "Oh, nice.", "That helps.", "Ah, got it.", "Cool."],
    person:    ["That's nice.", "Sounds fun.", "Good to know.", "Oh, with them.", "That's sweet.", "Nice.", "All by yourself?"],
    time:      ["Good to know.", "Oh, around then.", "That helps.", "Not bad.", "Sounds about right.", "Makes sense.", "Early bird."],
    frequency: ["That often?", "Sounds about right.", "Good to know.", "Wow.", "Interesting.", "Oh, really?", "That's consistent."],
    feeling:   ["I get that.", "Makes sense.", "Thanks for sharing.", "I understand.", "That's fair."],
  },

  // Soft prompt for comment-only turns
  softPrompt: 'Tell me more.',

  // Wrap/closing templates — mirrors current wrapPrompts
  wrap: [
    'Nice talking with you. See you later!',
    'Sounds good. Have a good day!',
    'Alright, see you next time!',
  ],
}
