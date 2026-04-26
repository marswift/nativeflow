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
    yes:       ["Oh, nice.", "Good to hear.", "Great.", "That's good.", "Perfect.", "Wonderful.", "Love that."],
    no:        ["No problem.", "Fair enough.", "That's fine.", "No worries.", "All good.", "That's okay.", "Totally fine."],
    object:    ["Sounds good.", "Interesting.", "Oh, that one.", "Ah, I know.", "That's a good pick.", "Classic.", "Love it."],
    person:    ["That's nice.", "Sounds fun.", "Lucky.", "Oh, with them.", "That's sweet.", "Aw, nice.", "All by yourself?"],
    time:      ["Oh, around then.", "Not too bad.", "That works.", "Solid timing.", "Sounds about right.", "Smart.", "Early bird."],
    frequency: ["That often?", "Oh, really?", "Consistent.", "Wow.", "Impressive.", "Ha, nice.", "Every single time?"],
    feeling:   ["I feel you.", "Makes sense.", "Yeah, same.", "Totally.", "That's real.", "Relatable.", "For real."],
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
