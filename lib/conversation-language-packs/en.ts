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

  // Acknowledgment pool — mirrors current ACKS in ai-conversation-prompt.ts
  acks: [
    'Got it.',
    'I see.',
    'Okay.',
    'Right.',
    'Sure.',
  ],

  // Reaction pools — mirrors current REACTION_BY_MEANING
  reactions: {
    yes:       ["That's good.", "Sounds like it.", "Good to hear.", "Makes sense.", "I see, nice."],
    no:        ["No problem.", "Fair enough.", "That's fine.", "No worries.", "All good."],
    object:    ["Sounds good.", "Interesting.", "Good to know.", "That helps.", "Oh, nice."],
    person:    ["That's nice.", "Thanks for sharing.", "Good to know.", "Sounds good.", "That's helpful."],
    time:      ["Good to know.", "Oh, around that time.", "That helps.", "Makes sense.", "Sounds about right."],
    frequency: ["That often?", "Sounds about right.", "Good to know.", "I get that.", "Interesting."],
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
