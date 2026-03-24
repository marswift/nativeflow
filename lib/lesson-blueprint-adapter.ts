/**
 * Adapter: converts the Hybrid-C lesson blueprint into a draft shape
 * that the current lesson system can consume.
 *
 * Pure logic only; no React, Supabase, or OpenAI.
 *
 * Design goals:
 * - Scene goals are internal English keys.
 * - UI labels are resolved by uiLanguage.
 * - Prompt / answer quality depends on learner level.
 * - Beginner stays short/simple.
 * - Advanced must not collapse into trivial one-line utterances.
 * - Conversation / typing should always have a usable English answer seed
 *   so audio generation and repeat scoring can work reliably.
 */

import type { CurrentLevel } from './constants'
import type {
  LessonBlueprint,
  LessonBlueprintBlock,
  LessonBlueprintBlockType,
} from './lesson-blueprint-service'

export type LessonBlueprintDraftItem = {
  prompt: string
  answer: string | null
}

export type LessonBlueprintDraftBlock = {
  type: LessonBlueprintBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonBlueprintDraftItem[]
}

export type LessonBlueprintDraft = {
  theme: string
  blocks: LessonBlueprintDraftBlock[]
}

type LevelBucket = 'beginner' | 'intermediate' | 'advanced'

type SceneContent = {
  beginner: {
    conversationAnswer: string
    typingAnswer: string
    reviewPrompt: string
    aiConversationPrompt: string
  }
  intermediate: {
    conversationAnswer: string
    typingAnswer: string
    reviewPrompt: string
    aiConversationPrompt: string
  }
  advanced: {
    conversationAnswer: string
    typingAnswer: string
    reviewPrompt: string
    aiConversationPrompt: string
  }
}

function normalizeGoal(goal: string): string {
  return goal || 'wake_up'
}

function getLevelBucket(level: CurrentLevel): LevelBucket {
  if (level === 'advanced') return 'advanced'
  if (level === 'intermediate') return 'intermediate'
  return 'beginner'
}

function titleizeSceneKey(sceneKey: string): string {
  return sceneKey
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function mapSceneKeyToDisplayLabel(
  sceneKey: string,
  uiLanguage: string
): string {
  const labels: Record<string, Record<string, string>> = {
    wake_up: { ja: '起床', en: 'Wake Up', ko: '기상', es: 'Despertarse' },
    alarm_clock: { ja: '目覚まし', en: 'Alarm Clock', ko: '알람', es: 'Despertador' },
    make_bed: { ja: '布団をたたむ', en: 'Make the Bed', ko: '침대 정리', es: 'Hacer la cama' },
    wash_face: { ja: '洗顔', en: 'Wash Face', ko: '세수', es: 'Lavarse la cara' },
    brush_teeth: { ja: '歯磨き', en: 'Brush Teeth', ko: '양치', es: 'Cepillarse los dientes' },
    take_a_shower: { ja: 'シャワー', en: 'Take a Shower', ko: '샤워하기', es: 'Ducharse' },
    get_dressed: { ja: '着替え', en: 'Get Dressed', ko: '옷 갈아입기', es: 'Vestirse' },
    make_breakfast: { ja: '朝食を作る', en: 'Make Breakfast', ko: '아침 만들기', es: 'Preparar el desayuno' },
    eat_breakfast: { ja: '朝食を食べる', en: 'Eat Breakfast', ko: '아침 먹기', es: 'Desayunar' },
    clean_up_after_breakfast: { ja: '朝食の片付け', en: 'Clean Up After Breakfast', ko: '아침 정리', es: 'Recoger después del desayuno' },
    morning_grooming: { ja: '身だしなみ', en: 'Morning Grooming', ko: '몸단장', es: 'Arreglarse' },
    get_ready_to_leave: { ja: '出発準備', en: 'Get Ready to Leave', ko: '외출 준비', es: 'Prepararse para salir' },
    take_out_the_garbage: { ja: 'ゴミ出し', en: 'Take Out the Garbage', ko: '쓰레기 버리기', es: 'Sacar la basura' },
    walk_to_station: { ja: '駅まで歩く', en: 'Walk to the Station', ko: '역까지 걷기', es: 'Caminar a la estación' },
    ride_a_bike: { ja: '自転車移動', en: 'Ride a Bike', ko: '자전거 타기', es: 'Ir en bicicleta' },
    take_the_train: { ja: '電車移動', en: 'Take the Train', ko: '기차 타기', es: 'Tomar el tren' },
    take_the_bus: { ja: 'バス移動', en: 'Take the Bus', ko: '버스 타기', es: 'Tomar el autobús' },
    wait_for_the_bus: { ja: 'バス待ち', en: 'Wait for the Bus', ko: '버스 기다리기', es: 'Esperar el autobús' },
    transfer_trains: { ja: '乗り換え', en: 'Transfer Trains', ko: '환승', es: 'Hacer transbordo' },
    arrive_at_work: { ja: '出勤', en: 'Arrive at Work', ko: '출근', es: 'Llegar al trabajo' },
    greet_coworkers: { ja: '職場の挨拶', en: 'Greet Coworkers', ko: '직장 인사', es: 'Saludar a compañeros' },
    school_attendance: { ja: '出席・授業', en: 'Attend Class', ko: '수업 출석', es: 'Asistir a clase' },
    talk_with_friends: { ja: '友人との会話', en: 'Talk with Friends', ko: '친구와 대화', es: 'Hablar con amigos' },
    go_to_a_convenience_store: { ja: 'コンビニ', en: 'Convenience Store', ko: '편의점', es: 'Tienda de conveniencia' },
    shop_at_the_supermarket: { ja: 'スーパー', en: 'Supermarket', ko: '슈퍼마켓', es: 'Supermercado' },
    go_to_a_drugstore: { ja: 'ドラッグストア', en: 'Drugstore', ko: '드러그스토어', es: 'Farmacia / droguería' },
    use_an_atm: { ja: 'ATM', en: 'Use an ATM', ko: 'ATM 사용', es: 'Usar un cajero' },
    go_to_the_post_office: { ja: '郵便局', en: 'Post Office', ko: '우체국', es: 'Oficina de correos' },
    go_to_a_hospital: { ja: '病院', en: 'Hospital', ko: '병원', es: 'Hospital' },
    go_to_a_pharmacy: { ja: '薬局', en: 'Pharmacy', ko: '약국', es: 'Farmacia' },
    come_home: { ja: '帰宅', en: 'Come Home', ko: '귀가', es: 'Volver a casa' },
    make_dinner: { ja: '夕食を作る', en: 'Make Dinner', ko: '저녁 만들기', es: 'Preparar la cena' },
    eat_dinner: { ja: '夕食を食べる', en: 'Eat Dinner', ko: '저녁 먹기', es: 'Cenar' },
    wash_the_dishes: { ja: '食器洗い', en: 'Wash the Dishes', ko: '설거지', es: 'Lavar los platos' },
    do_the_laundry: { ja: '洗濯', en: 'Do the Laundry', ko: '빨래하기', es: 'Lavar la ropa' },
    take_a_bath: { ja: '入浴', en: 'Take a Bath', ko: '목욕하기', es: 'Bañarse' },
    sort_the_garbage: { ja: 'ゴミ分別', en: 'Sort the Garbage', ko: '분리수거', es: 'Separar la basura' },
    watch_videos: { ja: '動画を見る', en: 'Watch Videos', ko: '영상 보기', es: 'Ver videos' },
    play_games: { ja: 'ゲーム', en: 'Play Games', ko: '게임하기', es: 'Jugar videojuegos' },
    go_for_a_walk: { ja: '散歩', en: 'Go for a Walk', ko: '산책', es: 'Salir a caminar' },
    read_a_book: { ja: '読書', en: 'Read a Book', ko: '독서', es: 'Leer un libro' },
    prepare_for_tomorrow: { ja: '翌日の準備', en: 'Prepare for Tomorrow', ko: '내일 준비', es: 'Prepararse para mañana' },
    write_a_diary: { ja: '日記', en: 'Write a Diary', ko: '일기 쓰기', es: 'Escribir un diario' },
    go_to_bed: { ja: '就寝', en: 'Go to Bed', ko: '잠자기', es: 'Ir a dormir' },
    hotel_checkin: { ja: 'ホテルのチェックイン', en: 'Hotel Check-in', ko: '호텔 체크인', es: 'Check-in del hotel' },
    career_consultation: { ja: 'キャリア相談', en: 'Career Consultation', ko: '진로 상담', es: 'Consulta de carrera' },
  }

  return labels[sceneKey]?.[uiLanguage] ?? labels[sceneKey]?.en ?? titleizeSceneKey(sceneKey)
}

function createDraftItem(
  prompt: string,
  answer: string | null
): LessonBlueprintDraftItem {
  return { prompt, answer }
}

const SCENE_CONTENT: Record<string, SceneContent> = {
  wake_up: {
    beginner: {
      conversationAnswer: 'I just woke up.',
      typingAnswer: 'I just woke up.',
      reviewPrompt: 'Review the basic wake-up phrase for this scene.',
      aiConversationPrompt: 'Tell the AI what time you usually wake up.',
    },
    intermediate: {
      conversationAnswer: 'I just woke up, and I need to get ready for the day.',
      typingAnswer: 'I need to get ready for the day.',
      reviewPrompt: 'Review how to describe your morning start in simple English.',
      aiConversationPrompt: 'Tell the AI about your usual morning routine after you wake up.',
    },
    advanced: {
      conversationAnswer: 'I just woke up, but I am still a little tired because I went to bed late last night.',
      typingAnswer: 'I am still a little tired because I went to bed late last night.',
      reviewPrompt: 'Review how to explain your condition and reason after waking up.',
      aiConversationPrompt: 'Explain to the AI how your sleep affects the rest of your morning.',
    },
  },
  wash_face: {
    beginner: {
      conversationAnswer: 'I wash my face every morning.',
      typingAnswer: 'I wash my face every morning.',
      reviewPrompt: 'Review a simple daily self-care sentence.',
      aiConversationPrompt: 'Tell the AI what you do after washing your face.',
    },
    intermediate: {
      conversationAnswer: 'I wash my face with cold water to help myself wake up.',
      typingAnswer: 'I wash my face with cold water.',
      reviewPrompt: 'Review how to explain a small habit and its purpose.',
      aiConversationPrompt: 'Tell the AI about your morning self-care routine.',
    },
    advanced: {
      conversationAnswer: 'I wash my face with cold water because it helps me feel refreshed and ready to focus.',
      typingAnswer: 'It helps me feel refreshed and ready to focus.',
      reviewPrompt: 'Review how to connect a routine with its effect in natural English.',
      aiConversationPrompt: 'Discuss with the AI how small morning habits affect your mood and productivity.',
    },
  },
  brush_teeth: {
    beginner: {
      conversationAnswer: 'I brush my teeth after breakfast.',
      typingAnswer: 'I brush my teeth after breakfast.',
      reviewPrompt: 'Review a simple hygiene sentence.',
      aiConversationPrompt: 'Tell the AI when you usually brush your teeth.',
    },
    intermediate: {
      conversationAnswer: 'I brush my teeth carefully after breakfast before I leave home.',
      typingAnswer: 'I brush my teeth before I leave home.',
      reviewPrompt: 'Review how to describe order and timing in a routine.',
      aiConversationPrompt: 'Describe your morning routine in order to the AI.',
    },
    advanced: {
      conversationAnswer: 'I always brush my teeth before leaving home because I want to feel clean and prepared for the day.',
      typingAnswer: 'I want to feel clean and prepared for the day.',
      reviewPrompt: 'Review how to explain a daily action with intention and feeling.',
      aiConversationPrompt: 'Explain to the AI why small routines help you feel more confident during the day.',
    },
  },
  take_a_shower: {
    beginner: {
      conversationAnswer: 'I take a shower in the morning.',
      typingAnswer: 'I take a shower in the morning.',
      reviewPrompt: 'Review a basic sentence about your morning shower.',
      aiConversationPrompt: 'Tell the AI whether you shower in the morning or at night.',
    },
    intermediate: {
      conversationAnswer: 'I take a quick shower in the morning before getting dressed.',
      typingAnswer: 'I take a quick shower before getting dressed.',
      reviewPrompt: 'Review how to describe order in your routine.',
      aiConversationPrompt: 'Tell the AI how long your usual shower takes and why.',
    },
    advanced: {
      conversationAnswer: 'I usually take a quick shower in the morning because it helps me feel more alert and ready to leave the house.',
      typingAnswer: 'It helps me feel more alert and ready to leave the house.',
      reviewPrompt: 'Review how to connect a daily action with its practical effect.',
      aiConversationPrompt: 'Discuss with the AI how your morning routine changes on busy days.',
    },
  },
  get_dressed: {
    beginner: {
      conversationAnswer: 'I get dressed before I go out.',
      typingAnswer: 'I get dressed before I go out.',
      reviewPrompt: 'Review a simple sentence about getting ready.',
      aiConversationPrompt: 'Tell the AI what you usually wear on weekdays.',
    },
    intermediate: {
      conversationAnswer: 'I get dressed quickly because I do not want to miss my train.',
      typingAnswer: 'I do not want to miss my train.',
      reviewPrompt: 'Review how to explain a reason in a short sentence.',
      aiConversationPrompt: 'Tell the AI how you choose your clothes for work or school.',
    },
    advanced: {
      conversationAnswer: 'I try to get dressed efficiently in the morning so I can leave on time without feeling rushed.',
      typingAnswer: 'I try to leave on time without feeling rushed.',
      reviewPrompt: 'Review how to describe efficiency and emotional state in a routine.',
      aiConversationPrompt: 'Explain to the AI how your clothes affect your confidence or mood during the day.',
    },
  },
  make_breakfast: {
    beginner: {
      conversationAnswer: 'I make breakfast every morning.',
      typingAnswer: 'I make breakfast every morning.',
      reviewPrompt: 'Review a simple breakfast sentence.',
      aiConversationPrompt: 'Tell the AI what you usually make for breakfast.',
    },
    intermediate: {
      conversationAnswer: 'I make a simple breakfast when I have enough time in the morning.',
      typingAnswer: 'I make a simple breakfast when I have time.',
      reviewPrompt: 'Review how to talk about routine and condition.',
      aiConversationPrompt: 'Tell the AI what breakfast you make on busy mornings and relaxed mornings.',
    },
    advanced: {
      conversationAnswer: 'I try to make a simple but healthy breakfast so that I can start the day with enough energy.',
      typingAnswer: 'I want to start the day with enough energy.',
      reviewPrompt: 'Review how to express purpose and healthy habits naturally.',
      aiConversationPrompt: 'Discuss with the AI how your breakfast choices affect your concentration later in the day.',
    },
  },
  take_the_train: {
    beginner: {
      conversationAnswer: 'I take the train to work.',
      typingAnswer: 'I take the train to work.',
      reviewPrompt: 'Review a simple commuting sentence.',
      aiConversationPrompt: 'Tell the AI how you usually commute.',
    },
    intermediate: {
      conversationAnswer: 'I take the train to work, and I usually change trains once.',
      typingAnswer: 'I usually change trains once.',
      reviewPrompt: 'Review how to describe a commute with one extra detail.',
      aiConversationPrompt: 'Tell the AI what your commute is usually like.',
    },
    advanced: {
      conversationAnswer: 'I take the train to work every day, and I usually use that time to check my schedule and prepare mentally.',
      typingAnswer: 'I use that time to check my schedule and prepare mentally.',
      reviewPrompt: 'Review how to add purpose and reflection to a daily commute.',
      aiConversationPrompt: 'Explain to the AI how commuting affects your energy, focus, or schedule.',
    },
  },
  greet_coworkers: {
    beginner: {
      conversationAnswer: 'I say good morning to my coworkers.',
      typingAnswer: 'I say good morning to my coworkers.',
      reviewPrompt: 'Review a basic workplace greeting sentence.',
      aiConversationPrompt: 'Tell the AI how you greet people at work or school.',
    },
    intermediate: {
      conversationAnswer: 'I always say good morning to my coworkers when I arrive at the office.',
      typingAnswer: 'I say good morning when I arrive at the office.',
      reviewPrompt: 'Review how to describe a routine social action at work.',
      aiConversationPrompt: 'Tell the AI why greetings matter in your workplace or school.',
    },
    advanced: {
      conversationAnswer: 'I make a point of greeting my coworkers every morning because it helps create a friendly and cooperative atmosphere.',
      typingAnswer: 'It helps create a friendly and cooperative atmosphere.',
      reviewPrompt: 'Review how to explain social purpose in a workplace routine.',
      aiConversationPrompt: 'Discuss with the AI how small communication habits influence teamwork.',
    },
  },
  shop_at_the_supermarket: {
    beginner: {
      conversationAnswer: 'I go to the supermarket after work.',
      typingAnswer: 'I go to the supermarket after work.',
      reviewPrompt: 'Review a simple shopping sentence.',
      aiConversationPrompt: 'Tell the AI what you usually buy at the supermarket.',
    },
    intermediate: {
      conversationAnswer: 'I stop by the supermarket after work to buy ingredients for dinner.',
      typingAnswer: 'I buy ingredients for dinner after work.',
      reviewPrompt: 'Review how to describe shopping purpose naturally.',
      aiConversationPrompt: 'Tell the AI what you usually cook after shopping.',
    },
    advanced: {
      conversationAnswer: 'I often stop by the supermarket after work so I can buy fresh ingredients and prepare dinner at home.',
      typingAnswer: 'I buy fresh ingredients and prepare dinner at home.',
      reviewPrompt: 'Review how to connect shopping, planning, and home life in one sentence.',
      aiConversationPrompt: 'Explain to the AI how you decide what to buy and cook on weekdays.',
    },
  },
  go_to_a_convenience_store: {
    beginner: {
      conversationAnswer: 'I went to the convenience store.',
      typingAnswer: 'I went to the convenience store.',
      reviewPrompt: 'Review a simple errand sentence.',
      aiConversationPrompt: 'Tell the AI what you usually buy at a convenience store.',
    },
    intermediate: {
      conversationAnswer: 'I went to the convenience store to buy a drink and a quick snack.',
      typingAnswer: 'I bought a drink and a quick snack.',
      reviewPrompt: 'Review how to talk about a short errand with details.',
      aiConversationPrompt: 'Tell the AI when convenience stores are useful in your daily life.',
    },
    advanced: {
      conversationAnswer: 'I dropped by the convenience store because I needed a quick snack and did not have time to cook anything.',
      typingAnswer: 'I did not have time to cook anything.',
      reviewPrompt: 'Review how to explain the reason behind a quick decision.',
      aiConversationPrompt: 'Discuss with the AI how convenience and health sometimes conflict in daily life.',
    },
  },
  come_home: {
    beginner: {
      conversationAnswer: 'I came home in the evening.',
      typingAnswer: 'I came home in the evening.',
      reviewPrompt: 'Review a simple sentence about coming home.',
      aiConversationPrompt: 'Tell the AI what you usually do when you get home.',
    },
    intermediate: {
      conversationAnswer: 'I came home in the evening and took a short break before dinner.',
      typingAnswer: 'I took a short break before dinner.',
      reviewPrompt: 'Review how to connect two evening actions in one sentence.',
      aiConversationPrompt: 'Describe your usual evening routine after coming home.',
    },
    advanced: {
      conversationAnswer: 'When I came home in the evening, I took a short break so I could reset before starting my chores.',
      typingAnswer: 'I took a short break so I could reset.',
      reviewPrompt: 'Review how to describe transition and purpose in your evening routine.',
      aiConversationPrompt: 'Explain to the AI how you shift mentally from work or school mode to home mode.',
    },
  },
  make_dinner: {
    beginner: {
      conversationAnswer: 'I make dinner at home.',
      typingAnswer: 'I make dinner at home.',
      reviewPrompt: 'Review a basic dinner sentence.',
      aiConversationPrompt: 'Tell the AI what you usually cook for dinner.',
    },
    intermediate: {
      conversationAnswer: 'I make dinner at home because it is cheaper and healthier.',
      typingAnswer: 'It is cheaper and healthier to cook at home.',
      reviewPrompt: 'Review how to give a simple opinion with reasons.',
      aiConversationPrompt: 'Tell the AI what kind of dinner is easy for you to make on weekdays.',
    },
    advanced: {
      conversationAnswer: 'I usually make dinner at home because cooking for myself is both more affordable and easier to control nutritionally.',
      typingAnswer: 'Cooking at home is more affordable and easier to control nutritionally.',
      reviewPrompt: 'Review how to compare benefits in a natural spoken sentence.',
      aiConversationPrompt: 'Discuss with the AI how your dinner habits affect your health, budget, or schedule.',
    },
  },
  do_the_laundry: {
    beginner: {
      conversationAnswer: 'I do the laundry at night.',
      typingAnswer: 'I do the laundry at night.',
      reviewPrompt: 'Review a simple household chore sentence.',
      aiConversationPrompt: 'Tell the AI when you usually do the laundry.',
    },
    intermediate: {
      conversationAnswer: 'I usually do the laundry at night after I finish dinner.',
      typingAnswer: 'I do the laundry after dinner.',
      reviewPrompt: 'Review how to place chores in a daily sequence.',
      aiConversationPrompt: 'Tell the AI which household chore you do most often.',
    },
    advanced: {
      conversationAnswer: 'I usually do the laundry at night because that is the easiest time to fit it into my schedule.',
      typingAnswer: 'That is the easiest time to fit it into my schedule.',
      reviewPrompt: 'Review how to explain scheduling logic in daily life.',
      aiConversationPrompt: 'Explain to the AI how you manage chores when your day is busy.',
    },
  },
  take_a_bath: {
    beginner: {
      conversationAnswer: 'I take a bath before bed.',
      typingAnswer: 'I take a bath before bed.',
      reviewPrompt: 'Review a simple bedtime routine sentence.',
      aiConversationPrompt: 'Tell the AI what helps you relax before bed.',
    },
    intermediate: {
      conversationAnswer: 'I take a bath before bed because it helps me relax.',
      typingAnswer: 'It helps me relax before bed.',
      reviewPrompt: 'Review how to connect an action with its effect.',
      aiConversationPrompt: 'Tell the AI about your evening routine before sleep.',
    },
    advanced: {
      conversationAnswer: 'I like to take a bath before bed because it helps me slow down and separate the evening from the rest of the day.',
      typingAnswer: 'It helps me slow down and separate the evening from the rest of the day.',
      reviewPrompt: 'Review how to describe emotional effect in a natural way.',
      aiConversationPrompt: 'Discuss with the AI how evening routines influence your sleep quality.',
    },
  },
  prepare_for_tomorrow: {
    beginner: {
      conversationAnswer: 'I prepare for tomorrow before bed.',
      typingAnswer: 'I prepare for tomorrow before bed.',
      reviewPrompt: 'Review a simple planning sentence.',
      aiConversationPrompt: 'Tell the AI what you prepare the night before.',
    },
    intermediate: {
      conversationAnswer: 'I prepare my bag and clothes for tomorrow before I go to bed.',
      typingAnswer: 'I prepare my bag and clothes for tomorrow.',
      reviewPrompt: 'Review how to describe practical night-before preparation.',
      aiConversationPrompt: 'Tell the AI how preparing early helps your morning.',
    },
    advanced: {
      conversationAnswer: 'I prepare for the next day before bed so that my morning can start more smoothly and with less stress.',
      typingAnswer: 'My morning can start more smoothly and with less stress.',
      reviewPrompt: 'Review how to express purpose and expected result clearly.',
      aiConversationPrompt: 'Explain to the AI how evening preparation affects your productivity the next day.',
    },
  },
  go_to_bed: {
    beginner: {
      conversationAnswer: 'I go to bed at eleven.',
      typingAnswer: 'I go to bed at eleven.',
      reviewPrompt: 'Review a basic bedtime sentence.',
      aiConversationPrompt: 'Tell the AI what time you usually go to bed.',
    },
    intermediate: {
      conversationAnswer: 'I try to go to bed early so I can wake up feeling better.',
      typingAnswer: 'I try to go to bed early.',
      reviewPrompt: 'Review how to explain bedtime habits with a reason.',
      aiConversationPrompt: 'Tell the AI what helps you sleep better at night.',
    },
    advanced: {
      conversationAnswer: 'I try to go to bed at a reasonable time because the quality of my sleep strongly affects my mood and focus the next day.',
      typingAnswer: 'The quality of my sleep affects my mood and focus the next day.',
      reviewPrompt: 'Review how to explain cause and effect in your sleep habits.',
      aiConversationPrompt: 'Discuss with the AI how sleep influences your performance, emotions, and daily routine.',
    },
  },
  hotel_checkin: {
    beginner: {
      conversationAnswer: 'I have a reservation under Tanaka.',
      typingAnswer: 'I have a reservation under Tanaka.',
      reviewPrompt: 'Review a basic hotel check-in sentence.',
      aiConversationPrompt: 'Tell the AI what information you usually give at hotel check-in.',
    },
    intermediate: {
      conversationAnswer: 'I have a reservation under Tanaka, and I would like to check in now.',
      typingAnswer: 'I would like to check in now.',
      reviewPrompt: 'Review a polite hotel check-in sentence.',
      aiConversationPrompt: 'Role-play a hotel check-in with the AI.',
    },
    advanced: {
      conversationAnswer: 'I have a reservation under Tanaka, and I would like to check in now if the room is ready.',
      typingAnswer: 'I would like to check in now if the room is ready.',
      reviewPrompt: 'Review a polite and slightly more flexible request at check-in.',
      aiConversationPrompt: 'Explain to the AI what you would ask for if you had a special request at hotel check-in.',
    },
  },
  career_consultation: {
    beginner: {
      conversationAnswer: 'I want to talk about my future career.',
      typingAnswer: 'I want to talk about my future career.',
      reviewPrompt: 'Review a simple sentence for starting a career discussion.',
      aiConversationPrompt: 'Tell the AI what kind of work you are interested in.',
    },
    intermediate: {
      conversationAnswer: 'I want to talk about my future career because I am thinking about changing jobs.',
      typingAnswer: 'I am thinking about changing jobs.',
      reviewPrompt: 'Review how to explain your reason for career consultation.',
      aiConversationPrompt: 'Tell the AI why you are reconsidering your current path.',
    },
    advanced: {
      conversationAnswer: 'I would like to talk about my future career because I am reconsidering my current path and looking for better long-term opportunities.',
      typingAnswer: 'I am reconsidering my current path and looking for better long-term opportunities.',
      reviewPrompt: 'Review how to explain your career situation with nuance and long-term perspective.',
      aiConversationPrompt: 'Discuss with the AI what matters most to you in your future career and why.',
    },
  },
}

function getFallbackSceneContent(sceneKey: string): SceneContent {
  const label = titleizeSceneKey(sceneKey)

  return {
    beginner: {
      conversationAnswer: `This is about ${label.toLowerCase()}.`,
      typingAnswer: `This is about ${label.toLowerCase()}.`,
      reviewPrompt: `Review a simple English expression for ${label.toLowerCase()}.`,
      aiConversationPrompt: `Talk to the AI about ${label.toLowerCase()}.`,
    },
    intermediate: {
      conversationAnswer: `I want to talk about ${label.toLowerCase()} in daily life.`,
      typingAnswer: `I want to talk about ${label.toLowerCase()} in daily life.`,
      reviewPrompt: `Review useful English expressions for ${label.toLowerCase()}.`,
      aiConversationPrompt: `Explain your experience with ${label.toLowerCase()} to the AI.`,
    },
    advanced: {
      conversationAnswer: `I want to explain how ${label.toLowerCase()} affects my daily routine and decisions.`,
      typingAnswer: `I want to explain how ${label.toLowerCase()} affects my daily routine and decisions.`,
      reviewPrompt: `Review more detailed English expressions for ${label.toLowerCase()}.`,
      aiConversationPrompt: `Discuss ${label.toLowerCase()} with the AI in a more detailed and natural way.`,
    },
  }
}

function getSceneContent(
  sceneKey: string,
  level: CurrentLevel
): SceneContent[LevelBucket] {
  const bucket = getLevelBucket(level)
  const scene = SCENE_CONTENT[sceneKey] ?? getFallbackSceneContent(sceneKey)
  return scene[bucket]
}

function buildEnglishPrompt(input: {
  blockType: LessonBlueprintBlockType
  sceneKey: string
  level: CurrentLevel
}): { prompt: string; answer: string | null } {
  const scene = getSceneContent(input.sceneKey, input.level)

  switch (input.blockType) {
    case 'conversation':
      return {
        prompt: 'Listen to the English audio carefully and repeat the sentence naturally.',
        answer: scene.conversationAnswer,
      }

    case 'typing':
      return {
        prompt: 'Type the English sentence you heard or the key sentence for this scene.',
        answer: scene.typingAnswer,
      }

    case 'review':
      return {
        prompt: scene.reviewPrompt,
        answer: scene.conversationAnswer,
      }

    case 'ai_conversation':
      return {
        prompt: scene.aiConversationPrompt,
        answer: scene.conversationAnswer,
      }

    default:
      return {
        prompt: `Practice English for this scene: ${input.sceneKey}`,
        answer: scene.conversationAnswer,
      }
  }
}

function mapBlockToDraft(
  block: LessonBlueprintBlock,
  uiLanguage: string,
  level: CurrentLevel
): LessonBlueprintDraftBlock {
  const goal = normalizeGoal(block.goal)
  const sceneKey = goal
  const sceneLabel = mapSceneKeyToDisplayLabel(sceneKey, uiLanguage)
  const englishContent = buildEnglishPrompt({
    blockType: block.type,
    sceneKey,
    level,
  })

  switch (block.type) {
    case 'conversation':
      return {
        type: 'conversation',
        title: block.title,
        description: sceneLabel,
        estimatedMinutes: 5,
        items: [createDraftItem(englishContent.prompt, englishContent.answer)],
      }

    case 'typing':
      return {
        type: 'typing',
        title: block.title,
        description: sceneLabel,
        estimatedMinutes: 4,
        items: [createDraftItem(englishContent.prompt, englishContent.answer)],
      }

    case 'review':
      return {
        type: 'review',
        title: block.title,
        description: sceneLabel,
        estimatedMinutes: 3,
        items: [createDraftItem(englishContent.prompt, englishContent.answer)],
      }

    case 'ai_conversation':
      return {
        type: 'ai_conversation',
        title: block.title,
        description: sceneLabel,
        estimatedMinutes: 6,
        items: [createDraftItem(englishContent.prompt, englishContent.answer)],
      }

    default: {
      const _: never = block.type
      return {
        type: block.type,
        title: block.title,
        description: sceneLabel,
        estimatedMinutes: 3,
        items: [createDraftItem(englishContent.prompt, englishContent.answer)],
      }
    }
  }
}

/**
 * Builds a lesson draft from a Hybrid-C blueprint.
 * Preserves block order; one draft block per blueprint block.
 *
 * uiLanguage is the display language for labels/descriptions.
 * Lesson prompts remain English-first for the initial release.
 */
export function createLessonBlueprintDraft(
  blueprint: LessonBlueprint,
  uiLanguage = 'ja'
): LessonBlueprintDraft {
  return {
    theme: blueprint.theme,
    blocks: blueprint.blocks.map((block) =>
      mapBlockToDraft(block, uiLanguage, blueprint.level)
    ),
  }
}
