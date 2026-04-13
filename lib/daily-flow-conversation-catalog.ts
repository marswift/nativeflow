/**
 * Daily Flow Conversation Catalog
 *
 * Key-based lookup: sceneId + region + ageGroup + level
 * Used by conversation-resolver.ts for safe fallback resolution.
 */

export type ConversationVariant = {
  aiQuestionText: string
  typingVariations: string[]
  aiConversationOpener: string
  coreChunks: {
    chunk: string
    meaning: string
  }[]

  /**
   * Optional emotional / cultural flavor layer.
   * Not shown in UI yet. Used for future prompt generation and personalization.
   */
  flavor?: {
    topics?: string[]
    references?: string[]
    cultureNotes?: string[]
    /** Where this conversation typically happens (e.g. 'coffee shop', 'pub', 'park'). */
    setting?: string
    /** What people in this context typically care about or talk about. */
    lifestyle?: string[]
  } | null
}

type CatalogKey = string

const makeKey = (
  sceneId: string,
  region: string,
  ageGroup: string,
  level: string
): CatalogKey => {
  return `${sceneId}__${region}__${ageGroup}__${level}`
}

export const DAILY_FLOW_CONVERSATION_CATALOG: Record<CatalogKey, ConversationVariant> = {
  // wake_up — en_us_general — 20s — beginner
  [makeKey('wake_up', 'en_us_general', '20s', 'beginner')]: {
    aiQuestionText: 'Did you sleep well?',
    typingVariations: [
      'I woke up early today.',
      'I woke up a little late.',
      'I need coffee this morning.',
    ],
    aiConversationOpener: 'Good morning. How are you feeling today?',
    coreChunks: [
      { chunk: 'wake up', meaning: '目が覚める' },
      { chunk: 'get up', meaning: '起きる' },
      { chunk: 'this morning', meaning: '今朝' },
    ],
  },

  // wake_up — en_us_general — 40s — beginner
  [makeKey('wake_up', 'en_us_general', '40s', 'beginner')]: {
    aiQuestionText: 'How is your morning going so far?',
    typingVariations: [
      'I need to wake the kids up.',
      'It is already a busy morning.',
      'I did not sleep enough.',
    ],
    aiConversationOpener: 'Morning. Busy with the family already?',
    coreChunks: [
      { chunk: 'wake the kids up', meaning: '子どもを起こす' },
      { chunk: 'busy morning', meaning: '忙しい朝' },
      { chunk: 'not sleep enough', meaning: '寝不足だ' },
    ],
  },

  // wake_up — en_us_general — 30s — beginner
  [makeKey('wake_up', 'en_us_general', '30s', 'beginner')]: {
    aiQuestionText: 'How is your morning going?',
    typingVariations: [
      'I need to get ready for work.',
      'I have a meeting this morning.',
      "I'm a bit rushed today.",
    ],
    aiConversationOpener: 'Morning. Busy day ahead?',
    coreChunks: [
      { chunk: 'get ready', meaning: '準備する' },
      { chunk: 'have a meeting', meaning: '会議がある' },
      { chunk: 'busy day', meaning: '忙しい日' },
    ],
  },

  // wake_up — en_gb_general — 20s — beginner
  [makeKey('wake_up', 'en_gb_general', '20s', 'beginner')]: {
    aiQuestionText: 'Did you sleep well?',
    typingVariations: [
      'I woke up early today.',
      'I woke up a bit late.',
      'I need some tea this morning.',
    ],
    aiConversationOpener: 'Morning. How are you feeling?',
    coreChunks: [
      { chunk: 'wake up', meaning: '目が覚める' },
      { chunk: 'get up', meaning: '起きる' },
      { chunk: 'this morning', meaning: '今朝' },
    ],
  },

  // eat_breakfast — en_us_general — 20s — beginner
  [makeKey('eat_breakfast', 'en_us_general', '20s', 'beginner')]: {
    aiQuestionText: 'What do you usually eat for breakfast?',
    typingVariations: [
      'I usually eat toast.',
      'I had eggs this morning.',
      'I skipped breakfast today.',
    ],
    aiConversationOpener: 'What did you have for breakfast today?',
    coreChunks: [
      { chunk: 'eat breakfast', meaning: '朝ごはんを食べる' },
      { chunk: 'usually', meaning: 'いつもは' },
      { chunk: 'this morning', meaning: '今朝' },
    ],
  },

  // eat_breakfast — en_us_general — 40s — beginner
  [makeKey('eat_breakfast', 'en_us_general', '40s', 'beginner')]: {
    aiQuestionText: 'Did you get to eat breakfast with your family?',
    typingVariations: [
      'I made breakfast for everyone.',
      'I ate with my family this morning.',
      'I only had a quick bite.',
    ],
    aiConversationOpener: 'Did everyone get breakfast this morning?',
    coreChunks: [
      { chunk: 'make breakfast', meaning: '朝食を作る' },
      { chunk: 'with my family', meaning: '家族と一緒に' },
      { chunk: 'a quick bite', meaning: '軽くひと口' },
    ],
  },

  // eat_breakfast — en_us_general — 50plus — beginner
  [makeKey('eat_breakfast', 'en_us_general', '50plus', 'beginner')]: {
    aiQuestionText: 'What did you have for breakfast this morning?',
    typingVariations: [
      'I had toast and coffee.',
      'I took my time this morning.',
      'I tried a new recipe.',
    ],
    aiConversationOpener: 'Did you enjoy your breakfast this morning?',
    coreChunks: [
      { chunk: 'take my time', meaning: 'ゆっくりする' },
      { chunk: 'this morning', meaning: '今朝' },
      { chunk: 'try something new', meaning: '新しいことを試す' },
    ],
    flavor: {
      setting: 'quiet kitchen table or sunny balcony with coffee',
      topics: ['morning routine', 'health', 'trying new foods'],
      lifestyle: ['slow mornings', 'reading the news while eating', 'cooking for pleasure', 'enjoying quiet time'],
      references: ['morning news', 'health magazines', 'farmers market ingredients'],
      cultureNotes: ['breakfast is enjoyed, not rushed', 'mornings are a valued part of the day'],
    },
  },

  // eat_breakfast — en_us_general — 30s — beginner
  [makeKey('eat_breakfast', 'en_us_general', '30s', 'beginner')]: {
    aiQuestionText: 'Did you have time for breakfast?',
    typingVariations: [
      'I grabbed something quick.',
      'I skipped breakfast.',
      'I ate on the way to work.',
    ],
    aiConversationOpener: 'Did you manage to eat this morning?',
    coreChunks: [
      { chunk: 'grab something', meaning: '軽く食べる' },
      { chunk: 'on the way', meaning: '途中で' },
      { chunk: 'skip breakfast', meaning: '朝食を抜く' },
    ],
  },

  // eat_breakfast — en_gb_general — 20s — beginner
  [makeKey('eat_breakfast', 'en_gb_general', '20s', 'beginner')]: {
    aiQuestionText: 'What do you usually have for breakfast?',
    typingVariations: [
      'I usually have toast.',
      'I had eggs this morning.',
      'I skipped breakfast today.',
    ],
    aiConversationOpener: 'What did you have for breakfast?',
    coreChunks: [
      { chunk: 'have breakfast', meaning: '朝ごはんを食べる' },
      { chunk: 'usually', meaning: 'いつもは' },
      { chunk: 'this morning', meaning: '今朝' },
    ],
  },

  // eat_breakfast — en_au_general — 20s — beginner
  [makeKey('eat_breakfast', 'en_au_general', '20s', 'beginner')]: {
    aiQuestionText: 'What did you have for brekkie?',
    typingVariations: [
      'I had some Vegemite toast.',
      'Just a flat white this morning.',
      'I grabbed a smoothie on the way.',
    ],
    aiConversationOpener: 'Did you have brekkie this morning?',
    coreChunks: [
      { chunk: 'have brekkie', meaning: '朝ごはんを食べる' },
      { chunk: 'flat white', meaning: 'フラットホワイト（コーヒー）' },
      { chunk: 'on the way', meaning: '途中で' },
    ],
    flavor: {
      setting: 'kitchen counter or local cafe with outdoor seating',
      topics: ['brekkie habits', 'coffee culture', 'quick mornings'],
      lifestyle: ['flat white is essential', 'Vegemite on toast is a staple', 'smoothie bowls on weekends', 'eating outside when sunny'],
      references: ['flat white', 'Vegemite', 'acai bowl', 'local cafe'],
      cultureNotes: ['brekkie is the standard word for breakfast', 'cafe culture is huge in Australia'],
    },
  },

  // leave_home — en_us_general — 30s — beginner
  [makeKey('leave_home', 'en_us_general', '30s', 'beginner')]: {
    aiQuestionText: 'Are you heading to work now?',
    typingVariations: [
      'I need to leave soon.',
      'I have a meeting this morning.',
      'Traffic might be bad today.',
    ],
    aiConversationOpener: 'Are you leaving for work?',
    coreChunks: [
      { chunk: 'leave soon', meaning: 'すぐ出る' },
      { chunk: 'traffic', meaning: '交通状況' },
      { chunk: 'be bad', meaning: '悪い状態だ' },
    ],
  },

  // leave_home — en_us_general — 40s — beginner
  [makeKey('leave_home', 'en_us_general', '40s', 'beginner')]: {
    aiQuestionText: 'Are you taking the kids out now?',
    typingVariations: [
      'I am taking them to school.',
      'We are running a bit late.',
      'Mornings are always busy.',
    ],
    aiConversationOpener: 'Heading out with the kids?',
    coreChunks: [
      { chunk: 'take to school', meaning: '学校に送る' },
      { chunk: 'run late', meaning: '遅れ気味だ' },
      { chunk: 'busy morning', meaning: '忙しい朝' },
    ],
  },

  // leave_home — en_us_general — 50plus — beginner
  [makeKey('leave_home', 'en_us_general', '50plus', 'beginner')]: {
    aiQuestionText: 'Where are you heading today?',
    typingVariations: [
      'I am going to my English class.',
      'I am meeting a friend for coffee.',
      'I am just going for a walk.',
    ],
    aiConversationOpener: 'Any plans for today?',
    coreChunks: [
      { chunk: 'go to class', meaning: '教室に行く' },
      { chunk: 'meet a friend', meaning: '友達に会う' },
      { chunk: 'go for a walk', meaning: '散歩に行く' },
    ],
    flavor: {
      setting: 'front door, calm departure with no rush',
      topics: ['daily plans', 'classes', 'hobbies', 'errands'],
      lifestyle: ['flexible schedule', 'walking instead of driving', 'attending classes for fun', 'slow start to the day'],
      references: ['community center', 'language school', 'neighborhood walk'],
      cultureNotes: ['leaving home is intentional not rushed', 'daily plans are chosen not imposed'],
    },
  },

  // leave_home — en_gb_general — 20s — beginner
  [makeKey('leave_home', 'en_gb_general', '20s', 'beginner')]: {
    aiQuestionText: 'What time do you leave home?',
    typingVariations: [
      "I'm heading out now.",
      "I'll catch the tube.",
      "I'm running a bit late.",
    ],
    aiConversationOpener: 'Are you heading out now?',
    coreChunks: [
      { chunk: 'leave home', meaning: '家を出る' },
      { chunk: 'catch the tube', meaning: '地下鉄に乗る' },
      { chunk: 'be late', meaning: '遅れる' },
    ],
  },

  // leave_home — en_au_general — 20s — beginner
  [makeKey('leave_home', 'en_au_general', '20s', 'beginner')]: {
    aiQuestionText: 'What time do you head off in the morning?',
    typingVariations: [
      "I'm heading off now.",
      "I'll grab the bus.",
      "It's a nice day to walk.",
    ],
    aiConversationOpener: 'Are you heading off?',
    coreChunks: [
      { chunk: 'head off', meaning: '出発する' },
      { chunk: 'grab the bus', meaning: 'バスに乗る' },
      { chunk: 'nice day', meaning: 'いい天気' },
    ],
    flavor: {
      setting: 'front door or driveway on a sunny morning',
      topics: ['commute', 'weather', 'transport'],
      lifestyle: ['walking or biking when sunny', 'checking the weather first', 'light layers year-round', 'casual drive to work'],
      references: ['Opal card', 'ute', 'morning surf before work'],
      cultureNotes: ['weather affects plans more than in other regions', '"head off" is more common than "leave"'],
    },
  },

  // leave_home — en_us_general — 20s — beginner
  [makeKey('leave_home', 'en_us_general', '20s', 'beginner')]: {
    aiQuestionText: 'What time do you leave home?',
    typingVariations: [
      'I leave home at 8.',
      "I'm running late today.",
      'I need to hurry.',
    ],
    aiConversationOpener: 'Are you heading out now?',
    coreChunks: [
      { chunk: 'leave home', meaning: '家を出る' },
      { chunk: 'be late', meaning: '遅れる' },
      { chunk: 'hurry up', meaning: '急ぐ' },
    ],
  },

  // talk_with_friends — en_us_general — 20s — beginner
  [makeKey('talk_with_friends', 'en_us_general', '20s', 'beginner')]: {
    aiQuestionText: 'What are you doing this weekend?',
    typingVariations: [
      "I'm meeting friends.",
      "I'm just relaxing.",
      'I have no plans yet.',
    ],
    aiConversationOpener: "Hey, what's up?",
    coreChunks: [
      { chunk: 'hang out', meaning: '遊ぶ' },
      { chunk: 'this weekend', meaning: '今週末' },
      { chunk: 'no plans', meaning: '予定がない' },
    ],
    flavor: {
      setting: 'coffee shop or campus hangout spot',
      topics: ['weekend plans', 'friends', 'what to do tonight'],
      lifestyle: ['spontaneous plans', 'texting group chats', 'splitting rides'],
      references: ['Netflix', 'TikTok', 'new music drops'],
      cultureNotes: ['casual "wanna hang?" culture', 'last-minute plans are normal'],
    },
  },

  // talk_with_friends — en_us_general — 30s — beginner
  [makeKey('talk_with_friends', 'en_us_general', '30s', 'beginner')]: {
    aiQuestionText: 'Have you had time to catch up with friends lately?',
    typingVariations: [
      "I've been busy with work.",
      "It's hard to find time lately.",
      'Maybe we can meet this weekend.',
    ],
    aiConversationOpener: 'Hey, how have you been?',
    coreChunks: [
      { chunk: 'catch up', meaning: '近況を話す' },
      { chunk: 'find time', meaning: '時間を作る' },
      { chunk: 'this weekend', meaning: '今週末' },
    ],
    flavor: {
      topics: ['work-life balance', 'weekend plans', 'staying connected'],
      references: ['podcasts', 'news', 'coffee catch-up'],
      cultureNotes: ['busy adult life', 'less spontaneous scheduling'],
    },
  },

  // talk_with_friends — en_us_general — 40s — beginner
  [makeKey('talk_with_friends', 'en_us_general', '40s', 'beginner')]: {
    aiQuestionText: 'Have you talked with any friends recently?',
    typingVariations: [
      "We've both been really busy.",
      "It's hard to make time these days.",
      'We usually talk about family and work.',
    ],
    aiConversationOpener: "It feels like it's been a while.",
    coreChunks: [
      { chunk: 'make time', meaning: '時間を作る' },
      { chunk: 'these days', meaning: '最近は' },
      { chunk: 'family and work', meaning: '家族と仕事' },
    ],
    flavor: {
      setting: 'quick meetup at a cafe near home, after picking up the kids',
      topics: ['family', 'work', 'health', 'old friends'],
      lifestyle: ['juggling family and work', 'short catch-ups between errands', 'checking in by text more than meeting', 'too tired for late nights'],
      references: ['classic shows', 'older music', 'shared memories'],
      cultureNotes: ['nostalgic catch-up', 'responsibility-centered conversation', 'friendship maintained in small moments'],
    },
  },

  // talk_with_friends — en_us_general — 50plus — beginner
  [makeKey('talk_with_friends', 'en_us_general', '50plus', 'beginner')]: {
    aiQuestionText: 'Have you been in touch with anyone lately?',
    typingVariations: [
      'I met a friend for coffee.',
      "We talked about our travel plans.",
      "It's nice to have time for friends now.",
    ],
    aiConversationOpener: "It's good to take it easy and catch up, isn't it?",
    coreChunks: [
      { chunk: 'keep in touch', meaning: '連絡を取り合う' },
      { chunk: 'travel plans', meaning: '旅行の計画' },
      { chunk: 'have time for', meaning: '〜の時間がある' },
    ],
    flavor: {
      setting: 'quiet cafe or park bench on a weekday morning',
      topics: ['travel', 'personal growth', 'learning English abroad', 'second chapter in life'],
      lifestyle: ['unhurried mornings', 'coffee meetups with old friends', 'planning trips', 'taking classes for fun', 'walking for exercise'],
      references: ['travel shows', 'documentaries', 'coffee catch-ups', 'old favorite songs', 'local culture events'],
      cultureNotes: ['calm reflective conversation', 'post-childrearing freedom', 'studying for overseas stay or personal fulfillment'],
    },
  },

  // talk_with_friends — en_gb_general — 20s — beginner
  [makeKey('talk_with_friends', 'en_gb_general', '20s', 'beginner')]: {
    aiQuestionText: 'What are you doing this weekend?',
    typingVariations: [
      "I'm meeting some friends.",
      'Fancy grabbing a pint?',
      "I've got no plans yet.",
    ],
    aiConversationOpener: 'Hey, you alright?',
    coreChunks: [
      { chunk: 'grab a pint', meaning: 'ビールを飲みに行く' },
      { chunk: 'this weekend', meaning: '今週末' },
      { chunk: 'no plans', meaning: '予定がない' },
    ],
    flavor: {
      setting: 'local pub or high street cafe',
      topics: ['weekend plans', 'mates', 'the match this weekend'],
      lifestyle: ['pub after work', 'Sunday roast with family', 'queueing politely'],
      references: ['Premier League', 'pub quiz night', 'Nando\'s'],
      cultureNotes: ['"You alright?" is a greeting not a question', 'pub is a social hub not just drinking'],
    },
  },

  // talk_with_friends — en_au_general — 20s — beginner
  [makeKey('talk_with_friends', 'en_au_general', '20s', 'beginner')]: {
    aiQuestionText: 'What are you up to this weekend?',
    typingVariations: [
      "I'm catching up with some mates.",
      'Might head to the beach.',
      "I haven't decided yet.",
    ],
    aiConversationOpener: "Hey, how's it going?",
    coreChunks: [
      { chunk: 'catch up', meaning: '会って話す' },
      { chunk: 'head to the beach', meaning: 'ビーチに行く' },
      { chunk: 'this weekend', meaning: '今週末' },
    ],
    flavor: {
      setting: 'outdoor cafe or beach-side spot',
      topics: ['weekend plans', 'mates', 'the weather', 'surfing or swimming'],
      lifestyle: ['outdoor lifestyle', 'BBQ with mates', 'beach after work', 'casual dress code'],
      references: ['AFL', 'Bunnings sausage sizzle', 'flat white coffee'],
      cultureNotes: ['laid-back tone is standard', '"No worries" and "mate" are universal', 'outdoor social life year-round'],
    },
  },

  // go_to_bed — en_us_general — 30s — beginner
  [makeKey('go_to_bed', 'en_us_general', '30s', 'beginner')]: {
    aiQuestionText: 'Are you going to bed soon?',
    typingVariations: [
      'I have work early tomorrow.',
      'I need to get some rest.',
      'It was a long day.',
    ],
    aiConversationOpener: 'Long day today?',
    coreChunks: [
      { chunk: 'go to bed', meaning: '寝る' },
      { chunk: 'get some rest', meaning: '休む' },
      { chunk: 'long day', meaning: '長い一日' },
    ],
  },

  // go_to_bed — en_us_general — 40s — beginner
  [makeKey('go_to_bed', 'en_us_general', '40s', 'beginner')]: {
    aiQuestionText: 'Did everyone go to bed already?',
    typingVariations: [
      'The kids are finally asleep.',
      'I am exhausted.',
      'I need some quiet time.',
    ],
    aiConversationOpener: 'Did the kids go to bed?',
    coreChunks: [
      { chunk: 'fall asleep', meaning: '眠りにつく' },
      { chunk: 'be exhausted', meaning: 'へとへとだ' },
      { chunk: 'quiet time', meaning: '静かな時間' },
    ],
  },

  // go_to_bed — en_gb_general — 20s — beginner
  [makeKey('go_to_bed', 'en_gb_general', '20s', 'beginner')]: {
    aiQuestionText: 'What time do you go to bed?',
    typingVariations: [
      "I'm off to bed.",
      'I stayed up quite late.',
      "I'm really tired tonight.",
    ],
    aiConversationOpener: 'Are you off to bed?',
    coreChunks: [
      { chunk: 'go to bed', meaning: '寝る' },
      { chunk: 'stay up late', meaning: '夜更かしする' },
      { chunk: 'be tired', meaning: '疲れている' },
    ],
  },

  // go_to_bed — en_us_general — 20s — beginner
  [makeKey('go_to_bed', 'en_us_general', '20s', 'beginner')]: {
    aiQuestionText: 'What time do you go to bed?',
    typingVariations: [
      'I go to bed around 11.',
      'I stayed up late.',
      "I'm really tired.",
    ],
    aiConversationOpener: 'Are you going to bed soon?',
    coreChunks: [
      { chunk: 'go to bed', meaning: '寝る' },
      { chunk: 'stay up late', meaning: '夜更かしする' },
      { chunk: 'be tired', meaning: '疲れている' },
    ],
  },
}

export const buildCatalogKey = makeKey
