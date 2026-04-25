/**
 * Korean Conversation Language Pack
 *
 * Phase 4 skeleton — not connected to runtime assembly yet.
 * Templates are beginner-friendly casual Korean (반말/존댓말 mix).
 */

import type { ConversationLanguagePack } from './index'

export const koreanConversationLanguagePack: ConversationLanguagePack = {
  code: 'ko',

  reciprocalGreeting: [
    '나도 좋아, 고마워!',
    '잘 지내, 고마워!',
    '나도 잘 지내!',
  ],
  greeting: [
    '안녕!',
    '안녕하세요!',
    '반가워!',
  ],
  thanks: [
    '천만에.',
    '아니야, 괜찮아.',
    '별말씀을.',
  ],
  apology: [
    '괜찮아!',
    '아니야, 괜찮아.',
    '문제없어.',
  ],
  farewell: [
    '또 봐!',
    '다음에 봐!',
    '잘 가!',
  ],
  confusion: [
    '괜찮아. 쉽게 다시 해보자.',
    '걱정 마. 천천히 가자.',
    '괜찮아. 한 번 더 해볼까?',
  ],
  continuation: [
    '좋아.',
    '그래.',
    '알겠어.',
  ],

  acks: [
    '알겠어.',
    '그렇구나.',
    '응.',
    '그래.',
    '좋아.',
  ],

  reactions: {
    yes:       ['좋아.', '그렇구나.', '잘했어.', '그래, 좋아.', '응, 알겠어.'],
    no:        ['괜찮아.', '그럴 수 있어.', '알겠어.', '그래도 괜찮아.', '문제없어.'],
    object:    ['좋은데.', '재미있다.', '알겠어.', '도움이 돼.', '오, 좋다.'],
    person:    ['좋다.', '고마워.', '알겠어.', '좋은데.', '도움이 돼.'],
    time:      ['알겠어.', '오, 그때.', '도움이 돼.', '그렇구나.', '맞아.'],
    frequency: ['그렇게 자주?', '맞는 것 같아.', '알겠어.', '이해해.', '재미있다.'],
    feeling:   ['이해해.', '그렇구나.', '고마워.', '알겠어.', '맞아.'],
  },

  softPrompt: '더 이야기해 줘.',

  wrap: [
    '이야기 재미있었어. 다음에 또 봐!',
    '좋았어. 좋은 하루 ��내!',
    '알겠어, 다음에 봐!',
  ],
}
