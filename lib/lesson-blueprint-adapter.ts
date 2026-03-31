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

export type ScaffoldStepType = 'native' | 'mix' | 'target'

export type ScaffoldStep = {
  step: 1 | 2 | 3
  type: ScaffoldStepType
  text: string
  highlight?: string[] | null
  audio_url: string | null
}

export type SemanticChunkType = 'phrase' | 'word'

export type SemanticChunk = {
  chunk: string
  meaning: string
  type: SemanticChunkType
  importance?: number | null
}

export type LessonBlueprintDraftItem = {
  prompt: string
  answer: string | null
  nativeHint: string | null
  mixHint: string | null
  aiQuestionText: string | null
  scaffold_steps: string[] | null
  structured_scaffold_steps: ScaffoldStep[] | null
  semantic_chunks: SemanticChunk[] | null
  image_url: string | null
}

export type LessonBlueprintDraftBlock = {
  type: LessonBlueprintBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonBlueprintDraftItem[]
  image_prompt: string | null
}

export type LessonBlueprintDraft = {
  theme: string
  blocks: LessonBlueprintDraftBlock[]
}

type LevelBucket = 'beginner' | 'intermediate' | 'advanced'

type SceneLevelContent = {
  conversationAnswer: string
  typingAnswer: string
  reviewPrompt: string
  aiConversationPrompt: string
  nativeHint: string
  mixHint: string
  aiQuestionText: string
}

type SceneContent = {
  beginner: SceneLevelContent
  intermediate: SceneLevelContent
  advanced: SceneLevelContent
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

// highlight is intentionally null until semantic_chunks-based extraction is implemented.
// Previous regex-based extraction produced invalid fragments (e.g. "I every morning").

function buildStructuredScaffoldSteps(
  nativeHint: string | null,
  mixHint: string | null,
  answer: string | null
): ScaffoldStep[] {
  const nativeText = nativeHint?.trim() || ''
  const mixText = mixHint?.trim() || ''
  const targetText = answer?.trim() || ''

  return [
    {
      step: 1,
      type: 'native',
      text: nativeText || targetText,
      audio_url: null,
    },
    {
      step: 2,
      type: 'mix',
      text: mixText || targetText,
      highlight: null,
      audio_url: null,
    },
    {
      step: 3,
      type: 'target',
      text: targetText,
      audio_url: null,
    },
  ]
}

function createDraftItem(
  prompt: string,
  answer: string | null,
  nativeHint: string | null = null,
  mixHint: string | null = null,
  aiQuestionText: string | null = null,
  imageUrl: string | null = null,
  semanticChunks: SemanticChunk[] | null = null
): LessonBlueprintDraftItem {
  const structuredSteps = buildStructuredScaffoldSteps(nativeHint, mixHint, answer)
  const flatSteps = structuredSteps.map((s) => s.text)

  return {
    prompt,
    answer,
    nativeHint,
    mixHint,
    aiQuestionText,
    scaffold_steps: flatSteps,
    structured_scaffold_steps: structuredSteps,
    semantic_chunks: semanticChunks,
    image_url: imageUrl,
  }
}

const SCENE_CONTENT: Record<string, SceneContent> = {
  wake_up: {
    beginner: {
      conversationAnswer: 'I just woke up.',
      typingAnswer: 'I just woke up.',
      reviewPrompt: 'Review the basic wake-up phrase for this scene.',
      aiConversationPrompt: 'Tell the AI what time you usually wake up.',
      nativeHint: '今、起きたところです。',
      mixHint: 'I 起きたところです。',
      aiQuestionText: 'What time did you wake up?',
    },
    intermediate: {
      conversationAnswer: 'I just woke up, and I need to get ready for the day.',
      typingAnswer: 'I need to get ready for the day.',
      reviewPrompt: 'Review how to describe your morning start in simple English.',
      aiConversationPrompt: 'Tell the AI about your usual morning routine after you wake up.',
      nativeHint: '今起きたところで、今日の準備をしなければなりません。',
      mixHint: 'I 起きたところで、 and I 準備をしなければなりません for the day.',
      aiQuestionText: 'What do you need to get ready?',
    },
    advanced: {
      conversationAnswer: 'I just woke up, but I am still a little tired because I went to bed late last night.',
      typingAnswer: 'I am still a little tired because I went to bed late last night.',
      reviewPrompt: 'Review how to explain your condition and reason after waking up.',
      aiConversationPrompt: 'Explain to the AI how your sleep affects the rest of your morning.',
      nativeHint: '今起きましたが、昨夜遅く寝たのでまだ少し疲れています。',
      mixHint: 'I 起きましたが、 I am still 少し疲れています because I 遅く寝ました last night.',
      aiQuestionText: 'Why are you so tired today?',
    },
  },
  alarm_clock: {
    beginner: {
      conversationAnswer: 'My alarm clock rings at seven.',
      typingAnswer: 'My alarm clock rings at seven.',
      reviewPrompt: 'Review how to say the time your alarm goes off.',
      aiConversationPrompt: 'Tell the AI what time your alarm rings.',
      nativeHint: '目覚ましは7時に鳴ります。',
      mixHint: 'My 目覚まし rings at seven.',
      aiQuestionText: 'What time does your alarm go off?',
    },
    intermediate: {
      conversationAnswer: 'My alarm clock rings at seven, but I sometimes hit snooze.',
      typingAnswer: 'I sometimes hit snooze.',
      reviewPrompt: 'Review how to talk about alarm habits.',
      aiConversationPrompt: 'Tell the AI what happens when your alarm goes off.',
      nativeHint: '目覚ましは7時に鳴りますが、たまにスヌーズを押します。',
      mixHint: 'My 目覚まし rings at seven, but I sometimes スヌーズを押します.',
      aiQuestionText: 'Do you hit snooze often?',
    },
    advanced: {
      conversationAnswer: 'My alarm clock rings at seven, but I have been trying to wake up without it by going to bed earlier.',
      typingAnswer: 'I have been trying to wake up without it by going to bed earlier.',
      reviewPrompt: 'Review how to explain a habit you are trying to change.',
      aiConversationPrompt: 'Discuss with the AI how you manage your morning alarm routine.',
      nativeHint: '目覚ましは7時に鳴りますが、早く寝ることで目覚ましなしで起きるようにしています。',
      mixHint: 'My 目覚まし rings at seven, but I have been trying to 目覚ましなしで起きる by 早く寝る.',
      aiQuestionText: 'How are you trying to change your wake-up routine?',
    },
  },
  make_bed: {
    beginner: {
      conversationAnswer: 'I make my bed every morning.',
      typingAnswer: 'I make my bed every morning.',
      reviewPrompt: 'Review a simple household phrase.',
      aiConversationPrompt: 'Tell the AI about making your bed.',
      nativeHint: '毎朝、布団をたたみます。',
      mixHint: 'I 布団をたたみます every morning.',
      aiQuestionText: 'Do you make your bed every day?',
    },
    intermediate: {
      conversationAnswer: 'I make my bed right after I get up because it makes the room look tidy.',
      typingAnswer: 'It makes the room look tidy.',
      reviewPrompt: 'Review how to explain the purpose of a small habit.',
      aiConversationPrompt: 'Tell the AI why you make your bed in the morning.',
      nativeHint: '部屋がきれいに見えるので、起きたらすぐ布団をたたみます。',
      mixHint: 'I 布団をたたみます right after I 起きる because it 部屋がきれいに見える.',
      aiQuestionText: 'Why do you make your bed right away?',
    },
    advanced: {
      conversationAnswer: 'I make my bed every morning because starting the day with a small task gives me a sense of accomplishment.',
      typingAnswer: 'Starting the day with a small task gives me a sense of accomplishment.',
      reviewPrompt: 'Review how to connect a small routine to a feeling of achievement.',
      aiConversationPrompt: 'Discuss with the AI how daily habits affect your mindset.',
      nativeHint: '小さなことから始めると達成感があるので、毎朝布団をたたみます。',
      mixHint: 'I 布団をたたみます every morning because 小さなことから始める gives me 達成感.',
      aiQuestionText: 'How does making your bed affect your day?',
    },
  },
  wash_face: {
    beginner: {
      conversationAnswer: 'I wash my face every morning.',
      typingAnswer: 'I wash my face every morning.',
      reviewPrompt: 'Review a simple daily self-care sentence.',
      aiConversationPrompt: 'Tell the AI what you do after washing your face.',
      nativeHint: '毎朝、顔を洗います。',
      mixHint: 'I 顔を洗います every morning.',
      aiQuestionText: 'When do you wash your face?',
    },
    intermediate: {
      conversationAnswer: 'I wash my face with cold water to help myself wake up.',
      typingAnswer: 'I wash my face with cold water.',
      reviewPrompt: 'Review how to explain a small habit and its purpose.',
      aiConversationPrompt: 'Tell the AI about your morning self-care routine.',
      nativeHint: '目を覚ますために冷たい水で顔を洗います。',
      mixHint: 'I 顔を洗います with cold water to 目を覚ます.',
      aiQuestionText: 'How do you wash your face?',
    },
    advanced: {
      conversationAnswer: 'I wash my face with cold water because it helps me feel refreshed and ready to focus.',
      typingAnswer: 'It helps me feel refreshed and ready to focus.',
      reviewPrompt: 'Review how to connect a routine with its effect in natural English.',
      aiConversationPrompt: 'Discuss with the AI how small morning habits affect your mood and productivity.',
      nativeHint: 'すっきりして集中できるように、冷たい水で顔を洗います。',
      mixHint: 'I 顔を洗います with cold water because it helps me すっきりして集中できる.',
      aiQuestionText: 'Why does cold water help you focus?',
    },
  },
  brush_teeth: {
    beginner: {
      conversationAnswer: 'I brush my teeth after breakfast.',
      typingAnswer: 'I brush my teeth after breakfast.',
      reviewPrompt: 'Review a simple hygiene sentence.',
      aiConversationPrompt: 'Tell the AI when you usually brush your teeth.',
      nativeHint: '朝食の後に歯を磨きます。',
      mixHint: 'I 歯を磨きます after breakfast.',
      aiQuestionText: 'When do you brush your teeth?',
    },
    intermediate: {
      conversationAnswer: 'I brush my teeth carefully after breakfast before I leave home.',
      typingAnswer: 'I brush my teeth before I leave home.',
      reviewPrompt: 'Review how to describe order and timing in a routine.',
      aiConversationPrompt: 'Describe your morning routine in order to the AI.',
      nativeHint: '出かける前に朝食の後、丁寧に歯を磨きます。',
      mixHint: 'I 丁寧に歯を磨きます after breakfast before I 出かける.',
      aiQuestionText: 'What do you do before leaving home?',
    },
    advanced: {
      conversationAnswer: 'I always brush my teeth before leaving home because I want to feel clean and prepared for the day.',
      typingAnswer: 'I want to feel clean and prepared for the day.',
      reviewPrompt: 'Review how to explain a daily action with intention and feeling.',
      aiConversationPrompt: 'Explain to the AI why small routines help you feel more confident during the day.',
      nativeHint: '清潔で準備万端な気持ちでいたいので、出かける前に必ず歯を磨きます。',
      mixHint: 'I always 歯を磨きます before leaving because I 清潔で準備万端でいたい.',
      aiQuestionText: 'Why do you brush before leaving?',
    },
  },
  take_a_shower: {
    beginner: {
      conversationAnswer: 'I take a shower in the morning.',
      typingAnswer: 'I take a shower in the morning.',
      reviewPrompt: 'Review a basic sentence about your morning shower.',
      aiConversationPrompt: 'Tell the AI whether you shower in the morning or at night.',
      nativeHint: '朝、シャワーを浴びます。',
      mixHint: 'I シャワーを浴びます in the morning.',
      aiQuestionText: 'When do you take a shower?',
    },
    intermediate: {
      conversationAnswer: 'I take a quick shower in the morning before getting dressed.',
      typingAnswer: 'I take a quick shower before getting dressed.',
      reviewPrompt: 'Review how to describe order in your routine.',
      aiConversationPrompt: 'Tell the AI how long your usual shower takes and why.',
      nativeHint: '着替える前に朝、さっとシャワーを浴びます。',
      mixHint: 'I さっとシャワーを浴びます in the morning before 着替える.',
      aiQuestionText: 'What do you do before getting dressed?',
    },
    advanced: {
      conversationAnswer: 'I usually take a quick shower in the morning because it helps me feel more alert and ready to leave the house.',
      typingAnswer: 'It helps me feel more alert and ready to leave the house.',
      reviewPrompt: 'Review how to connect a daily action with its practical effect.',
      aiConversationPrompt: 'Discuss with the AI how your morning routine changes on busy days.',
      nativeHint: '目が覚めてすぐ出かけられるように、朝さっとシャワーを浴びます。',
      mixHint: 'I usually さっとシャワーを浴びます because it helps me 目が覚めて出かけられる.',
      aiQuestionText: 'Why do you shower in the morning?',
    },
  },
  get_dressed: {
    beginner: {
      conversationAnswer: 'I get dressed before I go out.',
      typingAnswer: 'I get dressed before I go out.',
      reviewPrompt: 'Review a simple sentence about getting ready.',
      aiConversationPrompt: 'Tell the AI what you usually wear on weekdays.',
      nativeHint: '出かける前に着替えます。',
      mixHint: 'I 着替えます before I go out.',
      aiQuestionText: 'What do you do before leaving?',
    },
    intermediate: {
      conversationAnswer: 'I get dressed quickly because I do not want to miss my train.',
      typingAnswer: 'I do not want to miss my train.',
      reviewPrompt: 'Review how to explain a reason in a short sentence.',
      aiConversationPrompt: 'Tell the AI how you choose your clothes for work or school.',
      nativeHint: '電車に乗り遅れたくないので、急いで着替えます。',
      mixHint: 'I 急いで着替えます because I 乗り遅れたくない my train.',
      aiQuestionText: 'Why do you get dressed so quickly?',
    },
    advanced: {
      conversationAnswer: 'I try to get dressed efficiently in the morning so I can leave on time without feeling rushed.',
      typingAnswer: 'I try to leave on time without feeling rushed.',
      reviewPrompt: 'Review how to describe efficiency and emotional state in a routine.',
      aiConversationPrompt: 'Explain to the AI how your clothes affect your confidence or mood during the day.',
      nativeHint: '焦らずに時間通りに出発できるように、効率よく着替えるようにしています。',
      mixHint: 'I try to 効率よく着替える so I can leave on time 焦らずに.',
      aiQuestionText: 'How do you leave on time every morning?',
    },
  },
  make_breakfast: {
    beginner: {
      conversationAnswer: 'I make breakfast every morning.',
      typingAnswer: 'I make breakfast every morning.',
      reviewPrompt: 'Review a simple breakfast sentence.',
      aiConversationPrompt: 'Tell the AI what you usually make for breakfast.',
      nativeHint: '毎朝、朝食を作ります。',
      mixHint: 'I 朝食を作ります every morning.',
      aiQuestionText: 'What do you do every morning?',
    },
    intermediate: {
      conversationAnswer: 'I make a simple breakfast when I have enough time in the morning.',
      typingAnswer: 'I make a simple breakfast when I have time.',
      reviewPrompt: 'Review how to talk about routine and condition.',
      aiConversationPrompt: 'Tell the AI what breakfast you make on busy mornings and relaxed mornings.',
      nativeHint: '朝、時間があるときは簡単な朝食を作ります。',
      mixHint: 'I 簡単な朝食を作ります when I 時間がある in the morning.',
      aiQuestionText: 'What do you make for breakfast?',
    },
    advanced: {
      conversationAnswer: 'I try to make a simple but healthy breakfast so that I can start the day with enough energy.',
      typingAnswer: 'I want to start the day with enough energy.',
      reviewPrompt: 'Review how to express purpose and healthy habits naturally.',
      aiConversationPrompt: 'Discuss with the AI how your breakfast choices affect your concentration later in the day.',
      nativeHint: '十分なエネルギーで一日を始められるように、簡単でも健康的な朝食を作るようにしています。',
      mixHint: 'I try to 健康的な朝食を作る so that I can 一日を始められる with enough energy.',
      aiQuestionText: 'Why do you make a healthy breakfast?',
    },
  },
  eat_breakfast: {
    beginner: {
      conversationAnswer: 'I eat breakfast at home.',
      typingAnswer: 'I eat breakfast at home.',
      reviewPrompt: 'Review a simple breakfast sentence.',
      aiConversationPrompt: 'Tell the AI what you eat for breakfast.',
      nativeHint: '家で朝食を食べます。',
      mixHint: 'I 朝食を食べます at home.',
      aiQuestionText: 'What do you eat for breakfast?',
    },
    intermediate: {
      conversationAnswer: 'I eat breakfast at home with my family before we all leave for the day.',
      typingAnswer: 'I eat breakfast with my family.',
      reviewPrompt: 'Review how to describe who you eat with and when.',
      aiConversationPrompt: 'Tell the AI about your breakfast routine with your family.',
      nativeHint: 'みんなが出かける前に家族と家で朝食を食べます。',
      mixHint: 'I 朝食を食べます at home with 家族 before we all 出かける.',
      aiQuestionText: 'Who do you eat breakfast with?',
    },
    advanced: {
      conversationAnswer: 'I eat breakfast at home every day because I believe starting the morning with a proper meal helps me stay focused.',
      typingAnswer: 'Starting the morning with a proper meal helps me stay focused.',
      reviewPrompt: 'Review how to explain the benefit of a daily routine.',
      aiConversationPrompt: 'Discuss with the AI how eating breakfast affects your performance during the day.',
      nativeHint: 'ちゃんとした朝食で朝を始めると集中力が続くと思うので、毎日家で食べます。',
      mixHint: 'I 朝食を食べます at home every day because ちゃんとした朝食 helps me 集中力が続く.',
      aiQuestionText: 'How does breakfast affect your focus?',
    },
  },
  clean_up_after_breakfast: {
    beginner: {
      conversationAnswer: 'I clean up after breakfast.',
      typingAnswer: 'I clean up after breakfast.',
      reviewPrompt: 'Review a simple clean-up phrase.',
      aiConversationPrompt: 'Tell the AI what you do after eating breakfast.',
      nativeHint: '朝食の後、片付けをします。',
      mixHint: 'I 片付けをします after breakfast.',
      aiQuestionText: 'What do you do after breakfast?',
    },
    intermediate: {
      conversationAnswer: 'I clean up after breakfast quickly so I can leave the house on time.',
      typingAnswer: 'I clean up quickly so I can leave on time.',
      reviewPrompt: 'Review how to express doing something quickly with a reason.',
      aiConversationPrompt: 'Tell the AI how you manage time after breakfast.',
      nativeHint: '時間通りに家を出られるように、朝食の後すぐに片付けをします。',
      mixHint: 'I 片付けをします quickly so I can 時間通りに家を出る.',
      aiQuestionText: 'How do you manage your time after breakfast?',
    },
    advanced: {
      conversationAnswer: 'I always clean up right after breakfast because leaving the kitchen tidy gives me peace of mind before heading out.',
      typingAnswer: 'Leaving the kitchen tidy gives me peace of mind before heading out.',
      reviewPrompt: 'Review how to connect a chore to an emotional benefit.',
      aiConversationPrompt: 'Discuss with the AI why keeping things tidy in the morning matters to you.',
      nativeHint: 'キッチンをきれいにしておくと出かける前に気持ちが落ち着くので、朝食の後すぐに片付けます。',
      mixHint: 'I always 片付けます right after breakfast because キッチンをきれいにする gives me 安心感.',
      aiQuestionText: 'Why do you clean up right away?',
    },
  },
  take_the_train: {
    beginner: {
      conversationAnswer: 'I take the train to work.',
      typingAnswer: 'I take the train to work.',
      reviewPrompt: 'Review a simple commuting sentence.',
      aiConversationPrompt: 'Tell the AI how you usually commute.',
      nativeHint: '電車で通勤しています。',
      mixHint: 'I 電車で通勤しています.',
      aiQuestionText: 'How do you get to work?',
    },
    intermediate: {
      conversationAnswer: 'I take the train to work, and I usually change trains once.',
      typingAnswer: 'I usually change trains once.',
      reviewPrompt: 'Review how to describe a commute with one extra detail.',
      aiConversationPrompt: 'Tell the AI what your commute is usually like.',
      nativeHint: '電車で通勤していて、だいたい一回乗り換えます。',
      mixHint: 'I 電車で通勤していて、 and I usually 一回乗り換えます.',
      aiQuestionText: 'How many times do you change trains?',
    },
    advanced: {
      conversationAnswer: 'I take the train to work every day, and I usually use that time to check my schedule and prepare mentally.',
      typingAnswer: 'I use that time to check my schedule and prepare mentally.',
      reviewPrompt: 'Review how to add purpose and reflection to a daily commute.',
      aiConversationPrompt: 'Explain to the AI how commuting affects your energy, focus, or schedule.',
      nativeHint: '毎日電車で通勤していて、その時間にスケジュールを確認して心の準備をしています。',
      mixHint: 'I 電車で通勤していて every day, and I use that time to スケジュールを確認して心の準備をする.',
      aiQuestionText: 'What do you do on the train?',
    },
  },
  greet_coworkers: {
    beginner: {
      conversationAnswer: 'I say good morning to my coworkers.',
      typingAnswer: 'I say good morning to my coworkers.',
      reviewPrompt: 'Review a basic workplace greeting sentence.',
      aiConversationPrompt: 'Tell the AI how you greet people at work or school.',
      nativeHint: '同僚におはようございますと言います。',
      mixHint: 'I 同僚に say おはようございます.',
      aiQuestionText: 'What do you say to coworkers?',
    },
    intermediate: {
      conversationAnswer: 'I always say good morning to my coworkers when I arrive at the office.',
      typingAnswer: 'I say good morning when I arrive at the office.',
      reviewPrompt: 'Review how to describe a routine social action at work.',
      aiConversationPrompt: 'Tell the AI why greetings matter in your workplace or school.',
      nativeHint: 'オフィスに着いたら、いつも同僚におはようございますと言います。',
      mixHint: 'I always 同僚におはようございますと言います when I arrive at the office.',
      aiQuestionText: 'What do you do when you arrive?',
    },
    advanced: {
      conversationAnswer: 'I make a point of greeting my coworkers every morning because it helps create a friendly and cooperative atmosphere.',
      typingAnswer: 'It helps create a friendly and cooperative atmosphere.',
      reviewPrompt: 'Review how to explain social purpose in a workplace routine.',
      aiConversationPrompt: 'Discuss with the AI how small communication habits influence teamwork.',
      nativeHint: '友好的で協力的な雰囲気を作るために、毎朝同僚に挨拶するようにしています。',
      mixHint: 'I make a point of 同僚に挨拶する every morning because it helps 友好的な雰囲気を作る.',
      aiQuestionText: 'Why do you greet coworkers every morning?',
    },
  },
  shop_at_the_supermarket: {
    beginner: {
      conversationAnswer: 'I go to the supermarket after work.',
      typingAnswer: 'I go to the supermarket after work.',
      reviewPrompt: 'Review a simple shopping sentence.',
      aiConversationPrompt: 'Tell the AI what you usually buy at the supermarket.',
      nativeHint: '仕事の後にスーパーに行きます。',
      mixHint: 'I スーパーに行きます after work.',
      aiQuestionText: 'Where do you go after work?',
    },
    intermediate: {
      conversationAnswer: 'I stop by the supermarket after work to buy ingredients for dinner.',
      typingAnswer: 'I buy ingredients for dinner after work.',
      reviewPrompt: 'Review how to describe shopping purpose naturally.',
      aiConversationPrompt: 'Tell the AI what you usually cook after shopping.',
      nativeHint: '夕食の材料を買うために、仕事帰りにスーパーに寄ります。',
      mixHint: 'I スーパーに寄ります after work to 夕食の材料を買う.',
      aiQuestionText: 'Why do you stop by the supermarket?',
    },
    advanced: {
      conversationAnswer: 'I often stop by the supermarket after work so I can buy fresh ingredients and prepare dinner at home.',
      typingAnswer: 'I buy fresh ingredients and prepare dinner at home.',
      reviewPrompt: 'Review how to connect shopping, planning, and home life in one sentence.',
      aiConversationPrompt: 'Explain to the AI how you decide what to buy and cook on weekdays.',
      nativeHint: '新鮮な食材を買って自宅で夕食を作れるように、仕事帰りにスーパーに寄ることが多いです。',
      mixHint: 'I often スーパーに寄ります so I can 新鮮な食材を買って夕食を作る at home.',
      aiQuestionText: 'How often do you go to the store?',
    },
  },
  go_to_a_convenience_store: {
    beginner: {
      conversationAnswer: 'I went to the convenience store.',
      typingAnswer: 'I went to the convenience store.',
      reviewPrompt: 'Review a simple errand sentence.',
      aiConversationPrompt: 'Tell the AI what you usually buy at a convenience store.',
      nativeHint: 'コンビニに行きました。',
      mixHint: 'I コンビニに行きました.',
      aiQuestionText: 'Where did you go today?',
    },
    intermediate: {
      conversationAnswer: 'I went to the convenience store to buy a drink and a quick snack.',
      typingAnswer: 'I bought a drink and a quick snack.',
      reviewPrompt: 'Review how to talk about a short errand with details.',
      aiConversationPrompt: 'Tell the AI when convenience stores are useful in your daily life.',
      nativeHint: '飲み物と軽食を買いにコンビニに行きました。',
      mixHint: 'I コンビニに行きました to buy 飲み物と軽食.',
      aiQuestionText: 'What did you buy at the store?',
    },
    advanced: {
      conversationAnswer: 'I dropped by the convenience store because I needed a quick snack and did not have time to cook anything.',
      typingAnswer: 'I did not have time to cook anything.',
      reviewPrompt: 'Review how to explain the reason behind a quick decision.',
      aiConversationPrompt: 'Discuss with the AI how convenience and health sometimes conflict in daily life.',
      nativeHint: '軽食が必要で料理する時間がなかったので、コンビニに寄りました。',
      mixHint: 'I コンビニに寄りました because I 軽食が必要で料理する時間がなかった.',
      aiQuestionText: 'Why did you go to the convenience store?',
    },
  },
  come_home: {
    beginner: {
      conversationAnswer: 'I came home in the evening.',
      typingAnswer: 'I came home in the evening.',
      reviewPrompt: 'Review a simple sentence about coming home.',
      aiConversationPrompt: 'Tell the AI what you usually do when you get home.',
      nativeHint: '夕方、家に帰りました。',
      mixHint: 'I 家に帰りました in the evening.',
      aiQuestionText: 'When did you come home today?',
    },
    intermediate: {
      conversationAnswer: 'I came home in the evening and took a short break before dinner.',
      typingAnswer: 'I took a short break before dinner.',
      reviewPrompt: 'Review how to connect two evening actions in one sentence.',
      aiConversationPrompt: 'Describe your usual evening routine after coming home.',
      nativeHint: '夕方に帰宅して、夕食の前に少し休憩しました。',
      mixHint: 'I 帰宅して in the evening and 少し休憩しました before dinner.',
      aiQuestionText: 'What did you do when you came home?',
    },
    advanced: {
      conversationAnswer: 'When I came home in the evening, I took a short break so I could reset before starting my chores.',
      typingAnswer: 'I took a short break so I could reset.',
      reviewPrompt: 'Review how to describe transition and purpose in your evening routine.',
      aiConversationPrompt: 'Explain to the AI how you shift mentally from work or school mode to home mode.',
      nativeHint: '家事を始める前にリセットできるように、帰宅後に少し休憩しました。',
      mixHint: 'When I 帰宅して, I 少し休憩しました so I could リセットできる before 家事を始める.',
      aiQuestionText: 'Why do you take a break at home?',
    },
  },
  make_dinner: {
    beginner: {
      conversationAnswer: 'I make dinner at home.',
      typingAnswer: 'I make dinner at home.',
      reviewPrompt: 'Review a basic dinner sentence.',
      aiConversationPrompt: 'Tell the AI what you usually cook for dinner.',
      nativeHint: '家で夕食を作ります。',
      mixHint: 'I 夕食を作ります at home.',
      aiQuestionText: 'Where do you make dinner?',
    },
    intermediate: {
      conversationAnswer: 'I make dinner at home because it is cheaper and healthier.',
      typingAnswer: 'It is cheaper and healthier to cook at home.',
      reviewPrompt: 'Review how to give a simple opinion with reasons.',
      aiConversationPrompt: 'Tell the AI what kind of dinner is easy for you to make on weekdays.',
      nativeHint: '安くて健康的なので、家で夕食を作ります。',
      mixHint: 'I 夕食を作ります at home because it is 安くて健康的.',
      aiQuestionText: 'Why do you make dinner at home?',
    },
    advanced: {
      conversationAnswer: 'I usually make dinner at home because cooking for myself is both more affordable and easier to control nutritionally.',
      typingAnswer: 'Cooking at home is more affordable and easier to control nutritionally.',
      reviewPrompt: 'Review how to compare benefits in a natural spoken sentence.',
      aiConversationPrompt: 'Discuss with the AI how your dinner habits affect your health, budget, or schedule.',
      nativeHint: '自炊のほうが手頃で栄養管理もしやすいので、たいてい家で夕食を作ります。',
      mixHint: 'I usually 夕食を作ります at home because 自炊は手頃で栄養管理もしやすい.',
      aiQuestionText: 'Why do you prefer cooking at home?',
    },
  },
  do_the_laundry: {
    beginner: {
      conversationAnswer: 'I do the laundry at night.',
      typingAnswer: 'I do the laundry at night.',
      reviewPrompt: 'Review a simple household chore sentence.',
      aiConversationPrompt: 'Tell the AI when you usually do the laundry.',
      nativeHint: '夜、洗濯をします。',
      mixHint: 'I 洗濯をします at night.',
      aiQuestionText: 'When do you do the laundry?',
    },
    intermediate: {
      conversationAnswer: 'I usually do the laundry at night after I finish dinner.',
      typingAnswer: 'I do the laundry after dinner.',
      reviewPrompt: 'Review how to place chores in a daily sequence.',
      aiConversationPrompt: 'Tell the AI which household chore you do most often.',
      nativeHint: '夕食を済ませた後、夜に洗濯をすることが多いです。',
      mixHint: 'I usually 洗濯をします at night after I 夕食を済ませた.',
      aiQuestionText: 'What do you do after dinner?',
    },
    advanced: {
      conversationAnswer: 'I usually do the laundry at night because that is the easiest time to fit it into my schedule.',
      typingAnswer: 'That is the easiest time to fit it into my schedule.',
      reviewPrompt: 'Review how to explain scheduling logic in daily life.',
      aiConversationPrompt: 'Explain to the AI how you manage chores when your day is busy.',
      nativeHint: 'スケジュールに組み込みやすいので、夜に洗濯をすることが多いです。',
      mixHint: 'I usually 洗濯をします at night because that is スケジュールに組み込みやすい.',
      aiQuestionText: 'When do you usually do laundry?',
    },
  },
  take_a_bath: {
    beginner: {
      conversationAnswer: 'I take a bath before bed.',
      typingAnswer: 'I take a bath before bed.',
      reviewPrompt: 'Review a simple bedtime routine sentence.',
      aiConversationPrompt: 'Tell the AI what helps you relax before bed.',
      nativeHint: '寝る前にお風呂に入ります。',
      mixHint: 'I お風呂に入ります before bed.',
      aiQuestionText: 'What do you do before bed?',
    },
    intermediate: {
      conversationAnswer: 'I take a bath before bed because it helps me relax.',
      typingAnswer: 'It helps me relax before bed.',
      reviewPrompt: 'Review how to connect an action with its effect.',
      aiConversationPrompt: 'Tell the AI about your evening routine before sleep.',
      nativeHint: 'リラックスできるので、寝る前にお風呂に入ります。',
      mixHint: 'I お風呂に入ります before bed because it helps me リラックスできる.',
      aiQuestionText: 'Why do you take a bath before bed?',
    },
    advanced: {
      conversationAnswer: 'I like to take a bath before bed because it helps me slow down and separate the evening from the rest of the day.',
      typingAnswer: 'It helps me slow down and separate the evening from the rest of the day.',
      reviewPrompt: 'Review how to describe emotional effect in a natural way.',
      aiConversationPrompt: 'Discuss with the AI how evening routines influence your sleep quality.',
      nativeHint: '気持ちを落ち着けて、夜と一日の残りを切り離すために、寝る前にお風呂に入るのが好きです。',
      mixHint: 'I like to お風呂に入る before bed because it helps me 気持ちを落ち着けて一日を切り離す.',
      aiQuestionText: 'Why do you take a bath before bed?',
    },
  },
  prepare_for_tomorrow: {
    beginner: {
      conversationAnswer: 'I prepare for tomorrow before bed.',
      typingAnswer: 'I prepare for tomorrow before bed.',
      reviewPrompt: 'Review a simple planning sentence.',
      aiConversationPrompt: 'Tell the AI what you prepare the night before.',
      nativeHint: '寝る前に明日の準備をします。',
      mixHint: 'I 明日の準備をします before bed.',
      aiQuestionText: 'What do you do before bed?',
    },
    intermediate: {
      conversationAnswer: 'I prepare my bag and clothes for tomorrow before I go to bed.',
      typingAnswer: 'I prepare my bag and clothes for tomorrow.',
      reviewPrompt: 'Review how to describe practical night-before preparation.',
      aiConversationPrompt: 'Tell the AI how preparing early helps your morning.',
      nativeHint: '寝る前にカバンと服を準備します。',
      mixHint: 'I カバンと服を準備します for tomorrow before I go to bed.',
      aiQuestionText: 'What do you prepare before bed?',
    },
    advanced: {
      conversationAnswer: 'I prepare for the next day before bed so that my morning can start more smoothly and with less stress.',
      typingAnswer: 'My morning can start more smoothly and with less stress.',
      reviewPrompt: 'Review how to express purpose and expected result clearly.',
      aiConversationPrompt: 'Explain to the AI how evening preparation affects your productivity the next day.',
      nativeHint: '朝をスムーズにストレスなく始められるように、寝る前に翌日の準備をします。',
      mixHint: 'I 翌日の準備をします before bed so that my morning can スムーズにストレスなく始められる.',
      aiQuestionText: 'Why do you prepare the night before?',
    },
  },
  go_to_bed: {
    beginner: {
      conversationAnswer: 'I go to bed at eleven.',
      typingAnswer: 'I go to bed at eleven.',
      reviewPrompt: 'Review a basic bedtime sentence.',
      aiConversationPrompt: 'Tell the AI what time you usually go to bed.',
      nativeHint: '11時に寝ます。',
      mixHint: 'I 寝ます at eleven.',
      aiQuestionText: 'When do you go to bed?',
    },
    intermediate: {
      conversationAnswer: 'I try to go to bed early so I can wake up feeling better.',
      typingAnswer: 'I try to go to bed early.',
      reviewPrompt: 'Review how to explain bedtime habits with a reason.',
      aiConversationPrompt: 'Tell the AI what helps you sleep better at night.',
      nativeHint: 'より良い目覚めのために、早めに寝るようにしています。',
      mixHint: 'I try to 早めに寝る so I can より良い目覚め.',
      aiQuestionText: 'Why do you try to sleep early?',
    },
    advanced: {
      conversationAnswer: 'I try to go to bed at a reasonable time because the quality of my sleep strongly affects my mood and focus the next day.',
      typingAnswer: 'The quality of my sleep affects my mood and focus the next day.',
      reviewPrompt: 'Review how to explain cause and effect in your sleep habits.',
      aiConversationPrompt: 'Discuss with the AI how sleep influences your performance, emotions, and daily routine.',
      nativeHint: '睡眠の質が翌日の気分や集中力に大きく影響するので、適切な時間に寝るようにしています。',
      mixHint: 'I try to 適切な時間に寝る because 睡眠の質 strongly affects my 気分や集中力 the next day.',
      aiQuestionText: 'How does sleep affect your next day?',
    },
  },
  hotel_checkin: {
    beginner: {
      conversationAnswer: 'I have a reservation under Tanaka.',
      typingAnswer: 'I have a reservation under Tanaka.',
      reviewPrompt: 'Review a basic hotel check-in sentence.',
      aiConversationPrompt: 'Tell the AI what information you usually give at hotel check-in.',
      nativeHint: '田中で予約しています。',
      mixHint: 'I 予約しています under 田中.',
      aiQuestionText: 'What name is the reservation under?',
    },
    intermediate: {
      conversationAnswer: 'I have a reservation under Tanaka, and I would like to check in now.',
      typingAnswer: 'I would like to check in now.',
      reviewPrompt: 'Review a polite hotel check-in sentence.',
      aiConversationPrompt: 'Role-play a hotel check-in with the AI.',
      nativeHint: '田中で予約しています。チェックインしたいのですが。',
      mixHint: 'I 予約しています under 田中, and I チェックインしたいのですが.',
      aiQuestionText: 'When would you like to check in?',
    },
    advanced: {
      conversationAnswer: 'I have a reservation under Tanaka, and I would like to check in now if the room is ready.',
      typingAnswer: 'I would like to check in now if the room is ready.',
      reviewPrompt: 'Review a polite and slightly more flexible request at check-in.',
      aiConversationPrompt: 'Explain to the AI what you would ask for if you had a special request at hotel check-in.',
      nativeHint: '田中で予約しています。部屋の準備ができていれば、チェックインしたいのですが。',
      mixHint: 'I 予約しています under 田中, and I チェックインしたい if 部屋の準備ができていれば.',
      aiQuestionText: 'Would you like to check in now?',
    },
  },
  career_consultation: {
    beginner: {
      conversationAnswer: 'I want to talk about my future career.',
      typingAnswer: 'I want to talk about my future career.',
      reviewPrompt: 'Review a simple sentence for starting a career discussion.',
      aiConversationPrompt: 'Tell the AI what kind of work you are interested in.',
      nativeHint: '将来のキャリアについて相談したいです。',
      mixHint: 'I 相談したいです about my 将来のキャリア.',
      aiQuestionText: 'Got something on your mind?',
    },
    intermediate: {
      conversationAnswer: 'I want to talk about my future career because I am thinking about changing jobs.',
      typingAnswer: 'I am thinking about changing jobs.',
      reviewPrompt: 'Review how to explain your reason for career consultation.',
      aiConversationPrompt: 'Tell the AI why you are reconsidering your current path.',
      nativeHint: '転職を考えているので、将来のキャリアについて相談したいです。',
      mixHint: 'I 相談したいです about my 将来のキャリア because I am 転職を考えている.',
      aiQuestionText: 'Why are you thinking about your career?',
    },
    advanced: {
      conversationAnswer: 'I would like to talk about my future career because I am reconsidering my current path and looking for better long-term opportunities.',
      typingAnswer: 'I am reconsidering my current path and looking for better long-term opportunities.',
      reviewPrompt: 'Review how to explain your career situation with nuance and long-term perspective.',
      aiConversationPrompt: 'Discuss with the AI what matters most to you in your future career and why.',
      nativeHint: '今の道を見直して、より良い長期的な機会を探しているので、将来のキャリアについて相談したいです。',
      mixHint: 'I 相談したいです about my 将来のキャリア because I am 今の道を見直して looking for より良い長期的な機会.',
      aiQuestionText: 'What made you rethink your career?',
    },
  },
  walk_to_station: {
    beginner: {
      conversationAnswer: 'I walk to the station every morning.',
      typingAnswer: 'I walk to the station every morning.',
      reviewPrompt: 'Review a simple commuting sentence.',
      aiConversationPrompt: 'Tell the AI how you get to the station.',
      nativeHint: '毎朝、駅まで歩きます。',
      mixHint: 'I 駅まで歩きます every morning.',
      aiQuestionText: 'How do you reach the station?',
    },
    intermediate: {
      conversationAnswer: 'I walk to the station every morning, and it takes about ten minutes.',
      typingAnswer: 'It takes about ten minutes to walk.',
      reviewPrompt: 'Review how to describe duration in a commute.',
      aiConversationPrompt: 'Tell the AI how long it takes to get to the station.',
      nativeHint: '毎朝駅まで歩いていて、10分くらいかかります。',
      mixHint: 'I 駅まで歩いていて every morning, and it takes 10分くらい.',
      aiQuestionText: 'How long does it take to walk?',
    },
    advanced: {
      conversationAnswer: 'I walk to the station every morning because it is a nice way to start the day and get some fresh air.',
      typingAnswer: 'It is a nice way to start the day and get some fresh air.',
      reviewPrompt: 'Review how to explain the benefit of a daily habit.',
      aiConversationPrompt: 'Discuss with the AI how walking affects your morning routine.',
      nativeHint: 'いい気分転換になるので、毎朝駅まで歩いています。',
      mixHint: 'I 駅まで歩いています every morning because it is いい気分転換.',
      aiQuestionText: 'Why do you walk to the station?',
    },
  },
  take_out_the_garbage: {
    beginner: {
      conversationAnswer: 'I take out the garbage in the morning.',
      typingAnswer: 'I take out the garbage in the morning.',
      reviewPrompt: 'Review a simple household chore sentence.',
      aiConversationPrompt: 'Tell the AI when you take out the garbage.',
      nativeHint: '朝、ゴミを出します。',
      mixHint: 'I ゴミを出します in the morning.',
      aiQuestionText: 'When do you take out garbage?',
    },
    intermediate: {
      conversationAnswer: 'I take out the garbage every morning before I leave for work.',
      typingAnswer: 'I take out the garbage before work.',
      reviewPrompt: 'Review how to describe timing of a chore.',
      aiConversationPrompt: 'Tell the AI about your garbage routine.',
      nativeHint: '毎朝、出勤前にゴミを出します。',
      mixHint: 'I ゴミを出します every morning before 出勤.',
      aiQuestionText: 'What do you do before leaving for work?',
    },
    advanced: {
      conversationAnswer: 'I take out the garbage every morning because the collection truck comes early in my neighborhood.',
      typingAnswer: 'The collection truck comes early in my neighborhood.',
      reviewPrompt: 'Review how to explain the reason behind a morning chore.',
      aiConversationPrompt: 'Discuss with the AI how garbage collection works where you live.',
      nativeHint: '近所の収集車が早いので、毎朝ゴミを出します。',
      mixHint: 'I ゴミを出します every morning because 収集車が早い in my neighborhood.',
      aiQuestionText: 'What time does the garbage truck come?',
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
      nativeHint: `これは${label.toLowerCase()}についてです。`,
      mixHint: `This is ${label.toLowerCase()}についてです。`,
      aiQuestionText: `So, tell me about ${label.toLowerCase()}.`,
    },
    intermediate: {
      conversationAnswer: `I want to talk about ${label.toLowerCase()} in daily life.`,
      typingAnswer: `I want to talk about ${label.toLowerCase()} in daily life.`,
      reviewPrompt: `Review useful English expressions for ${label.toLowerCase()}.`,
      aiConversationPrompt: `Explain your experience with ${label.toLowerCase()} to the AI.`,
      nativeHint: `日常生活の中で${label.toLowerCase()}について話したいです。`,
      mixHint: `I want to 日常生活の中で ${label.toLowerCase()} について talk.`,
      aiQuestionText: `How does ${label.toLowerCase()} fit into your daily life?`,
    },
    advanced: {
      conversationAnswer: `I want to explain how ${label.toLowerCase()} affects my daily routine and decisions.`,
      typingAnswer: `I want to explain how ${label.toLowerCase()} affects my daily routine and decisions.`,
      reviewPrompt: `Review more detailed English expressions for ${label.toLowerCase()}.`,
      aiConversationPrompt: `Discuss ${label.toLowerCase()} with the AI in a more detailed and natural way.`,
      nativeHint: `${label.toLowerCase()}が日常の生活や判断にどう影響するか説明したいです。`,
      mixHint: `I want to ${label.toLowerCase()}が日常の生活にどう影響するか explain.`,
      aiQuestionText: `What can you tell me about ${label.toLowerCase()}?`,
    },
  }
}

/**
 * Handcrafted semantic chunks per scene+level.
 * Each chunk is a meaningful English unit with its Japanese meaning.
 * Only includes chunks that are pedagogically useful for beginner–advanced learners.
 */
// Chunk order rule: context/time first → core action → result/feeling
const SCENE_SEMANTIC_CHUNKS: Record<string, Record<LevelBucket, SemanticChunk[]>> = {
  wake_up: {
    beginner: [
      { chunk: 'just woke up', meaning: '起きたばかり', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'just woke up', meaning: '起きたばかり', type: 'phrase' },
      { chunk: 'get ready', meaning: '準備する', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'went to bed late', meaning: '遅く寝た', type: 'phrase' },
      { chunk: 'just woke up', meaning: '起きたばかり', type: 'phrase' },
      { chunk: 'a little tired', meaning: '少し疲れている', type: 'phrase' },
    ],
  },
  alarm_clock: {
    beginner: [
      { chunk: 'alarm clock', meaning: '目覚まし時計', type: 'phrase' },
      { chunk: 'rings', meaning: '鳴る', type: 'word' },
    ],
    intermediate: [
      { chunk: 'alarm clock', meaning: '目覚まし時計', type: 'phrase' },
      { chunk: 'hit snooze', meaning: 'スヌーズを押す', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'going to bed earlier', meaning: '早く寝る', type: 'phrase' },
      { chunk: 'alarm clock', meaning: '目覚まし時計', type: 'phrase' },
      { chunk: 'wake up without it', meaning: 'それなしで起きる', type: 'phrase' },
    ],
  },
  make_bed: {
    beginner: [
      { chunk: 'every morning', meaning: '毎朝', type: 'phrase' },
      { chunk: 'make my bed', meaning: '布団をたたむ', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'right after', meaning: 'すぐ後に', type: 'phrase' },
      { chunk: 'make my bed', meaning: '布団をたたむ', type: 'phrase' },
      { chunk: 'look tidy', meaning: 'きれいに見える', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'make my bed', meaning: '布団をたたむ', type: 'phrase' },
      { chunk: 'a sense of accomplishment', meaning: '達成感', type: 'phrase' },
    ],
  },
  wash_face: {
    beginner: [
      { chunk: 'every morning', meaning: '毎朝', type: 'phrase' },
      { chunk: 'wash my face', meaning: '顔を洗う', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'cold water', meaning: '冷たい水', type: 'phrase' },
      { chunk: 'wash my face', meaning: '顔を洗う', type: 'phrase' },
      { chunk: 'wake up', meaning: '目を覚ます', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'wash my face', meaning: '顔を洗う', type: 'phrase' },
      { chunk: 'feel refreshed', meaning: 'すっきりする', type: 'phrase' },
      { chunk: 'ready to focus', meaning: '集中する準備ができた', type: 'phrase' },
    ],
  },
  brush_teeth: {
    beginner: [
      { chunk: 'after breakfast', meaning: '朝食の後', type: 'phrase' },
      { chunk: 'brush my teeth', meaning: '歯を磨く', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'before I leave', meaning: '出かける前に', type: 'phrase' },
      { chunk: 'carefully', meaning: '丁寧に', type: 'word' },
      { chunk: 'brush my teeth', meaning: '歯を磨く', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'brush my teeth', meaning: '歯を磨く', type: 'phrase' },
      { chunk: 'feel clean', meaning: '清潔に感じる', type: 'phrase' },
      { chunk: 'prepared for the day', meaning: '一日の準備ができた', type: 'phrase' },
    ],
  },
  take_a_shower: {
    beginner: [
      { chunk: 'every morning', meaning: '毎朝', type: 'phrase' },
      { chunk: 'take a shower', meaning: 'シャワーを浴びる', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'right after', meaning: 'すぐ後に', type: 'phrase' },
      { chunk: 'take a shower', meaning: 'シャワーを浴びる', type: 'phrase' },
      { chunk: 'feel awake', meaning: '目が覚める', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'morning routine', meaning: '朝のルーティン', type: 'phrase' },
      { chunk: 'take a shower', meaning: 'シャワーを浴びる', type: 'phrase' },
      { chunk: 'start fresh', meaning: 'さっぱりして始める', type: 'phrase' },
    ],
  },
  get_dressed: {
    beginner: [
      { chunk: 'every morning', meaning: '毎朝', type: 'phrase' },
      { chunk: 'get dressed', meaning: '着替える', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'check the weather', meaning: '天気を確認する', type: 'phrase' },
      { chunk: 'get dressed', meaning: '着替える', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'the night before', meaning: '前の晩に', type: 'phrase' },
      { chunk: 'choose my outfit', meaning: '服を選ぶ', type: 'phrase' },
      { chunk: 'get dressed', meaning: '着替える', type: 'phrase' },
    ],
  },
  make_breakfast: {
    beginner: [
      { chunk: 'every morning', meaning: '毎朝', type: 'phrase' },
      { chunk: 'make breakfast', meaning: '朝食を作る', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'something simple', meaning: '簡単なもの', type: 'phrase' },
      { chunk: 'make breakfast', meaning: '朝食を作る', type: 'phrase' },
      { chunk: 'save time', meaning: '時間を節約する', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'healthy breakfast', meaning: '健康的な朝食', type: 'phrase' },
      { chunk: 'make breakfast', meaning: '朝食を作る', type: 'phrase' },
      { chunk: 'enough energy', meaning: '十分なエネルギー', type: 'phrase' },
    ],
  },
  eat_breakfast: {
    beginner: [
      { chunk: 'at home', meaning: '家で', type: 'phrase' },
      { chunk: 'eat breakfast', meaning: '朝食を食べる', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'with my family', meaning: '家族と一緒に', type: 'phrase' },
      { chunk: 'eat breakfast', meaning: '朝食を食べる', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'a proper meal', meaning: 'ちゃんとした食事', type: 'phrase' },
      { chunk: 'eat breakfast', meaning: '朝食を食べる', type: 'phrase' },
      { chunk: 'stay focused', meaning: '集中力を保つ', type: 'phrase' },
    ],
  },
  clean_up_after_breakfast: {
    beginner: [
      { chunk: 'after breakfast', meaning: '朝食の後', type: 'phrase' },
      { chunk: 'clean up', meaning: '片付ける', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'quickly', meaning: 'すぐに', type: 'word' },
      { chunk: 'clean up', meaning: '片付ける', type: 'phrase' },
      { chunk: 'leave on time', meaning: '時間通りに出る', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'clean up', meaning: '片付ける', type: 'phrase' },
      { chunk: 'peace of mind', meaning: '安心感', type: 'phrase' },
      { chunk: 'heading out', meaning: '出かける', type: 'phrase' },
    ],
  },
}

const TIME_CONTEXT_WORDS = /\b(morning|today|now|yesterday|tomorrow|tonight|every|after|before|right after|night|always|usually)\b/i
const SUBJECT_WORDS = /^(I|you|we|he|she|they|it)\b/i

/**
 * Rule-based priority for chunk ordering.
 * 1 = time/context (shown first), 2 = subject, 3 = verb/action, 4 = other
 */
function getChunkPriority(text: string): number {
  if (TIME_CONTEXT_WORDS.test(text)) return 1
  if (SUBJECT_WORDS.test(text)) return 2
  // Heuristic: phrases starting with a verb-like word (lowercase, no article)
  const first = text.split(/\s+/)[0] ?? ''
  if (/^[a-z]/.test(first) && !/^(a|an|the)\b/.test(text)) return 3
  return 4
}

function getSemanticChunks(sceneKey: string, level: CurrentLevel): SemanticChunk[] | null {
  const bucket = getLevelBucket(level)
  const sceneChunks = SCENE_SEMANTIC_CHUNKS[sceneKey]
  if (!sceneChunks) return null
  const chunks = sceneChunks[bucket]
  if (!chunks || chunks.length === 0) return null

  // Sort: importance first (lower = higher priority), then rule-based priority.
  // Stable sort preserves original order for equal values.
  const sorted = chunks.slice().sort((a, b) => {
    const impA = a.importance ?? Infinity
    const impB = b.importance ?? Infinity
    if (impA !== impB) return impA - impB
    return getChunkPriority(a.chunk) - getChunkPriority(b.chunk)
  })

  return sorted
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
}): { prompt: string; answer: string | null; nativeHint: string | null; mixHint: string | null; aiQuestionText: string | null; semanticChunks: SemanticChunk[] | null } {
  const scene = getSceneContent(input.sceneKey, input.level)
  const chunks = getSemanticChunks(input.sceneKey, input.level)

  const hint = scene.nativeHint || null
  const mix = scene.mixHint || null
  const question = scene.aiQuestionText || null

  switch (input.blockType) {
    case 'conversation':
      return {
        prompt: 'Listen to the English audio carefully and repeat the sentence naturally.',
        answer: scene.conversationAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
      }

    case 'typing':
      return {
        prompt: 'Type the English sentence you heard or the key sentence for this scene.',
        answer: scene.typingAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
      }

    case 'review':
      return {
        prompt: scene.reviewPrompt,
        answer: scene.conversationAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
      }

    case 'ai_conversation':
      return {
        prompt: scene.aiConversationPrompt,
        answer: scene.conversationAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
      }

    default:
      return {
        prompt: `Practice English for this scene: ${input.sceneKey}`,
        answer: scene.conversationAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
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
  // Prefer scenarioLabel from blueprint; fall back to mapping
  const sceneLabel = block.scenarioLabel?.trim() || mapSceneKeyToDisplayLabel(sceneKey, uiLanguage)
  const imagePrompt = block.image_prompt ?? null
  const imageUrl = block.image_url ?? null
  const englishContent = buildEnglishPrompt({
    blockType: block.type,
    sceneKey,
    level,
  })

  const items = [createDraftItem(englishContent.prompt, englishContent.answer, englishContent.nativeHint, englishContent.mixHint, englishContent.aiQuestionText, imageUrl, englishContent.semanticChunks)]

  switch (block.type) {
    case 'conversation':
      return { type: 'conversation', title: block.title, description: sceneLabel, estimatedMinutes: 5, items, image_prompt: imagePrompt }

    case 'typing':
      return { type: 'typing', title: block.title, description: sceneLabel, estimatedMinutes: 4, items, image_prompt: imagePrompt }

    case 'review':
      return { type: 'review', title: block.title, description: sceneLabel, estimatedMinutes: 3, items, image_prompt: imagePrompt }

    case 'ai_conversation':
      return { type: 'ai_conversation', title: block.title, description: sceneLabel, estimatedMinutes: 6, items, image_prompt: imagePrompt }

    default: {
      const _: never = block.type
      return { type: block.type, title: block.title, description: sceneLabel, estimatedMinutes: 3, items, image_prompt: imagePrompt }
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
