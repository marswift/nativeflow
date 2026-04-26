/**
 * Scene-specific question library for AI Conversation.
 *
 * Each scene provides natural, contextually appropriate question pools
 * per dimension. These replace generic template questions when a scene
 * is detected from the lesson phrase.
 *
 * Rules:
 * - Every question must sound like something a real person would say aloud
 * - No awkward template concatenation ("after breakfast after breakfast")
 * - No duplicate semantic intent within one dimension pool
 * - Short, spoken-English style
 */

import type { Dimension } from './ai-conversation-state'

// ── Types ──

export type SlotDefinition = {
  /** Keywords that count as a valid answer for this dimension */
  accept: Set<string>
  /** Deterministic repair prompts when the answer doesn't match the slot */
  repairTemplates: string[]
  /** Whether a bare yes/no is enough to fill this slot */
  acceptYesNo: boolean
}

export type SceneSlotSchema = Partial<Record<Exclude<Dimension, 'action'>, SlotDefinition>>

export type SceneQuestionSet = {
  /** Scene identifier for telemetry */
  id: string
  /** Keyword patterns to match lesson phrase (lowercase, no punctuation) */
  patterns: RegExp[]
  /** Explicit anchor question for this scene */
  anchorQuestion: string
  /** Dimension → question pool */
  dimensions: Partial<Record<Exclude<Dimension, 'action'>, string[]>>
  /** Preferred dimension ordering for this scene */
  dimensionOrder: Exclude<Dimension, 'action'>[]
  /** Scene-specific clarification prompts */
  clarificationPrompts: {
    fragment: string[]
    confusion: string[]
    garbled: string[]
  }
  /** Optional slot schema for semantic validation (V2.6) */
  slotSchema?: SceneSlotSchema
  /** Optional value-aware bridge templates per dimension. Use {value} placeholder. */
  bridgeTemplates?: Partial<Record<Exclude<Dimension, 'action'>, string[]>>
}

// ── Scene Question Libraries ──

const SCENE_LIBRARIES: SceneQuestionSet[] = [
  // ── wake_up: Morning wake-up / alarm / getting up ──
  {
    id: 'wake_up',
    patterns: [
      /wake up|get up|alarm|get out of bed|oversleep/,
      /time to wake|five more minutes/,
    ],
    anchorQuestion: 'What time do you usually wake up?',
    dimensions: {
      time: [
        'What time do you usually wake up?',
        'Do you wake up early or late?',
      ],
      object: [
        'Do you use an alarm?',
        'Do you check your phone first?',
      ],
      people: [
        'Does someone wake you up?',
        'Do you wake up by yourself?',
      ],
      frequency: [
        'Do you wake up at the same time every day?',
        'Is it harder on weekdays?',
      ],
      feeling: [
        'Are you a morning person?',
        'Is it hard to get up?',
      ],
      place: [
        'Do you get up right away or stay in bed?',
      ],
    },
    dimensionOrder: ['time', 'object', 'feeling', 'people', 'frequency', 'place'],
    clarificationPrompts: {
      fragment: ['Your alarm?', 'In the morning?'],
      confusion: ['No problem. What time do you usually wake up?'],
      garbled: ['I\'m not sure I understood. Do you wake up early?'],
    },
    slotSchema: {
      time: {
        accept: new Set(['morning', 'early', 'late', 'oclock', 'six', 'seven', 'eight', 'nine', 'ten', 'five', 'alarm', 'before', 'after', 'hour', 'half']),
        repairTemplates: ['What time do you usually wake up?', 'Is it early or late?'],
        acceptYesNo: true,
      },
      object: {
        accept: new Set(['alarm', 'phone', 'clock', 'snooze', 'app', 'music', 'light', 'curtain', 'coffee']),
        repairTemplates: ['Do you use an alarm?', 'What wakes you up?'],
        acceptYesNo: true,
      },
      people: {
        accept: new Set(['alone', 'myself', 'mom', 'mother', 'dad', 'father', 'family', 'wife', 'husband', 'partner', 'someone', 'nobody', 'cat', 'dog']),
        repairTemplates: ['Does someone wake you up?', 'Do you wake up by yourself?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'everyday', 'daily', 'weekday', 'weekend']),
        repairTemplates: ['Do you wake up at the same time every day?', 'Is it the same on weekends?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['hard', 'easy', 'tired', 'sleepy', 'fresh', 'hate', 'love', 'like', 'enjoy', 'difficult', 'fine', 'okay', 'good', 'bad', 'terrible']),
        repairTemplates: ['Is it hard to get up?', 'Are you a morning person?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['bed', 'bedroom', 'room', 'couch', 'sofa', 'floor']),
        repairTemplates: ['Do you get up right away or stay in bed?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      time: ['{value} — that\'s pretty early.', 'Oh, {value}. Not bad.', '{value} — got it.'],
      object: ['An {value} — makes sense.', 'Oh, {value}. Smart.', '{value} — that works.'],
      people: ['{value} wakes you up — nice.', 'Oh, {value}. That helps.', '{value} — got it.'],
      frequency: ['{value}? That\'s consistent.', 'Oh, {value}. Good habit.', '{value} — makes sense.'],
      feeling: ['{value} — I get that.', 'Oh, {value}. Same here sometimes.', '{value} — fair enough.'],
    },
  },

  // ── breakfast_cleanup: Cleaning up after breakfast ──
  // Must come BEFORE breakfast scene — more specific pattern
  {
    id: 'breakfast_cleanup',
    patterns: [
      /clean up after breakfast|wash dishes|do the dishes|clean up after/,
      /clean up|tidy up|put away/,
    ],
    anchorQuestion: 'Do you clean up after breakfast?',
    dimensions: {
      object: [
        'What do you clean first?',
        'Do you wash dishes too?',
      ],
      people: [
        'Do you clean up alone or with someone?',
        'Who helps you clean up?',
      ],
      frequency: [
        'Do you do it every day?',
        'Do you clean up right after eating?',
      ],
      time: [
        'How long does it take?',
        'Do you clean up before you leave?',
      ],
      feeling: [
        'Is it quick or hard?',
        'Do you enjoy it?',
      ],
      place: [
        'Do you do it in the kitchen?',
      ],
    },
    dimensionOrder: ['object', 'people', 'frequency', 'feeling', 'time', 'place'],
    clarificationPrompts: {
      fragment: ['The dishes?', 'Just you?'],
      confusion: ['No problem. Do you wash dishes after breakfast?'],
      garbled: ['I\'m not sure I understood. What do you clean first?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['dish', 'dishes', 'plate', 'plates', 'cup', 'cups', 'glass', 'glasses', 'bowl', 'bowls', 'table', 'kitchen', 'floor', 'sink', 'counter', 'trash', 'wipe', 'sweep', 'mop', 'wash', 'rinse', 'tidy', 'vacuum', 'dust', 'pan', 'pot', 'stove', 'spoon', 'fork', 'knife', 'chopstick', 'chopsticks']),
        repairTemplates: ['Sorry, what do you clean first?', 'I mean like dishes or the table — what do you start with?'],
        acceptYesNo: false,
      },
      people: {
        accept: new Set(['alone', 'myself', 'family', 'mom', 'mother', 'dad', 'father', 'brother', 'sister', 'husband', 'wife', 'friend', 'friends', 'kids', 'children', 'son', 'daughter', 'roommate', 'partner', 'together', 'someone', 'nobody', 'everyone']),
        repairTemplates: ['Do you clean by yourself or with someone?', 'Who helps you clean up?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'once', 'twice', 'everyday', 'daily', 'weekly', 'weekday', 'weekend']),
        repairTemplates: ['How often do you do it?', 'Is it every day or just sometimes?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['morning', 'afternoon', 'evening', 'night', 'early', 'late', 'minutes', 'hour', 'hours', 'minute', 'quick', 'fast', 'slow', 'long', 'right', 'after', 'before']),
        repairTemplates: ['How long does it take?', 'Do you do it right after eating?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'love', 'hate', 'boring', 'bored', 'easy', 'hard', 'fun', 'annoying', 'fine', 'okay', 'nice', 'bad', 'tired']),
        repairTemplates: ['Is it easy or hard?', 'Do you enjoy cleaning up?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['kitchen', 'room', 'bathroom', 'home', 'house', 'dining', 'living', 'inside', 'outside']),
        repairTemplates: ['Do you do it in the kitchen?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['The {value} first — that makes sense.', 'Oh, {value} first. Nice.', '{value} first — got it.'],
      people: ['With {value} — that\'s nice.', 'Oh, with {value}. Sounds good.', '{value} helps you. Nice.'],
      time: ['{value} sounds quick.', 'Oh, {value}. That\'s not long.', '{value} — got it.'],
      frequency: ['{value}? That\'s a good habit.', 'Oh, {value}. Nice routine.', '{value} sounds consistent.'],
      feeling: ['{value} — I understand.', 'Oh, {value}. I get that.', '{value}. Thanks for sharing.'],
    },
  },

  // ── breakfast: Eating breakfast / morning meal ──
  {
    id: 'breakfast',
    patterns: [
      /eat in the morning|morning meal|cereal|toast/,
      /eat breakfast|have breakfast|skip breakfast|breakfast/,
    ],
    anchorQuestion: 'Do you eat breakfast every day?',
    dimensions: {
      object: [
        'What do you usually eat?',
        'Do you have coffee or tea?',
      ],
      time: [
        'What time do you eat breakfast?',
        'Do you eat before work?',
      ],
      people: [
        'Do you eat alone or with your family?',
        'Who makes breakfast at your home?',
      ],
      place: [
        'Do you eat at home?',
        'Do you ever eat breakfast outside?',
      ],
      frequency: [
        'Do you eat breakfast every day?',
        'Do you ever skip breakfast?',
      ],
      feeling: [
        'What\'s your favorite breakfast?',
        'Do you enjoy cooking in the morning?',
      ],
    },
    dimensionOrder: ['object', 'time', 'people', 'frequency', 'feeling', 'place'],
    clarificationPrompts: {
      fragment: ['Toast?', 'With your family?'],
      confusion: ['No problem. What do you usually eat for breakfast?'],
      garbled: ['I\'m not sure I understood. Do you eat breakfast?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['rice', 'bread', 'toast', 'cereal', 'egg', 'eggs', 'fruit', 'yogurt', 'pancake', 'oatmeal', 'miso', 'soup', 'salad', 'sandwich', 'banana', 'apple', 'natto', 'fish', 'coffee', 'tea', 'milk', 'juice', 'water']),
        repairTemplates: ['What do you usually eat?', 'Like toast, cereal, or rice?'],
        acceptYesNo: false,
      },
      time: {
        accept: new Set(['morning', 'early', 'late', 'oclock', 'six', 'seven', 'eight', 'nine', 'before', 'after', 'hour', 'half', 'quick', 'fast']),
        repairTemplates: ['What time do you eat breakfast?', 'Is it early or late?'],
        acceptYesNo: true,
      },
      people: {
        accept: new Set(['alone', 'myself', 'family', 'mom', 'mother', 'dad', 'father', 'kids', 'children', 'husband', 'wife', 'partner', 'together', 'someone', 'nobody', 'everyone']),
        repairTemplates: ['Do you eat alone or with your family?', 'Who do you eat with?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['home', 'house', 'kitchen', 'table', 'dining', 'outside', 'cafe', 'work', 'office', 'car', 'train']),
        repairTemplates: ['Do you eat at home?', 'Where do you eat breakfast?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'everyday', 'daily', 'skip', 'weekday', 'weekend']),
        repairTemplates: ['Do you eat breakfast every day?', 'Do you ever skip it?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'love', 'hate', 'boring', 'fun', 'favorite', 'good', 'nice', 'delicious', 'yummy', 'okay', 'fine']),
        repairTemplates: ['What\'s your favorite breakfast?', 'Do you enjoy it?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} — that sounds good.', 'Oh, {value}. Yummy.', '{value} — nice choice.'],
      time: ['{value} — that\'s a good time.', 'Oh, {value}. Not too early.', '{value} — got it.'],
      people: ['With {value} — that\'s nice.', 'Oh, {value}. Sounds fun.', '{value} — that\'s good.'],
      frequency: ['{value}? Good to know.', 'Oh, {value}. I see.', '{value} — makes sense.'],
      feeling: ['{value} — I get that.', 'Oh, {value}. Same here.', '{value} — nice.'],
    },
  },

  // ── commute: Going to work/school ──
  {
    id: 'commute',
    patterns: [
      /commute|go to work|go to school|take the train|take the bus|drive to/,
      /leave home|leave the house|head out|heading out|on the way/,
      /running late|don't forget/,
    ],
    anchorQuestion: 'How do you get to work?',
    dimensions: {
      object: [
        'Do you take the train or drive?',
        'Do you listen to music on the way?',
      ],
      time: [
        'What time do you leave home?',
        'How long is your commute?',
      ],
      people: [
        'Do you go alone?',
        'Do you see the same people on the train?',
      ],
      frequency: [
        'Do you commute every day?',
        'Do you ever work from home?',
      ],
      feeling: [
        'Is your commute long?',
        'Do you enjoy the ride?',
      ],
      place: [
        'Where do you work?',
        'Is your office far from home?',
      ],
    },
    dimensionOrder: ['object', 'time', 'frequency', 'feeling', 'people', 'place'],
    clarificationPrompts: {
      fragment: ['By train?', 'Every day?'],
      confusion: ['No problem. How do you get to work?'],
      garbled: ['I\'m not sure I understood. Do you take the train?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['train', 'bus', 'car', 'bike', 'bicycle', 'walk', 'subway', 'taxi', 'scooter', 'motorcycle', 'drive', 'ride', 'music', 'podcast', 'book', 'phone', 'headphones']),
        repairTemplates: ['Do you take the train or drive?', 'How do you get there?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['morning', 'early', 'late', 'oclock', 'six', 'seven', 'eight', 'nine', 'minutes', 'hour', 'hours', 'half', 'long', 'short', 'quick', 'fast']),
        repairTemplates: ['What time do you leave home?', 'How long does it take?'],
        acceptYesNo: true,
      },
      people: {
        accept: new Set(['alone', 'myself', 'friend', 'friends', 'coworker', 'colleague', 'someone', 'nobody', 'together', 'partner', 'husband', 'wife']),
        repairTemplates: ['Do you go alone?', 'Do you commute with anyone?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'everyday', 'daily', 'weekday', 'weekend', 'remote', 'home']),
        repairTemplates: ['Do you commute every day?', 'Do you ever work from home?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'hate', 'boring', 'long', 'tiring', 'tired', 'relaxing', 'stressful', 'fine', 'okay', 'good', 'bad', 'crowded']),
        repairTemplates: ['Is your commute long?', 'Do you enjoy the ride?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['office', 'school', 'station', 'stop', 'home', 'city', 'downtown', 'suburb', 'far', 'near', 'close']),
        repairTemplates: ['Where do you work?', 'Is it far from home?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['The {value} — that\'s common.', 'Oh, {value}. Makes sense.', '{value} — got it.'],
      time: ['{value} — that\'s reasonable.', 'Oh, {value}. Not too bad.', '{value} — I see.'],
      people: ['{value} — that\'s nice.', 'Oh, with {value}. Sounds good.', '{value} — got it.'],
      frequency: ['{value}? That\'s steady.', 'Oh, {value}. I see.', '{value} — makes sense.'],
      feeling: ['{value} — I understand.', 'Oh, {value}. That\'s fair.', '{value} — I get that.'],
    },
  },

  // ── sleep: Going to bed / bedtime ──
  {
    id: 'sleep',
    patterns: [
      /go to bed|go to sleep|sleep|bedtime|good night|before bed|brush.*teeth.*bed/,
      /stay up late|can't sleep|fall asleep/,
    ],
    anchorQuestion: 'What time do you usually go to bed?',
    dimensions: {
      time: [
        'What time do you usually go to bed?',
        'Do you stay up late sometimes?',
      ],
      object: [
        'Do you read or watch something before bed?',
        'Do you check your phone in bed?',
      ],
      people: [
        'Do you say goodnight to someone?',
        'Does anyone in your family stay up late?',
      ],
      frequency: [
        'Do you go to bed at the same time every night?',
        'Do you ever stay up really late?',
      ],
      feeling: [
        'Do you fall asleep easily?',
        'Do you sleep well?',
      ],
      place: [
        'Do you have your own room?',
      ],
    },
    dimensionOrder: ['time', 'object', 'feeling', 'frequency', 'people', 'place'],
    clarificationPrompts: {
      fragment: ['Before bed?', 'Your phone?'],
      confusion: ['No problem. What time do you usually go to bed?'],
      garbled: ['I\'m not sure I understood. Do you go to bed early?'],
    },
    slotSchema: {
      time: {
        accept: new Set(['early', 'late', 'oclock', 'nine', 'ten', 'eleven', 'twelve', 'midnight', 'before', 'after', 'hour', 'half', 'night']),
        repairTemplates: ['What time do you usually go to bed?', 'Is it early or late?'],
        acceptYesNo: true,
      },
      object: {
        accept: new Set(['phone', 'book', 'tv', 'movie', 'show', 'video', 'game', 'music', 'podcast', 'read', 'watch', 'scroll', 'app']),
        repairTemplates: ['Do you read or watch something before bed?', 'What do you do before sleeping?'],
        acceptYesNo: true,
      },
      people: {
        accept: new Set(['alone', 'myself', 'family', 'mom', 'dad', 'kids', 'children', 'husband', 'wife', 'partner', 'pet', 'cat', 'dog', 'someone', 'nobody']),
        repairTemplates: ['Do you say goodnight to someone?', 'Do you sleep alone?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'everyday', 'daily', 'weekday', 'weekend']),
        repairTemplates: ['Do you go to bed at the same time every night?', 'Is it the same on weekends?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['easy', 'hard', 'difficult', 'tired', 'sleepy', 'well', 'bad', 'good', 'fast', 'slow', 'trouble', 'enjoy', 'like', 'hate', 'fine', 'okay', 'relaxed']),
        repairTemplates: ['Do you fall asleep easily?', 'Do you sleep well?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['bed', 'bedroom', 'room', 'couch', 'sofa', 'own']),
        repairTemplates: ['Do you have your own room?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      time: ['{value} — not too late.', 'Oh, {value}. That\'s reasonable.', '{value} — I see.'],
      object: ['{value} before bed — nice.', 'Oh, {value}. Relaxing.', '{value} — sounds cozy.'],
      people: ['{value} — that\'s sweet.', 'Oh, {value}. Nice.', '{value} — got it.'],
      frequency: ['{value}? That\'s consistent.', 'Oh, {value}. Good routine.', '{value} — makes sense.'],
      feeling: ['{value} — I understand.', 'Oh, {value}. Same sometimes.', '{value} — that\'s fair.'],
    },
  },

  // ── meet_friend: Meeting / talking with friends ──
  {
    id: 'meet_friend',
    patterns: [
      /friend|hang out|meet up|get together|catch up|talk with/,
      /play outside|played outside/,
    ],
    anchorQuestion: 'Do you meet up with friends often?',
    dimensions: {
      people: [
        'Who do you usually hang out with?',
        'Do you have a best friend?',
      ],
      frequency: [
        'How often do you see your friends?',
        'Do you meet up every week?',
      ],
      object: [
        'What do you usually do together?',
        'Do you play games or just talk?',
      ],
      place: [
        'Where do you usually meet?',
        'Do you go to a cafe or someone\'s house?',
      ],
      time: [
        'Do you usually meet on weekends?',
        'How long do you hang out?',
      ],
      feeling: [
        'Is it fun?',
        'Do you look forward to it?',
      ],
    },
    dimensionOrder: ['people', 'object', 'frequency', 'place', 'feeling', 'time'],
    clarificationPrompts: {
      fragment: ['Your friend?', 'On weekends?'],
      confusion: ['No problem. Do you see your friends often?'],
      garbled: ['I\'m not sure I understood. Do you meet up with friends?'],
    },
    slotSchema: {
      people: {
        accept: new Set(['friend', 'friends', 'best', 'classmate', 'neighbor', 'coworker', 'colleague', 'group', 'alone', 'myself', 'someone', 'nobody', 'everyone']),
        repairTemplates: ['Who do you usually hang out with?', 'Do you have a best friend?'],
        acceptYesNo: false,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'everyday', 'daily', 'weekly', 'weekend', 'once', 'twice']),
        repairTemplates: ['How often do you see your friends?', 'Is it every week?'],
        acceptYesNo: true,
      },
      object: {
        accept: new Set(['game', 'games', 'talk', 'chat', 'eat', 'drink', 'shop', 'walk', 'movie', 'play', 'sport', 'soccer', 'basketball', 'music', 'karaoke', 'study', 'cook', 'hang']),
        repairTemplates: ['What do you usually do together?', 'Do you play games or just talk?'],
        acceptYesNo: false,
      },
      place: {
        accept: new Set(['cafe', 'restaurant', 'park', 'house', 'home', 'school', 'mall', 'station', 'online', 'outside', 'inside', 'bar', 'gym']),
        repairTemplates: ['Where do you usually meet?', 'Do you meet at a cafe or at home?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['fun', 'enjoy', 'like', 'love', 'boring', 'exciting', 'happy', 'glad', 'look', 'forward', 'good', 'nice', 'great', 'okay', 'fine']),
        repairTemplates: ['Is it fun?', 'Do you look forward to it?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['weekend', 'weekday', 'saturday', 'sunday', 'evening', 'afternoon', 'night', 'morning', 'hour', 'hours', 'long', 'short']),
        repairTemplates: ['Do you usually meet on weekends?', 'How long do you hang out?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      people: ['{value} — sounds fun.', 'Oh, {value}. Nice.', 'With {value} — that\'s cool.'],
      object: ['{value} together — that\'s fun.', 'Oh, {value}. Nice choice.', '{value} — sounds good.'],
      frequency: ['{value}? That\'s nice.', 'Oh, {value}. Good for you.', '{value} — not bad.'],
      feeling: ['{value} — I bet.', 'Oh, {value}. That\'s great.', '{value} — makes sense.'],
      time: ['{value} — good timing.', 'Oh, {value}. Works well.', '{value} — got it.'],
    },
  },

  // ── restaurant: Ordering food / eating out ──
  {
    id: 'restaurant',
    patterns: [
      /restaurant|order|menu|eat out|grab lunch|grab dinner|what.*eat|feel like eating/,
      /pasta|sushi|pizza|check|bill|pay/,
    ],
    anchorQuestion: 'Do you eat out often?',
    dimensions: {
      object: [
        'What kind of food do you like?',
        'What did you order last time?',
      ],
      people: [
        'Do you eat out alone or with someone?',
        'Who do you usually go with?',
      ],
      frequency: [
        'How often do you eat out?',
        'Do you eat out every week?',
      ],
      place: [
        'Do you have a favorite restaurant?',
        'Is there a good place near you?',
      ],
      time: [
        'Do you usually go for lunch or dinner?',
        'When was the last time you ate out?',
      ],
      feeling: [
        'Do you enjoy trying new places?',
        'What\'s the best meal you\'ve had?',
      ],
    },
    dimensionOrder: ['object', 'frequency', 'people', 'place', 'feeling', 'time'],
    clarificationPrompts: {
      fragment: ['Pasta?', 'With someone?'],
      confusion: ['No problem. What kind of food do you like?'],
      garbled: ['I\'m not sure I understood. Do you eat out often?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['sushi', 'ramen', 'pasta', 'pizza', 'burger', 'curry', 'steak', 'salad', 'soup', 'rice', 'noodle', 'noodles', 'fish', 'meat', 'chicken', 'seafood', 'chinese', 'japanese', 'italian', 'mexican', 'thai', 'korean', 'indian', 'french', 'fast', 'food']),
        repairTemplates: ['What kind of food do you like?', 'Like sushi, pasta, or something else?'],
        acceptYesNo: false,
      },
      people: {
        accept: new Set(['alone', 'myself', 'friend', 'friends', 'family', 'mom', 'dad', 'husband', 'wife', 'partner', 'coworker', 'colleague', 'date', 'someone', 'nobody', 'together', 'group']),
        repairTemplates: ['Do you eat out alone or with someone?', 'Who do you usually go with?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'once', 'twice', 'weekly', 'everyday', 'weekend']),
        repairTemplates: ['How often do you eat out?', 'Is it once a week or more?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['restaurant', 'cafe', 'diner', 'bar', 'izakaya', 'food', 'court', 'mall', 'station', 'near', 'home', 'favorite', 'new', 'chain']),
        repairTemplates: ['Do you have a favorite restaurant?', 'Where do you usually go?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['lunch', 'dinner', 'morning', 'evening', 'night', 'afternoon', 'weekend', 'weekday', 'last', 'recently']),
        repairTemplates: ['Do you usually go for lunch or dinner?', 'When do you go?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'love', 'hate', 'fun', 'exciting', 'good', 'nice', 'great', 'delicious', 'yummy', 'best', 'favorite', 'okay', 'fine', 'boring']),
        repairTemplates: ['Do you enjoy trying new places?', 'Is it fun?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} — yummy.', 'Oh, {value}. Good choice.', '{value} — I like that too.'],
      people: ['With {value} — sounds nice.', 'Oh, {value}. That\'s fun.', '{value} — nice.'],
      frequency: ['{value}? Not bad.', 'Oh, {value}. Good to know.', '{value} — makes sense.'],
      feeling: ['{value} ��� I get that.', 'Oh, {value}. Same here.', '{value} — nice.'],
      time: ['{value} — good choice.', 'Oh, {value}. That works.', '{value} — got it.'],
    },
  },

  // ── shopping: Buying things / errands ──
  {
    id: 'shopping',
    patterns: [
      /shopping|buy|store|pick up|grocery|market|errand/,
      /need to get|need to buy|get some milk/,
    ],
    anchorQuestion: 'Do you go shopping often?',
    dimensions: {
      object: [
        'What do you usually buy?',
        'Do you make a shopping list?',
      ],
      frequency: [
        'How often do you go shopping?',
        'Do you go every week?',
      ],
      people: [
        'Do you go alone or with someone?',
        'Who usually does the shopping?',
      ],
      place: [
        'Where do you usually shop?',
        'Is there a store near your home?',
      ],
      time: [
        'Do you go in the morning or after work?',
        'When do you usually go?',
      ],
      feeling: [
        'Do you enjoy shopping?',
        'Is it fun or just a chore?',
      ],
    },
    dimensionOrder: ['object', 'frequency', 'place', 'people', 'feeling', 'time'],
    clarificationPrompts: {
      fragment: ['Groceries?', 'At the store?'],
      confusion: ['No problem. Do you go shopping often?'],
      garbled: ['I\'m not sure I understood. What do you usually buy?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['food', 'grocery', 'groceries', 'vegetable', 'vegetables', 'fruit', 'meat', 'milk', 'bread', 'snack', 'snacks', 'clothes', 'shoes', 'bag', 'book', 'drink', 'drinks', 'water', 'rice', 'egg', 'eggs', 'list']),
        repairTemplates: ['What do you usually buy?', 'Like food, clothes, or something else?'],
        acceptYesNo: false,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'once', 'twice', 'weekly', 'everyday', 'daily', 'weekend']),
        repairTemplates: ['How often do you go shopping?', 'Is it every week?'],
        acceptYesNo: true,
      },
      people: {
        accept: new Set(['alone', 'myself', 'family', 'mom', 'mother', 'dad', 'father', 'husband', 'wife', 'partner', 'friend', 'friends', 'someone', 'nobody', 'together', 'kids', 'children']),
        repairTemplates: ['Do you go alone or with someone?', 'Who does the shopping?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['supermarket', 'store', 'shop', 'market', 'mall', 'convenience', 'online', 'amazon', 'near', 'home', 'station', 'downtown']),
        repairTemplates: ['Where do you usually shop?', 'Is there a store near home?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['morning', 'afternoon', 'evening', 'night', 'weekend', 'weekday', 'after', 'before', 'work', 'early', 'late']),
        repairTemplates: ['Do you go in the morning or after work?', 'When do you usually go?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'love', 'hate', 'fun', 'boring', 'chore', 'tiring', 'tired', 'relaxing', 'good', 'fine', 'okay', 'stressful']),
        repairTemplates: ['Do you enjoy shopping?', 'Is it fun or just a chore?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} — useful.', 'Oh, {value}. Makes sense.', '{value} — got it.'],
      frequency: ['{value}? That\'s regular.', 'Oh, {value}. Good rhythm.', '{value} — I see.'],
      people: ['With {value} — that\'s nice.', 'Oh, {value}. Sounds good.', '{value} — got it.'],
      feeling: ['{value} — I get that.', 'Oh, {value}. Fair enough.', '{value} — makes sense.'],
      time: ['{value} — good timing.', 'Oh, {value}. That works.', '{value} — I see.'],
    },
  },

  // ── small_talk: Weekend / hobbies / general chat ──
  {
    id: 'small_talk',
    patterns: [
      /weekend|hobby|free time|day off|relax|watch tv|read|exercise/,
      /what.*do.*weekend|how.*weekend|what.*do.*free/,
    ],
    anchorQuestion: 'What do you do on weekends?',
    dimensions: {
      object: [
        'What do you usually do?',
        'Do you watch TV or go out?',
      ],
      time: [
        'Do you wake up late on weekends?',
        'Do you do something Saturday and Sunday?',
      ],
      people: [
        'Do you spend weekends alone or with someone?',
        'Do you see your friends on weekends?',
      ],
      frequency: [
        'Do you do the same thing every weekend?',
        'How often do you go out?',
      ],
      place: [
        'Do you usually stay home?',
        'Where do you like to go?',
      ],
      feeling: [
        'Do you enjoy your weekends?',
        'Is your weekend relaxing?',
      ],
    },
    dimensionOrder: ['object', 'people', 'time', 'feeling', 'place', 'frequency'],
    clarificationPrompts: {
      fragment: ['On weekends?', 'At home?'],
      confusion: ['No problem. What do you usually do on weekends?'],
      garbled: ['I\'m not sure I understood. What do you do for fun?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['tv', 'movie', 'movies', 'game', 'games', 'read', 'book', 'walk', 'run', 'exercise', 'gym', 'cook', 'clean', 'shop', 'shopping', 'sleep', 'relax', 'music', 'guitar', 'piano', 'draw', 'paint', 'garden', 'yoga', 'swim', 'hike', 'bike', 'netflix', 'youtube', 'video']),
        repairTemplates: ['What do you usually do?', 'Like watching TV, going out, or something else?'],
        acceptYesNo: false,
      },
      time: {
        accept: new Set(['morning', 'afternoon', 'evening', 'night', 'early', 'late', 'saturday', 'sunday', 'both', 'all', 'day', 'long']),
        repairTemplates: ['Do you wake up late on weekends?', 'Saturday and Sunday?'],
        acceptYesNo: true,
      },
      people: {
        accept: new Set(['alone', 'myself', 'family', 'friend', 'friends', 'husband', 'wife', 'partner', 'kids', 'children', 'someone', 'nobody', 'together', 'everyone']),
        repairTemplates: ['Do you spend weekends alone or with someone?', 'Do you see friends?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'every', 'same', 'different', 'weekly']),
        repairTemplates: ['Do you do the same thing every weekend?', 'How often do you go out?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['home', 'house', 'park', 'cafe', 'mall', 'gym', 'outside', 'inside', 'beach', 'mountain', 'city', 'downtown', 'library']),
        repairTemplates: ['Do you usually stay home?', 'Where do you like to go?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'love', 'hate', 'fun', 'relaxing', 'boring', 'exciting', 'good', 'nice', 'great', 'fine', 'okay', 'tired', 'lazy']),
        repairTemplates: ['Do you enjoy your weekends?', 'Is it relaxing?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} — that sounds fun.', 'Oh, {value}. Nice.', '{value} — good choice.'],
      people: ['With {value} — sounds great.', 'Oh, {value}. That\'s nice.', '{value} — fun.'],
      time: ['{value} — that\'s chill.', 'Oh, {value}. Relaxing.', '{value} — nice.'],
      feeling: ['{value} — I get that.', 'Oh, {value}. Makes sense.', '{value} — sounds right.'],
      frequency: ['{value}? That\'s a good pace.', 'Oh, {value}. I see.', '{value} — makes sense.'],
    },
  },

  // ── office_greeting: Work morning / coworker check-in ──
  {
    id: 'office',
    patterns: [
      /office|coworker|colleague|project|meeting|presentation|deadline/,
      /good morning.*work|how.*project|heading out.*work/,
    ],
    anchorQuestion: 'How is work going?',
    dimensions: {
      object: [
        'What are you working on?',
        'Do you have a big project right now?',
      ],
      people: [
        'Do you work with a team?',
        'Do you get along with your coworkers?',
      ],
      time: [
        'What time do you start work?',
        'Do you work late sometimes?',
      ],
      frequency: [
        'Do you have meetings every day?',
        'How often do you work from home?',
      ],
      feeling: [
        'Do you like your job?',
        'Is work busy right now?',
      ],
      place: [
        'Do you work in an office?',
        'Is your office close to home?',
      ],
    },
    dimensionOrder: ['object', 'people', 'feeling', 'time', 'frequency', 'place'],
    clarificationPrompts: {
      fragment: ['Your project?', 'At the office?'],
      confusion: ['No problem. What do you do at work?'],
      garbled: ['I\'m not sure I understood. How is work going?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['project', 'report', 'email', 'meeting', 'presentation', 'task', 'code', 'design', 'plan', 'document', 'client', 'deadline', 'product', 'system', 'data', 'budget']),
        repairTemplates: ['What are you working on?', 'Do you have a big project?'],
        acceptYesNo: true,
      },
      people: {
        accept: new Set(['alone', 'myself', 'team', 'boss', 'manager', 'coworker', 'coworkers', 'colleague', 'colleagues', 'client', 'partner', 'someone', 'nobody', 'together', 'group', 'everyone']),
        repairTemplates: ['Do you work with a team?', 'Who do you work with?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['morning', 'early', 'late', 'oclock', 'eight', 'nine', 'ten', 'overtime', 'hour', 'hours', 'evening', 'night', 'before', 'after', 'long']),
        repairTemplates: ['What time do you start work?', 'Do you work late sometimes?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'everyday', 'daily', 'weekly', 'remote', 'home']),
        repairTemplates: ['Do you have meetings every day?', 'How often do you work from home?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'love', 'hate', 'busy', 'stressful', 'fun', 'boring', 'tiring', 'tired', 'exciting', 'challenging', 'good', 'fine', 'okay', 'hard', 'easy', 'interesting']),
        repairTemplates: ['Do you like your job?', 'Is work busy right now?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['office', 'home', 'remote', 'building', 'room', 'desk', 'city', 'downtown', 'near', 'far', 'close']),
        repairTemplates: ['Do you work in an office?', 'Is it close to home?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} — sounds important.', 'Oh, {value}. Interesting.', '{value} — got it.'],
      people: ['With {value} — nice team.', 'Oh, {value}. Good to know.', '{value} — sounds good.'],
      feeling: ['{value} — I understand.', 'Oh, {value}. That\'s real.', '{value} — fair enough.'],
      time: ['{value} — that\'s reasonable.', 'Oh, {value}. Not bad.', '{value} — I see.'],
      frequency: ['{value}? That\'s steady.', 'Oh, {value}. Makes sense.', '{value} — got it.'],
    },
  },

  // ── family: Family conversation / homework / school ──
  {
    id: 'school',
    patterns: [
      /homework|school|study|class|teacher|test|exam/,
      /how.*school|finish.*homework|math|english/,
    ],
    anchorQuestion: 'How was school today?',
    dimensions: {
      object: [
        'What subject did you study?',
        'Do you have a lot of homework?',
      ],
      people: [
        'Who is your favorite teacher?',
        'Do you study with friends?',
      ],
      time: [
        'What time does school finish?',
        'How long do you study at home?',
      ],
      frequency: [
        'Do you get homework every day?',
        'How often do you have tests?',
      ],
      feeling: [
        'Do you like school?',
        'What\'s your favorite subject?',
      ],
      place: [
        'Do you study at home or at a library?',
      ],
    },
    dimensionOrder: ['object', 'feeling', 'people', 'time', 'frequency', 'place'],
    clarificationPrompts: {
      fragment: ['Math?', 'Your teacher?'],
      confusion: ['No problem. What subject do you like?'],
      garbled: ['I\'m not sure I understood. How was school?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['math', 'english', 'science', 'history', 'art', 'music', 'pe', 'gym', 'japanese', 'social', 'study', 'homework', 'test', 'exam', 'quiz', 'project', 'report', 'book', 'reading', 'writing']),
        repairTemplates: ['What subject did you study?', 'Like math, English, or something else?'],
        acceptYesNo: false,
      },
      people: {
        accept: new Set(['teacher', 'friend', 'friends', 'classmate', 'classmates', 'alone', 'myself', 'someone', 'nobody', 'together', 'group', 'partner', 'tutor']),
        repairTemplates: ['Who is your favorite teacher?', 'Do you study with friends?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['morning', 'afternoon', 'evening', 'night', 'early', 'late', 'oclock', 'three', 'four', 'five', 'hour', 'hours', 'minutes', 'long', 'short', 'after', 'before']),
        repairTemplates: ['What time does school finish?', 'How long do you study at home?'],
        acceptYesNo: true,
      },
      frequency: {
        accept: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'everyday', 'daily', 'weekly', 'once', 'twice']),
        repairTemplates: ['Do you get homework every day?', 'How often do you have tests?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'love', 'hate', 'fun', 'boring', 'hard', 'easy', 'difficult', 'interesting', 'favorite', 'good', 'fine', 'okay', 'tired', 'stressful']),
        repairTemplates: ['Do you like school?', 'What\'s your favorite subject?'],
        acceptYesNo: true,
      },
      place: {
        accept: new Set(['home', 'house', 'library', 'school', 'classroom', 'room', 'desk', 'cafe', 'outside']),
        repairTemplates: ['Do you study at home or at a library?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} — interesting subject.', 'Oh, {value}. Makes sense.', '{value} — got it.'],
      feeling: ['{value} — I get that.', 'Oh, {value}. Same for many people.', '{value} — fair enough.'],
      people: ['With {value} — that helps.', 'Oh, {value}. Nice.', '{value} — good to know.'],
      time: ['{value} — that\'s not bad.', 'Oh, {value}. Got it.', '{value} — I see.'],
      frequency: ['{value}? That\'s regular.', 'Oh, {value}. Makes sense.', '{value} — I see.'],
    },
  },

  // ── dinner: Making / eating dinner ──
  {
    id: 'dinner',
    patterns: [
      /make dinner|cook dinner|eat dinner|have dinner|dinner/,
      /evening meal|supper/,
    ],
    anchorQuestion: 'What do you usually have for dinner?',
    dimensions: {
      object: [
        'What do you usually cook?',
        'Do you have rice with dinner?',
      ],
      people: [
        'Do you eat with your family?',
        'Who cooks dinner at your home?',
      ],
      time: [
        'What time do you eat dinner?',
        'Is it early or late?',
      ],
      frequency: [
        'Do you cook every day?',
        'Do you ever eat out?',
      ],
      feeling: [
        'Do you enjoy cooking?',
        'What\'s your favorite dinner?',
      ],
    },
    dimensionOrder: ['object', 'people', 'time', 'feeling', 'frequency'],
    clarificationPrompts: {
      fragment: ['Rice?', 'With family?'],
      confusion: ['No problem. What do you usually eat for dinner?'],
      garbled: ['I\'m not sure I understood. Do you cook at home?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['rice', 'pasta', 'noodle', 'noodles', 'soup', 'curry', 'stew', 'salad', 'meat', 'fish', 'chicken', 'beef', 'pork', 'vegetable', 'vegetables', 'pizza', 'sushi', 'ramen', 'stir', 'fry']),
        repairTemplates: ['What do you usually cook?', 'Like rice, pasta, or something else?'],
        acceptYesNo: false,
      },
      people: {
        accept: new Set(['alone', 'myself', 'family', 'mom', 'mother', 'dad', 'father', 'husband', 'wife', 'partner', 'kids', 'children', 'together', 'someone', 'nobody', 'everyone']),
        repairTemplates: ['Do you eat with your family?', 'Who do you eat dinner with?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['early', 'late', 'six', 'seven', 'eight', 'nine', 'evening', 'night', 'after', 'before', 'oclock']),
        repairTemplates: ['What time do you eat dinner?', 'Is it early or late?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['enjoy', 'like', 'love', 'hate', 'boring', 'fun', 'favorite', 'good', 'nice', 'delicious', 'tired', 'relaxing']),
        repairTemplates: ['Do you enjoy cooking?', 'What\'s your favorite dinner?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} — sounds delicious.', 'Oh, {value}. Yummy.', '{value} — nice choice.'],
      people: ['With {value} — that\'s nice.', 'Oh, {value}. Sounds warm.', '{value} — that\'s good.'],
      time: ['{value} — that\'s a good time.', 'Oh, {value}. Not too late.', '{value} — got it.'],
      feeling: ['{value} — I get that.', 'Oh, {value}. Me too.', '{value} — nice.'],
    },
  },

  // ── bath: Taking a bath / shower ──
  {
    id: 'bath',
    patterns: [
      /take a bath|take a shower|bath time|have a bath|bathe/,
      /shower|soak in the tub/,
    ],
    anchorQuestion: 'Do you take a bath or a shower?',
    dimensions: {
      object: [
        'Bath or shower?',
        'Do you use any special soap?',
      ],
      time: [
        'Do you shower in the morning or at night?',
        'How long does it take?',
      ],
      feeling: [
        'Is it relaxing?',
        'Do you enjoy bath time?',
      ],
      frequency: [
        'Do you take a bath every day?',
        'How often do you soak in the tub?',
      ],
      people: [
        'Do you take a bath alone?',
      ],
    },
    dimensionOrder: ['object', 'time', 'feeling', 'frequency', 'people'],
    clarificationPrompts: {
      fragment: ['A bath?', 'In the evening?'],
      confusion: ['No problem. Do you take a bath or a shower?'],
      garbled: ['I\'m not sure I understood. Bath or shower?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['bath', 'shower', 'tub', 'soap', 'shampoo', 'hot', 'warm', 'cold', 'water', 'towel']),
        repairTemplates: ['Bath or shower?', 'Do you soak in the tub or just shower?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['morning', 'evening', 'night', 'before', 'after', 'minutes', 'hour', 'long', 'short', 'quick', 'fast']),
        repairTemplates: ['Morning or night?', 'How long does it take?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['relaxing', 'nice', 'good', 'love', 'like', 'enjoy', 'warm', 'refreshing', 'tired', 'sleepy', 'calm']),
        repairTemplates: ['Is it relaxing?', 'Do you enjoy it?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} — nice.', 'Oh, {value}. Sounds good.', '{value} — got it.'],
      time: ['{value} — good timing.', 'Oh, {value}. Makes sense.', '{value} — I see.'],
      feeling: ['{value} — sounds lovely.', 'Oh, {value}. That\'s nice.', '{value} — I get that.'],
    },
  },

  // ── go_home: Coming home / returning home ──
  {
    id: 'go_home',
    patterns: [
      /come home|get home|go home|return home|heading home|back home/,
      /arrive home|finally home/,
    ],
    anchorQuestion: 'What time do you usually get home?',
    dimensions: {
      time: [
        'What time do you usually get home?',
        'Is it early or late?',
      ],
      feeling: [
        'Are you tired when you get home?',
        'How do you feel when you get home?',
      ],
      object: [
        'What\'s the first thing you do when you get home?',
        'Do you change clothes?',
      ],
      people: [
        'Is someone home when you arrive?',
        'Does anyone greet you?',
      ],
    },
    dimensionOrder: ['time', 'feeling', 'object', 'people'],
    clarificationPrompts: {
      fragment: ['After work?', 'By train?'],
      confusion: ['No problem. What time do you usually get home?'],
      garbled: ['I\'m not sure I understood. When do you get home?'],
    },
    slotSchema: {
      time: {
        accept: new Set(['early', 'late', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'evening', 'night', 'afternoon', 'before', 'after', 'oclock']),
        repairTemplates: ['What time do you get home?', 'Is it early or late?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['tired', 'exhausted', 'happy', 'relieved', 'hungry', 'relaxed', 'good', 'fine', 'okay', 'sleepy', 'stressed']),
        repairTemplates: ['Are you tired when you get home?', 'How do you feel?'],
        acceptYesNo: true,
      },
      object: {
        accept: new Set(['clothes', 'change', 'shower', 'bath', 'tv', 'phone', 'cook', 'eat', 'rest', 'sit', 'relax', 'coffee', 'tea', 'water', 'snack']),
        repairTemplates: ['What do you do first when you get home?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      time: ['{value} — not too bad.', 'Oh, {value}. Got it.', '{value} — I see.'],
      feeling: ['{value} — I get that.', 'Oh, {value}. Hang in there.', '{value} — makes sense.'],
      object: ['{value} first — nice.', 'Oh, {value}. Sounds good.', '{value} — got it.'],
    },
  },

  // ── arrive_work: Arriving at work / office ──
  {
    id: 'arrive_work',
    patterns: [
      /arrive at work|get to work|arrive at the office|get to the office/,
      /arrive at school|start work|clock in/,
    ],
    anchorQuestion: 'What do you do first when you arrive at work?',
    dimensions: {
      object: [
        'What do you do first at work?',
        'Do you check your email first?',
      ],
      time: [
        'What time do you start?',
        'Do you arrive early?',
      ],
      people: [
        'Do you greet your coworkers?',
        'Who do you talk to first?',
      ],
      feeling: [
        'How do you feel in the morning at work?',
        'Is the start of work stressful?',
      ],
      frequency: [
        'Is your schedule the same every day?',
        'Do you have morning meetings?',
      ],
    },
    dimensionOrder: ['object', 'time', 'people', 'feeling', 'frequency'],
    clarificationPrompts: {
      fragment: ['Email?', 'Coffee first?'],
      confusion: ['No problem. What do you usually do first at work?'],
      garbled: ['I\'m not sure I understood. What time do you start work?'],
    },
    slotSchema: {
      object: {
        accept: new Set(['email', 'computer', 'coffee', 'tea', 'meeting', 'desk', 'phone', 'task', 'tasks', 'check', 'review', 'report', 'schedule']),
        repairTemplates: ['What do you do first at work?', 'Like checking email or having coffee?'],
        acceptYesNo: true,
      },
      time: {
        accept: new Set(['early', 'late', 'eight', 'nine', 'seven', 'ten', 'morning', 'before', 'after', 'oclock']),
        repairTemplates: ['What time do you start?', 'Is it early?'],
        acceptYesNo: true,
      },
      people: {
        accept: new Set(['coworker', 'coworkers', 'boss', 'manager', 'colleague', 'colleagues', 'team', 'alone', 'nobody', 'everyone', 'someone']),
        repairTemplates: ['Do you greet your coworkers?', 'Who do you talk to first?'],
        acceptYesNo: true,
      },
      feeling: {
        accept: new Set(['tired', 'stressed', 'busy', 'happy', 'fine', 'okay', 'good', 'motivated', 'sleepy', 'energized', 'calm']),
        repairTemplates: ['How do you feel in the morning at work?'],
        acceptYesNo: true,
      },
    },
    bridgeTemplates: {
      object: ['{value} first — makes sense.', 'Oh, {value}. Good start.', '{value} — that\'s typical.'],
      time: ['{value} — not bad.', 'Oh, {value}. Got it.', '{value} — I see.'],
      people: ['{value} — nice.', 'Oh, {value}. Sounds friendly.', '{value} — good to know.'],
      feeling: ['{value} — I get that.', 'Oh, {value}. Hang in there.', '{value} — fair enough.'],
    },
  },
]

// ── Scene matching ──

/**
 * Detect the best matching scene question set for a given lesson phrase.
 * Returns null if no scene matches — the engine should fall back to generic templates.
 */
export function matchSceneQuestions(lessonPhrase: string): SceneQuestionSet | null {
  const lower = lessonPhrase.trim().toLowerCase().replace(/[.!?]+$/, '')

  for (const scene of SCENE_LIBRARIES) {
    if (scene.patterns.some((p) => p.test(lower))) {
      return scene
    }
  }

  return null
}
