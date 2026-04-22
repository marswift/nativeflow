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
import { getLessonContentRepository } from './lesson-content-repository'
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
  /** TTS override for meaning text (e.g. hiragana for correct Japanese reading). */
  meaningTts?: string | null
}

export type LessonBlueprintDraftItem = {
  prompt: string
  answer: string | null
  nativeHint: string | null
  mixHint: string | null
  aiQuestionText: string | null
  aiQuestionChoices?: { label: string; isCorrect: boolean }[] | null
  scaffold_steps: string[] | null
  structured_scaffold_steps: ScaffoldStep[] | null
  semantic_chunks: SemanticChunk[] | null
  image_url: string | null
  /** Additional typing answers from scene variations. Used by TypingMultiRound for diverse prompts. */
  typing_variations?: string[] | null
  /** Related expressions network for scene expansion. */
  related_expressions?: { en: string; ja: string; category: string }[] | null
}

export type LessonBlueprintDraftBlock = {
  type: LessonBlueprintBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonBlueprintDraftItem[]
  image_prompt: string | null
  /** Scene key (e.g. 'wake_up'). Passed through to runtime for image resolution. */
  sceneId: string | null
  /** Scene category (e.g. 'daily-flow'). Passed through to runtime for image resolution. */
  sceneCategory: string | null
  /** Region for conversation variation (e.g. 'en_us_general'). */
  region: string | null
  /** Age group for conversation flavor (e.g. '20s'). */
  ageGroup: string | null
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

/** Phrase variation — only override the fields that change from the base. */
type SceneLevelVariation = {
  conversationAnswer: string
  typingAnswer: string
  nativeHint: string
  mixHint: string
}

type SceneLevelWithVariations = SceneLevelContent & {
  variations?: SceneLevelVariation[]
}

type SceneContent = {
  beginner: SceneLevelWithVariations
  intermediate: SceneLevelWithVariations
  advanced: SceneLevelWithVariations
}

/**
 * Phrase selection mode.
 * - 'base': first exposure or review — always use base phrase
 * - 'variation': second+ exposure in non-review mode — may use a variation
 */
export type PhraseSelectionMode = 'base' | 'variation'

/**
 * Selects base phrase or a variation based on exposure context.
 *
 * Rules:
 * - First exposure (exposureCount <= 1) → base
 * - Review mode → base
 * - No variations exist → base
 * - Otherwise → deterministic pick from variations using sceneId + exposureCount
 *
 * Returns the level content with selected phrases applied.
 */
export function selectScenePhraseVariant(
  sceneKey: string,
  level: CurrentLevel,
  mode: PhraseSelectionMode,
  exposureCount: number
): SceneLevelContent {
  const bucket = getLevelBucket(level)
  const scene = SCENE_CONTENT[sceneKey] ?? getFallbackSceneContent(sceneKey)
  const base = scene[bucket]

  // Always return base for first exposure, review, or missing variations
  if (mode === 'base' || exposureCount <= 1 || !base.variations || base.variations.length === 0) {
    return base
  }

  // Deterministic selection: use exposureCount to pick variation index
  // Subtract 2 because exposureCount 2 = first variation opportunity
  const varIndex = (exposureCount - 2) % base.variations.length
  const variation = base.variations[varIndex]

  return {
    ...base,
    conversationAnswer: variation.conversationAnswer,
    typingAnswer: variation.typingAnswer,
    nativeHint: variation.nativeHint,
    mixHint: variation.mixHint,
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

// highlight is intentionally null until semantic_chunks-based extraction is implemented.
// Previous regex-based extraction produced invalid fragments (e.g. "I every morning").

/**
 * Builds the 3-step scaffold for the Image Understanding stage.
 *
 * Pedagogy:
 *  Step 1 — Target: hear the full target-language sentence first (initial exposure).
 *  Step 2 — Mix:    see a bridged target + native-language version (comprehension aid).
 *  Step 3 — Target: hear the full target-language sentence again (reinforcement).
 */
function buildStructuredScaffoldSteps(
  _nativeHint: string | null,
  mixHint: string | null,
  answer: string | null
): ScaffoldStep[] {
  const mixText = mixHint?.trim() || ''
  const targetText = answer?.trim() || ''

  return [
    {
      step: 1,
      type: 'target',
      text: targetText,
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
  semanticChunks: SemanticChunk[] | null = null,
  typingVariations: string[] | null = null,
  relatedExpressions: { en: string; ja: string; category: string }[] | null = null,
  aiQuestionChoices: { label: string; isCorrect: boolean }[] | null = null
): LessonBlueprintDraftItem {
  const structuredSteps = buildStructuredScaffoldSteps(nativeHint, mixHint, answer)
  const flatSteps = structuredSteps.map((s) => s.text)

  return {
    prompt,
    answer,
    nativeHint,
    mixHint,
    aiQuestionText,
    aiQuestionChoices,
    scaffold_steps: flatSteps,
    structured_scaffold_steps: structuredSteps,
    semantic_chunks: semanticChunks,
    image_url: imageUrl,
    typing_variations: typingVariations,
    related_expressions: relatedExpressions,
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
      variations: [
        { conversationAnswer: "I'm up.", typingAnswer: "I'm up.", nativeHint: '起きた。', mixHint: "I'm 起きた." },
        { conversationAnswer: 'I just got up.', typingAnswer: 'I just got up.', nativeHint: '今起きたとこ。', mixHint: 'I just 起きたとこ.' },
        { conversationAnswer: "Oh, I'm awake.", typingAnswer: "I'm awake.", nativeHint: 'あ、目が覚めた。', mixHint: "Oh, I'm 目が覚めた." },
      ],
    },
    intermediate: {
      conversationAnswer: 'I just woke up, and I need to get ready for the day.',
      typingAnswer: 'I need to get ready for the day.',
      reviewPrompt: 'Review how to describe your morning start in simple English.',
      aiConversationPrompt: 'Tell the AI about your usual morning routine after you wake up.',
      nativeHint: '今起きたところで、今日の準備をしなければなりません。',
      mixHint: 'I 起きたところで、 and I 準備をしなければなりません for the day.',
      aiQuestionText: 'What do you need to get ready?',
      variations: [
        { conversationAnswer: "I'm up — time to get moving.", typingAnswer: 'Time to get moving.', nativeHint: '起きた。さあ動かないと。', mixHint: "I'm 起きた — time to 動かないと." },
        { conversationAnswer: 'Just woke up. Gotta start getting ready.', typingAnswer: 'Gotta start getting ready.', nativeHint: '今起きた。準備しなきゃ。', mixHint: 'Just 起きた. Gotta 準備しなきゃ.' },
        { conversationAnswer: "I just got up, and I've got a lot to do today.", typingAnswer: "I've got a lot to do today.", nativeHint: '今起きた。今日やること多い。', mixHint: "I just 起きた, and I've got やること多い today." },
      ],
    },
    advanced: {
      conversationAnswer: "I just woke up, but I'm still pretty tired — I stayed up too late last night.",
      typingAnswer: "I'm still pretty tired — I stayed up too late last night.",
      reviewPrompt: 'Review how to explain your condition and reason after waking up.',
      aiConversationPrompt: 'Explain to the AI how your sleep affects the rest of your morning.',
      nativeHint: '今起きたけど、昨日夜更かししちゃってまだけっこう眠い。',
      mixHint: "I 起きたけど、I'm still けっこう眠い — I 夜更かしした last night.",
      aiQuestionText: 'Why are you so tired today?',
      variations: [
        { conversationAnswer: "Ugh, I barely slept — I was up way too late last night.", typingAnswer: 'I was up way too late last night.', nativeHint: 'うー、全然寝てない。昨日遅くまで起きてた。', mixHint: 'Ugh, 全然寝てない — I was 遅くまで起きてた last night.' },
        { conversationAnswer: "I'm running on like four hours of sleep — shouldn't have stayed up.", typingAnswer: "I shouldn't have stayed up.", nativeHint: '4時間くらいしか寝てない。夜更かしすべきじゃなかった。', mixHint: "I'm 4時間くらいしか寝てない — shouldn't have 夜更かし." },
        { conversationAnswer: "Just woke up but I feel like I could sleep for another hour.", typingAnswer: 'I could sleep for another hour.', nativeHint: '起きたけどあと1時間寝たい気分。', mixHint: 'Just 起きたけど I could あと1時間 sleep.' },
      ],
    },
  },
  alarm_clock: {
    beginner: {
      conversationAnswer: 'My alarm goes off at seven.',
      typingAnswer: 'My alarm goes off at seven.',
      reviewPrompt: 'Review how to say the time your alarm goes off.',
      aiConversationPrompt: 'Tell the AI what time your alarm goes off.',
      nativeHint: '目覚ましは7時に鳴ります。',
      mixHint: 'My 目覚まし goes off at seven.',
      aiQuestionText: 'What time does your alarm go off?',
      variations: [
        { conversationAnswer: 'I set my alarm for six thirty.', typingAnswer: 'I set my alarm for six thirty.', nativeHint: '目覚ましを6時半にセットした。', mixHint: 'I 目覚ましを set for six thirty.' },
        { conversationAnswer: 'Did you hear the alarm?', typingAnswer: 'Did you hear the alarm?', nativeHint: '目覚まし聞こえた？', mixHint: 'Did you 目覚まし hear?' },
      ],
    },
    intermediate: {
      conversationAnswer: 'My alarm goes off at seven, but I usually hit snooze.',
      typingAnswer: 'I usually hit snooze.',
      reviewPrompt: 'Review how to talk about alarm habits.',
      aiConversationPrompt: 'Tell the AI what happens when your alarm goes off.',
      nativeHint: '目覚ましは7時に鳴るけど、だいたいスヌーズ押しちゃう。',
      mixHint: 'My 目覚まし goes off at seven, but I usually スヌーズ押しちゃう.',
      aiQuestionText: 'Do you hit snooze a lot?',
      variations: [
        { conversationAnswer: 'I set three alarms just to be safe.', typingAnswer: 'I set three alarms just to be safe.', nativeHint: '念のため目覚ましを3つセットしてる。', mixHint: 'I 目覚まし3つ set just to be safe.' },
        { conversationAnswer: 'I keep hitting snooze every morning.', typingAnswer: 'I keep hitting snooze every morning.', nativeHint: '毎朝スヌーズ押し続けちゃう。', mixHint: 'I keep スヌーズ hitting every morning.' },
      ],
    },
    advanced: {
      conversationAnswer: "My alarm's set for seven, but I've been trying to get up on my own by going to bed earlier.",
      typingAnswer: "I've been trying to get up on my own by going to bed earlier.",
      reviewPrompt: 'Review how to explain a habit you are trying to change.',
      aiConversationPrompt: 'Discuss with the AI how you manage your morning alarm routine.',
      nativeHint: '目覚ましは7時にセットしてるけど、早く寝て自力で起きるようにしてる。',
      mixHint: "My 目覚まし is set for seven, but I've been trying to 自力で起きる by 早く寝る.",
      aiQuestionText: 'Are you trying to change your morning routine?',
      variations: [
        { conversationAnswer: "I'm trying to wake up before the alarm — it feels so much better.", typingAnswer: 'It feels so much better to wake up naturally.', nativeHint: '目覚ましより先に起きるようにしてる。その方がずっと気持ちいい。', mixHint: "I'm trying to 目覚ましより先に起きる — ずっと気持ちいい." },
        { conversationAnswer: "I used to need two alarms, but now one is enough.", typingAnswer: 'Now one alarm is enough.', nativeHint: '前は2つ必要だったけど、今は1つで足りる。', mixHint: 'I used to 2つ必要 but now 1つで足りる.' },
      ],
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
      conversationAnswer: 'I make my bed right when I get up — it makes the room look so much better.',
      typingAnswer: 'It makes the room look so much better.',
      reviewPrompt: 'Review how to explain the purpose of a small habit.',
      aiConversationPrompt: 'Tell the AI why you make your bed in the morning.',
      nativeHint: '起きたらすぐベッド整える — 部屋がずっときれいに見えるから。',
      mixHint: 'I ベッド整える right when I 起きる — it 部屋がきれいに見える.',
      aiQuestionText: 'Why do you make your bed right away?',
    },
    advanced: {
      conversationAnswer: "I always make my bed first thing — it's a small win that sets the tone for the day.",
      typingAnswer: "It's a small win that sets the tone for the day.",
      reviewPrompt: 'Review how to connect a small routine to a feeling of achievement.',
      aiConversationPrompt: 'Discuss with the AI how daily habits affect your mindset.',
      nativeHint: '毎朝まずベッドを整える。小さな達成感で一日の調子が決まるから。',
      mixHint: "I always ベッドを整える first thing — it's 小さな達成感 that sets the tone.",
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
      variations: [
        { conversationAnswer: 'I washed my face just now.', typingAnswer: 'I washed my face just now.', nativeHint: 'たった今、顔を洗った。', mixHint: 'I 顔を洗った just now.' },
        { conversationAnswer: 'I need to go wash my face.', typingAnswer: 'I need to go wash my face.', nativeHint: '顔を洗いに行かないと。', mixHint: 'I need to 顔を洗いに行く.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I splash cold water on my face to wake myself up.',
      typingAnswer: 'I splash cold water on my face.',
      reviewPrompt: 'Review how to explain a small habit and its purpose.',
      aiConversationPrompt: 'Tell the AI about your morning self-care routine.',
      nativeHint: '目を覚ますのに冷たい水で顔をバシャッと洗う。',
      mixHint: 'I 冷たい水で顔を splash to 目を覚ます.',
      aiQuestionText: 'How do you wash your face?',
      variations: [
        { conversationAnswer: 'I use warm water when I wash my face at night.', typingAnswer: 'I use warm water at night.', nativeHint: '夜はお湯で顔を洗う。', mixHint: 'I お湯で wash my face at night.' },
        { conversationAnswer: "I can't start my day without washing my face.", typingAnswer: "I can't start my day without it.", nativeHint: '顔を洗わないと一日が始まらない。', mixHint: "I can't 一日が始まらない without it." },
      ],
    },
    advanced: {
      conversationAnswer: 'I always wash my face with cold water — it wakes me right up and gets me going.',
      typingAnswer: 'It wakes me right up and gets me going.',
      reviewPrompt: 'Review how to connect a routine with its effect in natural English.',
      aiConversationPrompt: 'Discuss with the AI how small morning habits affect your mood and productivity.',
      nativeHint: '冷たい水で顔を洗うと一気に目が覚めてやる気が出る。',
      mixHint: 'I always 顔を洗う with cold water — it 一気に目が覚めて gets me going.',
      aiQuestionText: 'Does cold water really help you wake up?',
      variations: [
        { conversationAnswer: "Washing my face is the first thing I do — it's like a reset button.", typingAnswer: "It's like a reset button for me.", nativeHint: '顔を洗うのが最初にやること。リセットボタンみたい。', mixHint: "It's like a リセットボタン for me." },
        { conversationAnswer: "I've tried skipping it but I just feel groggy all morning.", typingAnswer: 'I just feel groggy all morning.', nativeHint: 'やめてみたけど午前中ずっとぼーっとする。', mixHint: 'I just ぼーっとする all morning.' },
      ],
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
      variations: [
        { conversationAnswer: 'I brushed my teeth this morning.', typingAnswer: 'I brushed my teeth this morning.', nativeHint: '今朝、歯を磨いた。', mixHint: 'I 歯を磨いた this morning.' },
        { conversationAnswer: "Don't forget to brush your teeth.", typingAnswer: "Don't forget to brush your teeth.", nativeHint: '歯磨き忘れないでね。', mixHint: "Don't forget to 歯磨き." },
      ],
    },
    intermediate: {
      conversationAnswer: 'I always brush my teeth after breakfast before I head out.',
      typingAnswer: 'I brush my teeth before I head out.',
      reviewPrompt: 'Review how to describe order and timing in a routine.',
      aiConversationPrompt: 'Describe your morning routine in order to the AI.',
      nativeHint: '出かける前に朝ごはんの後、必ず歯を磨く。',
      mixHint: 'I always 歯を磨く after breakfast before I 出かける.',
      aiQuestionText: 'What do you do before heading out?',
      variations: [
        { conversationAnswer: 'I brush my teeth at least twice a day.', typingAnswer: 'I brush my teeth at least twice a day.', nativeHint: '1日に少なくとも2回は歯を磨く。', mixHint: 'I 歯を磨く at least 2回 a day.' },
        { conversationAnswer: 'I forgot to brush my teeth this morning.', typingAnswer: 'I forgot to brush my teeth this morning.', nativeHint: '今朝、歯を磨くの忘れた。', mixHint: 'I forgot to 歯を磨く this morning.' },
      ],
    },
    advanced: {
      conversationAnswer: "I never leave the house without brushing my teeth — it just doesn't feel right.",
      typingAnswer: "It just doesn't feel right to skip it.",
      reviewPrompt: 'Review how to explain a daily action with intention and feeling.',
      aiConversationPrompt: 'Explain to the AI why small routines help you feel more confident during the day.',
      nativeHint: '歯を磨かないで家を出るなんてありえない — なんか気持ち悪い。',
      mixHint: "I never 歯を磨かないで出る — it just doesn't しっくりくる.",
      aiQuestionText: 'Do you ever skip brushing your teeth?',
      variations: [
        { conversationAnswer: "I'm pretty strict about brushing — morning and night, no exceptions.", typingAnswer: 'Morning and night, no exceptions.', nativeHint: '朝と夜、例外なし。歯磨きはちゃんとやる。', mixHint: '朝と夜、例外なし — no exceptions.' },
        { conversationAnswer: "I keep a toothbrush at the office just in case.", typingAnswer: 'I keep a toothbrush at the office.', nativeHint: '念のためにオフィスに歯ブラシ置いてる。', mixHint: 'I オフィスに歯ブラシ keep just in case.' },
      ],
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
      variations: [
        { conversationAnswer: 'I took a shower after breakfast.', typingAnswer: 'I took a shower after breakfast.', nativeHint: '朝ごはんの後シャワーを浴びた。', mixHint: 'I シャワーを浴びた after breakfast.' },
        { conversationAnswer: 'I need to take a shower.', typingAnswer: 'I need to take a shower.', nativeHint: 'シャワーを浴びないと。', mixHint: 'I need to シャワーを浴びる.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I take a quick shower in the morning before getting dressed.',
      typingAnswer: 'I take a quick shower before getting dressed.',
      reviewPrompt: 'Review how to describe order in your routine.',
      aiConversationPrompt: 'Tell the AI how long your usual shower takes and why.',
      nativeHint: '着替える前に朝、さっとシャワーを浴びます。',
      mixHint: 'I さっとシャワーを浴びます in the morning before 着替える.',
      aiQuestionText: 'What do you do before getting dressed?',
      variations: [
        { conversationAnswer: 'I usually shower for about five minutes.', typingAnswer: 'I usually shower for about five minutes.', nativeHint: 'だいたい5分くらいシャワー浴びる。', mixHint: 'I usually 5分くらい shower.' },
        { conversationAnswer: 'I prefer taking a shower at night.', typingAnswer: 'I prefer taking a shower at night.', nativeHint: '夜にシャワーを浴びる方が好き。', mixHint: 'I prefer 夜に shower.' },
      ],
    },
    advanced: {
      conversationAnswer: "I always grab a quick shower in the morning — it really wakes me up.",
      typingAnswer: 'It really wakes me up.',
      reviewPrompt: 'Review how to connect a daily action with its practical effect.',
      aiConversationPrompt: 'Discuss with the AI how your morning routine changes on busy days.',
      nativeHint: '朝はいつもさっとシャワー浴びる。ほんとに目が覚める。',
      mixHint: 'I always さっとシャワー浴びる in the morning — it really 目が覚める.',
      aiQuestionText: 'Why do you shower in the morning?',
      variations: [
        { conversationAnswer: "A hot shower at night is the best way to unwind.", typingAnswer: 'A hot shower is the best way to unwind.', nativeHint: '夜の熱いシャワーが最高のリラックス。', mixHint: 'A 熱いシャワー is the best way to リラックス.' },
        { conversationAnswer: "I can't function in the morning without a shower first.", typingAnswer: "I can't function without a shower first.", nativeHint: 'シャワー浴びないと朝動けない。', mixHint: "I can't 動けない without a shower first." },
      ],
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
      conversationAnswer: "I get dressed fast so I don't miss my train.",
      typingAnswer: "I don't want to miss my train.",
      reviewPrompt: 'Review how to explain a reason in a short sentence.',
      aiConversationPrompt: 'Tell the AI how you choose your clothes for work or school.',
      nativeHint: '電車に乗り遅れたくないから急いで着替える。',
      mixHint: "I 急いで着替える so I don't 乗り遅れる my train.",
      aiQuestionText: 'Why do you get dressed so fast?',
    },
    advanced: {
      conversationAnswer: "I try to get ready quickly so I'm not rushing out the door.",
      typingAnswer: "I don't want to be rushing out the door.",
      reviewPrompt: 'Review how to describe efficiency and emotional state in a routine.',
      aiConversationPrompt: 'Explain to the AI how your clothes affect your confidence or mood during the day.',
      nativeHint: '焦って出かけたくないから、さっと準備するようにしてる。',
      mixHint: "I try to さっと準備する so I'm not 焦って出かける.",
      aiQuestionText: 'How do you avoid rushing in the morning?',
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
      variations: [
        { conversationAnswer: 'I cook breakfast every day.', typingAnswer: 'I cook breakfast every day.', nativeHint: '毎日朝ごはん作る。', mixHint: 'I 朝ごはん cook every day.' },
        { conversationAnswer: 'I always fix something for breakfast.', typingAnswer: 'I fix something for breakfast.', nativeHint: 'いつも朝ごはんは何か作る。', mixHint: 'I always 何か fix for breakfast.' },
        { conversationAnswer: 'I make myself breakfast before I leave.', typingAnswer: 'I make breakfast before I leave.', nativeHint: '出かける前に朝ごはん作る。', mixHint: 'I 朝ごはん作る before I 出かける.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I make something simple when I have time in the morning.',
      typingAnswer: 'I make something simple when I have time.',
      reviewPrompt: 'Review how to talk about routine and condition.',
      aiConversationPrompt: 'Tell the AI what breakfast you make on busy mornings and relaxed mornings.',
      nativeHint: '朝、時間があるときは何か簡単なもの作る。',
      mixHint: 'I 何か簡単なもの作る when I 時間がある in the morning.',
      aiQuestionText: 'What do you usually make?',
      variations: [
        { conversationAnswer: "If I have time, I'll throw something together.", typingAnswer: "I'll throw something together.", nativeHint: '時間あればさっと何か作る。', mixHint: "If 時間あれば, I'll さっと何か throw together." },
        { conversationAnswer: 'I usually whip up something quick before work.', typingAnswer: 'I whip up something quick.', nativeHint: '仕事前にさっと何か作ることが多い。', mixHint: 'I usually さっと何か whip up before work.' },
        { conversationAnswer: "On good mornings, I'll actually make a proper breakfast.", typingAnswer: "I'll make a proper breakfast.", nativeHint: '余裕のある朝はちゃんと朝ごはん作る。', mixHint: "On 余裕のある朝, I'll ちゃんと make breakfast." },
      ],
    },
    advanced: {
      conversationAnswer: "I try to eat something healthy so I don't run out of energy later.",
      typingAnswer: "I don't want to run out of energy later.",
      reviewPrompt: 'Review how to express purpose and healthy habits naturally.',
      aiConversationPrompt: 'Discuss with the AI how your breakfast choices affect your concentration later in the day.',
      nativeHint: '後でバテないように、なるべく体にいいもの食べるようにしてる。',
      mixHint: "I try to 体にいいもの食べる so I don't 後でバテる.",
      aiQuestionText: 'Why do you try to eat healthy?',
      variations: [
        { conversationAnswer: "I need a solid breakfast or I'll crash by noon.", typingAnswer: "I'll crash by noon.", nativeHint: 'ちゃんと食べないと昼までもたない。', mixHint: "I need ちゃんと breakfast or 昼までもたない." },
        { conversationAnswer: "Skipping breakfast isn't an option for me — I need fuel to get through the morning.", typingAnswer: 'I need fuel to get through the morning.', nativeHint: '朝抜きは無理。午前中乗り切るにはエネルギーがいる。', mixHint: "朝抜き isn't an option — I need エネルギー to get through the morning." },
        { conversationAnswer: "If I eat well in the morning, the rest of my day just goes smoother.", typingAnswer: 'The rest of my day goes smoother.', nativeHint: '朝ちゃんと食べると一日がスムーズ。', mixHint: 'If I 朝ちゃんと食べると, the rest of my day just スムーズ.' },
      ],
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
      variations: [
        { conversationAnswer: 'I had toast and coffee for breakfast.', typingAnswer: 'I had toast and coffee for breakfast.', nativeHint: '朝はトーストとコーヒーだった。', mixHint: 'I トーストとコーヒー had for breakfast.' },
        { conversationAnswer: 'I eat breakfast around seven.', typingAnswer: 'I eat breakfast around seven.', nativeHint: '7時くらいに朝ごはんを食べる。', mixHint: 'I 朝ごはん食べる around seven.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I have breakfast with my family before everyone heads out.',
      typingAnswer: 'I have breakfast with my family.',
      reviewPrompt: 'Review how to describe who you eat with and when.',
      aiConversationPrompt: 'Tell the AI about your breakfast routine with your family.',
      nativeHint: 'みんなが出かける前に家族と朝ごはん食べる。',
      mixHint: 'I 家族と朝ごはん食べる before everyone 出かける.',
      aiQuestionText: 'Who do you have breakfast with?',
      variations: [
        { conversationAnswer: 'I usually eat something light in the morning.', typingAnswer: 'I usually eat something light.', nativeHint: '朝はだいたい軽く食べる。', mixHint: 'I usually 軽く食べる in the morning.' },
        { conversationAnswer: "I try to sit down for breakfast, not just grab something.", typingAnswer: 'I try to sit down for breakfast.', nativeHint: '立ち食いじゃなくて、ちゃんと座って食べるようにしてる。', mixHint: 'I try to ちゃんと座って for breakfast.' },
      ],
    },
    advanced: {
      conversationAnswer: "I always eat breakfast at home — if I skip it, I can't focus at all.",
      typingAnswer: "If I skip it, I can't focus at all.",
      reviewPrompt: 'Review how to explain the benefit of a daily routine.',
      aiConversationPrompt: 'Discuss with the AI how eating breakfast affects your performance during the day.',
      nativeHint: '朝ごはんは絶対家で食べる。抜くと全然集中できない。',
      mixHint: "I always 朝ごはん食べる at home — 抜くと I can't 集中できない at all.",
      aiQuestionText: 'What happens if you skip breakfast?',
      variations: [
        { conversationAnswer: "Breakfast is the one meal I never skip — it sets the tone for my whole day.", typingAnswer: 'It sets the tone for my whole day.', nativeHint: '朝ごはんだけは絶対抜かない。一日の調子が決まる。', mixHint: 'It 一日の調子が決まる for my whole day.' },
        { conversationAnswer: "I used to skip breakfast all the time, but I felt so sluggish.", typingAnswer: 'I felt so sluggish without it.', nativeHint: '前はよく朝抜いてたけど、だるかった。', mixHint: 'I felt so だるかった without it.' },
      ],
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
      conversationAnswer: 'I clean up right after breakfast so I can get out the door on time.',
      typingAnswer: 'I clean up so I can leave on time.',
      reviewPrompt: 'Review how to express doing something quickly with a reason.',
      aiConversationPrompt: 'Tell the AI how you manage time after breakfast.',
      nativeHint: '時間通りに出られるように、朝ごはんの後すぐ片付ける。',
      mixHint: 'I 片付ける right after breakfast so I can 時間通りに出る.',
      aiQuestionText: 'How do you manage your time after breakfast?',
    },
    advanced: {
      conversationAnswer: "I always clean up after breakfast — I can't leave with a messy kitchen.",
      typingAnswer: "I can't leave with a messy kitchen.",
      reviewPrompt: 'Review how to connect a chore to an emotional benefit.',
      aiConversationPrompt: 'Discuss with the AI why keeping things tidy in the morning matters to you.',
      nativeHint: '朝ごはんの後は絶対片付ける。キッチン散らかったまま出られない。',
      mixHint: "I always 片付ける after breakfast — キッチン散らかったまま I can't 出る.",
      aiQuestionText: 'Why do you always clean up first?',
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
      conversationAnswer: 'I take the train to work and switch lines once.',
      typingAnswer: 'I switch lines once.',
      reviewPrompt: 'Review how to describe a commute with one extra detail.',
      aiConversationPrompt: 'Tell the AI what your commute is usually like.',
      nativeHint: '電車で通勤してて、一回乗り換える。',
      mixHint: 'I 電車で通勤してて and 一回乗り換える.',
      aiQuestionText: 'Do you have to switch trains?',
    },
    advanced: {
      conversationAnswer: 'I take the train every day — I usually use the ride to check my schedule and get my head ready.',
      typingAnswer: 'I use the ride to check my schedule and get my head ready.',
      reviewPrompt: 'Review how to add purpose and reflection to a daily commute.',
      aiConversationPrompt: 'Explain to the AI how commuting affects your energy, focus, or schedule.',
      nativeHint: '毎日電車通勤してて、乗ってる間にスケジュール確認して頭を切り替える。',
      mixHint: 'I 毎日電車通勤してて — I use the ride to スケジュール確認して頭を切り替える.',
      aiQuestionText: 'What do you do on the train?',
    },
  },
  greet_coworkers: {
    beginner: {
      conversationAnswer: 'I say good morning at work.',
      typingAnswer: 'I say good morning at work.',
      reviewPrompt: 'Review a basic workplace greeting sentence.',
      aiConversationPrompt: 'Tell the AI how you greet people at work or school.',
      nativeHint: '職場のみんなにおはようって言う。',
      mixHint: 'I みんなに say おはよう at work.',
      aiQuestionText: 'What do you say at work?',
      variations: [
        { conversationAnswer: 'I say hi to everyone when I get in.', typingAnswer: 'I say hi to everyone.', nativeHint: '着いたらみんなに挨拶する。', mixHint: 'I みんなに say hi when I get in.' },
        { conversationAnswer: "Good morning! That's the first thing I say.", typingAnswer: "That's the first thing I say.", nativeHint: 'おはよう！まずそれ言う。', mixHint: "おはよう! That's the first thing I 言う." },
        { conversationAnswer: 'I greet my coworkers every morning.', typingAnswer: 'I greet my coworkers.', nativeHint: '毎朝同僚に挨拶する。', mixHint: 'I 同僚に greet every morning.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I always say good morning when I get to the office.',
      typingAnswer: 'I say good morning when I get to the office.',
      reviewPrompt: 'Review how to describe a routine social action at work.',
      aiConversationPrompt: 'Tell the AI why greetings matter in your workplace or school.',
      nativeHint: 'オフィス着いたら必ずおはようって言う。',
      mixHint: 'I always おはようって言う when I get to the office.',
      aiQuestionText: 'What do you do when you get there?',
      variations: [
        { conversationAnswer: 'The first thing I do at work is say hi to the team.', typingAnswer: 'I say hi to the team.', nativeHint: '仕事で最初にやるのはチームに挨拶。', mixHint: 'The first thing I do is チームに say hi.' },
        { conversationAnswer: "I make it a point to greet everyone — it's just my thing.", typingAnswer: "It's just my thing.", nativeHint: '挨拶するのは自分のこだわり。', mixHint: "I make it a point to みんなに greet — it's 自分のこだわり." },
        { conversationAnswer: 'I never skip saying good morning — even on busy days.', typingAnswer: 'Even on busy days.', nativeHint: '忙しい日でもおはようは必ず言う。', mixHint: 'I never skip おはよう — even on 忙しい日.' },
      ],
    },
    advanced: {
      conversationAnswer: "I always make sure to say hi to everyone — it sets a good vibe for the day.",
      typingAnswer: 'It sets a good vibe for the day.',
      reviewPrompt: 'Review how to explain social purpose in a workplace routine.',
      aiConversationPrompt: 'Discuss with the AI how small communication habits influence teamwork.',
      nativeHint: '必ずみんなに挨拶する。一日のいい雰囲気が作れるから。',
      mixHint: 'I always make sure to みんなに挨拶する — it sets いい雰囲気 for the day.',
      aiQuestionText: 'Why do you always say hi to everyone?',
      variations: [
        { conversationAnswer: "A quick hello goes a long way — people notice when you don't say it.", typingAnswer: "People notice when you don't say it.", nativeHint: 'さっと挨拶するだけで全然違う。言わないと気づかれる。', mixHint: "A quick hello goes a long way — 言わないと people notice." },
        { conversationAnswer: "I like starting the day with a friendly face — it makes the whole office feel more relaxed.", typingAnswer: 'It makes the whole office feel more relaxed.', nativeHint: '笑顔で始めると職場全体がリラックスする。', mixHint: 'I like 笑顔で始める — it makes the office feel リラックス.' },
        { conversationAnswer: "Saying good morning is such a small thing, but it really sets the tone.", typingAnswer: 'It really sets the tone.', nativeHint: 'おはようって言うだけだけど、雰囲気が変わる。', mixHint: 'おはよう is such a small thing, but it really 雰囲気が変わる.' },
      ],
    },
  },
  shop_at_the_supermarket: {
    beginner: {
      conversationAnswer: 'I go to the supermarket.',
      typingAnswer: 'I go to the supermarket.',
      reviewPrompt: 'Review a simple shopping sentence.',
      aiConversationPrompt: 'Tell the AI what you usually buy at the supermarket.',
      nativeHint: '仕事の後にスーパーに行きます。',
      mixHint: 'I スーパーに行きます after work.',
      aiQuestionText: 'Where do you go after work?',
      variations: [
        { conversationAnswer: 'I stop at the store on my way home.', typingAnswer: 'I stop at the store.', nativeHint: '帰りにお店に寄る。', mixHint: 'I お店に stop on my way home.' },
        { conversationAnswer: 'I go grocery shopping after work.', typingAnswer: 'I go grocery shopping.', nativeHint: '仕事の後に買い物する。', mixHint: 'I 買い物する after work.' },
        { conversationAnswer: 'I pick up groceries on the way home.', typingAnswer: 'I pick up groceries.', nativeHint: '帰りに食材を買う。', mixHint: 'I 食材を pick up on the way home.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I stop by the supermarket after work to pick up stuff for dinner.',
      typingAnswer: 'I pick up stuff for dinner after work.',
      reviewPrompt: 'Review how to describe shopping purpose naturally.',
      aiConversationPrompt: 'Tell the AI what you usually cook after shopping.',
      nativeHint: '仕事帰りにスーパー寄って、晩ごはんの材料買う。',
      mixHint: 'I スーパー寄る after work to 晩ごはんの材料買う.',
      aiQuestionText: 'What do you pick up at the store?',
      variations: [
        { conversationAnswer: "I swing by the grocery store to grab what I need for tonight.", typingAnswer: 'I grab what I need for tonight.', nativeHint: '今夜のものを買いにスーパーに寄る。', mixHint: 'I スーパーに寄る to grab 今夜のもの.' },
        { conversationAnswer: "I usually hit the supermarket on my way back — it's right by the station.", typingAnswer: "It's right by the station.", nativeHint: '帰りにスーパー寄るのが定番。駅のすぐそば。', mixHint: "I usually 帰りにスーパー寄る — it's 駅のすぐそば." },
        { conversationAnswer: "I pop into the store real quick after work to get dinner stuff.", typingAnswer: 'I get dinner stuff.', nativeHint: '仕事後にさっとスーパー寄って夕飯の買い物。', mixHint: 'I さっと pop into the store after work to 夕飯の買い物.' },
      ],
    },
    advanced: {
      conversationAnswer: 'I usually swing by the store after work to grab something fresh and cook at home.',
      typingAnswer: 'I grab something fresh and cook at home.',
      reviewPrompt: 'Review how to connect shopping, planning, and home life in one sentence.',
      aiConversationPrompt: 'Explain to the AI how you decide what to buy and cook on weekdays.',
      nativeHint: '仕事帰りにスーパー寄って、新鮮なもの買って家で作ることが多い。',
      mixHint: 'I usually スーパー寄る after work to 新鮮なもの買って家で cook.',
      aiQuestionText: 'Do you cook at home a lot?',
      variations: [
        { conversationAnswer: "I try to shop fresh every day — I don't like buying too much at once.", typingAnswer: "I don't like buying too much at once.", nativeHint: '毎日新鮮なの買うようにしてる。まとめ買いは好きじゃない。', mixHint: "I try to 毎日新鮮な shop — まとめ買い don't like." },
        { conversationAnswer: "Grocery shopping after work is kind of my routine now — it helps me plan dinner.", typingAnswer: 'It helps me plan dinner.', nativeHint: '仕事帰りの買い物がルーティンになった。夕飯の計画に役立つ。', mixHint: '仕事帰りの買い物 is kind of my routine — it helps me 夕飯の計画.' },
        { conversationAnswer: "I like picking stuff up fresh and figuring out what to make on the spot.", typingAnswer: 'I figure out what to make on the spot.', nativeHint: '新鮮なの選んで、その場で何作るか決めるのが好き。', mixHint: 'I like 新鮮なの picking up and その場で figuring out what to make.' },
      ],
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
      variations: [
        { conversationAnswer: 'I stopped at the store.', typingAnswer: 'I stopped at the store.', nativeHint: 'お店に寄った。', mixHint: 'I お店に stopped.' },
        { conversationAnswer: 'I ran to the convenience store.', typingAnswer: 'I ran to the store.', nativeHint: 'コンビニに走った。', mixHint: 'I コンビニに ran.' },
        { conversationAnswer: 'I popped into the store real quick.', typingAnswer: 'I popped into the store.', nativeHint: 'ちょっとお店に寄った。', mixHint: 'I ちょっと popped into the store.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I went to the convenience store to buy a drink and a quick snack.',
      typingAnswer: 'I bought a drink and a quick snack.',
      reviewPrompt: 'Review how to talk about a short errand with details.',
      aiConversationPrompt: 'Tell the AI when convenience stores are useful in your daily life.',
      nativeHint: '飲み物と軽食を買いにコンビニに行きました。',
      mixHint: 'I コンビニに行きました to buy 飲み物と軽食.',
      aiQuestionText: 'What did you buy at the store?',
      variations: [
        { conversationAnswer: 'I grabbed a coffee and a snack at the convenience store.', typingAnswer: 'I grabbed a coffee and a snack.', nativeHint: 'コンビニでコーヒーと軽食を買った。', mixHint: 'I コンビニで コーヒーと軽食 grabbed.' },
        { conversationAnswer: 'I swung by the store to pick up something to drink.', typingAnswer: 'I picked up something to drink.', nativeHint: '飲み物買いにお店に寄った。', mixHint: 'I お店に寄った to pick up 飲み物.' },
        { conversationAnswer: "I hit the convenience store for a quick bite — didn't want to wait.", typingAnswer: "I didn't want to wait.", nativeHint: '待ちたくなくてコンビニでさっと買った。', mixHint: "I コンビニ hit for a quick bite — 待ちたくなかった." },
      ],
    },
    advanced: {
      conversationAnswer: "I stopped by the convenience store — I needed something quick and didn't have time to cook.",
      typingAnswer: "I didn't have time to cook.",
      reviewPrompt: 'Review how to explain the reason behind a quick decision.',
      aiConversationPrompt: 'Discuss with the AI how convenience and health sometimes conflict in daily life.',
      nativeHint: 'コンビニ寄った。何かさっと食べたくて、料理する時間なかったから。',
      mixHint: "I コンビニ寄った — 何かさっと needed and didn't have time to 料理する.",
      aiQuestionText: 'Why did you stop at the convenience store?',
      variations: [
        { conversationAnswer: "I just ducked into the convenience store — I was starving and couldn't be bothered to cook.", typingAnswer: "I couldn't be bothered to cook.", nativeHint: 'コンビニにさっと寄った。お腹すいて料理する気にならなかった。', mixHint: "I さっと convenience store — お腹すいて couldn't be bothered to 料理する." },
        { conversationAnswer: "I grabbed something from the store on my way home — I was too beat to cook.", typingAnswer: 'I was too beat to cook.', nativeHint: '帰りにお店で何か買った。疲れすぎて料理する気力なかった。', mixHint: "I 帰りに store で何か grabbed — too 疲れて to cook." },
        { conversationAnswer: "Ended up at the convenience store again — one of those days where cooking just wasn't happening.", typingAnswer: "Cooking just wasn't happening.", nativeHint: 'またコンビニになった。料理する気分じゃない日だった。', mixHint: "またコンビニ — one of those days where 料理 wasn't happening." },
      ],
    },
  },
  come_home: {
    beginner: {
      conversationAnswer: 'I got home in the evening.',
      typingAnswer: 'I got home in the evening.',
      reviewPrompt: 'Review a simple sentence about coming home.',
      aiConversationPrompt: 'Tell the AI what you usually do when you get home.',
      nativeHint: '夕方、家に着いた。',
      mixHint: 'I 家に着いた in the evening.',
      aiQuestionText: 'When did you get home?',
      variations: [
        { conversationAnswer: "I'm home.", typingAnswer: "I'm home.", nativeHint: 'ただいま。', mixHint: "I'm ただいま." },
        { conversationAnswer: 'I made it home.', typingAnswer: 'I made it home.', nativeHint: '家に着いた。', mixHint: 'I 家に made it.' },
        { conversationAnswer: 'I just got back.', typingAnswer: 'I just got back.', nativeHint: '今帰った。', mixHint: 'I just 帰った.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I got home and took a quick break before dinner.',
      typingAnswer: 'I took a quick break before dinner.',
      reviewPrompt: 'Review how to connect two evening actions in one sentence.',
      aiConversationPrompt: 'Describe your usual evening routine after coming home.',
      nativeHint: '帰ってきて、晩ごはんの前にちょっと休憩した。',
      mixHint: 'I 帰ってきて and ちょっと休憩した before dinner.',
      aiQuestionText: 'What did you do when you got home?',
      variations: [
        { conversationAnswer: 'First thing I did when I got home was sit down and relax.', typingAnswer: 'I sat down and relaxed.', nativeHint: '帰ってまず座ってリラックスした。', mixHint: 'First thing I 帰って was 座ってリラックス.' },
        { conversationAnswer: 'I got home and just crashed on the couch for a bit.', typingAnswer: 'I crashed on the couch.', nativeHint: '帰ってソファでちょっとダラダラした。', mixHint: 'I 帰って and just ソファでダラダラ for a bit.' },
        { conversationAnswer: "I took it easy for a few minutes after I got back — I needed it.", typingAnswer: 'I needed it.', nativeHint: '帰ってから数分ゆっくりした。必要だった。', mixHint: 'I 帰ってから数分ゆっくりした — I needed it.' },
      ],
    },
    advanced: {
      conversationAnswer: 'When I got home, I took a break to recharge before jumping into dinner and chores.',
      typingAnswer: 'I took a break to recharge before jumping into chores.',
      reviewPrompt: 'Review how to describe transition and purpose in your evening routine.',
      aiConversationPrompt: 'Explain to the AI how you shift mentally from work or school mode to home mode.',
      nativeHint: '帰ったら、晩ごはんや家事に取りかかる前にちょっと充電タイム。',
      mixHint: 'When I 帰ったら, I took a break to 充電する before jumping into 家事.',
      aiQuestionText: 'Do you take a break when you get home?',
      variations: [
        { conversationAnswer: "I always give myself like ten minutes to decompress before I start doing anything.", typingAnswer: 'I give myself ten minutes to decompress.', nativeHint: '何かする前に10分くらい気持ちを落ち着ける。', mixHint: 'I always 10分くらい decompress before I 何かする.' },
        { conversationAnswer: "I need a little downtime when I get home — otherwise I burn out by nine.", typingAnswer: 'Otherwise I burn out by nine.', nativeHint: '帰ったら少し休まないと9時にはバテる。', mixHint: 'I need 帰ったら少し休む — otherwise 9時には burn out.' },
        { conversationAnswer: "Getting home and doing nothing for a few minutes is how I reset.", typingAnswer: "That's how I reset.", nativeHint: '帰って数分何もしないのがリセット方法。', mixHint: '帰って数分何もしない is how I reset.' },
      ],
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
      variations: [
        { conversationAnswer: 'I cook dinner myself.', typingAnswer: 'I cook dinner myself.', nativeHint: '自分で夕飯作る。', mixHint: 'I 自分で dinner cook.' },
        { conversationAnswer: 'I fix dinner at home.', typingAnswer: 'I fix dinner at home.', nativeHint: '家でごはん作る。', mixHint: 'I ごはん fix at home.' },
        { conversationAnswer: 'I make something for dinner every night.', typingAnswer: 'I make something every night.', nativeHint: '毎晩何か作る。', mixHint: 'I 毎晩何か make for dinner.' },
      ],
    },
    intermediate: {
      conversationAnswer: "I cook at home — it's cheaper and healthier.",
      typingAnswer: "It's cheaper and healthier.",
      reviewPrompt: 'Review how to give a simple opinion with reasons.',
      aiConversationPrompt: 'Tell the AI what kind of dinner is easy for you to make on weekdays.',
      nativeHint: '家で作る。安いし体にもいいし。',
      mixHint: "I 家で作る — it's 安いし体にもいい.",
      aiQuestionText: 'Why do you cook at home?',
      variations: [
        { conversationAnswer: "I'd rather cook than eat out — I feel better when I make my own food.", typingAnswer: 'I feel better when I make my own food.', nativeHint: '外食より自炊のほうがいい。自分で作ると調子がいい。', mixHint: "I'd rather 自炊 than eat out — 自分で作ると I feel better." },
        { conversationAnswer: "Cooking at home just makes more sense — it's easy and saves money.", typingAnswer: "It's easy and saves money.", nativeHint: '家で作るほうが合理的。楽だしお金も浮く。', mixHint: '家で作る just makes more sense — 楽 and saves money.' },
        { conversationAnswer: "I try to cook most nights — eating out gets expensive fast.", typingAnswer: 'Eating out gets expensive fast.', nativeHint: 'なるべく自炊する。外食はすぐお金かかるから。', mixHint: 'I try to なるべく自炊する — 外食 gets expensive fast.' },
      ],
    },
    advanced: {
      conversationAnswer: "I usually cook at home — it saves money and I know exactly what I'm eating.",
      typingAnswer: "It saves money and I know exactly what I'm eating.",
      reviewPrompt: 'Review how to compare benefits in a natural spoken sentence.',
      aiConversationPrompt: 'Discuss with the AI how your dinner habits affect your health, budget, or schedule.',
      nativeHint: 'だいたい家で作る。お金も浮くし、何食べてるか分かるから。',
      mixHint: "I usually 家で作る — it saves money and 何食べてるか I know exactly.",
      aiQuestionText: 'Do you prefer cooking at home?',
      variations: [
        { conversationAnswer: "Cooking at home gives me way more control — I can make exactly what I want.", typingAnswer: 'I can make exactly what I want.', nativeHint: '家で作ると自由度が全然違う。食べたいもの作れる。', mixHint: '家で作る gives me way more control — 食べたいもの I can make.' },
        { conversationAnswer: "I actually enjoy cooking dinner — it's kind of how I wind down after work.", typingAnswer: "It's how I wind down after work.", nativeHint: '夕飯作るの実は好き。仕事の後のリラックスタイム。', mixHint: "I actually enjoy 夕飯作る — it's how I 仕事後にリラックス." },
        { conversationAnswer: "Making dinner from scratch every night might sound like a lot, but honestly it's become second nature.", typingAnswer: "It's become second nature.", nativeHint: '毎晩一から作るのは大変そうだけど、もう習慣になった。', mixHint: '毎晩一から作る might sound like a lot, but honestly もう習慣.' },
      ],
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
      variations: [
        { conversationAnswer: 'I need to do the laundry today.', typingAnswer: 'I need to do the laundry today.', nativeHint: '今日洗濯しないと。', mixHint: 'I need to 洗濯する today.' },
        { conversationAnswer: 'I did the laundry this morning.', typingAnswer: 'I did the laundry this morning.', nativeHint: '今朝洗濯した。', mixHint: 'I 洗濯した this morning.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I usually do the laundry at night after I finish dinner.',
      typingAnswer: 'I do the laundry after dinner.',
      reviewPrompt: 'Review how to place chores in a daily sequence.',
      aiConversationPrompt: 'Tell the AI which household chore you do most often.',
      nativeHint: '夕食を済ませた後、夜に洗濯をすることが多いです。',
      mixHint: 'I usually 洗濯をします at night after I 夕食を済ませた.',
      aiQuestionText: 'What do you do after dinner?',
      variations: [
        { conversationAnswer: 'I do laundry about three times a week.', typingAnswer: 'I do laundry about three times a week.', nativeHint: '週3回くらい洗濯する。', mixHint: 'I 洗濯する about 週3回.' },
        { conversationAnswer: 'The laundry really piles up if I skip a day.', typingAnswer: 'It piles up if I skip a day.', nativeHint: '1日サボると洗濯物がすぐ溜まる。', mixHint: 'It すぐ溜まる if I 1日サボる.' },
      ],
    },
    advanced: {
      conversationAnswer: "I usually do laundry at night — that's when it fits best into my day.",
      typingAnswer: "That's when it fits best into my day.",
      reviewPrompt: 'Review how to explain scheduling logic in daily life.',
      aiConversationPrompt: 'Explain to the AI how you manage chores when your day is busy.',
      nativeHint: 'だいたい夜に洗濯する。一日の中でそこが一番合うから。',
      mixHint: "I usually 夜に洗濯する — that's when 一番合う into my day.",
      aiQuestionText: 'When do you usually do laundry?',
      variations: [
        { conversationAnswer: "I've started doing laundry every other day — it keeps things manageable.", typingAnswer: 'It keeps things manageable.', nativeHint: '一日おきに洗濯するようにしたら楽になった。', mixHint: "I've started 一日おきに洗濯 — it keeps 楽になった." },
        { conversationAnswer: "Folding laundry is the part I always put off.", typingAnswer: "Folding is the part I always put off.", nativeHint: '畳むのがいつも後回しになる。', mixHint: '畳むの is the part I always 後回し.' },
      ],
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
      variations: [
        { conversationAnswer: 'I take a shower at night.', typingAnswer: 'I take a shower at night.', nativeHint: '夜にシャワーを浴びる。', mixHint: 'I シャワーを浴びる at night.' },
        { conversationAnswer: 'I always soak in the tub before bed.', typingAnswer: 'I soak in the tub.', nativeHint: '寝る前にいつも湯船に浸かる。', mixHint: 'I always 湯船に浸かる before bed.' },
        { conversationAnswer: 'I hop in the bath every night.', typingAnswer: 'I hop in the bath.', nativeHint: '毎晩お風呂に入る。', mixHint: 'I 毎晩 hop in the お風呂.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I take a bath before bed because it helps me relax.',
      typingAnswer: 'It helps me relax before bed.',
      reviewPrompt: 'Review how to connect an action with its effect.',
      aiConversationPrompt: 'Tell the AI about your evening routine before sleep.',
      nativeHint: 'リラックスできるので、寝る前にお風呂に入ります。',
      mixHint: 'I お風呂に入ります before bed because it helps me リラックスできる.',
      aiQuestionText: 'Why do you take a bath before bed?',
      variations: [
        { conversationAnswer: "A hot bath before bed is the best — I sleep so much better after.", typingAnswer: 'I sleep so much better after.', nativeHint: '寝る前の熱いお風呂が最高。その後めちゃくちゃよく寝れる。', mixHint: '寝る前の熱いお風呂 is the best — I めちゃくちゃよく寝れる after.' },
        { conversationAnswer: "I can't skip my bath — it's the only time I really relax.", typingAnswer: "It's the only time I really relax.", nativeHint: 'お風呂は絶対。ほんとにリラックスできる唯一の時間。', mixHint: "I can't skip お風呂 — it's ほんとにリラックスできる唯一の時間." },
        { conversationAnswer: "Taking a bath is how I wind down — it clears my head.", typingAnswer: 'It clears my head.', nativeHint: 'お風呂に入ると落ち着く。頭がスッキリする。', mixHint: 'お風呂に入る is how I wind down — 頭がスッキリ.' },
      ],
    },
    advanced: {
      conversationAnswer: "I love taking a bath before bed — it really helps me unwind and let go of the day.",
      typingAnswer: 'It really helps me unwind and let go of the day.',
      reviewPrompt: 'Review how to describe emotional effect in a natural way.',
      aiConversationPrompt: 'Discuss with the AI how evening routines influence your sleep quality.',
      nativeHint: '寝る前のお風呂が大好き。気持ちがほぐれて一日を手放せる。',
      mixHint: 'I love 寝る前のお風呂 — it really helps me ほぐれて一日を let go.',
      aiQuestionText: 'Does a bath help you relax?',
      variations: [
        { conversationAnswer: "There's nothing like a long bath after a tough day — it just melts the stress away.", typingAnswer: 'It just melts the stress away.', nativeHint: '大変な日の後の長風呂は最高。ストレスが溶ける。', mixHint: "There's nothing like 大変な日の後の長風呂 — ストレスが melts away." },
        { conversationAnswer: "My bath time is sacred — I don't check my phone, I just zone out.", typingAnswer: "I don't check my phone, I just zone out.", nativeHint: 'お風呂の時間は聖域。スマホも見ないでぼーっとする。', mixHint: "お風呂の時間 is sacred — スマホも見ない, I just ぼーっとする." },
        { conversationAnswer: "Soaking in the tub is honestly the highlight of my evening — everything else can wait.", typingAnswer: 'Everything else can wait.', nativeHint: '湯船に浸かるのが夜のハイライト。他のことは後でいい。', mixHint: '湯船に浸かる is honestly the highlight — 他のこと can wait.' },
      ],
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
      variations: [
        { conversationAnswer: 'I packed my bag for tomorrow.', typingAnswer: 'I packed my bag for tomorrow.', nativeHint: '明日のカバンを準備した。', mixHint: 'I 明日のカバンを packed.' },
        { conversationAnswer: 'Did you get ready for tomorrow?', typingAnswer: 'Did you get ready for tomorrow?', nativeHint: '明日の準備はした？', mixHint: 'Did you 明日の準備 get ready?' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I prepare my bag and clothes for tomorrow before I go to bed.',
      typingAnswer: 'I prepare my bag and clothes for tomorrow.',
      reviewPrompt: 'Review how to describe practical night-before preparation.',
      aiConversationPrompt: 'Tell the AI how preparing early helps your morning.',
      nativeHint: '寝る前にカバンと服を準備します。',
      mixHint: 'I カバンと服を準備します for tomorrow before I go to bed.',
      aiQuestionText: 'What do you prepare before bed?',
      variations: [
        { conversationAnswer: 'I always check my schedule for the next day.', typingAnswer: 'I always check my schedule for the next day.', nativeHint: '翌日のスケジュールを必ず確認する。', mixHint: 'I always 翌日のスケジュールを check.' },
        { conversationAnswer: 'I pick out my clothes the night before.', typingAnswer: 'I pick out my clothes the night before.', nativeHint: '前の晩に服を選んでおく。', mixHint: 'I 服を選んでおく the night before.' },
      ],
    },
    advanced: {
      conversationAnswer: "I always get stuff ready the night before — my mornings go way smoother that way.",
      typingAnswer: 'My mornings go way smoother that way.',
      reviewPrompt: 'Review how to express purpose and expected result clearly.',
      aiConversationPrompt: 'Explain to the AI how evening preparation affects your productivity the next day.',
      nativeHint: '前の晩に準備しておくと朝がめちゃくちゃ楽になる。',
      mixHint: 'I always 前の晩に準備する — my mornings go めちゃくちゃ楽 that way.',
      aiQuestionText: 'Does preparing the night before help?',
      variations: [
        { conversationAnswer: "If I don't prepare the night before, I always forget something.", typingAnswer: 'I always forget something if I skip it.', nativeHint: '前の晩に準備しないと絶対何か忘れる。', mixHint: "I always 何か忘れる if I don't 前の晩に準備." },
        { conversationAnswer: "I write a quick to-do list before bed — it takes two minutes and saves me so much stress.", typingAnswer: 'It saves me so much stress.', nativeHint: '寝る前にTO DOリスト書くと朝のストレスが全然違う。', mixHint: 'It ストレスが全然違う to write a to-do list before bed.' },
      ],
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
      variations: [
        { conversationAnswer: 'I hit the bed around eleven.', typingAnswer: 'I hit the bed around eleven.', nativeHint: '11時ぐらいに寝る。', mixHint: 'I 11時ぐらいに hit the bed.' },
        { conversationAnswer: "Time for bed. It's eleven.", typingAnswer: "It's eleven.", nativeHint: '寝る時間。11時だ。', mixHint: "寝る時間. It's eleven." },
        { conversationAnswer: "I'm going to sleep now.", typingAnswer: "I'm going to sleep.", nativeHint: 'もう寝る。', mixHint: "I'm もう寝る." },
      ],
    },
    intermediate: {
      conversationAnswer: 'I try to go to bed early so I can wake up feeling better.',
      typingAnswer: 'I try to go to bed early.',
      reviewPrompt: 'Review how to explain bedtime habits with a reason.',
      aiConversationPrompt: 'Tell the AI what helps you sleep better at night.',
      nativeHint: 'より良い目覚めのために、早めに寝るようにしています。',
      mixHint: 'I try to 早めに寝る so I can より良い目覚め.',
      aiQuestionText: 'Why do you try to sleep early?',
      variations: [
        { conversationAnswer: "I make sure to get to bed at a decent hour — it makes mornings easier.", typingAnswer: 'It makes mornings easier.', nativeHint: 'ちゃんとした時間に寝るようにしてる。朝が楽になる。', mixHint: 'I make sure to ちゃんとした時間に寝る — 朝が楽になる.' },
        { conversationAnswer: "Going to bed early is tough, but I always feel better the next day.", typingAnswer: 'I always feel better the next day.', nativeHint: '早寝は大変だけど翌日絶対調子いい。', mixHint: '早寝 is tough, but I always 翌日調子いい.' },
        { conversationAnswer: "I'm trying to fix my sleep schedule — going to bed earlier really helps.", typingAnswer: 'Going to bed earlier really helps.', nativeHint: '睡眠リズム直そうとしてる。早寝が効く。', mixHint: "I'm trying to 睡眠リズム直す — 早寝 really helps." },
      ],
    },
    advanced: {
      conversationAnswer: "I try not to stay up too late — if I don't sleep well, I'm useless the next day.",
      typingAnswer: "If I don't sleep well, I'm useless the next day.",
      reviewPrompt: 'Review how to explain cause and effect in your sleep habits.',
      aiConversationPrompt: 'Discuss with the AI how sleep influences your performance, emotions, and daily routine.',
      nativeHint: 'あんまり夜更かししないようにしてる。よく寝ないと翌日使い物にならない。',
      mixHint: "I try not to 夜更かししない — よく寝ないと I'm 使い物にならない the next day.",
      aiQuestionText: 'What happens when you stay up too late?',
      variations: [
        { conversationAnswer: "I've learned the hard way that staying up late wrecks my whole next day.", typingAnswer: 'Staying up late wrecks my whole next day.', nativeHint: '夜更かしすると翌日全部ダメになるって痛感した。', mixHint: "I've learned 夜更かしすると wrecks my whole next day." },
        { conversationAnswer: "Sleep is non-negotiable for me now — I used to pull all-nighters and it caught up.", typingAnswer: 'It caught up.', nativeHint: '今は睡眠は絶対。昔は徹夜してたけどツケが来た。', mixHint: 'Sleep is non-negotiable — 昔は徹夜してた and it caught up.' },
        { conversationAnswer: "If I don't get at least seven hours, I'm dragging the entire next day.", typingAnswer: "I'm dragging the entire next day.", nativeHint: '7時間寝ないと翌日ずっとダルい。', mixHint: "If I don't 7時間寝ない, I'm ずっとダルい the entire next day." },
      ],
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
      conversationAnswer: "I have a reservation under Tanaka. I'd like to check in, please.",
      typingAnswer: "I'd like to check in, please.",
      reviewPrompt: 'Review a polite hotel check-in sentence.',
      aiConversationPrompt: 'Role-play a hotel check-in with the AI.',
      nativeHint: '田中で予約してます。チェックインお願いします。',
      mixHint: "I 予約してます under 田中. I'd like to チェックイン, please.",
      aiQuestionText: 'Sure! Can I see your ID?',
    },
    advanced: {
      conversationAnswer: "I have a reservation under Tanaka. I'd like to check in — is the room ready?",
      typingAnswer: "I'd like to check in — is the room ready?",
      reviewPrompt: 'Review a polite and slightly more flexible request at check-in.',
      aiConversationPrompt: 'Explain to the AI what you would ask for if you had a special request at hotel check-in.',
      nativeHint: '田中で予約してます。チェックインしたいんですけど、お部屋もう準備できてますか？',
      mixHint: "I 予約してます under 田中. I'd like to チェックイン — お部屋 ready?",
      aiQuestionText: 'Of course! Let me check that for you.',
    },
  },
  career_consultation: {
    beginner: {
      conversationAnswer: "I'd like to talk about my career.",
      typingAnswer: "I'd like to talk about my career.",
      reviewPrompt: 'Review a simple sentence for starting a career discussion.',
      aiConversationPrompt: 'Tell the AI what kind of work you are interested in.',
      nativeHint: 'キャリアについて話したいです。',
      mixHint: "I'd like to キャリアについて talk.",
      aiQuestionText: 'Got something on your mind?',
    },
    intermediate: {
      conversationAnswer: "I'd like to talk about my career — I've been thinking about making a change.",
      typingAnswer: "I've been thinking about making a change.",
      reviewPrompt: 'Review how to explain your reason for career consultation.',
      aiConversationPrompt: 'Tell the AI why you are reconsidering your current path.',
      nativeHint: 'キャリアの相談したくて。転職しようかなって考えてる。',
      mixHint: "I'd like to キャリアの相談 — I've been 転職しようか thinking.",
      aiQuestionText: 'What kind of change are you thinking about?',
    },
    advanced: {
      conversationAnswer: "I'd love to talk about my career — I've been rethinking things and looking for something with more long-term potential.",
      typingAnswer: "I've been rethinking things and looking for something with more long-term potential.",
      reviewPrompt: 'Review how to explain your career situation with nuance and long-term perspective.',
      aiConversationPrompt: 'Discuss with the AI what matters most to you in your future career and why.',
      nativeHint: 'キャリアの話したいな。いろいろ考え直してて、もっと将来性のあるもの探してる。',
      mixHint: "I'd love to キャリアの話 — I've been 考え直してて looking for もっと将来性のあるもの.",
      aiQuestionText: 'What made you start rethinking things?',
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
      conversationAnswer: "I walk to the station every morning — it's about a ten-minute walk.",
      typingAnswer: "It's about a ten-minute walk.",
      reviewPrompt: 'Review how to describe duration in a commute.',
      aiConversationPrompt: 'Tell the AI how long it takes to get to the station.',
      nativeHint: '毎朝駅まで歩いてる。10分くらいかな。',
      mixHint: 'I 駅まで歩いてる every morning — 10分くらい.',
      aiQuestionText: 'How far is the station?',
    },
    advanced: {
      conversationAnswer: "I walk to the station every morning — it's a nice way to start the day and get some fresh air.",
      typingAnswer: "It's a nice way to start the day and get some fresh air.",
      reviewPrompt: 'Review how to explain the benefit of a daily habit.',
      aiConversationPrompt: 'Discuss with the AI how walking affects your morning routine.',
      nativeHint: '毎朝駅まで歩いてる。いい気分転換になるし、朝の空気が気持ちいい。',
      mixHint: "I 駅まで歩いてる every morning — it's いい気分転換 and 朝の空気が気持ちいい.",
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
  morning_grooming: {
    beginner: {
      conversationAnswer: 'I check myself in the mirror.',
      typingAnswer: 'I check myself in the mirror.',
      reviewPrompt: 'Review a simple grooming sentence.',
      aiConversationPrompt: 'Tell the AI what you do to get ready in the morning.',
      nativeHint: '鏡で身だしなみを確認する。',
      mixHint: 'I 鏡で身だしなみを確認する.',
      aiQuestionText: 'Do you check the mirror before you leave?',
    },
    intermediate: {
      conversationAnswer: 'I always check my hair and clothes before I head out.',
      typingAnswer: 'I check my hair and clothes before I head out.',
      reviewPrompt: 'Review how to describe morning grooming habits.',
      aiConversationPrompt: 'Tell the AI about your grooming routine.',
      nativeHint: '出かける前に髪と服をチェックする。',
      mixHint: 'I always 髪と服をチェックする before I head out.',
      aiQuestionText: 'What do you check before leaving?',
    },
    advanced: {
      conversationAnswer: "I make sure I look decent before leaving — first impressions matter, you know?",
      typingAnswer: 'First impressions matter.',
      reviewPrompt: 'Review how to explain the importance of grooming naturally.',
      aiConversationPrompt: 'Discuss with the AI how appearance affects your confidence.',
      nativeHint: '出る前にちゃんとした格好か確認する。第一印象って大事だから。',
      mixHint: "I make sure I ちゃんとした格好か確認する — 第一印象 matter, you know?",
      aiQuestionText: 'How important is appearance to you?',
    },
  },
  get_ready_to_leave: {
    beginner: {
      conversationAnswer: 'I grab my bag and head out.',
      typingAnswer: 'I grab my bag and head out.',
      reviewPrompt: 'Review a simple leaving-home phrase.',
      aiConversationPrompt: 'Tell the AI what you do before leaving the house.',
      nativeHint: 'カバン持って出かける。',
      mixHint: 'I カバン持って head out.',
      aiQuestionText: 'Are you ready to go?',
      variations: [
        { conversationAnswer: "OK, I'm heading out.", typingAnswer: "I'm heading out.", nativeHint: 'じゃ、出るね。', mixHint: "OK, I'm 出る." },
        { conversationAnswer: "Time to go. I've got my bag.", typingAnswer: "I've got my bag.", nativeHint: 'そろそろ行く。カバン持った。', mixHint: "Time to 行く. I've got カバン." },
        { conversationAnswer: "I'm out the door.", typingAnswer: "I'm out the door.", nativeHint: 'もう出た。', mixHint: "I'm もう出た." },
      ],
    },
    intermediate: {
      conversationAnswer: "I check my bag and make sure I've got everything before I leave.",
      typingAnswer: "I make sure I've got everything.",
      reviewPrompt: 'Review how to describe a pre-departure check.',
      aiConversationPrompt: 'Tell the AI what you always bring with you.',
      nativeHint: 'カバンの中確認して、忘れ物ないか見てから出る。',
      mixHint: "I カバン確認して make sure I've got 忘れ物ない before I leave.",
      aiQuestionText: 'Do you ever forget anything?',
      variations: [
        { conversationAnswer: "I always double-check that I've got everything — I hate going back.", typingAnswer: 'I hate going back.', nativeHint: '忘れ物ないか必ず確認する。取りに帰るの嫌だから。', mixHint: "I always 確認する I've got everything — 取りに帰る hate." },
        { conversationAnswer: "Let me just make sure I have everything... OK, good to go.", typingAnswer: 'Good to go.', nativeHint: '全部あるか確認…OK、出れる。', mixHint: 'Let me just 確認... OK, good to 出る.' },
        { conversationAnswer: "I do a quick check before I leave — I've forgotten stuff too many times.", typingAnswer: "I've forgotten stuff too many times.", nativeHint: '出る前にさっと確認する。忘れ物多すぎたから。', mixHint: "I さっと確認 before I leave — 忘れ物 too many times." },
      ],
    },
    advanced: {
      conversationAnswer: "I always do a quick check — phone, wallet, keys — before I walk out the door.",
      typingAnswer: 'Phone, wallet, keys.',
      reviewPrompt: 'Review how to list essentials naturally.',
      aiConversationPrompt: 'Tell the AI about your leaving-the-house routine.',
      nativeHint: 'スマホ、財布、鍵…出る前にさっと確認する。',
      mixHint: 'I always さっと確認する — スマホ、財布、鍵 — before I walk out.',
      aiQuestionText: 'What do you always make sure to bring?',
      variations: [
        { conversationAnswer: "My little exit routine is phone, wallet, keys, headphones — in that order, every time.", typingAnswer: 'In that order, every time.', nativeHint: '出る時のルーティン：スマホ、財布、鍵、イヤホン。毎回この順番。', mixHint: 'My 出る時ルーティン is スマホ、財布、鍵、イヤホン — in that order, 毎回.' },
        { conversationAnswer: "I pat my pockets before I leave — if I feel three bumps, I'm good.", typingAnswer: "If I feel three bumps, I'm good.", nativeHint: '出る前にポケット叩く。3つ膨らみ感じればOK。', mixHint: "I ポケット叩く before I leave — 3つ膨らみ feel, I'm good." },
        { conversationAnswer: "I got locked out once and now I triple-check my keys before leaving.", typingAnswer: 'I triple-check my keys.', nativeHint: '一回締め出されてから鍵は3回確認するようになった。', mixHint: "I 一回締め出された and now I 鍵 triple-check before leaving." },
      ],
    },
  },
  ride_a_bike: {
    beginner: {
      conversationAnswer: 'I ride my bike to the station.',
      typingAnswer: 'I ride my bike to the station.',
      reviewPrompt: 'Review a simple commuting sentence.',
      aiConversationPrompt: 'Tell the AI how you get to the station.',
      nativeHint: '自転車で駅まで行く。',
      mixHint: 'I 自転車で ride to the station.',
      aiQuestionText: 'How do you get to the station?',
    },
    intermediate: {
      conversationAnswer: "I ride my bike to the station — it's faster than walking.",
      typingAnswer: "It's faster than walking.",
      reviewPrompt: 'Review how to compare commute options.',
      aiConversationPrompt: 'Tell the AI why you choose to bike.',
      nativeHint: '自転車で駅まで行く。歩くより早い。',
      mixHint: "I 自転車で駅まで行く — it's 歩くより faster.",
      aiQuestionText: 'Why do you bike instead of walk?',
    },
    advanced: {
      conversationAnswer: "I usually bike to the station — it only takes five minutes and parking's easy.",
      typingAnswer: "It only takes five minutes and parking's easy.",
      reviewPrompt: 'Review how to explain practical benefits of biking.',
      aiConversationPrompt: 'Discuss with the AI your preferred way to commute.',
      nativeHint: 'だいたい自転車で駅まで行く。5分だし駐輪も楽。',
      mixHint: "I usually 自転車で駅まで行く — 5分 and 駐輪も easy.",
      aiQuestionText: 'Is biking convenient for you?',
    },
  },
  take_the_bus: {
    beginner: {
      conversationAnswer: 'I take the bus to work.',
      typingAnswer: 'I take the bus to work.',
      reviewPrompt: 'Review a simple commuting sentence.',
      aiConversationPrompt: 'Tell the AI how you get to work.',
      nativeHint: 'バスで仕事に行く。',
      mixHint: 'I バスで work に行く.',
      aiQuestionText: 'How do you get to work?',
    },
    intermediate: {
      conversationAnswer: "I take the bus to work — it stops right by my office.",
      typingAnswer: 'It stops right by my office.',
      reviewPrompt: 'Review how to describe a bus commute.',
      aiConversationPrompt: 'Tell the AI about your bus route.',
      nativeHint: 'バスで通勤してる。オフィスのすぐ近くに止まるから。',
      mixHint: "I バスで通勤してる — it stops right by my オフィス.",
      aiQuestionText: 'Where does the bus stop?',
    },
    advanced: {
      conversationAnswer: "I usually take the bus — it's less crowded than the train and I can actually get a seat.",
      typingAnswer: "It's less crowded than the train.",
      reviewPrompt: 'Review how to compare commute options naturally.',
      aiConversationPrompt: 'Discuss with the AI the pros and cons of your commute.',
      nativeHint: 'だいたいバス。電車より空いてて座れるから。',
      mixHint: "I usually バスに乗る — it's 電車より空いてて I can 座れる.",
      aiQuestionText: 'Why do you prefer the bus?',
    },
  },
  wait_for_the_bus: {
    beginner: {
      conversationAnswer: "I'm waiting for the bus.",
      typingAnswer: "I'm waiting for the bus.",
      reviewPrompt: 'Review a simple waiting phrase.',
      aiConversationPrompt: 'Tell the AI what you do while waiting.',
      nativeHint: 'バスを待ってる。',
      mixHint: "I'm バスを待ってる.",
      aiQuestionText: 'Are you waiting for the bus?',
    },
    intermediate: {
      conversationAnswer: "I'm waiting for the bus — it should be here any minute.",
      typingAnswer: 'It should be here any minute.',
      reviewPrompt: 'Review how to estimate arrival time.',
      aiConversationPrompt: 'Tell the AI how often the bus comes.',
      nativeHint: 'バス待ってる。もうすぐ来るはず。',
      mixHint: "I'm バス待ってる — もうすぐ来るはず.",
      aiQuestionText: 'Is the bus coming soon?',
    },
    advanced: {
      conversationAnswer: "I've been waiting for a while — the bus is running late today.",
      typingAnswer: 'The bus is running late today.',
      reviewPrompt: 'Review how to describe delays naturally.',
      aiConversationPrompt: 'Discuss with the AI how you handle delays in your commute.',
      nativeHint: 'けっこう待ってる。今日バス遅れてるみたい。',
      mixHint: "I've been けっこう待ってる — バスが遅れてる today.",
      aiQuestionText: 'How long have you been waiting?',
    },
  },
  transfer_trains: {
    beginner: {
      conversationAnswer: 'I change trains here.',
      typingAnswer: 'I change trains here.',
      reviewPrompt: 'Review a simple transfer sentence.',
      aiConversationPrompt: 'Tell the AI where you change trains.',
      nativeHint: 'ここで乗り換える。',
      mixHint: 'I ここで乗り換える.',
      aiQuestionText: 'Do you change trains?',
    },
    intermediate: {
      conversationAnswer: "I switch trains at Shinjuku — it's always packed.",
      typingAnswer: "It's always packed.",
      reviewPrompt: 'Review how to describe a transfer experience.',
      aiConversationPrompt: 'Tell the AI about your transfer station.',
      nativeHint: '新宿で乗り換える。いつも混んでる。',
      mixHint: "I 新宿で乗り換える — いつも packed.",
      aiQuestionText: 'Where do you switch trains?',
    },
    advanced: {
      conversationAnswer: "I have to switch lines at Shinjuku — the transfer is a real pain during rush hour.",
      typingAnswer: "The transfer is a real pain during rush hour.",
      reviewPrompt: 'Review how to express frustration with commuting naturally.',
      aiConversationPrompt: 'Discuss with the AI how you deal with crowded transfers.',
      nativeHint: '新宿で乗り換えなきゃで、ラッシュ時はほんと大変。',
      mixHint: "I 新宿で乗り換えなきゃ — ラッシュ時は a real pain.",
      aiQuestionText: 'How bad is rush hour for you?',
    },
  },
  arrive_at_work: {
    beginner: {
      conversationAnswer: 'I got to work on time.',
      typingAnswer: 'I got to work on time.',
      reviewPrompt: 'Review a simple arrival sentence.',
      aiConversationPrompt: 'Tell the AI what time you usually arrive at work.',
      nativeHint: '時間通りに着いた。',
      mixHint: 'I 時間通りに got to work.',
      aiQuestionText: 'Did you make it on time?',
      variations: [
        { conversationAnswer: 'I made it to work.', typingAnswer: 'I made it to work.', nativeHint: '仕事に着いた。', mixHint: 'I 仕事に made it.' },
        { conversationAnswer: "I'm at the office now.", typingAnswer: "I'm at the office.", nativeHint: '今オフィスにいる。', mixHint: "I'm 今 at the オフィス." },
        { conversationAnswer: 'I got here right on time.', typingAnswer: 'Right on time.', nativeHint: 'ちょうど時間通りに着いた。', mixHint: 'I got here ちょうど on time.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I got to work early today, so I grabbed a coffee first.',
      typingAnswer: 'I grabbed a coffee first.',
      reviewPrompt: 'Review how to describe an early arrival.',
      aiConversationPrompt: 'Tell the AI what you do when you arrive early.',
      nativeHint: '今日ちょっと早く着いたから、先にコーヒー買った。',
      mixHint: 'I 早く着いた today, so I 先にコーヒー bought.',
      aiQuestionText: 'What do you do when you get there early?',
      variations: [
        { conversationAnswer: "I showed up a bit early, so I had time for coffee.", typingAnswer: 'I had time for coffee.', nativeHint: '少し早く着いたからコーヒー飲む時間あった。', mixHint: 'I 少し早く arrived, so コーヒー飲む time あった.' },
        { conversationAnswer: "I was ahead of schedule today — nice change from the usual rush.", typingAnswer: 'Nice change from the usual rush.', nativeHint: '今日は余裕あった。いつものバタバタと違っていい感じ。', mixHint: 'I was 余裕あった today — nice change from いつものバタバタ.' },
        { conversationAnswer: "Got in early for once, so I took my time settling in.", typingAnswer: 'I took my time settling in.', nativeHint: '珍しく早く着いたから、ゆっくり準備した。', mixHint: '珍しく早く Got in, so I ゆっくり settling in.' },
      ],
    },
    advanced: {
      conversationAnswer: "I made it to the office just in time — the train was delayed, so I had to rush.",
      typingAnswer: 'The train was delayed, so I had to rush.',
      reviewPrompt: 'Review how to describe a close call naturally.',
      aiConversationPrompt: 'Discuss with the AI how you handle unexpected delays.',
      nativeHint: 'ギリギリ間に合った。電車遅れて走った。',
      mixHint: 'I ギリギリ間に合った — 電車遅れて I had to rush.',
      aiQuestionText: 'Did you almost run late?',
      variations: [
        { conversationAnswer: "I barely made it — there was some signal issue and the whole line was backed up.", typingAnswer: 'The whole line was backed up.', nativeHint: 'ギリギリだった。信号トラブルで全線遅れてた。', mixHint: 'I ギリギリだった — 信号トラブル and the whole line 遅れてた.' },
        { conversationAnswer: "Got to work with like two minutes to spare — I was practically speed-walking from the station.", typingAnswer: 'I was speed-walking from the station.', nativeHint: '2分前に着いた。駅からほぼ早歩きだった。', mixHint: 'Got to work 2分前 — I was practically 早歩き from the 駅.' },
        { conversationAnswer: "I cut it way too close this morning — I need to leave earlier.", typingAnswer: 'I need to leave earlier.', nativeHint: '今朝はギリギリすぎた。もっと早く出ないと。', mixHint: 'I ギリギリすぎた this morning — もっと早く出ないと.' },
      ],
    },
  },
  school_attendance: {
    beginner: {
      conversationAnswer: 'I have class today.',
      typingAnswer: 'I have class today.',
      reviewPrompt: 'Review a simple school sentence.',
      aiConversationPrompt: 'Tell the AI about your classes.',
      nativeHint: '今日は授業がある。',
      mixHint: 'I 授業がある today.',
      aiQuestionText: 'Do you have class today?',
    },
    intermediate: {
      conversationAnswer: 'I have three classes today — the first one starts at nine.',
      typingAnswer: 'The first one starts at nine.',
      reviewPrompt: 'Review how to describe your class schedule.',
      aiConversationPrompt: 'Tell the AI about your school schedule.',
      nativeHint: '今日授業3つ。最初は9時から。',
      mixHint: 'I 授業3つ today — 最初は nine から.',
      aiQuestionText: 'How many classes do you have?',
    },
    advanced: {
      conversationAnswer: "I've got back-to-back classes this morning, so I won't have a break until lunch.",
      typingAnswer: "I won't have a break until lunch.",
      reviewPrompt: 'Review how to describe a packed schedule naturally.',
      aiConversationPrompt: 'Discuss with the AI how your school schedule affects your energy.',
      nativeHint: '午前中ずっと授業で、昼まで休憩ない。',
      mixHint: "I've got 午前中ずっと授業 — 昼まで break ない.",
      aiQuestionText: 'How busy is your schedule today?',
    },
  },
  talk_with_friends: {
    beginner: {
      conversationAnswer: 'I talked with my friend today.',
      typingAnswer: 'I talked with my friend.',
      reviewPrompt: 'Review a simple socializing sentence.',
      aiConversationPrompt: 'Tell the AI about a recent conversation with a friend.',
      nativeHint: '今日友達と話した。',
      mixHint: 'I 友達と talked today.',
      aiQuestionText: 'Who did you talk to today?',
      variations: [
        { conversationAnswer: 'I hung out with a friend.', typingAnswer: 'I hung out with a friend.', nativeHint: '友達と遊んだ。', mixHint: 'I 友達と hung out.' },
        { conversationAnswer: 'I chatted with my friend today.', typingAnswer: 'I chatted with my friend.', nativeHint: '今日友達とおしゃべりした。', mixHint: 'I 友達と chatted today.' },
        { conversationAnswer: 'I caught up with a friend.', typingAnswer: 'I caught up with a friend.', nativeHint: '友達と近況報告した。', mixHint: 'I 友達と caught up.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I ran into a friend and we chatted for a bit.',
      typingAnswer: 'We chatted for a bit.',
      reviewPrompt: 'Review how to describe a casual encounter.',
      aiConversationPrompt: 'Tell the AI what you talked about with your friend.',
      nativeHint: '友達にばったり会って、ちょっと話した。',
      mixHint: 'I 友達にばったり会って and we ちょっと chatted.',
      aiQuestionText: 'What did you two talk about?',
      variations: [
        { conversationAnswer: "I saw a friend on my way home and we ended up talking for a while.", typingAnswer: 'We ended up talking for a while.', nativeHint: '帰りに友達に会って結構話し込んだ。', mixHint: 'I 帰りに友達に saw and we 結構話し込んだ.' },
        { conversationAnswer: "My friend and I grabbed coffee and caught up.", typingAnswer: 'We grabbed coffee and caught up.', nativeHint: '友達とコーヒー飲みながら近況報告した。', mixHint: '友達と coffee grabbed and caught up.' },
        { conversationAnswer: "I met up with a friend — we haven't talked in a while, so it was nice.", typingAnswer: "We haven't talked in a while.", nativeHint: '友達と会った。しばらく話してなかったから良かった。', mixHint: "I 友達と met up — しばらく haven't talked, so it was nice." },
      ],
    },
    advanced: {
      conversationAnswer: "I bumped into an old friend at the station — we ended up talking for like twenty minutes.",
      typingAnswer: 'We ended up talking for like twenty minutes.',
      reviewPrompt: 'Review how to describe an unexpected long chat.',
      aiConversationPrompt: 'Discuss with the AI how you keep in touch with old friends.',
      nativeHint: '駅で昔の友達に会って、気づいたら20分くらい話してた。',
      mixHint: 'I 昔の友達に bumped into — we ended up 20分くらい talking.',
      aiQuestionText: 'When was the last time you saw them?',
      variations: [
        { conversationAnswer: "Ran into someone I haven't seen in ages — we stood there chatting forever.", typingAnswer: 'We stood there chatting forever.', nativeHint: 'すごい久しぶりの人に会った。ずっと立ち話してた。', mixHint: "久しぶりの人に Ran into — we ずっと stood chatting." },
        { conversationAnswer: "I saw an old friend at the store and one thing led to another — next thing I know it's been half an hour.", typingAnswer: "Next thing I know it's been half an hour.", nativeHint: 'お店で昔の友達に会って話が弾んで、気づいたら30分。', mixHint: "昔の友達 at the store — 話が弾んで next thing I know 30分." },
        { conversationAnswer: "Caught up with a buddy I hadn't talked to since college — felt like no time had passed.", typingAnswer: 'It felt like no time had passed.', nativeHint: '大学以来会ってなかった友達と再会。時間経ってない感覚。', mixHint: "大学以来 buddy と caught up — felt like 時間経ってない." },
      ],
    },
  },
  go_to_a_drugstore: {
    beginner: {
      conversationAnswer: 'I went to the drugstore.',
      typingAnswer: 'I went to the drugstore.',
      reviewPrompt: 'Review a simple errand sentence.',
      aiConversationPrompt: 'Tell the AI what you buy at the drugstore.',
      nativeHint: 'ドラッグストアに行った。',
      mixHint: 'I ドラッグストアに went.',
      aiQuestionText: 'What did you need?',
    },
    intermediate: {
      conversationAnswer: 'I stopped by the drugstore to pick up some cold medicine.',
      typingAnswer: 'I picked up some cold medicine.',
      reviewPrompt: 'Review how to describe a quick errand.',
      aiConversationPrompt: 'Tell the AI what you usually get at the drugstore.',
      nativeHint: '風邪薬買いにドラッグストア寄った。',
      mixHint: 'I ドラッグストア寄った to pick up 風邪薬.',
      aiQuestionText: 'Are you feeling okay?',
    },
    advanced: {
      conversationAnswer: "I swung by the drugstore on my way home — I needed allergy medicine and sunscreen.",
      typingAnswer: 'I needed allergy medicine and sunscreen.',
      reviewPrompt: 'Review how to list what you need while running errands.',
      aiConversationPrompt: 'Tell the AI about your typical drugstore purchases.',
      nativeHint: '帰りにドラッグストア寄った。花粉の薬と日焼け止めが必要だった。',
      mixHint: 'I 帰りにドラッグストア swung by — 花粉の薬と日焼け止め needed.',
      aiQuestionText: 'What did you pick up?',
    },
  },
  use_an_atm: {
    beginner: {
      conversationAnswer: 'I need to get some cash.',
      typingAnswer: 'I need to get some cash.',
      reviewPrompt: 'Review a simple banking sentence.',
      aiConversationPrompt: 'Tell the AI how often you use an ATM.',
      nativeHint: '現金おろさなきゃ。',
      mixHint: 'I 現金おろさなきゃ.',
      aiQuestionText: 'Do you need cash?',
    },
    intermediate: {
      conversationAnswer: 'I stopped at the ATM to take out some cash.',
      typingAnswer: 'I took out some cash.',
      reviewPrompt: 'Review how to talk about ATM usage.',
      aiConversationPrompt: 'Tell the AI when you usually withdraw cash.',
      nativeHint: 'ATMで現金おろしてきた。',
      mixHint: 'I ATMに stopped to 現金おろす.',
      aiQuestionText: 'How much did you take out?',
    },
    advanced: {
      conversationAnswer: "I had to run to the ATM real quick — I didn't have enough cash for lunch.",
      typingAnswer: "I didn't have enough cash for lunch.",
      reviewPrompt: 'Review how to explain a quick errand with a reason.',
      aiConversationPrompt: 'Discuss with the AI whether you prefer cash or card.',
      nativeHint: 'ATMさっと行ってきた。ランチの現金足りなかった。',
      mixHint: "I ATMに real quick 行った — ランチの現金 didn't have enough.",
      aiQuestionText: 'Do you usually carry cash?',
    },
  },
  go_to_the_post_office: {
    beginner: {
      conversationAnswer: 'I went to the post office.',
      typingAnswer: 'I went to the post office.',
      reviewPrompt: 'Review a simple errand sentence.',
      aiConversationPrompt: 'Tell the AI why you went to the post office.',
      nativeHint: '郵便局に行った。',
      mixHint: 'I 郵便局に went.',
      aiQuestionText: 'Did you mail something?',
    },
    intermediate: {
      conversationAnswer: 'I went to the post office to send a package.',
      typingAnswer: 'I sent a package.',
      reviewPrompt: 'Review how to describe a post office errand.',
      aiConversationPrompt: 'Tell the AI about your mailing experience.',
      nativeHint: '荷物出しに郵便局行った。',
      mixHint: 'I 郵便局行った to 荷物出す.',
      aiQuestionText: 'What did you send?',
    },
    advanced: {
      conversationAnswer: "I had to go to the post office to mail a package — the line was pretty long today.",
      typingAnswer: 'The line was pretty long today.',
      reviewPrompt: 'Review how to describe waiting in line.',
      aiConversationPrompt: 'Discuss with the AI whether you prefer online shipping or the post office.',
      nativeHint: '荷物出しに郵便局行ったけど、今日けっこう並んだ。',
      mixHint: 'I 郵便局行った to 荷物出す — the line was けっこう long today.',
      aiQuestionText: 'Was it busy?',
    },
  },
  go_to_a_hospital: {
    beginner: {
      conversationAnswer: 'I went to the hospital.',
      typingAnswer: 'I went to the hospital.',
      reviewPrompt: 'Review a simple medical visit sentence.',
      aiConversationPrompt: 'Tell the AI why you went to the hospital.',
      nativeHint: '病院に行った。',
      mixHint: 'I 病院に went.',
      aiQuestionText: 'Is everything okay?',
    },
    intermediate: {
      conversationAnswer: 'I went to the hospital for a checkup.',
      typingAnswer: 'I had a checkup.',
      reviewPrompt: 'Review how to describe a medical visit.',
      aiConversationPrompt: 'Tell the AI about your hospital visit.',
      nativeHint: '検診で病院行ってきた。',
      mixHint: 'I 病院行った for a 検診.',
      aiQuestionText: 'How did it go?',
    },
    advanced: {
      conversationAnswer: "I had a doctor's appointment this morning — nothing serious, just a regular checkup.",
      typingAnswer: 'Nothing serious, just a regular checkup.',
      reviewPrompt: 'Review how to reassure someone about a medical visit.',
      aiConversationPrompt: 'Discuss with the AI how often you go for checkups.',
      nativeHint: '今朝病院の予約あった。大したことなくて、定期検診。',
      mixHint: "I 病院の予約 this morning — 大したことない, just 定期検診.",
      aiQuestionText: 'How often do you get checkups?',
    },
  },
  go_to_a_pharmacy: {
    beginner: {
      conversationAnswer: 'I picked up my medicine.',
      typingAnswer: 'I picked up my medicine.',
      reviewPrompt: 'Review a simple pharmacy sentence.',
      aiConversationPrompt: 'Tell the AI what medicine you needed.',
      nativeHint: '薬をもらってきた。',
      mixHint: 'I 薬をもらってきた.',
      aiQuestionText: 'Did you get your medicine?',
    },
    intermediate: {
      conversationAnswer: 'I went to the pharmacy to pick up my prescription.',
      typingAnswer: 'I picked up my prescription.',
      reviewPrompt: 'Review how to talk about getting medicine.',
      aiConversationPrompt: 'Tell the AI about your pharmacy visit.',
      nativeHint: '処方箋の薬もらいに薬局行った。',
      mixHint: 'I 薬局行った to 処方箋の薬 pick up.',
      aiQuestionText: 'Is it a new prescription?',
    },
    advanced: {
      conversationAnswer: "I stopped by the pharmacy after the hospital — they said it'd be ready in ten minutes.",
      typingAnswer: "They said it'd be ready in ten minutes.",
      reviewPrompt: 'Review how to describe a short wait naturally.',
      aiConversationPrompt: 'Discuss with the AI the process of getting prescriptions.',
      nativeHint: '病院の後に薬局寄った。10分で準備できるって。',
      mixHint: "I 病院の後に薬局 stopped by — 10分で ready って.",
      aiQuestionText: 'How long did you have to wait?',
    },
  },
  eat_dinner: {
    beginner: {
      conversationAnswer: 'I had dinner at home.',
      typingAnswer: 'I had dinner at home.',
      reviewPrompt: 'Review a simple dinner sentence.',
      aiConversationPrompt: 'Tell the AI what you had for dinner.',
      nativeHint: '家で晩ごはん食べた。',
      mixHint: 'I 晩ごはん had at home.',
      aiQuestionText: 'What did you have for dinner?',
      variations: [
        { conversationAnswer: "I'm making dinner now.", typingAnswer: "I'm making dinner now.", nativeHint: '今、晩ごはん作ってる。', mixHint: "I'm 晩ごはん making now." },
        { conversationAnswer: "What's for dinner tonight?", typingAnswer: "What's for dinner tonight?", nativeHint: '今夜のごはん何？', mixHint: "What's 今夜のごはん?" },
      ],
    },
    intermediate: {
      conversationAnswer: 'I had dinner with my family — we had curry tonight.',
      typingAnswer: 'We had curry tonight.',
      reviewPrompt: 'Review how to describe a family dinner.',
      aiConversationPrompt: 'Tell the AI about your typical dinner.',
      nativeHint: '家族と晩ごはん。今日はカレーだった。',
      mixHint: 'I 家族と dinner — カレー tonight.',
      aiQuestionText: 'What was for dinner?',
      variations: [
        { conversationAnswer: 'We ate out tonight for a change.', typingAnswer: 'We ate out tonight for a change.', nativeHint: '今夜は気分転換に外食した。', mixHint: 'We 外食した tonight for a 気分転換.' },
        { conversationAnswer: 'Dinner was ready when I got home.', typingAnswer: 'Dinner was ready when I got home.', nativeHint: '帰ったら晩ごはんができてた。', mixHint: '晩ごはんができてた when I got home.' },
      ],
    },
    advanced: {
      conversationAnswer: "We all sat down for dinner together — it's one of the few times we're all in the same room.",
      typingAnswer: "It's one of the few times we're all in the same room.",
      reviewPrompt: 'Review how to reflect on family time naturally.',
      aiConversationPrompt: 'Discuss with the AI how often you eat together as a family.',
      nativeHint: 'みんなで食卓囲んだ。全員揃うのって貴重。',
      mixHint: "We みんなで dinner — it's 全員揃う one of the few times.",
      aiQuestionText: 'Do you eat together every night?',
      variations: [
        { conversationAnswer: "Dinner is the one time of day I actually sit down and relax.", typingAnswer: 'Dinner is the one time I actually relax.', nativeHint: '晩ごはんの時間が唯一ちゃんと座ってくつろげる。', mixHint: 'Dinner is the one time I actually くつろげる.' },
        { conversationAnswer: "We try to eat together as often as we can, even if it's just something simple.", typingAnswer: 'We try to eat together as often as we can.', nativeHint: '簡単なものでも、できるだけ一緒に食べるようにしてる。', mixHint: 'We try to 一緒に食べる as often as we can.' },
      ],
    },
  },
  wash_the_dishes: {
    beginner: {
      conversationAnswer: 'I washed the dishes.',
      typingAnswer: 'I washed the dishes.',
      reviewPrompt: 'Review a simple chore sentence.',
      aiConversationPrompt: 'Tell the AI when you wash the dishes.',
      nativeHint: '食器を洗った。',
      mixHint: 'I 食器を washed.',
      aiQuestionText: 'Did you do the dishes?',
      variations: [
        { conversationAnswer: "I'm washing the dishes now.", typingAnswer: "I'm washing the dishes now.", nativeHint: '今、食器を洗ってる。', mixHint: "I'm 食器を洗ってる now." },
        { conversationAnswer: 'Can you wash the dishes?', typingAnswer: 'Can you wash the dishes?', nativeHint: '食器を洗ってくれる？', mixHint: 'Can you 食器を洗って?' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I did the dishes right after dinner.',
      typingAnswer: 'I did the dishes right after dinner.',
      reviewPrompt: 'Review how to describe chore timing.',
      aiConversationPrompt: 'Tell the AI about your after-dinner routine.',
      nativeHint: '晩ごはんの後すぐ皿洗いした。',
      mixHint: 'I 皿洗い did right after dinner.',
      aiQuestionText: 'Do you wash them right away?',
      variations: [
        { conversationAnswer: "I usually do the dishes before bed.", typingAnswer: 'I usually do the dishes before bed.', nativeHint: '寝る前にたいてい食器を洗う。', mixHint: 'I usually 食器を洗う before bed.' },
        { conversationAnswer: "It's my turn to do the dishes tonight.", typingAnswer: "It's my turn to do the dishes tonight.", nativeHint: '今夜は私が皿洗いの番。', mixHint: "It's 私の番 to 皿洗い tonight." },
      ],
    },
    advanced: {
      conversationAnswer: "I always do the dishes right after we eat — if I leave them, I'll never get to them.",
      typingAnswer: "If I leave them, I'll never get to them.",
      reviewPrompt: 'Review how to explain a habit with self-awareness.',
      aiConversationPrompt: 'Discuss with the AI how you motivate yourself to do chores.',
      nativeHint: '食べたらすぐ洗う。放っておいたら絶対やらない。',
      mixHint: "I always すぐ洗う — 放っておいたら I'll never get to them.",
      aiQuestionText: 'Are you good about doing chores right away?',
      variations: [
        { conversationAnswer: "I hate leaving dirty dishes in the sink overnight.", typingAnswer: 'I hate leaving dirty dishes in the sink.', nativeHint: '汚い食器をシンクに放置するの嫌い。', mixHint: 'I hate 汚い食器を放置 in the sink.' },
        { conversationAnswer: "The dishes pile up so fast if you don't stay on top of them.", typingAnswer: "They pile up if you don't stay on top of them.", nativeHint: 'ちゃんとやらないとすぐ溜まる。', mixHint: "They すぐ溜まる if you don't ちゃんとやる." },
      ],
    },
  },
  sort_the_garbage: {
    beginner: {
      conversationAnswer: 'I sort the garbage.',
      typingAnswer: 'I sort the garbage.',
      reviewPrompt: 'Review a simple recycling sentence.',
      aiConversationPrompt: 'Tell the AI how you sort your garbage.',
      nativeHint: 'ゴミを分別する。',
      mixHint: 'I ゴミを sort.',
      aiQuestionText: 'Do you sort your garbage?',
    },
    intermediate: {
      conversationAnswer: 'I sort the garbage into plastic, cans, and burnable.',
      typingAnswer: 'Plastic, cans, and burnable.',
      reviewPrompt: 'Review how to name garbage categories.',
      aiConversationPrompt: 'Tell the AI about garbage rules where you live.',
      nativeHint: 'ゴミをプラ・缶・燃えるゴミに分ける。',
      mixHint: 'I ゴミを sort into プラ、缶、燃えるゴミ.',
      aiQuestionText: 'How many categories do you sort into?',
    },
    advanced: {
      conversationAnswer: "Sorting garbage is kind of a pain, but I've gotten used to it.",
      typingAnswer: "I've gotten used to it.",
      reviewPrompt: 'Review how to express gradual adaptation to a habit.',
      aiConversationPrompt: 'Discuss with the AI how garbage sorting works in your area.',
      nativeHint: 'ゴミ分別は正直面倒だけど、慣れた。',
      mixHint: "ゴミ分別 is kind of a pain, but I've 慣れた.",
      aiQuestionText: 'Was it hard to get used to?',
    },
  },
  watch_videos: {
    beginner: {
      conversationAnswer: 'I watch videos at night.',
      typingAnswer: 'I watch videos at night.',
      reviewPrompt: 'Review a simple entertainment sentence.',
      aiConversationPrompt: 'Tell the AI what kind of videos you watch.',
      nativeHint: '夜に動画を見る。',
      mixHint: 'I 動画を watch at night.',
      aiQuestionText: 'What do you like to watch?',
      variations: [
        { conversationAnswer: 'I watch stuff on my phone at night.', typingAnswer: 'I watch stuff on my phone.', nativeHint: '夜にスマホで動画見る。', mixHint: 'I スマホで stuff watch at night.' },
        { conversationAnswer: 'I like watching videos before bed.', typingAnswer: 'I like watching videos.', nativeHint: '寝る前に動画見るのが好き。', mixHint: 'I like 動画見る before bed.' },
        { conversationAnswer: 'I stream some shows at night.', typingAnswer: 'I stream some shows.', nativeHint: '夜に番組を見る。', mixHint: 'I 番組を stream at night.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I usually watch YouTube for a bit before bed.',
      typingAnswer: 'I watch YouTube before bed.',
      reviewPrompt: 'Review how to describe a nightly habit.',
      aiConversationPrompt: 'Tell the AI what channels or content you enjoy.',
      nativeHint: '寝る前にYouTubeちょっと見る。',
      mixHint: 'I usually YouTube ちょっと watch before bed.',
      aiQuestionText: 'What kind of stuff do you watch?',
      variations: [
        { conversationAnswer: "I scroll through YouTube most nights — it's kind of my wind-down routine.", typingAnswer: "It's my wind-down routine.", nativeHint: 'ほぼ毎晩YouTube見てる。くつろぎのルーティン。', mixHint: "I ほぼ毎晩 YouTube scroll — it's くつろぎのルーティン." },
        { conversationAnswer: "I'll watch a couple of videos while I'm in bed — nothing heavy, just chill stuff.", typingAnswer: 'Just chill stuff.', nativeHint: 'ベッドで動画を何本か見る。重いのじゃなくてゆるいやつ。', mixHint: "I'll ベッドで動画を何本か watch — ゆるいやつ, just chill stuff." },
        { conversationAnswer: "Before I fall asleep, I always end up on YouTube for a bit.", typingAnswer: 'I end up on YouTube.', nativeHint: '寝る前、気づいたらYouTube見てる。', mixHint: 'Before I 寝る前, I always 気づいたら YouTube.' },
      ],
    },
    advanced: {
      conversationAnswer: "I always end up watching way too many videos before bed — I tell myself 'just one more' but it never works.",
      typingAnswer: "I tell myself 'just one more' but it never works.",
      reviewPrompt: 'Review how to describe a relatable bad habit.',
      aiConversationPrompt: 'Discuss with the AI how screen time affects your sleep.',
      nativeHint: '寝る前に動画見すぎちゃう。「あと一本」って言っても絶対守れない。',
      mixHint: "I 動画見すぎちゃう before bed — 「あと一本」but it never works.",
      aiQuestionText: 'Do you stay up too late watching videos?',
      variations: [
        { conversationAnswer: "I fall into that YouTube rabbit hole every single night — I swear I'll stop but I never do.", typingAnswer: "I swear I'll stop but I never do.", nativeHint: '毎晩YouTube沼にはまる。やめるって言うけど絶対やめない。', mixHint: "I 毎晩 YouTube沼にはまる — I swear やめる but I never do." },
        { conversationAnswer: "One video turns into ten and suddenly it's one in the morning.", typingAnswer: "Suddenly it's one in the morning.", nativeHint: '1本が10本になって気づいたら夜中の1時。', mixHint: "1本 turns into 10本 and suddenly 夜中の1時." },
        { conversationAnswer: "My screen time report is honestly embarrassing — most of it is late-night YouTube.", typingAnswer: "Most of it is late-night YouTube.", nativeHint: 'スクリーンタイムの数字がやばい。ほとんど深夜のYouTube。', mixHint: 'My スクリーンタイム is honestly embarrassing — ほとんど深夜のYouTube.' },
      ],
    },
  },
  play_games: {
    beginner: {
      conversationAnswer: 'I play games after dinner.',
      typingAnswer: 'I play games after dinner.',
      reviewPrompt: 'Review a simple hobby sentence.',
      aiConversationPrompt: 'Tell the AI what games you play.',
      nativeHint: '晩ごはんの後ゲームする。',
      mixHint: 'I ゲーム play after dinner.',
      aiQuestionText: 'What games do you play?',
      variations: [
        { conversationAnswer: 'I played games for a while last night.', typingAnswer: 'I played games for a while last night.', nativeHint: '昨日の夜しばらくゲームした。', mixHint: 'I ゲームした for a while last night.' },
        { conversationAnswer: 'Do you play any games?', typingAnswer: 'Do you play any games?', nativeHint: '何かゲームする？', mixHint: 'Do you 何かゲーム play?' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I play games for about an hour before bed.',
      typingAnswer: 'I play for about an hour.',
      reviewPrompt: 'Review how to describe gaming habits.',
      aiConversationPrompt: 'Tell the AI what kind of games you enjoy.',
      nativeHint: '寝る前に1時間くらいゲームする。',
      mixHint: 'I ゲーム play for about 1時間 before bed.',
      aiQuestionText: 'How long do you usually play?',
      variations: [
        { conversationAnswer: "I usually play online with my friends.", typingAnswer: 'I usually play online with my friends.', nativeHint: '友達とオンラインで遊ぶことが多い。', mixHint: 'I usually 友達とオンラインで play.' },
        { conversationAnswer: "I'm into puzzle games right now.", typingAnswer: "I'm into puzzle games right now.", nativeHint: '今パズルゲームにハマってる。', mixHint: "I'm パズルゲームに into right now." },
      ],
    },
    advanced: {
      conversationAnswer: "I try to keep it to an hour, but once I start, it's hard to stop.",
      typingAnswer: "Once I start, it's hard to stop.",
      reviewPrompt: 'Review how to admit a common habit honestly.',
      aiConversationPrompt: 'Discuss with the AI how you balance gaming with other things.',
      nativeHint: '1時間にしたいけど、始めるとなかなかやめられない。',
      mixHint: "I 1時間にしたい, but 始めると it's hard to stop.",
      aiQuestionText: 'Is it hard to put the game down?',
      variations: [
        { conversationAnswer: "Gaming is how I unwind — I don't feel guilty about it.", typingAnswer: "I don't feel guilty about it.", nativeHint: 'ゲームはリラックス方法。罪悪感はない。', mixHint: "Gaming is how I リラックス — 罪悪感はない." },
        { conversationAnswer: "I set a timer so I don't end up playing all night.", typingAnswer: "I set a timer so I don't play all night.", nativeHint: '一晩中やらないようにタイマーセットしてる。', mixHint: "I タイマーセット so I don't 一晩中やる." },
      ],
    },
  },
  go_for_a_walk: {
    beginner: {
      conversationAnswer: 'I went for a walk.',
      typingAnswer: 'I went for a walk.',
      reviewPrompt: 'Review a simple exercise sentence.',
      aiConversationPrompt: 'Tell the AI where you like to walk.',
      nativeHint: '散歩に行った。',
      mixHint: 'I 散歩に went.',
      aiQuestionText: 'Where did you go?',
      variations: [
        { conversationAnswer: "Let's go for a walk.", typingAnswer: "Let's go for a walk.", nativeHint: '散歩に行こう。', mixHint: "Let's 散歩に行こう." },
        { conversationAnswer: 'I walk every evening.', typingAnswer: 'I walk every evening.', nativeHint: '毎晩散歩する。', mixHint: 'I 毎晩 walk.' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I went for a walk around the neighborhood after dinner.',
      typingAnswer: 'I walked around the neighborhood.',
      reviewPrompt: 'Review how to describe an evening walk.',
      aiConversationPrompt: 'Tell the AI about your favorite walking route.',
      nativeHint: '晩ごはんの後、近所を散歩した。',
      mixHint: 'I 近所を walk around after dinner.',
      aiQuestionText: 'Do you walk every day?',
      variations: [
        { conversationAnswer: 'I usually walk for about thirty minutes.', typingAnswer: 'I usually walk for about thirty minutes.', nativeHint: 'だいたい30分くらい歩く。', mixHint: 'I usually 30分くらい walk.' },
        { conversationAnswer: 'I like walking along the river near my house.', typingAnswer: 'I like walking along the river.', nativeHint: '家の近くの川沿いを歩くのが好き。', mixHint: 'I like 川沿いを walking.' },
      ],
    },
    advanced: {
      conversationAnswer: "I like to take a walk after dinner — it clears my head and helps me sleep better.",
      typingAnswer: 'It clears my head and helps me sleep better.',
      reviewPrompt: 'Review how to describe the mental benefits of exercise.',
      aiConversationPrompt: 'Discuss with the AI how walking helps your daily routine.',
      nativeHint: '晩ごはんの後散歩するのが好き。頭すっきりして、よく眠れる。',
      mixHint: 'I 散歩するのが好き after dinner — 頭すっきり and helps me sleep better.',
      aiQuestionText: 'How does walking help you?',
      variations: [
        { conversationAnswer: "Walking is the simplest thing I do for my health, and it makes a huge difference.", typingAnswer: 'It makes a huge difference.', nativeHint: '散歩は一番シンプルな健康法で、効果がすごい。', mixHint: 'Walking is the simplest 健康法 and it 効果がすごい.' },
        { conversationAnswer: "I've been walking every night for a month, and I sleep so much better now.", typingAnswer: 'I sleep so much better now.', nativeHint: '1ヶ月毎晩歩いてたら睡眠の質がすごく良くなった。', mixHint: "I've been 毎晩歩いて for a month and 睡眠の質 so much better." },
      ],
    },
  },
  read_a_book: {
    beginner: {
      conversationAnswer: 'I read a book before bed.',
      typingAnswer: 'I read a book before bed.',
      reviewPrompt: 'Review a simple reading habit sentence.',
      aiConversationPrompt: 'Tell the AI what kind of books you like.',
      nativeHint: '寝る前に本を読む。',
      mixHint: 'I 本を read before bed.',
      aiQuestionText: 'What are you reading?',
      variations: [
        { conversationAnswer: 'I like reading on the train.', typingAnswer: 'I like reading on the train.', nativeHint: '電車で本読むのが好き。', mixHint: 'I like 本読む on the train.' },
        { conversationAnswer: 'I finished a book yesterday.', typingAnswer: 'I finished a book yesterday.', nativeHint: '昨日本を読み終わった。', mixHint: 'I 本を読み終わった yesterday.' },
      ],
    },
    intermediate: {
      conversationAnswer: "I'm reading a really good book right now.",
      typingAnswer: "I'm reading a really good book.",
      reviewPrompt: 'Review how to talk about a current activity.',
      aiConversationPrompt: 'Tell the AI about the book you are reading.',
      nativeHint: '今すごくいい本読んでる。',
      mixHint: "I'm すごくいい本 reading right now.",
      aiQuestionText: 'What kind of book is it?',
      variations: [
        { conversationAnswer: 'I try to read a few pages every night.', typingAnswer: 'I try to read a few pages every night.', nativeHint: '毎晩数ページは読むようにしてる。', mixHint: 'I try to 数ページ read every night.' },
        { conversationAnswer: "I've been into mystery novels lately.", typingAnswer: "I've been into mystery novels lately.", nativeHint: '最近ミステリー小説にハマってる。', mixHint: "I've been ミステリー小説に into lately." },
      ],
    },
    advanced: {
      conversationAnswer: "I try to read for at least twenty minutes before bed — it's way better than scrolling my phone.",
      typingAnswer: "It's way better than scrolling my phone.",
      reviewPrompt: 'Review how to compare habits naturally.',
      aiConversationPrompt: 'Discuss with the AI how reading affects your evening routine.',
      nativeHint: '寝る前に最低20分は読むようにしてる。スマホいじるよりずっといい。',
      mixHint: "I try to 最低20分 read before bed — it's スマホいじるより way better.",
      aiQuestionText: 'Do you read every night?',
      variations: [
        { conversationAnswer: "Reading before bed calms me down — I fall asleep so much faster.", typingAnswer: 'I fall asleep so much faster.', nativeHint: '寝る前に読むと落ち着く。寝つきがすごく早くなる。', mixHint: 'Reading before bed 落ち着く — I 寝つきが so much faster.' },
        { conversationAnswer: "I went through three books last month — I'm on a real reading streak.", typingAnswer: "I'm on a real reading streak.", nativeHint: '先月3冊読んだ。読書にハマってる。', mixHint: "I 先月3冊 read — I'm on a 読書ハマってる streak." },
      ],
    },
  },
  write_a_diary: {
    beginner: {
      conversationAnswer: 'I write in my diary.',
      typingAnswer: 'I write in my diary.',
      reviewPrompt: 'Review a simple journal sentence.',
      aiConversationPrompt: 'Tell the AI what you write about.',
      nativeHint: '日記を書く。',
      mixHint: 'I 日記を write.',
      aiQuestionText: 'Do you keep a diary?',
      variations: [
        { conversationAnswer: 'I wrote in my diary last night.', typingAnswer: 'I wrote in my diary last night.', nativeHint: '昨日の夜日記を書いた。', mixHint: 'I 日記を wrote last night.' },
        { conversationAnswer: 'Do you keep a diary?', typingAnswer: 'Do you keep a diary?', nativeHint: '日記つけてる？', mixHint: 'Do you 日記つけてる?' },
      ],
    },
    intermediate: {
      conversationAnswer: 'I write in my diary every night before bed.',
      typingAnswer: 'I write every night before bed.',
      reviewPrompt: 'Review how to describe a daily journaling habit.',
      aiConversationPrompt: 'Tell the AI what journaling does for you.',
      nativeHint: '毎晩寝る前に日記書く。',
      mixHint: 'I 毎晩 diary write before bed.',
      aiQuestionText: 'What do you usually write about?',
      variations: [
        { conversationAnswer: 'I usually write about what happened during the day.', typingAnswer: 'I write about what happened during the day.', nativeHint: 'その日あったことを書くことが多い。', mixHint: 'I write about その日あったこと.' },
        { conversationAnswer: 'Writing helps me remember things better.', typingAnswer: 'It helps me remember things better.', nativeHint: '書くと物事をよく覚えていられる。', mixHint: 'Writing helps me よく覚えていられる.' },
      ],
    },
    advanced: {
      conversationAnswer: "I've been keeping a diary for about a year now — it helps me sort out my thoughts.",
      typingAnswer: 'It helps me sort out my thoughts.',
      reviewPrompt: 'Review how to describe the benefit of journaling.',
      aiConversationPrompt: 'Discuss with the AI how writing helps you reflect.',
      nativeHint: '日記つけて1年くらい。考えを整理するのに役立つ。',
      mixHint: "I've been 日記つけて for about a year — 考えを整理する helps.",
      aiQuestionText: 'How long have you been writing?',
      variations: [
        { conversationAnswer: "Looking back at old entries is really interesting — I can see how much I've changed.", typingAnswer: "I can see how much I've changed.", nativeHint: '昔の日記読み返すと面白い。自分の変化がわかる。', mixHint: "昔の日記 is interesting — I can see 自分の変化." },
        { conversationAnswer: "Even just a few lines a day makes a difference — it's become part of my routine.", typingAnswer: "It's become part of my routine.", nativeHint: '数行でも毎日書くと違う。もう習慣になった。', mixHint: 'Even 数行でも makes a difference — もう習慣.' },
      ],
    },
  },
  // ——— Intermediate pool scenes ———
  commute_by_car: {
    beginner: {
      conversationAnswer: 'I drive to work.',
      typingAnswer: 'I drive to work.',
      reviewPrompt: 'Review a simple commuting sentence.',
      aiConversationPrompt: 'Tell the AI how you get to work.',
      nativeHint: '車で通勤してる。',
      mixHint: 'I 車で drive to work.',
      aiQuestionText: 'Do you drive to work?',
    },
    intermediate: {
      conversationAnswer: "I drive to work — it takes about thirty minutes if there's no traffic.",
      typingAnswer: "It takes about thirty minutes if there's no traffic.",
      reviewPrompt: 'Review how to describe a car commute.',
      aiConversationPrompt: 'Tell the AI about your drive.',
      nativeHint: '車で通勤。渋滞なければ30分くらい。',
      mixHint: "I 車で通勤 — 渋滞なければ about thirty minutes.",
      aiQuestionText: 'How long is your commute?',
    },
    advanced: {
      conversationAnswer: "I drive to work every day, but honestly, the traffic is killing me lately.",
      typingAnswer: 'The traffic is killing me lately.',
      reviewPrompt: 'Review how to complain about traffic naturally.',
      aiConversationPrompt: 'Discuss with the AI whether you prefer driving or public transport.',
      nativeHint: '毎日車通勤だけど、最近渋滞がほんとしんどい。',
      mixHint: 'I 毎日車通勤, but 渋滞が killing me lately.',
      aiQuestionText: 'How bad is the traffic?',
    },
  },
  traffic_jam: {
    beginner: {
      conversationAnswer: "I'm stuck in traffic.",
      typingAnswer: "I'm stuck in traffic.",
      reviewPrompt: 'Review a simple traffic sentence.',
      aiConversationPrompt: 'Tell the AI about the traffic.',
      nativeHint: '渋滞にはまってる。',
      mixHint: "I'm 渋滞に stuck.",
      aiQuestionText: 'Is the traffic bad?',
    },
    intermediate: {
      conversationAnswer: "I'm stuck in traffic again — I might be late.",
      typingAnswer: 'I might be late.',
      reviewPrompt: 'Review how to report a delay.',
      aiConversationPrompt: 'Tell the AI how traffic affects your day.',
      nativeHint: 'また渋滞。遅刻するかも。',
      mixHint: "I'm また渋滞 — 遅刻するかも.",
      aiQuestionText: 'Are you going to be late?',
    },
    advanced: {
      conversationAnswer: "I've been sitting in traffic for twenty minutes — I should've left earlier.",
      typingAnswer: "I should've left earlier.",
      reviewPrompt: 'Review how to express regret about timing.',
      aiConversationPrompt: 'Discuss with the AI how you deal with traffic jams.',
      nativeHint: '20分渋滞にはまってる。もっと早く出ればよかった。',
      mixHint: "I've been 渋滞 for twenty minutes — もっと早く should've left.",
      aiQuestionText: 'How long have you been stuck?',
    },
  },
  morning_meeting: {
    beginner: {
      conversationAnswer: 'We have a meeting this morning.',
      typingAnswer: 'We have a meeting this morning.',
      reviewPrompt: 'Review a simple meeting sentence.',
      aiConversationPrompt: 'Tell the AI about your morning meeting.',
      nativeHint: '今朝ミーティングがある。',
      mixHint: 'We 今朝ミーティング have.',
      aiQuestionText: 'What time is the meeting?',
    },
    intermediate: {
      conversationAnswer: "We have a quick team meeting every morning at nine.",
      typingAnswer: 'We have a team meeting at nine.',
      reviewPrompt: 'Review how to describe a regular meeting schedule.',
      aiConversationPrompt: 'Tell the AI what happens in your morning meeting.',
      nativeHint: '毎朝9時にチームのミーティングがある。',
      mixHint: 'We 毎朝 team meeting at nine.',
      aiQuestionText: 'What do you discuss?',
    },
    advanced: {
      conversationAnswer: "We do a quick standup every morning — it's supposed to be fifteen minutes, but it always runs over.",
      typingAnswer: "It's supposed to be fifteen minutes, but it always runs over.",
      reviewPrompt: 'Review how to describe a meeting that runs long.',
      aiConversationPrompt: 'Discuss with the AI how you feel about daily meetings.',
      nativeHint: '毎朝スタンドアップやる。15分のはずなのに、いつも伸びる。',
      mixHint: "We 毎朝スタンドアップ — 15分のはず, but it always runs over.",
      aiQuestionText: 'Do meetings usually run long?',
    },
  },
  lunch_break: {
    beginner: {
      conversationAnswer: "It's lunch time.",
      typingAnswer: "It's lunch time.",
      reviewPrompt: 'Review a simple lunch break sentence.',
      aiConversationPrompt: 'Tell the AI what you eat for lunch.',
      nativeHint: 'お昼の時間だ。',
      mixHint: "It's お昼の時間.",
      aiQuestionText: 'What are you having for lunch?',
      variations: [
        { conversationAnswer: "Time for lunch!", typingAnswer: 'Time for lunch!', nativeHint: 'お昼だ！', mixHint: 'Time for お昼!' },
        { conversationAnswer: "I'm on my lunch break.", typingAnswer: "I'm on my lunch break.", nativeHint: '昼休み中。', mixHint: "I'm 昼休み中." },
        { conversationAnswer: "Let's eat.", typingAnswer: "Let's eat.", nativeHint: '食べよう。', mixHint: "Let's 食べよう." },
      ],
    },
    intermediate: {
      conversationAnswer: "I usually eat lunch at my desk — I don't have time to go out.",
      typingAnswer: "I don't have time to go out.",
      reviewPrompt: 'Review how to describe lunch habits at work.',
      aiConversationPrompt: 'Tell the AI about your lunch routine.',
      nativeHint: 'だいたいデスクで食べる。外に行く時間ない。',
      mixHint: "I usually デスクで lunch — 外に行く時間 don't have.",
      aiQuestionText: 'Do you eat at your desk?',
      variations: [
        { conversationAnswer: "I just eat at my desk most days — going out takes too long.", typingAnswer: 'Going out takes too long.', nativeHint: 'ほとんどデスクで食べる。外行くと時間かかるし。', mixHint: 'I just デスクで eat most days — 外行く takes too long.' },
        { conversationAnswer: "I bring my lunch and eat while I work — it saves time.", typingAnswer: 'It saves time.', nativeHint: '弁当持ってきて仕事しながら食べる。時短になる。', mixHint: 'I 弁当持ってきて eat while I work — 時短になる.' },
        { conversationAnswer: "I rarely go out for lunch — there's always too much to do.", typingAnswer: "There's always too much to do.", nativeHint: '外にランチ行くことほとんどない。やること多すぎ。', mixHint: 'I rarely 外にランチ — やること always too much.' },
      ],
    },
    advanced: {
      conversationAnswer: "I try to take a proper lunch break — if I eat at my desk, I end up working through it.",
      typingAnswer: "If I eat at my desk, I end up working through it.",
      reviewPrompt: 'Review how to describe work-life balance at lunchtime.',
      aiConversationPrompt: 'Discuss with the AI whether you take a real break at lunch.',
      nativeHint: 'ちゃんと昼休み取るようにしてる。デスクで食べると結局仕事しちゃう。',
      mixHint: 'I try to ちゃんと昼休み取る — デスクで食べると I end up working through it.',
      aiQuestionText: 'Do you actually take a break?',
      variations: [
        { conversationAnswer: "I force myself to leave my desk for lunch — otherwise I just work straight through.", typingAnswer: 'Otherwise I just work straight through.', nativeHint: '昼は無理やりデスク離れる。じゃないとぶっ通しで仕事しちゃう。', mixHint: 'I force myself to デスク離れる for lunch — otherwise ぶっ通しで work.' },
        { conversationAnswer: "Taking a real lunch break actually makes my afternoon way more productive.", typingAnswer: 'It makes my afternoon way more productive.', nativeHint: 'ちゃんと昼休み取ると午後の生産性が全然違う。', mixHint: 'ちゃんと昼休み取ると actually makes 午後 way more productive.' },
        { conversationAnswer: "I started stepping away from my desk at lunch and honestly it changed everything.", typingAnswer: 'It changed everything.', nativeHint: '昼にデスクから離れるようにしたら全部変わった。', mixHint: 'I started 昼にデスクから離れる and honestly 全部変わった.' },
      ],
    },
  },
  give_a_presentation: {
    beginner: {
      conversationAnswer: 'I have a presentation today.',
      typingAnswer: 'I have a presentation today.',
      reviewPrompt: 'Review a simple work sentence.',
      aiConversationPrompt: 'Tell the AI about your presentation.',
      nativeHint: '今日プレゼンがある。',
      mixHint: 'I プレゼン have today.',
      aiQuestionText: 'Are you nervous?',
    },
    intermediate: {
      conversationAnswer: "I have a presentation this afternoon — I've been preparing all week.",
      typingAnswer: "I've been preparing all week.",
      reviewPrompt: 'Review how to talk about preparation.',
      aiConversationPrompt: 'Tell the AI what your presentation is about.',
      nativeHint: '今日の午後プレゼン。一週間ずっと準備してた。',
      mixHint: "I 午後プレゼン — I've been 一週間ずっと preparing.",
      aiQuestionText: 'What is it about?',
    },
    advanced: {
      conversationAnswer: "I just finished my presentation — it went way better than I expected.",
      typingAnswer: 'It went way better than I expected.',
      reviewPrompt: 'Review how to reflect on a completed task.',
      aiConversationPrompt: 'Discuss with the AI how you handle presentations.',
      nativeHint: 'プレゼン終わった。思ったよりずっとうまくいった。',
      mixHint: 'I プレゼン just finished — 思ったより way better.',
      aiQuestionText: 'How did it go?',
    },
  },
  online_shopping: {
    beginner: {
      conversationAnswer: 'I bought something online.',
      typingAnswer: 'I bought something online.',
      reviewPrompt: 'Review a simple shopping sentence.',
      aiConversationPrompt: 'Tell the AI what you bought.',
      nativeHint: 'ネットで買い物した。',
      mixHint: 'I ネットで bought something.',
      aiQuestionText: 'What did you buy?',
    },
    intermediate: {
      conversationAnswer: "I ordered a new bag online — it should arrive by Friday.",
      typingAnswer: 'It should arrive by Friday.',
      reviewPrompt: 'Review how to talk about online orders.',
      aiConversationPrompt: 'Tell the AI about your online shopping habits.',
      nativeHint: 'ネットで新しいバッグ注文した。金曜までに届くはず。',
      mixHint: 'I ネットで新しいバッグ ordered — 金曜まで arrive should.',
      aiQuestionText: 'When is it arriving?',
    },
    advanced: {
      conversationAnswer: "I keep adding stuff to my cart but never actually buying anything — I need to stop window shopping online.",
      typingAnswer: 'I need to stop window shopping online.',
      reviewPrompt: 'Review how to describe a relatable shopping habit.',
      aiConversationPrompt: 'Discuss with the AI your online shopping habits.',
      nativeHint: 'カートに入れるだけで全然買わない。ネットのウィンドウショッピングやめなきゃ。',
      mixHint: 'I keep カートに入れる but never buying — ネットのウィンドウショッピングやめなきゃ.',
      aiQuestionText: 'Do you shop online a lot?',
    },
  },
  airport_checkin: {
    beginner: {
      conversationAnswer: "I'd like to check in for my flight.",
      typingAnswer: "I'd like to check in.",
      reviewPrompt: 'Review a basic airport check-in sentence.',
      aiConversationPrompt: 'Tell the AI about your travel plans.',
      nativeHint: 'フライトのチェックインお願いします。',
      mixHint: "I'd like to チェックイン for my flight.",
      aiQuestionText: 'Where are you flying to?',
    },
    intermediate: {
      conversationAnswer: "I'd like to check in — I have one bag to check.",
      typingAnswer: 'I have one bag to check.',
      reviewPrompt: 'Review how to handle airport check-in.',
      aiConversationPrompt: 'Role-play an airport check-in with the AI.',
      nativeHint: 'チェックインお願いします。預ける荷物が一つあります。',
      mixHint: "I'd like to チェックイン — 預ける荷物 one bag.",
      aiQuestionText: 'How many bags are you checking?',
    },
    advanced: {
      conversationAnswer: "I'd like to check in — is there any chance I could get a window seat?",
      typingAnswer: 'Is there any chance I could get a window seat?',
      reviewPrompt: 'Review how to make a polite request at the airport.',
      aiConversationPrompt: 'Discuss with the AI your airport preferences.',
      nativeHint: 'チェックインお願いします。窓側の席って空いてますか？',
      mixHint: "I'd like to チェックイン — 窓側の席 any chance?",
      aiQuestionText: 'Do you prefer window or aisle?',
    },
  },
  order_at_a_restaurant: {
    beginner: {
      conversationAnswer: "I'll have the pasta, please.",
      typingAnswer: "I'll have the pasta.",
      reviewPrompt: 'Review a basic restaurant ordering sentence.',
      aiConversationPrompt: 'Tell the AI what you usually order.',
      nativeHint: 'パスタをお願いします。',
      mixHint: "I'll have the パスタ, please.",
      aiQuestionText: 'What would you like?',
      variations: [
        { conversationAnswer: 'Can I get the pasta?', typingAnswer: 'Can I get the pasta?', nativeHint: 'パスタもらえますか？', mixHint: 'Can I get the パスタ?' },
        { conversationAnswer: 'The pasta, please.', typingAnswer: 'The pasta, please.', nativeHint: 'パスタお願いします。', mixHint: 'The パスタ, please.' },
        { conversationAnswer: "I'd like the pasta.", typingAnswer: "I'd like the pasta.", nativeHint: 'パスタがいいです。', mixHint: "I'd like the パスタ." },
      ],
    },
    intermediate: {
      conversationAnswer: "Can I get the lunch set? And a water, please.",
      typingAnswer: 'Can I get the lunch set?',
      reviewPrompt: 'Review how to order a set meal.',
      aiConversationPrompt: 'Role-play ordering at a restaurant with the AI.',
      nativeHint: 'ランチセットお願いします。あとお水も。',
      mixHint: 'Can I get the ランチセット? And お水, please.',
      aiQuestionText: 'Anything to drink?',
      variations: [
        { conversationAnswer: "I'll do the lunch set. And just water is fine.", typingAnswer: 'Just water is fine.', nativeHint: 'ランチセットで。お水だけで大丈夫です。', mixHint: "I'll do the ランチセット. お水だけで fine." },
        { conversationAnswer: "Could I have the set meal? Oh, and a water too, please.", typingAnswer: 'A water too, please.', nativeHint: 'セットをお願いします。あ、お水もください。', mixHint: 'Could I have the セット? Oh, and お水 too, please.' },
        { conversationAnswer: "The lunch set looks good — I'll take that. And water, please.", typingAnswer: "I'll take that.", nativeHint: 'ランチセット良さそう。それください。あとお水も。', mixHint: "ランチセット looks good — I'll take that. And お水, please." },
      ],
    },
    advanced: {
      conversationAnswer: "I'll go with the chef's special — what do you recommend for a side?",
      typingAnswer: 'What do you recommend for a side?',
      reviewPrompt: 'Review how to ask for recommendations naturally.',
      aiConversationPrompt: 'Discuss with the AI your restaurant ordering style.',
      nativeHint: 'シェフのおすすめにします。サイドは何がいいですか？',
      mixHint: "I'll go with the シェフのおすすめ — サイド recommend?",
      aiQuestionText: 'Would you like to try our special?',
      variations: [
        { conversationAnswer: "I'm feeling adventurous — surprise me. What's your best dish?", typingAnswer: "What's your best dish?", nativeHint: '冒険したい気分。おすすめは何ですか？', mixHint: "I'm 冒険したい気分 — surprise me. おすすめは what?" },
        { conversationAnswer: "What pairs well with the special? I'm open to suggestions.", typingAnswer: "I'm open to suggestions.", nativeHint: 'スペシャルに合うのは？何でも聞きます。', mixHint: "What pairs well with the スペシャル? I'm 何でも open." },
        { conversationAnswer: "Let me try the chef's pick — and whatever side you think goes best with it.", typingAnswer: 'Whatever side goes best with it.', nativeHint: 'シェフのおすすめで。サイドも合うやつお任せで。', mixHint: "Let me try シェフのおすすめ — and whatever サイド goes best with it." },
      ],
    },
  },
  doctor_consultation: {
    beginner: {
      conversationAnswer: "I don't feel well.",
      typingAnswer: "I don't feel well.",
      reviewPrompt: 'Review a basic health complaint.',
      aiConversationPrompt: 'Tell the AI how you feel.',
      nativeHint: '体調が悪い。',
      mixHint: "I don't 体調が良くない.",
      aiQuestionText: 'What seems to be the problem?',
    },
    intermediate: {
      conversationAnswer: "I've had a sore throat for a few days now.",
      typingAnswer: "I've had a sore throat for a few days.",
      reviewPrompt: 'Review how to describe symptoms to a doctor.',
      aiConversationPrompt: 'Tell the AI about your symptoms.',
      nativeHint: '数日前から喉が痛い。',
      mixHint: "I've had 喉が痛い for a few days.",
      aiQuestionText: 'How long have you been feeling this way?',
    },
    advanced: {
      conversationAnswer: "I've been feeling run down for about a week — I think I might've caught something.",
      typingAnswer: "I think I might've caught something.",
      reviewPrompt: 'Review how to describe vague symptoms naturally.',
      aiConversationPrompt: 'Discuss your health concerns with the AI.',
      nativeHint: '一週間くらいだるい。なんかうつったかも。',
      mixHint: "I've been 一週間だるい — なんか caught something かも.",
      aiQuestionText: 'When did you start feeling like this?',
    },
  },
  // ——— Advanced pool scenes ———
  deadline_discussion: {
    beginner: {
      conversationAnswer: 'The deadline is Friday.',
      typingAnswer: 'The deadline is Friday.',
      reviewPrompt: 'Review a simple deadline sentence.',
      aiConversationPrompt: 'Tell the AI about your deadline.',
      nativeHint: '締切は金曜日。',
      mixHint: 'The 締切 is Friday.',
      aiQuestionText: 'When is the deadline?',
    },
    intermediate: {
      conversationAnswer: "The deadline is Friday, but I don't think I'll make it.",
      typingAnswer: "I don't think I'll make it.",
      reviewPrompt: 'Review how to express concern about a deadline.',
      aiConversationPrompt: 'Tell the AI about your workload.',
      nativeHint: '締切金曜だけど、間に合わないかも。',
      mixHint: "The 締切 is Friday, but 間に合わない I don't think.",
      aiQuestionText: 'Are you going to make it?',
    },
    advanced: {
      conversationAnswer: "I need to push the deadline back — there's no way I can finish everything by Friday.",
      typingAnswer: "There's no way I can finish by Friday.",
      reviewPrompt: 'Review how to negotiate a deadline extension.',
      aiConversationPrompt: 'Discuss with the AI how you handle tight deadlines.',
      nativeHint: '締切延ばさなきゃ。金曜までに全部終わるのは無理。',
      mixHint: "I 締切延ばさなきゃ — 金曜まで no way 全部終わる.",
      aiQuestionText: 'Can you ask for more time?',
    },
  },
  job_interview_preparation: {
    beginner: {
      conversationAnswer: 'I have a job interview tomorrow.',
      typingAnswer: 'I have a job interview tomorrow.',
      reviewPrompt: 'Review a simple interview sentence.',
      aiConversationPrompt: 'Tell the AI about your interview.',
      nativeHint: '明日面接がある。',
      mixHint: 'I 面接 have tomorrow.',
      aiQuestionText: 'Are you ready for it?',
    },
    intermediate: {
      conversationAnswer: "I have a job interview tomorrow — I've been practicing my answers all week.",
      typingAnswer: "I've been practicing my answers all week.",
      reviewPrompt: 'Review how to describe interview preparation.',
      aiConversationPrompt: 'Tell the AI how you prepare for interviews.',
      nativeHint: '明日面接。一週間ずっと回答練習してた。',
      mixHint: "I 面接 tomorrow — I've been 一週間ずっと回答 practicing.",
      aiQuestionText: 'What kind of job is it?',
    },
    advanced: {
      conversationAnswer: "I'm pretty nervous about my interview — I really want this job, so I've been going over everything a hundred times.",
      typingAnswer: "I really want this job.",
      reviewPrompt: 'Review how to express nervousness and determination.',
      aiConversationPrompt: 'Discuss with the AI how you handle interview nerves.',
      nativeHint: '面接めっちゃ緊張する。この仕事ほんとに欲しいから、何回も練習してる。',
      mixHint: "I'm 面接めっちゃ緊張 — この仕事 really want, so 何回も going over everything.",
      aiQuestionText: 'What makes you nervous about it?',
    },
  },
  plan_a_trip: {
    beginner: {
      conversationAnswer: "I'm planning a trip.",
      typingAnswer: "I'm planning a trip.",
      reviewPrompt: 'Review a simple travel planning sentence.',
      aiConversationPrompt: 'Tell the AI where you want to go.',
      nativeHint: '旅行の計画をしてる。',
      mixHint: "I'm 旅行の計画 planning.",
      aiQuestionText: 'Where are you going?',
    },
    intermediate: {
      conversationAnswer: "I'm planning a trip to Kyoto next month — I want to see the temples.",
      typingAnswer: 'I want to see the temples.',
      reviewPrompt: 'Review how to describe travel plans.',
      aiConversationPrompt: 'Tell the AI about your travel plans.',
      nativeHint: '来月京都に行く予定。お寺を見たい。',
      mixHint: "I'm 来月京都 planning — お寺 want to see.",
      aiQuestionText: 'What do you want to do there?',
    },
    advanced: {
      conversationAnswer: "I've been looking at flights and hotels for weeks — planning a trip is almost as fun as going on one.",
      typingAnswer: "Planning a trip is almost as fun as going on one.",
      reviewPrompt: 'Review how to express enjoyment of the planning process.',
      aiConversationPrompt: 'Discuss with the AI how you plan your trips.',
      nativeHint: '何週間もフライトとホテル見てる。旅行の計画って行くのと同じくらい楽しい。',
      mixHint: "I've been フライトとホテル weeks 見てる — 計画 is almost as fun as 行くの.",
      aiQuestionText: 'Do you enjoy the planning part?',
    },
  },
  ask_someone_out: {
    beginner: {
      conversationAnswer: 'Do you want to get dinner sometime?',
      typingAnswer: 'Do you want to get dinner?',
      reviewPrompt: 'Review how to ask someone out simply.',
      aiConversationPrompt: 'Practice asking someone out with the AI.',
      nativeHint: '今度ご飯行かない？',
      mixHint: 'Do you want to 今度ご飯 sometime?',
      aiQuestionText: 'Are you asking me out?',
    },
    intermediate: {
      conversationAnswer: "There's this great Italian place nearby — would you want to check it out this weekend?",
      typingAnswer: 'Would you want to check it out this weekend?',
      reviewPrompt: 'Review how to suggest a specific date spot.',
      aiConversationPrompt: 'Practice inviting someone to a specific place.',
      nativeHint: '近くにいいイタリアンあるんだけど、今週末行ってみない？',
      mixHint: "近くにいいイタリアン — would you want to 今週末 check it out?",
      aiQuestionText: "That sounds fun! What's it called?",
    },
    advanced: {
      conversationAnswer: "I've been meaning to ask you — would you like to grab dinner this Friday? I know a really nice spot.",
      typingAnswer: 'Would you like to grab dinner this Friday?',
      reviewPrompt: 'Review how to ask someone out confidently and politely.',
      aiConversationPrompt: 'Discuss with the AI how to ask someone out naturally.',
      nativeHint: 'ずっと聞きたかったんだけど、今週の金曜ご飯行かない？いいお店知ってるんだ。',
      mixHint: "I've been ずっと聞きたかった — 金曜ご飯 grab dinner? いいお店 know.",
      aiQuestionText: "I'd love to! Where were you thinking?",
    },
  },
  parking_a_car: {
    beginner: { conversationAnswer: 'I parked the car.', typingAnswer: 'I parked the car.', reviewPrompt: 'Review a simple parking sentence.', aiConversationPrompt: 'Tell the AI where you parked.', nativeHint: '車を停めた。', mixHint: 'I 車を parked.', aiQuestionText: 'Where did you park?' },
    intermediate: { conversationAnswer: "I found a spot pretty close to the entrance.", typingAnswer: 'I found a spot close to the entrance.', reviewPrompt: 'Review how to describe parking.', aiConversationPrompt: 'Tell the AI about parking at your workplace.', nativeHint: '入口の近くに停められた。', mixHint: 'I 入口の近く spot found.', aiQuestionText: 'Was it hard to find parking?' },
    advanced: { conversationAnswer: "It took me forever to find a spot — the parking lot was completely full.", typingAnswer: 'The parking lot was completely full.', reviewPrompt: 'Review how to describe a frustrating parking experience.', aiConversationPrompt: 'Discuss with the AI parking challenges.', nativeHint: '停めるのにめっちゃ時間かかった。駐車場満車だった。', mixHint: 'It took 永遠 to find a spot — 駐車場 completely full.', aiQuestionText: 'How long did it take to park?' },
  },
  phone_call_at_work: {
    beginner: { conversationAnswer: 'I got a phone call at work.', typingAnswer: 'I got a phone call.', reviewPrompt: 'Review a simple work call sentence.', aiConversationPrompt: 'Tell the AI about the call.', nativeHint: '仕事中に電話があった。', mixHint: 'I 仕事中に phone call got.', aiQuestionText: 'Who called you?' },
    intermediate: { conversationAnswer: "I had to take a call from a client during lunch.", typingAnswer: 'I had to take a call from a client.', reviewPrompt: 'Review how to describe work calls.', aiConversationPrompt: 'Tell the AI how you handle work calls.', nativeHint: 'お昼にクライアントから電話来て出なきゃだった。', mixHint: 'I クライアントから call had to take during lunch.', aiQuestionText: 'What was the call about?' },
    advanced: { conversationAnswer: "I was on the phone for an hour — the client kept going back and forth on the details.", typingAnswer: "The client kept going back and forth.", reviewPrompt: 'Review how to describe a long phone call.', aiConversationPrompt: 'Discuss with the AI how you manage long calls.', nativeHint: '1時間電話してた。クライアントが細かいとこ何度もやり直して。', mixHint: "I was 1時間 on the phone — クライアント kept 細かいとこ going back and forth.", aiQuestionText: 'Was it a productive call?' },
  },
  send_an_email: {
    beginner: { conversationAnswer: 'I sent an email.', typingAnswer: 'I sent an email.', reviewPrompt: 'Review a simple email sentence.', aiConversationPrompt: 'Tell the AI who you emailed.', nativeHint: 'メールを送った。', mixHint: 'I メール sent.', aiQuestionText: 'Who did you email?' },
    intermediate: { conversationAnswer: "I sent an email to my boss about the schedule change.", typingAnswer: 'I emailed my boss about the schedule.', reviewPrompt: 'Review how to describe an email topic.', aiConversationPrompt: 'Tell the AI about your email.', nativeHint: '予定変更について上司にメール送った。', mixHint: 'I 上司に email sent about 予定変更.', aiQuestionText: 'Did they reply?' },
    advanced: { conversationAnswer: "I spent way too long writing that email — I kept rewriting it to make sure the tone was right.", typingAnswer: 'I kept rewriting it to get the tone right.', reviewPrompt: 'Review how to describe careful communication.', aiConversationPrompt: 'Discuss with the AI your email writing habits.', nativeHint: 'あのメール書くのに時間かかりすぎた。トーンが大丈夫か何度も書き直した。', mixHint: "I way too long あのメール — 何度も rewriting to トーン right.", aiQuestionText: 'Was it a tricky email to write?' },
  },
  talk_with_a_manager: {
    beginner: { conversationAnswer: 'I talked to my manager.', typingAnswer: 'I talked to my manager.', reviewPrompt: 'Review a simple work conversation sentence.', aiConversationPrompt: 'Tell the AI what you discussed.', nativeHint: '上司と話した。', mixHint: 'I 上司と talked.', aiQuestionText: 'What did you talk about?' },
    intermediate: { conversationAnswer: "I had a quick chat with my manager about my project.", typingAnswer: 'I had a quick chat about my project.', reviewPrompt: 'Review how to describe a work discussion.', aiConversationPrompt: 'Tell the AI about your conversation with your manager.', nativeHint: 'プロジェクトについて上司とちょっと話した。', mixHint: 'I 上司と quick chat about プロジェクト.', aiQuestionText: 'How did it go?' },
    advanced: { conversationAnswer: "I brought up the staffing issue with my manager — she said she'd look into it.", typingAnswer: "She said she'd look into it.", reviewPrompt: 'Review how to report a conversation with a superior.', aiConversationPrompt: 'Discuss with the AI how you raise concerns at work.', nativeHint: '人手不足のこと上司に言ったら、確認してくれるって。', mixHint: "I 人手不足 brought up — she said she'd 確認する.", aiQuestionText: 'Did your manager take it seriously?' },
  },
  talk_with_a_teacher: {
    beginner: { conversationAnswer: 'I talked to my teacher.', typingAnswer: 'I talked to my teacher.', reviewPrompt: 'Review a simple school sentence.', aiConversationPrompt: 'Tell the AI what you asked.', nativeHint: '先生と話した。', mixHint: 'I 先生と talked.', aiQuestionText: 'What did the teacher say?' },
    intermediate: { conversationAnswer: "I asked my teacher about the homework after class.", typingAnswer: 'I asked about the homework after class.', reviewPrompt: 'Review how to describe asking a teacher for help.', aiConversationPrompt: 'Tell the AI about your conversation with your teacher.', nativeHint: '授業の後、先生に宿題について聞いた。', mixHint: 'I 先生に asked about 宿題 after class.', aiQuestionText: 'Did you understand the homework?' },
    advanced: { conversationAnswer: "I stayed after class to ask about the essay — my teacher gave me some really helpful feedback.", typingAnswer: 'My teacher gave me really helpful feedback.', reviewPrompt: 'Review how to describe getting academic advice.', aiConversationPrompt: 'Discuss with the AI how teachers help you improve.', nativeHint: '授業後に残ってレポートについて聞いたら、すごく役立つアドバイスもらえた。', mixHint: 'I 授業後に残って essay asked — 先生が really helpful feedback.', aiQuestionText: 'What kind of feedback did you get?' },
  },
  study_for_an_exam: {
    beginner: { conversationAnswer: "I'm studying for a test.", typingAnswer: "I'm studying for a test.", reviewPrompt: 'Review a simple study sentence.', aiConversationPrompt: 'Tell the AI what subject you are studying.', nativeHint: 'テスト勉強してる。', mixHint: "I'm テスト勉強 studying.", aiQuestionText: 'What test is coming up?' },
    intermediate: { conversationAnswer: "I've been studying all day — the exam is tomorrow.", typingAnswer: 'The exam is tomorrow.', reviewPrompt: 'Review how to describe exam preparation.', aiConversationPrompt: 'Tell the AI how you study for exams.', nativeHint: '一日中勉強してた。明日試験。', mixHint: "I've been 一日中 studying — 試験 tomorrow.", aiQuestionText: 'Do you feel ready?' },
    advanced: { conversationAnswer: "I've been cramming for this exam, but honestly, I should've started studying way earlier.", typingAnswer: "I should've started studying way earlier.", reviewPrompt: 'Review how to express regret about study habits.', aiConversationPrompt: 'Discuss with the AI your study strategies.', nativeHint: '一夜漬けしてるけど、正直もっと早く始めればよかった。', mixHint: "I've been 一夜漬け, but 正直 should've もっと早く started.", aiQuestionText: 'How do you usually study?' },
  },
  club_activity: {
    beginner: { conversationAnswer: 'I have club practice today.', typingAnswer: 'I have club practice today.', reviewPrompt: 'Review a simple club activity sentence.', aiConversationPrompt: 'Tell the AI about your club.', nativeHint: '今日部活がある。', mixHint: 'I 部活 have today.', aiQuestionText: 'What club are you in?' },
    intermediate: { conversationAnswer: "I have basketball practice after school — we have a game this weekend.", typingAnswer: 'We have a game this weekend.', reviewPrompt: 'Review how to describe club schedules.', aiConversationPrompt: 'Tell the AI about your upcoming game or event.', nativeHint: '放課後バスケの練習ある。今週末試合だから。', mixHint: 'I 放課後バスケ練習 — 今週末試合.', aiQuestionText: 'Are you ready for the game?' },
    advanced: { conversationAnswer: "Practice was rough today — the coach really pushed us hard, but I feel like I'm improving.", typingAnswer: "I feel like I'm improving.", reviewPrompt: 'Review how to reflect on athletic progress.', aiConversationPrompt: 'Discuss with the AI how practice affects your performance.', nativeHint: '今日の練習きつかった。コーチにしごかれたけど、上達してる気がする。', mixHint: "練習 was rough — コーチ pushed hard, but I feel like I'm 上達してる.", aiQuestionText: 'How was practice?' },
  },
  go_to_a_hair_salon: {
    beginner: { conversationAnswer: 'I got a haircut today.', typingAnswer: 'I got a haircut.', reviewPrompt: 'Review a simple personal care sentence.', aiConversationPrompt: 'Tell the AI about your haircut.', nativeHint: '今日髪切った。', mixHint: 'I 髪切った today.', aiQuestionText: 'Do you like your new haircut?' },
    intermediate: { conversationAnswer: "I went to the hair salon — I just needed a trim.", typingAnswer: 'I just needed a trim.', reviewPrompt: 'Review how to describe a salon visit.', aiConversationPrompt: 'Tell the AI how often you get your hair cut.', nativeHint: '美容院行ってきた。ちょっと整えるだけ。', mixHint: 'I 美容院行った — just ちょっと整える.', aiQuestionText: 'What did you get done?' },
    advanced: { conversationAnswer: "I finally went to get my hair done — I'd been putting it off for months.", typingAnswer: "I'd been putting it off for months.", reviewPrompt: 'Review how to describe procrastination naturally.', aiConversationPrompt: 'Discuss with the AI how often you go to the salon.', nativeHint: 'やっと髪やりに行った。何ヶ月もサボってた。', mixHint: "I finally 髪やりに行った — I'd been 何ヶ月も putting it off.", aiQuestionText: 'How do you like it?' },
  },
  pick_up_dry_cleaning: {
    beginner: { conversationAnswer: 'I picked up my clothes.', typingAnswer: 'I picked up my clothes.', reviewPrompt: 'Review a simple errand sentence.', aiConversationPrompt: 'Tell the AI about your errand.', nativeHint: '服を取りに行った。', mixHint: 'I 服を picked up.', aiQuestionText: 'From the dry cleaner?' },
    intermediate: { conversationAnswer: "I swung by the dry cleaner's to pick up my suit.", typingAnswer: 'I picked up my suit.', reviewPrompt: 'Review how to describe a dry cleaning errand.', aiConversationPrompt: 'Tell the AI when you use dry cleaning.', nativeHint: 'クリーニング店にスーツ取りに寄った。', mixHint: 'I クリーニング店に swung by to スーツ pick up.', aiQuestionText: 'Do you use the dry cleaner often?' },
    advanced: { conversationAnswer: "I almost forgot to pick up my dry cleaning — they close at seven and I barely made it.", typingAnswer: 'They close at seven and I barely made it.', reviewPrompt: 'Review how to describe a close call with timing.', aiConversationPrompt: 'Discuss with the AI how you manage errands.', nativeHint: 'クリーニング取りに行くの忘れそうだった。7時閉店でギリギリ。', mixHint: 'I almost クリーニング forgot — 7時閉店で barely made it.', aiQuestionText: 'Did you make it in time?' },
  },
  pick_up_a_child: {
    beginner: { conversationAnswer: 'I picked up my kid from school.', typingAnswer: 'I picked up my kid.', reviewPrompt: 'Review a simple parenting sentence.', aiConversationPrompt: 'Tell the AI about picking up your child.', nativeHint: '学校に子どもを迎えに行った。', mixHint: 'I 子ども picked up from school.', aiQuestionText: 'What time do you pick them up?' },
    intermediate: { conversationAnswer: "I left work early to pick up my daughter — she has a piano lesson today.", typingAnswer: 'She has a piano lesson today.', reviewPrompt: 'Review how to describe balancing work and childcare.', aiConversationPrompt: 'Tell the AI about your daily schedule with kids.', nativeHint: '早退して娘を迎えに行った。今日ピアノのレッスンだから。', mixHint: 'I 早退して 娘を pick up — ピアノレッスン today.', aiQuestionText: 'Do you pick her up every day?' },
    advanced: { conversationAnswer: "Picking up the kids is always a rush — I have to leave work right at five or I'll be late.", typingAnswer: "I have to leave right at five.", reviewPrompt: 'Review how to describe time pressure with kids.', aiConversationPrompt: 'Discuss with the AI how you juggle work and parenting.', nativeHint: '子どもの迎えはいつもバタバタ。5時ぴったりに出ないと間に合わない。', mixHint: '子どもの迎え always a rush — 5時ぴったり leave or 間に合わない.', aiQuestionText: 'Is it stressful managing both?' },
  },
  help_with_homework: {
    beginner: { conversationAnswer: 'I helped with homework.', typingAnswer: 'I helped with homework.', reviewPrompt: 'Review a simple parenting sentence.', aiConversationPrompt: 'Tell the AI what subject you helped with.', nativeHint: '宿題を手伝った。', mixHint: 'I 宿題 helped with.', aiQuestionText: 'What subject was it?' },
    intermediate: { conversationAnswer: "I helped my son with his math homework — it was harder than I remembered.", typingAnswer: 'It was harder than I remembered.', reviewPrompt: 'Review how to describe helping with studies.', aiConversationPrompt: 'Tell the AI about helping your child study.', nativeHint: '息子の算数の宿題手伝った。思ったより難しかった。', mixHint: 'I 息子の算数 helped — 思ったより harder.', aiQuestionText: 'Was it hard?' },
    advanced: { conversationAnswer: "My kid's homework is getting way beyond me — I had to look stuff up just to help.", typingAnswer: 'I had to look stuff up just to help.', reviewPrompt: 'Review how to admit difficulty honestly.', aiConversationPrompt: 'Discuss with the AI the challenges of helping with schoolwork.', nativeHint: '子どもの宿題もう自分の手に負えない。手伝うために調べなきゃだった。', mixHint: "子どもの宿題 way beyond me — 調べなきゃ just to help.", aiQuestionText: 'Can you still help them?' },
  },
  take_a_child_to_lessons: {
    beginner: { conversationAnswer: 'I took my kid to their lesson.', typingAnswer: 'I took my kid to their lesson.', reviewPrompt: 'Review a simple errand sentence.', aiConversationPrompt: 'Tell the AI what lesson your child takes.', nativeHint: '子どもを習い事に連れて行った。', mixHint: 'I 子どもを 習い事 took.', aiQuestionText: 'What kind of lesson?' },
    intermediate: { conversationAnswer: "I drove my daughter to her swimming lesson after school.", typingAnswer: 'I drove her to swimming.', reviewPrompt: 'Review how to describe driving kids to activities.', aiConversationPrompt: 'Tell the AI about your child\'s activities.', nativeHint: '放課後、娘をスイミングに車で送った。', mixHint: 'I 娘をスイミングに drove after school.', aiQuestionText: 'How many activities does she do?' },
    advanced: { conversationAnswer: "Between soccer and piano, I feel like I spend half my evenings just driving the kids around.", typingAnswer: 'I spend half my evenings driving the kids around.', reviewPrompt: 'Review how to describe a busy parent schedule.', aiConversationPrompt: 'Discuss with the AI how extracurriculars affect family time.', nativeHint: 'サッカーとピアノで、夕方の半分は子どもの送迎で終わる気がする。', mixHint: 'サッカーとピアノ — 夕方の半分 just driving kids around.', aiQuestionText: 'How many activities do your kids do?' },
  },
  read_a_story_to_a_child: {
    beginner: { conversationAnswer: 'I read a story to my kid.', typingAnswer: 'I read a story.', reviewPrompt: 'Review a simple bedtime sentence.', aiConversationPrompt: 'Tell the AI what story you read.', nativeHint: '子どもに絵本を読んだ。', mixHint: 'I 子どもに story read.', aiQuestionText: 'What story did you read?' },
    intermediate: { conversationAnswer: "I read my daughter a bedtime story — she always wants the same one.", typingAnswer: 'She always wants the same one.', reviewPrompt: 'Review how to describe a bedtime routine with kids.', aiConversationPrompt: 'Tell the AI about your bedtime reading routine.', nativeHint: '娘に寝る前の絵本読んだ。いつも同じやつがいいって。', mixHint: 'I 娘に bedtime story — いつも同じやつ wants.', aiQuestionText: 'Does she have a favorite?' },
    advanced: { conversationAnswer: "Reading to my kid before bed is my favorite part of the day — it's our special time together.", typingAnswer: "It's our special time together.", reviewPrompt: 'Review how to express emotional value of routine.', aiConversationPrompt: 'Discuss with the AI the importance of reading to children.', nativeHint: '寝る前の読み聞かせが一日で一番好きな時間。二人だけの特別な時間。', mixHint: '寝る前の読み聞かせ favorite part of the day — 二人だけの special time.', aiQuestionText: 'Why is bedtime reading special to you?' },
  },
  family_discussion: {
    beginner: { conversationAnswer: 'We talked as a family.', typingAnswer: 'We talked as a family.', reviewPrompt: 'Review a simple family sentence.', aiConversationPrompt: 'Tell the AI what you discussed.', nativeHint: '家族で話し合った。', mixHint: 'We 家族で talked.', aiQuestionText: 'What did you talk about?' },
    intermediate: { conversationAnswer: "We had a family meeting about our vacation plans.", typingAnswer: 'We talked about our vacation plans.', reviewPrompt: 'Review how to describe family discussions.', aiConversationPrompt: 'Tell the AI how your family makes decisions.', nativeHint: '休みの予定について家族会議した。', mixHint: 'We 家族会議 about 休みの予定.', aiQuestionText: 'Where are you thinking of going?' },
    advanced: { conversationAnswer: "We sat down and talked about the budget — it's not always fun, but it keeps us on the same page.", typingAnswer: "It keeps us on the same page.", reviewPrompt: 'Review how to describe practical family communication.', aiConversationPrompt: 'Discuss with the AI how your family handles important topics.', nativeHint: '家計について話し合った。楽しくはないけど、認識合わせは大事。', mixHint: 'We 家計について talked — 楽しくないけど keeps us on the same page.', aiQuestionText: 'Do you have family meetings often?' },
  },
  talk_with_siblings: {
    beginner: { conversationAnswer: 'I called my brother.', typingAnswer: 'I called my brother.', reviewPrompt: 'Review a simple family sentence.', aiConversationPrompt: 'Tell the AI about your sibling.', nativeHint: '兄に電話した。', mixHint: 'I 兄に called.', aiQuestionText: 'What did you talk about?' },
    intermediate: { conversationAnswer: "I video-called my sister — we try to catch up at least once a week.", typingAnswer: 'We catch up at least once a week.', reviewPrompt: 'Review how to describe keeping in touch.', aiConversationPrompt: 'Tell the AI how often you talk to your siblings.', nativeHint: '姉とビデオ通話した。週に一回は近況報告するようにしてる。', mixHint: 'I 姉と video-called — 週一で catch up.', aiQuestionText: 'Are you close with your siblings?' },
    advanced: { conversationAnswer: "My brother and I don't talk super often, but when we do, we can go on for hours.", typingAnswer: 'When we do talk, we can go on for hours.', reviewPrompt: 'Review how to describe sibling relationships.', aiConversationPrompt: 'Discuss with the AI your relationship with siblings.', nativeHint: '兄とはそんなに頻繁に話さないけど、話すと何時間でも続く。', mixHint: "兄と don't talk super often, but 話すと何時間でも go on.", aiQuestionText: 'How often do you catch up?' },
  },
  talk_with_grandparents: {
    beginner: { conversationAnswer: 'I visited my grandparents.', typingAnswer: 'I visited my grandparents.', reviewPrompt: 'Review a simple family sentence.', aiConversationPrompt: 'Tell the AI about your visit.', nativeHint: '祖父母に会いに行った。', mixHint: 'I 祖父母に visited.', aiQuestionText: 'How are they doing?' },
    intermediate: { conversationAnswer: "I called my grandmother — she always asks if I'm eating enough.", typingAnswer: "She always asks if I'm eating enough.", reviewPrompt: 'Review how to describe a typical grandparent conversation.', aiConversationPrompt: 'Tell the AI what your grandparents like to talk about.', nativeHint: 'おばあちゃんに電話した。いつも「ちゃんと食べてる？」って聞かれる。', mixHint: "I おばあちゃんに called — いつも「ちゃんと食べてる？」.", aiQuestionText: 'What did she say?' },
    advanced: { conversationAnswer: "I try to visit my grandparents at least once a month — they won't say it, but I can tell they get lonely.", typingAnswer: "I can tell they get lonely.", reviewPrompt: 'Review how to express emotional awareness about family.', aiConversationPrompt: 'Discuss with the AI how you stay connected with elderly family.', nativeHint: '月に一回は祖父母に会いに行くようにしてる。言わないけど、寂しそうなの分かるから。', mixHint: 'I 月一で祖父母に visit — 言わないけど 寂しそう can tell.', aiQuestionText: 'How often do you see them?' },
  },
  plan_a_date: {
    beginner: { conversationAnswer: "Let's go out this weekend.", typingAnswer: "Let's go out this weekend.", reviewPrompt: 'Review a simple date invitation.', aiConversationPrompt: 'Tell the AI your date plans.', nativeHint: '今週末どこか行こうよ。', mixHint: "Let's 今週末 go out.", aiQuestionText: 'What do you want to do?' },
    intermediate: { conversationAnswer: "I'm thinking we could check out that new cafe downtown.", typingAnswer: 'We could check out that new cafe.', reviewPrompt: 'Review how to suggest a date plan.', aiConversationPrompt: 'Tell the AI what kind of dates you enjoy.', nativeHint: '街の新しいカフェ行ってみない？', mixHint: "I'm thinking 新しいカフェ check out downtown.", aiQuestionText: 'Which cafe?' },
    advanced: { conversationAnswer: "I found this amazing restaurant with great reviews — want to try it this Saturday?", typingAnswer: 'Want to try it this Saturday?', reviewPrompt: 'Review how to suggest a date with enthusiasm.', aiConversationPrompt: 'Discuss with the AI how you plan dates.', nativeHint: 'レビューめっちゃいいレストラン見つけた。今週の土曜行ってみない？', mixHint: 'I found レビューめっちゃいいレストラン — want to 土曜 try?', aiQuestionText: 'That sounds great! What kind of food?' },
  },
  date_at_a_cafe: {
    beginner: { conversationAnswer: "This place is really cute.", typingAnswer: 'This place is really cute.', reviewPrompt: 'Review a simple compliment about a place.', aiConversationPrompt: 'Tell the AI about the cafe.', nativeHint: 'ここすごくかわいい。', mixHint: 'This place すごくかわいい.', aiQuestionText: 'Do you like it here?' },
    intermediate: { conversationAnswer: "This cafe has such a nice vibe — good call picking this place.", typingAnswer: 'Good call picking this place.', reviewPrompt: 'Review how to compliment someone\'s choice.', aiConversationPrompt: 'Describe the cafe atmosphere to the AI.', nativeHint: 'このカフェ雰囲気いいね。ここ選んで正解。', mixHint: 'This cafe 雰囲気いい — good call ここ選んで.', aiQuestionText: 'What do you think of the coffee?' },
    advanced: { conversationAnswer: "I could sit here all day — the coffee's great and I love the music they're playing.", typingAnswer: "The coffee's great and I love the music.", reviewPrompt: 'Review how to express enjoying an atmosphere.', aiConversationPrompt: 'Discuss with the AI what makes a great cafe date.', nativeHint: 'ここ一日中いられる。コーヒーも美味しいし、流れてる音楽も好き。', mixHint: 'I could ここ一日中 — コーヒー great and 音楽 love.', aiQuestionText: 'Want to stay a little longer?' },
  },
  date_at_a_restaurant: {
    beginner: { conversationAnswer: 'The food here is great.', typingAnswer: 'The food is great.', reviewPrompt: 'Review a simple restaurant compliment.', aiConversationPrompt: 'Tell the AI about the restaurant.', nativeHint: 'ここの料理おいしい。', mixHint: 'The food here おいしい.', aiQuestionText: 'What did you order?' },
    intermediate: { conversationAnswer: "Everything looks so good — I can't decide what to get.", typingAnswer: "I can't decide what to get.", reviewPrompt: 'Review how to express indecision at a restaurant.', aiConversationPrompt: 'Tell the AI what you ended up ordering.', nativeHint: '全部おいしそう。何にするか決められない。', mixHint: "Everything おいしそう — I can't 決められない.", aiQuestionText: 'Need help choosing?' },
    advanced: { conversationAnswer: "This was such a good pick — the atmosphere, the food, everything. We should come back.", typingAnswer: 'We should come back.', reviewPrompt: 'Review how to praise a restaurant experience.', aiConversationPrompt: 'Discuss with the AI what makes a great restaurant experience.', nativeHint: 'ここ本当にいいチョイスだった。雰囲気も料理も全部最高。また来よう。', mixHint: 'This was いいチョイス — 雰囲気も料理も everything. また来よう.', aiQuestionText: 'Would you come back here?' },
  },
  go_to_a_movie: {
    beginner: { conversationAnswer: 'I watched a movie.', typingAnswer: 'I watched a movie.', reviewPrompt: 'Review a simple entertainment sentence.', aiConversationPrompt: 'Tell the AI what movie you saw.', nativeHint: '映画を観た。', mixHint: 'I 映画を watched.', aiQuestionText: 'What did you watch?' },
    intermediate: { conversationAnswer: "I saw that new action movie — it was better than I expected.", typingAnswer: 'It was better than I expected.', reviewPrompt: 'Review how to give a simple movie review.', aiConversationPrompt: 'Tell the AI about the movie.', nativeHint: '新しいアクション映画観た。思ったより良かった。', mixHint: 'I 新しいアクション映画 saw — 思ったより better.', aiQuestionText: 'Would you recommend it?' },
    advanced: { conversationAnswer: "The movie was amazing — I don't want to spoil it, but the ending totally caught me off guard.", typingAnswer: "The ending totally caught me off guard.", reviewPrompt: 'Review how to talk about a movie without spoilers.', aiConversationPrompt: 'Discuss with the AI your movie preferences.', nativeHint: '映画最高だった。ネタバレしたくないけど、ラストは完全に予想外。', mixHint: "映画 amazing — ネタバレしたくない but ending totally 予想外.", aiQuestionText: 'Was it worth watching?' },
  },
  choose_a_gift: {
    beginner: { conversationAnswer: "I'm looking for a gift.", typingAnswer: "I'm looking for a gift.", reviewPrompt: 'Review a simple shopping sentence.', aiConversationPrompt: 'Tell the AI who the gift is for.', nativeHint: 'プレゼントを探してる。', mixHint: "I'm プレゼント looking for.", aiQuestionText: 'Who is it for?' },
    intermediate: { conversationAnswer: "I'm looking for a birthday gift for my friend — any ideas?", typingAnswer: 'Any ideas?', reviewPrompt: 'Review how to ask for gift suggestions.', aiConversationPrompt: 'Tell the AI what kind of things your friend likes.', nativeHint: '友達の誕生日プレゼント探してるんだけど、何かいいアイデアある？', mixHint: "I'm 誕生日プレゼント looking for 友達 — any ideas?", aiQuestionText: 'What kind of things do they like?' },
    advanced: { conversationAnswer: "I never know what to get people — I always end up overthinking it and buying something last minute.", typingAnswer: 'I always end up buying something last minute.', reviewPrompt: 'Review how to describe gift-giving anxiety.', aiConversationPrompt: 'Discuss with the AI your approach to gift giving.', nativeHint: 'いつも何買えばいいかわからない。考えすぎて結局ギリギリに買う。', mixHint: 'I never 何買えばいいか know — 考えすぎて last minute.', aiQuestionText: 'Do you find it hard to choose gifts?' },
  },
  make_weekend_plans: {
    beginner: { conversationAnswer: 'What are you doing this weekend?', typingAnswer: 'What are you doing this weekend?', reviewPrompt: 'Review a simple weekend question.', aiConversationPrompt: 'Tell the AI your weekend plans.', nativeHint: '今週末何するの？', mixHint: 'What are you 今週末 doing?', aiQuestionText: 'Got any plans?' },
    intermediate: { conversationAnswer: "I don't have any plans yet — want to do something together?", typingAnswer: 'Want to do something together?', reviewPrompt: 'Review how to suggest weekend plans.', aiConversationPrompt: 'Tell the AI how you usually spend weekends.', nativeHint: 'まだ予定ないんだけど、一緒に何かしない？', mixHint: "まだ予定ない — want to 一緒に something?", aiQuestionText: 'What do you usually do on weekends?' },
    advanced: { conversationAnswer: "I was thinking about going hiking if the weather's good — it'd be nice to get out of the city for a bit.", typingAnswer: "It'd be nice to get out of the city.", reviewPrompt: 'Review how to suggest outdoor weekend plans.', aiConversationPrompt: 'Discuss with the AI how you recharge on weekends.', nativeHint: '天気良かったらハイキング行こうかなと思って。ちょっと街から離れたい。', mixHint: "ハイキング thinking if 天気良かったら — it'd be nice to 街から離れる.", aiQuestionText: 'That sounds fun! Where would you go?' },
  },
  talk_on_social_media: {
    beginner: { conversationAnswer: 'I was chatting online.', typingAnswer: 'I was chatting online.', reviewPrompt: 'Review a simple social media sentence.', aiConversationPrompt: 'Tell the AI who you were talking to.', nativeHint: 'ネットでチャットしてた。', mixHint: 'I was ネットで chatting.', aiQuestionText: 'Who were you talking to?' },
    intermediate: { conversationAnswer: "I was scrolling through Instagram and ended up messaging a friend.", typingAnswer: 'I ended up messaging a friend.', reviewPrompt: 'Review how to describe social media use.', aiConversationPrompt: 'Tell the AI how you use social media.', nativeHint: 'インスタ見てたら友達にメッセージ送ってた。', mixHint: 'I was インスタ scrolling and 友達に messaging.', aiQuestionText: 'Do you spend a lot of time on social media?' },
    advanced: { conversationAnswer: "I got into this long back-and-forth on Twitter — I should really stop getting pulled into online debates.", typingAnswer: 'I should stop getting pulled into online debates.', reviewPrompt: 'Review how to describe social media habits.', aiConversationPrompt: 'Discuss with the AI your social media boundaries.', nativeHint: 'Twitterで長いやり取りしちゃった。ネットの議論に巻き込まれるのやめなきゃ。', mixHint: 'I Twitterで long back-and-forth — ネット議論 stop getting pulled in.', aiQuestionText: 'How much time do you spend online?' },
  },
  birthday_party: {
    beginner: { conversationAnswer: "It's my friend's birthday.", typingAnswer: "It's my friend's birthday.", reviewPrompt: 'Review a simple birthday sentence.', aiConversationPrompt: 'Tell the AI about the party.', nativeHint: '友達の誕生日。', mixHint: "It's 友達の birthday.", aiQuestionText: 'Are you going to a party?' },
    intermediate: { conversationAnswer: "We threw a surprise party for our friend — the look on her face was priceless.", typingAnswer: 'The look on her face was priceless.', reviewPrompt: 'Review how to describe a surprise party.', aiConversationPrompt: 'Tell the AI about a birthday party you went to.', nativeHint: '友達にサプライズパーティーした。彼女の顔が最高だった。', mixHint: 'We サプライズパーティー — 彼女の顔 priceless.', aiQuestionText: 'Was it a surprise?' },
    advanced: { conversationAnswer: "We all got together for her birthday — it was nothing fancy, just good food and lots of laughs.", typingAnswer: 'Nothing fancy, just good food and lots of laughs.', reviewPrompt: 'Review how to describe a casual celebration.', aiConversationPrompt: 'Discuss with the AI how you celebrate birthdays.', nativeHint: 'みんなで彼女の誕生日集まった。特別なことはしてないけど、おいしいごはんとたくさん笑った。', mixHint: 'We みんなで集まった — nothing fancy, おいしいごはん and lots of laughs.', aiQuestionText: 'How did you celebrate?' },
  },
  hobby_circle: {
    beginner: { conversationAnswer: 'I joined a hobby group.', typingAnswer: 'I joined a hobby group.', reviewPrompt: 'Review a simple hobby sentence.', aiConversationPrompt: 'Tell the AI about your hobby.', nativeHint: '趣味の集まりに参加した。', mixHint: 'I 趣味の集まり joined.', aiQuestionText: 'What kind of hobby?' },
    intermediate: { conversationAnswer: "I go to a photography meetup once a month — it's a nice way to meet people.", typingAnswer: "It's a nice way to meet people.", reviewPrompt: 'Review how to describe a hobby group.', aiConversationPrompt: 'Tell the AI about your hobby community.', nativeHint: '月一で写真のミートアップ行ってる。いい出会いがある。', mixHint: 'I 月一で写真ミートアップ — nice way to 出会い.', aiQuestionText: 'How did you find the group?' },
    advanced: { conversationAnswer: "I started going to this book club, and honestly, it's become the highlight of my month.", typingAnswer: "It's become the highlight of my month.", reviewPrompt: 'Review how to express enthusiasm about a social activity.', aiConversationPrompt: 'Discuss with the AI how hobbies enrich your life.', nativeHint: '読書会に通い始めたけど、正直月で一番楽しみなイベントになった。', mixHint: 'I 読書会 started going — 正直 highlight of my month.', aiQuestionText: 'What do you like about it?' },
  },
  school_festival: {
    beginner: { conversationAnswer: 'We have a school festival.', typingAnswer: 'We have a school festival.', reviewPrompt: 'Review a simple school event sentence.', aiConversationPrompt: 'Tell the AI about your school festival.', nativeHint: '文化祭がある。', mixHint: 'We 文化祭 have.', aiQuestionText: 'What is your class doing?' },
    intermediate: { conversationAnswer: "Our class is doing a cafe for the school festival.", typingAnswer: 'Our class is doing a cafe.', reviewPrompt: 'Review how to describe a school event.', aiConversationPrompt: 'Tell the AI about your class project.', nativeHint: 'うちのクラスは文化祭でカフェやる。', mixHint: 'Our class 文化祭で cafe doing.', aiQuestionText: 'What are you serving?' },
    advanced: { conversationAnswer: "The school festival was exhausting but so much fun — our cafe sold out by noon.", typingAnswer: 'Our cafe sold out by noon.', reviewPrompt: 'Review how to describe a successful event.', aiConversationPrompt: 'Discuss with the AI your favorite school memories.', nativeHint: '文化祭疲れたけど超楽しかった。カフェ昼には完売した。', mixHint: '文化祭 exhausting but fun — カフェ sold out by noon.', aiQuestionText: 'How did your event go?' },
  },
  sports_festival: {
    beginner: { conversationAnswer: 'We had a sports day today.', typingAnswer: 'We had sports day.', reviewPrompt: 'Review a simple school event sentence.', aiConversationPrompt: 'Tell the AI about sports day.', nativeHint: '今日体育祭だった。', mixHint: 'We 体育祭 had today.', aiQuestionText: 'How did it go?' },
    intermediate: { conversationAnswer: "I ran the relay race — our team came in second.", typingAnswer: 'Our team came in second.', reviewPrompt: 'Review how to describe competition results.', aiConversationPrompt: 'Tell the AI about your sports day events.', nativeHint: 'リレー走った。うちのチームは2位だった。', mixHint: 'I リレー ran — our team 2位.', aiQuestionText: 'What events did you do?' },
    advanced: { conversationAnswer: "Sports day was brutal in this heat, but winning the tug-of-war made it all worth it.", typingAnswer: 'Winning the tug-of-war made it all worth it.', reviewPrompt: 'Review how to describe enduring something for a reward.', aiConversationPrompt: 'Discuss with the AI your sports day experience.', nativeHint: 'この暑さで体育祭きつかったけど、綱引き勝って全部報われた。', mixHint: '体育祭 brutal この暑さ, but 綱引き winning made it worth it.', aiQuestionText: 'Did your team win anything?' },
  },
  station_conversation: {
    beginner: { conversationAnswer: 'Excuse me, which platform?', typingAnswer: 'Which platform?', reviewPrompt: 'Review a simple station question.', aiConversationPrompt: 'Practice asking for directions at a station.', nativeHint: 'すみません、何番ホームですか？', mixHint: 'Excuse me, 何番ホーム?', aiQuestionText: 'Where are you trying to go?' },
    intermediate: { conversationAnswer: "Excuse me, does this train go to Shibuya?", typingAnswer: 'Does this train go to Shibuya?', reviewPrompt: 'Review how to confirm train directions.', aiConversationPrompt: 'Practice station conversations with the AI.', nativeHint: 'すみません、この電車渋谷行きますか？', mixHint: 'Excuse me, this train 渋谷 go?', aiQuestionText: 'Which line do you need?' },
    advanced: { conversationAnswer: "I think I'm on the wrong platform — could you tell me where to catch the express to Shinjuku?", typingAnswer: 'Could you tell me where to catch the express?', reviewPrompt: 'Review how to ask for help when lost.', aiConversationPrompt: 'Discuss with the AI navigating train stations.', nativeHint: 'ホーム間違えたかも。新宿行きの急行どこから乗れますか？', mixHint: 'I think 間違えた — 新宿行き急行 where to catch?', aiQuestionText: 'Are you lost?' },
  },
  buy_souvenirs: {
    beginner: { conversationAnswer: 'I bought some souvenirs.', typingAnswer: 'I bought some souvenirs.', reviewPrompt: 'Review a simple souvenir sentence.', aiConversationPrompt: 'Tell the AI what you bought.', nativeHint: 'お土産を買った。', mixHint: 'I お土産 bought.', aiQuestionText: 'Who are they for?' },
    intermediate: { conversationAnswer: "I picked up some snacks as souvenirs — everyone at work loves the local sweets.", typingAnswer: 'Everyone loves the local sweets.', reviewPrompt: 'Review how to describe souvenir shopping.', aiConversationPrompt: 'Tell the AI about your souvenir choices.', nativeHint: 'お菓子をお土産に買った。職場のみんな地元のお菓子好きだから。', mixHint: 'I お菓子 picked up as お土産 — みんな 地元のお菓子 love.', aiQuestionText: 'What did you get?' },
    advanced: { conversationAnswer: "I always spend way too much on souvenirs — I just can't help it when I see something cool.", typingAnswer: "I can't help it when I see something cool.", reviewPrompt: 'Review how to describe impulse buying.', aiConversationPrompt: 'Discuss with the AI your souvenir shopping habits.', nativeHint: 'お土産にいつもお金使いすぎる。いいもの見ると買わずにいられない。', mixHint: "I always お土産に使いすぎる — いいもの見ると can't help it.", aiQuestionText: 'Do you buy a lot of souvenirs?' },
  },
  talk_with_locals: {
    beginner: { conversationAnswer: 'I talked to a local person.', typingAnswer: 'I talked to a local.', reviewPrompt: 'Review a simple travel sentence.', aiConversationPrompt: 'Tell the AI about your conversation.', nativeHint: '地元の人と話した。', mixHint: 'I 地元の人と talked.', aiQuestionText: 'What did they tell you?' },
    intermediate: { conversationAnswer: "I asked a local for restaurant recommendations — they were really helpful.", typingAnswer: 'They were really helpful.', reviewPrompt: 'Review how to describe getting local advice.', aiConversationPrompt: 'Tell the AI about interacting with locals while traveling.', nativeHint: '地元の人にレストランのおすすめ聞いた。すごく親切だった。', mixHint: 'I 地元の人に レストランおすすめ asked — すごく helpful.', aiQuestionText: 'Did they give you good tips?' },
    advanced: { conversationAnswer: "Talking with locals is the best part of traveling — you learn things you'd never find in a guidebook.", typingAnswer: "You learn things you'd never find in a guidebook.", reviewPrompt: 'Review how to describe the value of local interaction.', aiConversationPrompt: 'Discuss with the AI how talking to locals enriches travel.', nativeHint: '旅行で地元の人と話すのが一番いい。ガイドブックにない情報が得られる。', mixHint: "地元の人と話す best part of 旅行 — ガイドブックにない things learn.", aiQuestionText: 'What did you learn from them?' },
  },
  health_checkup: {
    beginner: { conversationAnswer: 'I had a health checkup.', typingAnswer: 'I had a health checkup.', reviewPrompt: 'Review a simple medical sentence.', aiConversationPrompt: 'Tell the AI about your checkup.', nativeHint: '健康診断を受けた。', mixHint: 'I 健康診断 had.', aiQuestionText: 'How did it go?' },
    intermediate: { conversationAnswer: "I had my annual checkup — everything came back normal.", typingAnswer: 'Everything came back normal.', reviewPrompt: 'Review how to report medical results.', aiConversationPrompt: 'Tell the AI about your health habits.', nativeHint: '年に一回の健診受けた。全部問題なかった。', mixHint: 'I 年一回の健診 — 全部 normal.', aiQuestionText: 'Were the results okay?' },
    advanced: { conversationAnswer: "My checkup went well overall, but the doctor said I should cut back on salt and exercise more.", typingAnswer: 'I should cut back on salt and exercise more.', reviewPrompt: 'Review how to describe medical advice.', aiConversationPrompt: 'Discuss with the AI how you maintain your health.', nativeHint: '健診は概ね問題なかったけど、塩分控えてもっと運動しろって言われた。', mixHint: '健診 went well, but 医者 said 塩分控えて exercise more.', aiQuestionText: 'Did the doctor have any advice?' },
  },
  exercise_habit: {
    beginner: { conversationAnswer: 'I go jogging.', typingAnswer: 'I go jogging.', reviewPrompt: 'Review a simple exercise sentence.', aiConversationPrompt: 'Tell the AI about your exercise routine.', nativeHint: 'ジョギングしてる。', mixHint: 'I ジョギング go.', aiQuestionText: 'How often do you exercise?' },
    intermediate: { conversationAnswer: "I try to work out three times a week — mostly running and some stretching.", typingAnswer: 'I work out three times a week.', reviewPrompt: 'Review how to describe an exercise routine.', aiConversationPrompt: 'Tell the AI what exercise you enjoy.', nativeHint: '週3で運動するようにしてる。だいたいランニングとストレッチ。', mixHint: 'I 週3で work out — mostly ランニング and ストレッチ.', aiQuestionText: 'What kind of exercise do you do?' },
    advanced: { conversationAnswer: "I've been trying to build a consistent workout habit — the hardest part is just showing up.", typingAnswer: 'The hardest part is just showing up.', reviewPrompt: 'Review how to discuss building habits.', aiConversationPrompt: 'Discuss with the AI how you stay motivated to exercise.', nativeHint: '運動を習慣化しようとしてる。一番大変なのは、とにかく始めること。', mixHint: "I've been 運動を習慣化しようと — 一番大変 is just showing up.", aiQuestionText: 'How do you stay motivated?' },
  },
  diet_and_meal_control: {
    beginner: { conversationAnswer: "I'm trying to eat healthy.", typingAnswer: "I'm trying to eat healthy.", reviewPrompt: 'Review a simple health sentence.', aiConversationPrompt: 'Tell the AI about your eating habits.', nativeHint: '健康的な食事を心がけてる。', mixHint: "I'm 健康的な食事 trying.", aiQuestionText: 'What do you usually eat?' },
    intermediate: { conversationAnswer: "I've been cutting back on sugar and eating more vegetables.", typingAnswer: "I've been eating more vegetables.", reviewPrompt: 'Review how to describe diet changes.', aiConversationPrompt: 'Tell the AI about your diet.', nativeHint: '砂糖減らして野菜多めにしてる。', mixHint: "I've been 砂糖減らして and 野菜多め.", aiQuestionText: 'Is it working?' },
    advanced: { conversationAnswer: "I'm not on a strict diet or anything — I just try to be more mindful about what I eat.", typingAnswer: "I try to be more mindful about what I eat.", reviewPrompt: 'Review how to describe a balanced approach to eating.', aiConversationPrompt: 'Discuss with the AI your food philosophy.', nativeHint: '厳しいダイエットとかじゃなくて、食べるものにもうちょっと気をつけてるだけ。', mixHint: "Not 厳しいダイエット — just もうちょっと mindful about 食べるもの.", aiQuestionText: 'What changes have you made?' },
  },
  improve_sleep: {
    beginner: { conversationAnswer: "I want to sleep better.", typingAnswer: 'I want to sleep better.', reviewPrompt: 'Review a simple sleep sentence.', aiConversationPrompt: 'Tell the AI about your sleep.', nativeHint: 'もっとよく眠りたい。', mixHint: 'I もっとよく眠りたい.', aiQuestionText: 'How do you sleep?' },
    intermediate: { conversationAnswer: "I've been trying to go to bed earlier and put my phone away.", typingAnswer: "I'm trying to put my phone away before bed.", reviewPrompt: 'Review how to describe sleep improvement steps.', aiConversationPrompt: 'Tell the AI what affects your sleep.', nativeHint: '早く寝るようにして、寝る前にスマホ置くようにしてる。', mixHint: "I've been 早く寝る and スマホ置く before bed.", aiQuestionText: 'Is it helping?' },
    advanced: { conversationAnswer: "The biggest thing that helped my sleep was cutting out caffeine after two — I didn't realize how much it was affecting me.", typingAnswer: "I didn't realize how much caffeine was affecting me.", reviewPrompt: 'Review how to describe a lifestyle discovery.', aiConversationPrompt: 'Discuss with the AI your sleep improvement strategies.', nativeHint: '睡眠に一番効いたのは2時以降カフェイン断ち。どれだけ影響してたか気づかなかった。', mixHint: "一番効いた is 2時以降カフェイン断ち — didn't realize どれだけ影響.", aiQuestionText: 'What helped you the most?' },
  },
  stress_relief: {
    beginner: { conversationAnswer: "I'm so stressed.", typingAnswer: "I'm so stressed.", reviewPrompt: 'Review a simple stress expression.', aiConversationPrompt: 'Tell the AI what stresses you.', nativeHint: 'めっちゃストレス。', mixHint: "I'm めっちゃ stressed.", aiQuestionText: 'What are you stressed about?' },
    intermediate: { conversationAnswer: "When I'm stressed, I go for a walk or listen to music.", typingAnswer: 'I go for a walk or listen to music.', reviewPrompt: 'Review how to describe stress relief methods.', aiConversationPrompt: 'Tell the AI how you deal with stress.', nativeHint: 'ストレスたまったら散歩するか音楽聴く。', mixHint: "ストレスたまったら I walk or 音楽聴く.", aiQuestionText: 'How do you deal with stress?' },
    advanced: { conversationAnswer: "I've learned that the best thing for my stress is just getting outside — even ten minutes makes a huge difference.", typingAnswer: 'Even ten minutes makes a huge difference.', reviewPrompt: 'Review how to share a personal stress management insight.', aiConversationPrompt: 'Discuss with the AI what helps you relax.', nativeHint: 'ストレスには外に出るのが一番って分かった。10分でも全然違う。', mixHint: "I've learned 外に出る best for stress — 10分でも huge difference.", aiQuestionText: 'What works best for you?' },
  },
  // ——— Advanced pool scenes (remaining) ———
  overtime_discussion: {
    beginner: { conversationAnswer: "I have to work late.", typingAnswer: 'I have to work late.', reviewPrompt: 'Review a simple overtime sentence.', aiConversationPrompt: 'Tell the AI about your overtime.', nativeHint: '残業しなきゃ。', mixHint: 'I 残業しなきゃ work late.', aiQuestionText: 'How late do you have to stay?' },
    intermediate: { conversationAnswer: "I have to stay late again — this project is taking forever.", typingAnswer: 'This project is taking forever.', reviewPrompt: 'Review how to express frustration with overtime.', aiConversationPrompt: 'Tell the AI about your work hours.', nativeHint: 'また残業。このプロジェクト全然終わらない。', mixHint: 'I また残業 — このプロジェクト taking forever.', aiQuestionText: 'Do you often work overtime?' },
    advanced: { conversationAnswer: "I've been doing overtime every day this week — I need to talk to my boss about the workload.", typingAnswer: 'I need to talk to my boss about the workload.', reviewPrompt: 'Review how to express concern about work-life balance.', aiConversationPrompt: 'Discuss with the AI how to handle excessive overtime.', nativeHint: '今週毎日残業してる。上司に仕事量のこと相談しなきゃ。', mixHint: "I've been 毎日残業 this week — 上司に仕事量 talk.", aiQuestionText: 'Can you push back on the workload?' },
  },
  career_change_discussion: {
    beginner: { conversationAnswer: "I'm thinking about changing jobs.", typingAnswer: "I'm thinking about changing jobs.", reviewPrompt: 'Review a simple career sentence.', aiConversationPrompt: 'Tell the AI why you want to change.', nativeHint: '転職しようか考えてる。', mixHint: "I'm 転職 thinking about.", aiQuestionText: 'Why do you want to change?' },
    intermediate: { conversationAnswer: "I've been looking at other companies — I feel like I've hit a ceiling here.", typingAnswer: "I feel like I've hit a ceiling.", reviewPrompt: 'Review how to describe career stagnation.', aiConversationPrompt: 'Tell the AI what you want from your next job.', nativeHint: '他の会社見てる。ここだと頭打ちな気がして。', mixHint: "I've been 他の会社 looking — ここだと hit a ceiling.", aiQuestionText: 'What are you looking for?' },
    advanced: { conversationAnswer: "Changing careers is scary, but staying somewhere I'm not growing feels worse.", typingAnswer: "Staying somewhere I'm not growing feels worse.", reviewPrompt: 'Review how to weigh career trade-offs.', aiConversationPrompt: 'Discuss with the AI the pros and cons of changing careers.', nativeHint: '転職は怖いけど、成長できない場所にいる方がもっと嫌。', mixHint: '転職 is scary, but 成長できない場所 feels worse.', aiQuestionText: 'What scares you about changing?' },
  },
  receiving_a_job_offer: {
    beginner: { conversationAnswer: 'I got a job offer!', typingAnswer: 'I got a job offer!', reviewPrompt: 'Review a simple career sentence.', aiConversationPrompt: 'Tell the AI about the offer.', nativeHint: '内定もらった！', mixHint: 'I 内定 got!', aiQuestionText: 'Congratulations! Where?' },
    intermediate: { conversationAnswer: "I got a job offer from a company I really wanted — I'm so relieved.", typingAnswer: "I'm so relieved.", reviewPrompt: 'Review how to share good career news.', aiConversationPrompt: 'Tell the AI about your new opportunity.', nativeHint: '行きたかった会社から内定もらった。ほんとにホッとした。', mixHint: 'I 行きたかった会社 offer got — ほんとにホッと.', aiQuestionText: 'Are you going to accept?' },
    advanced: { conversationAnswer: "I got two offers and I'm torn — one pays more but the other has better work-life balance.", typingAnswer: "One pays more but the other has better work-life balance.", reviewPrompt: 'Review how to weigh competing job offers.', aiConversationPrompt: 'Discuss with the AI how to choose between offers.', nativeHint: '2社から内定もらって迷ってる。一つは給料いいけど、もう一つはワークライフバランスがいい。', mixHint: "I 2社から内定 and I'm torn — 給料 vs ワークライフバランス.", aiQuestionText: 'Which one are you leaning toward?' },
  },
  confession_of_love: {
    beginner: { conversationAnswer: 'I really like you.', typingAnswer: 'I really like you.', reviewPrompt: 'Review a simple expression of feelings.', aiConversationPrompt: 'Practice expressing your feelings.', nativeHint: 'あなたのことが好きです。', mixHint: 'I really あなたのこと like.', aiQuestionText: 'How do you feel about them?' },
    intermediate: { conversationAnswer: "I've liked you for a while now — I just didn't know how to tell you.", typingAnswer: "I didn't know how to tell you.", reviewPrompt: 'Review how to express romantic feelings.', aiConversationPrompt: 'Practice confessing your feelings.', nativeHint: 'ずっと好きだった。どう言えばいいか分からなくて。', mixHint: "I've ずっと好きだった — どう言えばいいか didn't know.", aiQuestionText: 'When did you start feeling this way?' },
    advanced: { conversationAnswer: "I know this might be out of the blue, but I've had feelings for you for a long time and I didn't want to keep it to myself anymore.", typingAnswer: "I didn't want to keep it to myself anymore.", reviewPrompt: 'Review how to confess feelings openly.', aiConversationPrompt: 'Discuss with the AI how to be honest about feelings.', nativeHint: '急かもしれないけど、ずっと気持ちがあって、もう自分の中だけにしておきたくなかった。', mixHint: "急かもしれないけど、I've had ずっと気持ち and didn't want to 自分の中だけ.", aiQuestionText: 'How long have you felt this way?' },
  },
  proposal: {
    beginner: { conversationAnswer: 'Will you marry me?', typingAnswer: 'Will you marry me?', reviewPrompt: 'Review a classic proposal phrase.', aiConversationPrompt: 'Practice a proposal with the AI.', nativeHint: '結婚してくれますか？', mixHint: 'Will you 結婚してくれますか?', aiQuestionText: 'Are you ready for this?' },
    intermediate: { conversationAnswer: "I can't imagine my life without you — will you marry me?", typingAnswer: "I can't imagine my life without you.", reviewPrompt: 'Review how to express deep commitment.', aiConversationPrompt: 'Practice expressing commitment to a partner.', nativeHint: 'あなたのいない人生は想像できない。結婚してください。', mixHint: "あなたのいない人生 can't imagine — will you marry me?", aiQuestionText: 'What would you say?' },
    advanced: { conversationAnswer: "We've been through so much together, and every day I'm more sure — I want to spend the rest of my life with you.", typingAnswer: 'I want to spend the rest of my life with you.', reviewPrompt: 'Review how to express lifelong commitment.', aiConversationPrompt: 'Discuss with the AI what makes a meaningful proposal.', nativeHint: '一緒にいろんなことを乗り越えてきて、毎日もっと確信する。一生一緒にいたい。', mixHint: "We've いろんなこと been through, and every day もっと確信 — 一生一緒に.", aiQuestionText: 'What made you decide to propose?' },
  },
  meeting_the_parents: {
    beginner: { conversationAnswer: "I'm meeting their parents.", typingAnswer: "I'm meeting their parents.", reviewPrompt: 'Review a simple relationship milestone sentence.', aiConversationPrompt: 'Tell the AI how you feel about meeting parents.', nativeHint: '相手の両親に会う。', mixHint: "I'm 両親に meeting.", aiQuestionText: 'Are you nervous?' },
    intermediate: { conversationAnswer: "I'm meeting her parents this weekend — I want to make a good impression.", typingAnswer: 'I want to make a good impression.', reviewPrompt: 'Review how to express wanting to impress.', aiConversationPrompt: 'Tell the AI how you prepare for meeting parents.', nativeHint: '今週末彼女の両親に会う。いい印象残したい。', mixHint: "I'm 今週末 彼女の両親に meeting — いい印象 want.", aiQuestionText: 'What are you going to wear?' },
    advanced: { conversationAnswer: "Meeting the parents is always nerve-wracking, but honestly, they were so warm and welcoming that I relaxed pretty quickly.", typingAnswer: 'They were so warm and welcoming.', reviewPrompt: 'Review how to describe a nerve-wracking social situation.', aiConversationPrompt: 'Discuss with the AI how meeting parents went.', nativeHint: '両親に会うのはいつも緊張するけど、正直すごく温かく迎えてくれてすぐリラックスできた。', mixHint: '両親に会う always nerve-wracking, but 温かく迎えてくれて relaxed quickly.', aiQuestionText: 'How did it go?' },
  },
  study_abroad_planning: {
    beginner: { conversationAnswer: 'I want to study abroad.', typingAnswer: 'I want to study abroad.', reviewPrompt: 'Review a simple study abroad sentence.', aiConversationPrompt: 'Tell the AI where you want to study.', nativeHint: '留学したい。', mixHint: 'I 留学 want to.', aiQuestionText: 'Where do you want to go?' },
    intermediate: { conversationAnswer: "I'm thinking about studying in Canada for a year.", typingAnswer: "I'm thinking about studying in Canada.", reviewPrompt: 'Review how to describe study abroad plans.', aiConversationPrompt: 'Tell the AI about your study abroad plans.', nativeHint: 'カナダに1年留学しようかなと思ってる。', mixHint: "I'm カナダに1年 thinking about studying.", aiQuestionText: 'Why Canada?' },
    advanced: { conversationAnswer: "I've been saving up for a year to study abroad — it's a big investment, but I think it'll be worth it.", typingAnswer: "It's a big investment, but I think it'll be worth it.", reviewPrompt: 'Review how to discuss long-term educational plans.', aiConversationPrompt: 'Discuss with the AI the benefits and challenges of studying abroad.', nativeHint: '留学のために1年貯金してきた。大きな投資だけど、価値あると思う。', mixHint: "I've been 1年貯金 for 留学 — 大きな投資 but it'll be worth it.", aiQuestionText: 'What do you hope to gain from it?' },
  },
  qualification_planning: {
    beginner: { conversationAnswer: "I'm studying for a certification.", typingAnswer: "I'm studying for a certification.", reviewPrompt: 'Review a simple study sentence.', aiConversationPrompt: 'Tell the AI what certification you want.', nativeHint: '資格の勉強してる。', mixHint: "I'm 資格の studying.", aiQuestionText: 'What certification?' },
    intermediate: { conversationAnswer: "I'm studying for my TOEIC — I need at least 800 for the job I want.", typingAnswer: 'I need at least 800.', reviewPrompt: 'Review how to describe test goals.', aiConversationPrompt: 'Tell the AI about your study plan.', nativeHint: 'TOEIC勉強中。欲しい仕事には最低800点必要。', mixHint: "I'm TOEIC studying — 最低800 need for 欲しい仕事.", aiQuestionText: 'How is the studying going?' },
    advanced: { conversationAnswer: "I've been studying on and off for months — I really need to buckle down and set a test date.", typingAnswer: 'I need to buckle down and set a test date.', reviewPrompt: 'Review how to describe inconsistent study habits.', aiConversationPrompt: 'Discuss with the AI how you stay disciplined with studying.', nativeHint: '何ヶ月もダラダラ勉強してる。本気出して試験日決めなきゃ。', mixHint: "I've been ダラダラ months — 本気出して buckle down and 試験日 set.", aiQuestionText: 'When are you planning to take it?' },
  },
  startup_consultation: {
    beginner: { conversationAnswer: 'I want to start a business.', typingAnswer: 'I want to start a business.', reviewPrompt: 'Review a simple entrepreneurship sentence.', aiConversationPrompt: 'Tell the AI about your business idea.', nativeHint: '起業したい。', mixHint: 'I 起業 want to start.', aiQuestionText: 'What kind of business?' },
    intermediate: { conversationAnswer: "I have this idea for an app — I'm trying to figure out if it's actually viable.", typingAnswer: "I'm trying to figure out if it's viable.", reviewPrompt: 'Review how to discuss a business idea.', aiConversationPrompt: 'Tell the AI about your business concept.', nativeHint: 'アプリのアイデアあるんだけど、実現可能か考えてる。', mixHint: "I アプリのアイデア — 実現可能か trying to figure out.", aiQuestionText: 'What problem does it solve?' },
    advanced: { conversationAnswer: "I've been thinking about going out on my own for a while — the timing feels right, but the financial risk is what holds me back.", typingAnswer: 'The financial risk is what holds me back.', reviewPrompt: 'Review how to weigh entrepreneurial risks.', aiConversationPrompt: 'Discuss with the AI the pros and cons of starting a business.', nativeHint: 'しばらく独立を考えてて、タイミングはいい気がするけど、金銭的リスクが引っかかる。', mixHint: "I've been 独立 thinking — タイミング right, but 金銭的リスク holds me back.", aiQuestionText: 'What would it take to make the leap?' },
  },
  mentor_conversation: {
    beginner: { conversationAnswer: 'Can I ask you for advice?', typingAnswer: 'Can I ask for advice?', reviewPrompt: 'Review a simple advice-seeking sentence.', aiConversationPrompt: 'Tell the AI what you need advice on.', nativeHint: 'アドバイスもらってもいいですか？', mixHint: 'Can I アドバイス ask?', aiQuestionText: 'Of course. What is it?' },
    intermediate: { conversationAnswer: "I really value your opinion — do you think I should take this opportunity?", typingAnswer: 'Do you think I should take this opportunity?', reviewPrompt: 'Review how to ask a mentor for guidance.', aiConversationPrompt: 'Practice seeking guidance from a mentor.', nativeHint: 'あなたの意見すごく参考になるんです。このチャンス取るべきだと思いますか？', mixHint: 'I あなたの意見 really value — このチャンス should take?', aiQuestionText: 'What are you hoping to achieve?' },
    advanced: { conversationAnswer: "Looking back, what's the one thing you wish you'd known when you were starting out?", typingAnswer: "What's the one thing you wish you'd known?", reviewPrompt: 'Review how to ask a deep mentorship question.', aiConversationPrompt: 'Discuss with the AI what you learn from mentors.', nativeHint: '振り返って、始めた頃に知っておきたかったことって何ですか？', mixHint: "Looking back, 始めた頃に知っておきたかった one thing?", aiQuestionText: "That's a great question. Let me think..." },
  },
  start_a_relationship: {
    beginner: { conversationAnswer: "We're dating now.", typingAnswer: "We're dating now.", reviewPrompt: 'Review a simple relationship sentence.', aiConversationPrompt: 'Tell the AI about your new relationship.', nativeHint: '付き合い始めた。', mixHint: "We're 付き合い始めた.", aiQuestionText: "That's great! How did it happen?" },
    intermediate: { conversationAnswer: "We decided to make it official — it just felt right.", typingAnswer: 'It just felt right.', reviewPrompt: 'Review how to describe starting a relationship.', aiConversationPrompt: 'Tell the AI how you feel.', nativeHint: '正式に付き合うことにした。なんか自然にそうなった。', mixHint: 'We 正式に付き合う decided — 自然に felt right.', aiQuestionText: 'How are you feeling about it?' },
    advanced: { conversationAnswer: "We've been spending so much time together that it just made sense — neither of us had to say much, we just knew.", typingAnswer: 'Neither of us had to say much, we just knew.', reviewPrompt: 'Review how to describe a natural relationship progression.', aiConversationPrompt: 'Discuss with the AI how relationships develop naturally.', nativeHint: '一緒にいる時間が多くて自然な流れだった。多くを語らなくても、お互い分かってた。', mixHint: 'We ずっと一緒で自然な流れ — 多くを語らなくても just knew.', aiQuestionText: 'When did you realize it was something special?' },
  },
  long_distance_relationship: {
    beginner: { conversationAnswer: "We're in a long-distance relationship.", typingAnswer: "We're long-distance.", reviewPrompt: 'Review a simple relationship sentence.', aiConversationPrompt: 'Tell the AI about your situation.', nativeHint: '遠距離恋愛してる。', mixHint: "We're 遠距離恋愛.", aiQuestionText: 'How far apart are you?' },
    intermediate: { conversationAnswer: "We video call every night — it helps, but it's still hard.", typingAnswer: "It helps, but it's still hard.", reviewPrompt: 'Review how to describe long-distance challenges.', aiConversationPrompt: 'Tell the AI how you stay connected.', nativeHint: '毎晩ビデオ通話してる。助かるけど、やっぱり大変。', mixHint: 'We 毎晩ビデオ通話 — 助かるけど still hard.', aiQuestionText: 'How do you stay connected?' },
    advanced: { conversationAnswer: "Long distance isn't easy, but it's taught us both to communicate better and not take our time together for granted.", typingAnswer: "It's taught us not to take our time together for granted.", reviewPrompt: 'Review how to reflect on relationship growth.', aiConversationPrompt: 'Discuss with the AI the lessons of long-distance relationships.', nativeHint: '遠距離は楽じゃないけど、もっとちゃんと話すようになったし、一緒の時間を当たり前だと思わなくなった。', mixHint: "遠距離 isn't easy, but ちゃんと話す and 一緒の時間 not take for granted.", aiQuestionText: 'What has it taught you?' },
  },
  argument_and_reconciliation: {
    beginner: { conversationAnswer: "I'm sorry.", typingAnswer: "I'm sorry.", reviewPrompt: 'Review a basic apology.', aiConversationPrompt: 'Practice apologizing.', nativeHint: 'ごめんなさい。', mixHint: "I'm ごめんなさい.", aiQuestionText: 'What happened?' },
    intermediate: { conversationAnswer: "We had a fight, but we talked it out and made up.", typingAnswer: 'We talked it out and made up.', reviewPrompt: 'Review how to describe resolving a conflict.', aiConversationPrompt: 'Tell the AI how you resolved the argument.', nativeHint: 'ケンカしたけど、話し合って仲直りした。', mixHint: 'We ケンカしたけど talked it out and 仲直り.', aiQuestionText: 'How did you work it out?' },
    advanced: { conversationAnswer: "We both said things we didn't mean — it took a couple of days, but we apologized and I think we're stronger for it.", typingAnswer: "I think we're stronger for it.", reviewPrompt: 'Review how to reflect on conflict resolution maturely.', aiConversationPrompt: 'Discuss with the AI how arguments can strengthen relationships.', nativeHint: 'お互い本意じゃないこと言っちゃった。数日かかったけど謝って、逆に絆が深まった気がする。', mixHint: "We both 本意じゃないこと — 数日かかったけど apologized and I think we're stronger.", aiQuestionText: 'What did you learn from it?' },
  },
  talk_about_the_future_together: {
    beginner: { conversationAnswer: "What's your dream?", typingAnswer: "What's your dream?", reviewPrompt: 'Review a simple future question.', aiConversationPrompt: 'Tell the AI about your future plans.', nativeHint: '夢は何？', mixHint: "What's your 夢?", aiQuestionText: 'What do you see in your future?' },
    intermediate: { conversationAnswer: "I was thinking about where we want to be in five years.", typingAnswer: 'Where do we want to be in five years?', reviewPrompt: 'Review how to discuss future plans.', aiConversationPrompt: 'Tell the AI about your shared goals.', nativeHint: '5年後どうなってたいか考えてた。', mixHint: 'I was 5年後 thinking about where we want to be.', aiQuestionText: 'Where do you see yourself?' },
    advanced: { conversationAnswer: "It feels really good to be with someone who has similar goals — we're both working toward the same kind of life.", typingAnswer: "We're both working toward the same kind of life.", reviewPrompt: 'Review how to express alignment with a partner.', aiConversationPrompt: 'Discuss with the AI how you plan your future with a partner.', nativeHint: '同じ目標を持ってる人と一緒にいられるのは本当にいい。二人とも同じ方向に向かってる。', mixHint: '同じ目標の人 feels really good — 二人とも同じ方向 working toward.', aiQuestionText: 'What goals do you share?' },
  },
  engagement_and_ring_shopping: {
    beginner: { conversationAnswer: "I'm looking for an engagement ring.", typingAnswer: "I'm looking for a ring.", reviewPrompt: 'Review a simple shopping sentence.', aiConversationPrompt: 'Tell the AI about ring shopping.', nativeHint: '婚約指輪を探してる。', mixHint: "I'm 婚約指輪 looking for.", aiQuestionText: 'What style are you looking for?' },
    intermediate: { conversationAnswer: "I've been looking at rings — I want something simple but meaningful.", typingAnswer: 'Something simple but meaningful.', reviewPrompt: 'Review how to describe preferences in ring shopping.', aiConversationPrompt: 'Tell the AI what kind of ring you want.', nativeHint: '指輪見てる。シンプルだけど意味のあるものがいい。', mixHint: "I've been 指輪見てる — シンプルだけど meaningful.", aiQuestionText: 'Do you know her ring size?' },
    advanced: { conversationAnswer: "I want the ring to be perfect, but honestly, I think she'll love it no matter what — it's the meaning behind it that counts.", typingAnswer: "It's the meaning behind it that counts.", reviewPrompt: 'Review how to express sentimental value.', aiConversationPrompt: 'Discuss with the AI what makes an engagement ring special.', nativeHint: '完璧な指輪にしたいけど、正直何でも喜んでくれると思う。大事なのはその意味。', mixHint: '完璧にしたいけど、何でも喜ぶと思う — 大事なのは meaning behind it.', aiQuestionText: 'What matters most to you about the ring?' },
  },
  wedding_preparation: {
    beginner: { conversationAnswer: "We're planning our wedding.", typingAnswer: "We're planning our wedding.", reviewPrompt: 'Review a simple wedding sentence.', aiConversationPrompt: 'Tell the AI about your wedding plans.', nativeHint: '結婚式の準備してる。', mixHint: "We're 結婚式 planning.", aiQuestionText: 'When is the wedding?' },
    intermediate: { conversationAnswer: "There's so much to do — the venue, the food, the guest list... it's overwhelming.", typingAnswer: "It's overwhelming.", reviewPrompt: 'Review how to describe being overwhelmed.', aiConversationPrompt: 'Tell the AI what part of planning is hardest.', nativeHint: 'やること多すぎ。会場、料理、招待客リスト…大変。', mixHint: 'やること多すぎ — 会場、料理、招待客リスト… overwhelming.', aiQuestionText: 'What part is the most stressful?' },
    advanced: { conversationAnswer: "We're trying to keep it small and personal — we don't need a big fancy wedding, just the people we love.", typingAnswer: "We don't need a big fancy wedding.", reviewPrompt: 'Review how to describe wedding priorities.', aiConversationPrompt: 'Discuss with the AI what matters most in a wedding.', nativeHint: 'こぢんまりしたのにしたい。派手な結婚式はいらない、大切な人だけいればいい。', mixHint: "We're small and personal にしたい — 派手な結婚式はいらない, just 大切な人.", aiQuestionText: 'What kind of wedding do you want?' },
  },
  wedding_venue_selection: {
    beginner: { conversationAnswer: "We're looking for a wedding venue.", typingAnswer: "We're looking for a venue.", reviewPrompt: 'Review a simple venue sentence.', aiConversationPrompt: 'Tell the AI what kind of venue you want.', nativeHint: '式場を探してる。', mixHint: "We're 式場 looking for.", aiQuestionText: 'Indoor or outdoor?' },
    intermediate: { conversationAnswer: "We visited three venues this weekend — I liked the one by the sea.", typingAnswer: 'I liked the one by the sea.', reviewPrompt: 'Review how to compare venues.', aiConversationPrompt: 'Tell the AI about the venues you visited.', nativeHint: '今週末3か所見に行った。海沿いのが気に入った。', mixHint: 'We 3か所 visited — 海沿い liked.', aiQuestionText: 'Which one did you like best?' },
    advanced: { conversationAnswer: "Finding a venue that fits our budget and our vibe has been the hardest part of the whole process.", typingAnswer: "It's been the hardest part of the whole process.", reviewPrompt: 'Review how to describe a difficult decision process.', aiConversationPrompt: 'Discuss with the AI how you chose your venue.', nativeHint: '予算と雰囲気に合う式場探しが一番大変だった。', mixHint: '予算と雰囲気に合う venue — 一番大変 hardest part.', aiQuestionText: 'What made the decision so hard?' },
  },
  sending_invitations: {
    beginner: { conversationAnswer: 'I sent the invitations.', typingAnswer: 'I sent the invitations.', reviewPrompt: 'Review a simple invitation sentence.', aiConversationPrompt: 'Tell the AI about your invitations.', nativeHint: '招待状を送った。', mixHint: 'I 招待状 sent.', aiQuestionText: 'How many did you send?' },
    intermediate: { conversationAnswer: "We finally sent out all the invitations — now we're just waiting for RSVPs.", typingAnswer: "We're waiting for RSVPs.", reviewPrompt: 'Review how to describe the invitation process.', aiConversationPrompt: 'Tell the AI about your guest list.', nativeHint: 'やっと全部招待状出した。あとは返事待ち。', mixHint: 'We やっと全部 sent — 返事待ち RSVPs.', aiQuestionText: 'Have you gotten any replies yet?' },
    advanced: { conversationAnswer: "Figuring out the guest list was honestly more stressful than I expected — you don't want to leave anyone out.", typingAnswer: "You don't want to leave anyone out.", reviewPrompt: 'Review how to describe social pressure.', aiConversationPrompt: 'Discuss with the AI how you decided on your guest list.', nativeHint: 'ゲストリスト決めるの想像以上に大変だった。誰も外したくないし。', mixHint: 'ゲストリスト決め 想像以上にstressful — 誰も外したくない.', aiQuestionText: 'How did you decide who to invite?' },
  },
  honeymoon_planning: {
    beginner: { conversationAnswer: "We're going on a honeymoon.", typingAnswer: "We're going on a honeymoon.", reviewPrompt: 'Review a simple travel sentence.', aiConversationPrompt: 'Tell the AI where you want to go.', nativeHint: '新婚旅行に行く。', mixHint: "We're 新婚旅行 going.", aiQuestionText: 'Where are you going?' },
    intermediate: { conversationAnswer: "We're thinking about Hawaii for our honeymoon — we both love the beach.", typingAnswer: 'We both love the beach.', reviewPrompt: 'Review how to describe travel preferences.', aiConversationPrompt: 'Tell the AI about your honeymoon plans.', nativeHint: '新婚旅行はハワイにしようかなと思ってる。二人ともビーチ好きだし。', mixHint: "We're ハワイ thinking for 新婚旅行 — 二人とも beach love.", aiQuestionText: 'How long will you stay?' },
    advanced: { conversationAnswer: "We want our honeymoon to be relaxing, not packed with sightseeing — we just want to unwind and enjoy each other's company.", typingAnswer: "We just want to unwind and enjoy each other's company.", reviewPrompt: 'Review how to describe vacation priorities.', aiConversationPrompt: 'Discuss with the AI your ideal honeymoon.', nativeHint: '新婚旅行は観光詰め込みじゃなくてリラックスしたい。ゆっくり二人の時間を楽しみたい。', mixHint: '新婚旅行 relaxing にしたい, not 観光詰め込み — ゆっくり二人の時間.', aiQuestionText: 'What does your ideal honeymoon look like?' },
  },
  looking_for_a_new_home: {
    beginner: { conversationAnswer: "We're looking for a new place.", typingAnswer: "We're looking for a new place.", reviewPrompt: 'Review a simple housing sentence.', aiConversationPrompt: 'Tell the AI what you are looking for.', nativeHint: '新しい家を探してる。', mixHint: "We're 新しい家 looking for.", aiQuestionText: 'What kind of place do you want?' },
    intermediate: { conversationAnswer: "We've been looking at apartments near the station — something with two bedrooms.", typingAnswer: 'Something with two bedrooms.', reviewPrompt: 'Review how to describe housing requirements.', aiConversationPrompt: 'Tell the AI your housing priorities.', nativeHint: '駅の近くで2LDKのマンション探してる。', mixHint: "We've been 駅近くで apartments looking — 2LDK.", aiQuestionText: 'What is most important to you?' },
    advanced: { conversationAnswer: "Finding a place that's affordable and close to work is basically impossible in this city.", typingAnswer: "It's basically impossible in this city.", reviewPrompt: 'Review how to express frustration with housing.', aiConversationPrompt: 'Discuss with the AI the challenges of apartment hunting.', nativeHint: '手頃で職場に近い物件なんてこの街じゃほぼ無理。', mixHint: '手頃で職場に近い place — この街じゃ basically impossible.', aiQuestionText: 'How is the apartment search going?' },
  },
  moving_house: {
    beginner: { conversationAnswer: "I'm moving next week.", typingAnswer: "I'm moving next week.", reviewPrompt: 'Review a simple moving sentence.', aiConversationPrompt: 'Tell the AI about your move.', nativeHint: '来週引っ越す。', mixHint: "I'm 来週引っ越す.", aiQuestionText: 'Where are you moving to?' },
    intermediate: { conversationAnswer: "I've been packing boxes all week — I forgot how much stuff I have.", typingAnswer: 'I forgot how much stuff I have.', reviewPrompt: 'Review how to describe the moving process.', aiConversationPrompt: 'Tell the AI about your packing experience.', nativeHint: '一週間ずっと段ボール詰めてる。こんなに物あるの忘れてた。', mixHint: "I've been 一週間 packing — こんなに物ある forgot.", aiQuestionText: 'Need any help?' },
    advanced: { conversationAnswer: "Moving is exhausting, but there's something exciting about starting fresh in a new place.", typingAnswer: "There's something exciting about starting fresh.", reviewPrompt: 'Review how to balance negative and positive feelings.', aiConversationPrompt: 'Discuss with the AI the emotions of moving.', nativeHint: '引っ越しは大変だけど、新しい場所で心機一転するのはワクワクする。', mixHint: '引っ越し exhausting, but 新しい場所で心機一転 exciting.', aiQuestionText: 'Are you excited about the new place?' },
  },
  household_budget_discussion: {
    beginner: { conversationAnswer: 'We need to save money.', typingAnswer: 'We need to save money.', reviewPrompt: 'Review a simple budget sentence.', aiConversationPrompt: 'Tell the AI about your budget.', nativeHint: '節約しなきゃ。', mixHint: 'We 節約しなきゃ save money.', aiQuestionText: 'What are you saving for?' },
    intermediate: { conversationAnswer: "We sat down and went over our spending this month — we need to cut back on eating out.", typingAnswer: 'We need to cut back on eating out.', reviewPrompt: 'Review how to describe budget discussions.', aiConversationPrompt: 'Tell the AI how you manage your household budget.', nativeHint: '今月の支出見直した。外食減らさなきゃ。', mixHint: 'We 今月の支出 went over — 外食 cut back.', aiQuestionText: 'Where can you save?' },
    advanced: { conversationAnswer: "Talking about money is awkward, but not talking about it is worse — we've learned that the hard way.", typingAnswer: "Not talking about it is worse.", reviewPrompt: 'Review how to describe learning from experience.', aiConversationPrompt: 'Discuss with the AI how you handle finances as a couple.', nativeHint: 'お金の話は気まずいけど、話さない方がもっとまずい。身をもって学んだ。', mixHint: 'お金の話 awkward, but 話さない方が worse — 身をもって learned.', aiQuestionText: 'How do you handle money as a couple?' },
  },
  sharing_household_roles: {
    beginner: { conversationAnswer: 'I do the cooking.', typingAnswer: 'I do the cooking.', reviewPrompt: 'Review a simple household role sentence.', aiConversationPrompt: 'Tell the AI about your household chores.', nativeHint: '料理は私がする。', mixHint: 'I 料理 do.', aiQuestionText: 'Who does what at home?' },
    intermediate: { conversationAnswer: "We split the chores — I cook and she does the laundry.", typingAnswer: 'I cook and she does the laundry.', reviewPrompt: 'Review how to describe shared responsibilities.', aiConversationPrompt: 'Tell the AI how you divide household tasks.', nativeHint: '家事分担してる。料理は僕で洗濯は彼女。', mixHint: 'We 家事分担 — I 料理 and she 洗濯.', aiQuestionText: 'Is it a fair split?' },
    advanced: { conversationAnswer: "We don't have a strict system — whoever notices something needs doing just does it.", typingAnswer: 'Whoever notices just does it.', reviewPrompt: 'Review how to describe flexible household teamwork.', aiConversationPrompt: 'Discuss with the AI your approach to household duties.', nativeHint: '厳密なルールはない。気づいた方がやるスタイル。', mixHint: "We 厳密なルールはない — whoever 気づいた方が just does it.", aiQuestionText: 'Does that system work for you?' },
  },
  anniversary_planning: {
    beginner: { conversationAnswer: "It's our anniversary.", typingAnswer: "It's our anniversary.", reviewPrompt: 'Review a simple anniversary sentence.', aiConversationPrompt: 'Tell the AI about your anniversary.', nativeHint: '記念日だ。', mixHint: "It's 記念日.", aiQuestionText: 'How are you celebrating?' },
    intermediate: { conversationAnswer: "I'm planning a surprise dinner for our anniversary — she has no idea.", typingAnswer: 'She has no idea.', reviewPrompt: 'Review how to describe a surprise plan.', aiConversationPrompt: 'Tell the AI about your anniversary plans.', nativeHint: '記念日にサプライズディナー計画してる。全く気づいてない。', mixHint: "I'm 記念日にサプライズディナー planning — 全く気づいてない.", aiQuestionText: 'What do you have planned?' },
    advanced: { conversationAnswer: "We don't go all out for our anniversary — we just do something simple that feels special to us.", typingAnswer: 'We do something simple that feels special.', reviewPrompt: 'Review how to describe personal celebrations.', aiConversationPrompt: 'Discuss with the AI how you celebrate milestones.', nativeHint: '記念日に派手なことはしない。二人にとって特別だと思える簡単なことをする。', mixHint: "We don't 派手なこと — just 簡単だけど特別 something.", aiQuestionText: 'What do you usually do?' },
  },
  caregiving_support: {
    beginner: { conversationAnswer: 'I take care of my parents.', typingAnswer: 'I take care of my parents.', reviewPrompt: 'Review a simple caregiving sentence.', aiConversationPrompt: 'Tell the AI about your situation.', nativeHint: '親の介護をしてる。', mixHint: 'I 親の介護 take care.', aiQuestionText: 'How are they doing?' },
    intermediate: { conversationAnswer: "I help my mom with daily tasks — she can't do everything on her own anymore.", typingAnswer: "She can't do everything on her own.", reviewPrompt: 'Review how to describe caregiving responsibilities.', aiConversationPrompt: 'Tell the AI about your caregiving routine.', nativeHint: '母の日常を手伝ってる。一人じゃ全部はできなくなってきた。', mixHint: 'I 母の日常 help — 一人じゃ全部 can\'t anymore.', aiQuestionText: 'What kind of help does she need?' },
    advanced: { conversationAnswer: "Caregiving is rewarding but exhausting — I wish there were more support systems in place.", typingAnswer: 'I wish there were more support systems.', reviewPrompt: 'Review how to express mixed feelings about responsibilities.', aiConversationPrompt: 'Discuss with the AI the challenges and rewards of caregiving.', nativeHint: '介護はやりがいあるけど疲れる。もっとサポート体制があればいいのに。', mixHint: '介護 rewarding but exhausting — もっとサポート体制 wish.', aiQuestionText: 'How do you take care of yourself too?' },
  },
  financial_planning: {
    beginner: { conversationAnswer: "I'm saving money.", typingAnswer: "I'm saving money.", reviewPrompt: 'Review a simple finance sentence.', aiConversationPrompt: 'Tell the AI what you are saving for.', nativeHint: '貯金してる。', mixHint: "I'm 貯金 saving.", aiQuestionText: 'What are you saving for?' },
    intermediate: { conversationAnswer: "I'm trying to put aside a little each month for emergencies.", typingAnswer: "I'm putting aside a little each month.", reviewPrompt: 'Review how to describe a savings plan.', aiConversationPrompt: 'Tell the AI about your financial goals.', nativeHint: '毎月少しずつ緊急用に貯めるようにしてる。', mixHint: "I'm 毎月少しずつ trying to put aside for 緊急用.", aiQuestionText: 'Do you have a savings goal?' },
    advanced: { conversationAnswer: "I finally started budgeting properly — I don't know why I waited so long, it's already making a difference.", typingAnswer: "It's already making a difference.", reviewPrompt: 'Review how to describe a positive financial change.', aiConversationPrompt: 'Discuss with the AI your approach to money management.', nativeHint: 'やっとちゃんと家計管理始めた。なんでもっと早くやらなかったのか。もう効果出てる。', mixHint: "I finally ちゃんと家計管理 started — なんでもっと早く, it's already making a difference.", aiQuestionText: 'What changed your approach?' },
  },
  saving_consultation: {
    beginner: { conversationAnswer: 'How should I save money?', typingAnswer: 'How should I save?', reviewPrompt: 'Review a simple finance question.', aiConversationPrompt: 'Ask the AI for saving tips.', nativeHint: 'どうやって貯金すればいい？', mixHint: 'How should I 貯金?', aiQuestionText: 'Do you have a budget?' },
    intermediate: { conversationAnswer: "I want to save more, but I always end up spending everything by the end of the month.", typingAnswer: 'I end up spending everything.', reviewPrompt: 'Review how to describe a spending problem.', aiConversationPrompt: 'Tell the AI about your spending habits.', nativeHint: 'もっと貯めたいけど、月末にはいつも使い切っちゃう。', mixHint: 'I もっと貯めたい, but いつも月末に spending everything.', aiQuestionText: 'What do you spend the most on?' },
    advanced: { conversationAnswer: "The trick for me was automating my savings — if I don't see the money, I don't spend it.", typingAnswer: "If I don't see the money, I don't spend it.", reviewPrompt: 'Review how to share a personal financial tip.', aiConversationPrompt: 'Discuss with the AI what saving strategies work for you.', nativeHint: '自動積立にしたのが自分にはよかった。見えなければ使わない。', mixHint: "自動積立 was the trick — 見えなければ don't spend it.", aiQuestionText: 'What works for you?' },
  },
  insurance_consultation: {
    beginner: { conversationAnswer: 'Do I need insurance?', typingAnswer: 'Do I need insurance?', reviewPrompt: 'Review a simple insurance question.', aiConversationPrompt: 'Ask the AI about insurance.', nativeHint: '保険って必要？', mixHint: 'Do I 保険 need?', aiQuestionText: 'What kind of insurance do you have?' },
    intermediate: { conversationAnswer: "I'm looking into health insurance options — there are so many plans, it's confusing.", typingAnswer: "There are so many plans, it's confusing.", reviewPrompt: 'Review how to describe insurance confusion.', aiConversationPrompt: 'Tell the AI what insurance you need.', nativeHint: '健康保険のプラン調べてるけど、多すぎてわけわからない。', mixHint: "I'm 健康保険 looking into — プラン多すぎて confusing.", aiQuestionText: 'Do you know what you need?' },
    advanced: { conversationAnswer: "Insurance is one of those things I keep meaning to sort out — I know it's important, but the paperwork is so boring.", typingAnswer: "I keep meaning to sort it out.", reviewPrompt: 'Review how to describe procrastination on adult tasks.', aiConversationPrompt: 'Discuss with the AI the importance of insurance.', nativeHint: '保険ってやらなきゃと思いつつ後回し。大事なのは分かってるけど、書類が面倒。', mixHint: '保険 keep meaning to sort out — 大事だけど 書類 so boring.', aiQuestionText: 'Have you looked into your options?' },
  },
  home_purchase_consultation: {
    beginner: { conversationAnswer: 'I want to buy a house.', typingAnswer: 'I want to buy a house.', reviewPrompt: 'Review a simple housing sentence.', aiConversationPrompt: 'Tell the AI about your housing plans.', nativeHint: '家を買いたい。', mixHint: 'I 家を買いたい.', aiQuestionText: 'What kind of home?' },
    intermediate: { conversationAnswer: "We're thinking about buying — renting feels like throwing money away.", typingAnswer: 'Renting feels like throwing money away.', reviewPrompt: 'Review how to compare renting and buying.', aiConversationPrompt: 'Tell the AI why you want to buy.', nativeHint: '購入を考えてる。賃貸だとお金捨ててる気がして。', mixHint: "We're 購入を考えてる — 賃貸 feels like throwing money away.", aiQuestionText: 'Have you started looking?' },
    advanced: { conversationAnswer: "Buying a home is the biggest financial decision I'll ever make — I want to make sure I'm not rushing into it.", typingAnswer: "I don't want to rush into it.", reviewPrompt: 'Review how to express caution about a major decision.', aiConversationPrompt: 'Discuss with the AI the pros and cons of buying a home.', nativeHint: '家を買うのは人生最大の金銭的決断。焦って決めたくない。', mixHint: "家を買う biggest financial decision — 焦って rushing into it don't want.", aiQuestionText: 'What are you most worried about?' },
  },
  investment_basics: {
    beginner: { conversationAnswer: "I'm interested in investing.", typingAnswer: "I'm interested in investing.", reviewPrompt: 'Review a simple investment sentence.', aiConversationPrompt: 'Tell the AI about your interest.', nativeHint: '投資に興味がある。', mixHint: "I'm 投資に interested.", aiQuestionText: 'Have you invested before?' },
    intermediate: { conversationAnswer: "I started investing a little — just index funds for now.", typingAnswer: 'Just index funds for now.', reviewPrompt: 'Review how to describe starting to invest.', aiConversationPrompt: 'Tell the AI about your investment strategy.', nativeHint: 'ちょっとだけ投資始めた。今はインデックスファンドだけ。', mixHint: 'I 投資始めた a little — just インデックスファンド for now.', aiQuestionText: 'What got you started?' },
    advanced: { conversationAnswer: "The hardest part of investing is not panicking when the market drops — you just have to stay the course.", typingAnswer: 'You just have to stay the course.', reviewPrompt: 'Review how to describe investment mindset.', aiConversationPrompt: 'Discuss with the AI your investment philosophy.', nativeHint: '投資で一番難しいのは市場が下がっても焦らないこと。とにかく続けるしかない。', mixHint: '投資で一番難しい is 焦らない when 市場下がる — just stay the course.', aiQuestionText: 'What have you learned about investing?' },
  },
  tax_procedure: {
    beginner: { conversationAnswer: 'I need to file my taxes.', typingAnswer: 'I need to file my taxes.', reviewPrompt: 'Review a simple tax sentence.', aiConversationPrompt: 'Tell the AI about your tax situation.', nativeHint: '確定申告しなきゃ。', mixHint: 'I 確定申告しなきゃ file.', aiQuestionText: 'Have you done it yet?' },
    intermediate: { conversationAnswer: "I'm doing my taxes this weekend — I always leave it until the last minute.", typingAnswer: 'I always leave it until the last minute.', reviewPrompt: 'Review how to describe tax filing habits.', aiConversationPrompt: 'Tell the AI how you handle taxes.', nativeHint: '今週末確定申告する。いつもギリギリ。', mixHint: "I'm 今週末確定申告 — いつもギリギリ last minute.", aiQuestionText: 'Do you do it yourself?' },
    advanced: { conversationAnswer: "I finally used an accountant this year — it cost a bit, but it saved me so much stress and probably some money too.", typingAnswer: 'It saved me so much stress.', reviewPrompt: 'Review how to describe outsourcing a difficult task.', aiConversationPrompt: 'Discuss with the AI how you handle tax season.', nativeHint: '今年は税理士使った。多少お金かかったけど、ストレス激減したしたぶん節税にもなった。', mixHint: 'I finally 税理士 used — 多少かかった but ストレス激減 and たぶん節税.', aiQuestionText: 'Was it worth using a professional?' },
  },
  cultural_difference_discussion: {
    beginner: { conversationAnswer: "That's different from my country.", typingAnswer: "That's different from my country.", reviewPrompt: 'Review a simple cultural comparison.', aiConversationPrompt: 'Tell the AI about a cultural difference you noticed.', nativeHint: 'うちの国とは違う。', mixHint: "That's うちの国とは different.", aiQuestionText: 'What surprised you?' },
    intermediate: { conversationAnswer: "In Japan, you take your shoes off at the door — it took me a while to get used to that.", typingAnswer: 'It took me a while to get used to that.', reviewPrompt: 'Review how to describe adapting to cultural norms.', aiConversationPrompt: 'Tell the AI about a cultural difference you found interesting.', nativeHint: '日本では玄関で靴脱ぐ。慣れるのにちょっとかかった。', mixHint: '日本では 玄関で靴脱ぐ — 慣れるのに a while.', aiQuestionText: 'What was the biggest adjustment?' },
    advanced: { conversationAnswer: "The more I learn about different cultures, the more I realize there's no 'right' way — just different ways of doing things.", typingAnswer: "There's no right way, just different ways.", reviewPrompt: 'Review how to express cultural openness.', aiConversationPrompt: 'Discuss with the AI what you have learned from cultural differences.', nativeHint: '文化を知れば知るほど「正しい」やり方なんてないと分かる。ただ違うだけ。', mixHint: "文化を知るほど「正しい」やり方 no 'right' way — just different ways.", aiQuestionText: 'What have cultural differences taught you?' },
  },
  future_goals_discussion: {
    beginner: { conversationAnswer: 'I have a goal.', typingAnswer: 'I have a goal.', reviewPrompt: 'Review a simple goals sentence.', aiConversationPrompt: 'Tell the AI about your goal.', nativeHint: '目標がある。', mixHint: 'I 目標 have.', aiQuestionText: 'What is your goal?' },
    intermediate: { conversationAnswer: "I want to be fluent in English within two years.", typingAnswer: 'I want to be fluent within two years.', reviewPrompt: 'Review how to state a clear goal.', aiConversationPrompt: 'Tell the AI how you plan to achieve your goal.', nativeHint: '2年以内に英語ペラペラになりたい。', mixHint: 'I 2年以内に fluent want to be.', aiQuestionText: 'What steps are you taking?' },
    advanced: { conversationAnswer: "My goals have changed a lot over the years — I used to chase money, now I just want a life I actually enjoy.", typingAnswer: "I just want a life I actually enjoy.", reviewPrompt: 'Review how to reflect on changing priorities.', aiConversationPrompt: 'Discuss with the AI how your goals have evolved.', nativeHint: '目標は年々変わった。前はお金追いかけてたけど、今は楽しい人生がいい。', mixHint: '目標は年々変わった — 前は money, now just 楽しい人生.', aiQuestionText: 'How have your goals changed?' },
  },
  share_past_experience: {
    beginner: { conversationAnswer: 'Let me tell you something.', typingAnswer: 'Let me tell you something.', reviewPrompt: 'Review a simple storytelling opener.', aiConversationPrompt: 'Share an experience with the AI.', nativeHint: 'ちょっと聞いて。', mixHint: 'Let me ちょっと tell you.', aiQuestionText: 'Go ahead, I\'m listening.' },
    intermediate: { conversationAnswer: "Something similar happened to me before — I totally understand how you feel.", typingAnswer: 'I totally understand how you feel.', reviewPrompt: 'Review how to show empathy through shared experience.', aiConversationPrompt: 'Share a relevant experience with the AI.', nativeHint: '前に似たことあった。気持ちすごく分かる。', mixHint: '前に似たこと happened — 気持ち totally understand.', aiQuestionText: 'What happened to you?' },
    advanced: { conversationAnswer: "I made a huge mistake at my old job, and it was embarrassing at the time — but looking back, it taught me more than anything else.", typingAnswer: 'It taught me more than anything else.', reviewPrompt: 'Review how to share a lesson learned from failure.', aiConversationPrompt: 'Discuss with the AI a past experience that shaped you.', nativeHint: '前の仕事で大きなミスした。当時は恥ずかしかったけど、振り返ると一番勉強になった。', mixHint: '前の仕事で大きなミス — 当時恥ずかしかったけど it taught me more than anything.', aiQuestionText: 'What did you learn from it?' },
  },
  problem_solving_discussion: {
    beginner: { conversationAnswer: "I have a problem.", typingAnswer: 'I have a problem.', reviewPrompt: 'Review a simple problem statement.', aiConversationPrompt: 'Tell the AI about your problem.', nativeHint: '困ってることがある。', mixHint: 'I 困ってること have.', aiQuestionText: 'What is the problem?' },
    intermediate: { conversationAnswer: "I've been going back and forth on this — I can't figure out the best approach.", typingAnswer: "I can't figure out the best approach.", reviewPrompt: 'Review how to describe indecision.', aiConversationPrompt: 'Tell the AI what you are struggling with.', nativeHint: 'ずっと迷ってる。ベストな方法が分からない。', mixHint: "I've been ずっと迷ってる — ベストな approach can't figure out.", aiQuestionText: 'What options do you have?' },
    advanced: { conversationAnswer: "Sometimes the best solution is the simplest one — we tend to overcomplicate things when we're stressed.", typingAnswer: 'We tend to overcomplicate things.', reviewPrompt: 'Review how to share problem-solving wisdom.', aiConversationPrompt: 'Discuss with the AI your approach to solving problems.', nativeHint: '一番いい解決策って大抵シンプルなもの。ストレスだと複雑に考えがち。', mixHint: '一番いい solution is シンプルなもの — ストレスだと overcomplicate しがち.', aiQuestionText: 'How do you approach problems?' },
  },
  schedule_change_negotiation: {
    beginner: { conversationAnswer: 'Can I change the time?', typingAnswer: 'Can I change the time?', reviewPrompt: 'Review a simple schedule request.', aiConversationPrompt: 'Practice changing plans with the AI.', nativeHint: '時間変えてもいい？', mixHint: 'Can I 時間変えて?', aiQuestionText: 'What time works better?' },
    intermediate: { conversationAnswer: "Something came up — would it be okay to reschedule to next week?", typingAnswer: 'Would it be okay to reschedule?', reviewPrompt: 'Review how to politely reschedule.', aiConversationPrompt: 'Practice rescheduling with the AI.', nativeHint: '急用ができて。来週にリスケしても大丈夫？', mixHint: '急用ができて — would it be okay to 来週 reschedule?', aiQuestionText: 'When would work instead?' },
    advanced: { conversationAnswer: "I'm sorry to do this last minute, but I need to push our meeting — I'll make sure to find a time that works for both of us.", typingAnswer: "I'll find a time that works for both of us.", reviewPrompt: 'Review how to reschedule professionally.', aiConversationPrompt: 'Discuss with the AI how to handle schedule changes gracefully.', nativeHint: '直前ですみませんが、打ち合わせ延期させてください。お互い都合のいい時間見つけます。', mixHint: '直前ですみません — I need to push 打ち合わせ, お互い都合のいい time 見つけます.', aiQuestionText: 'No problem. What day works for you?' },
  },
  explain_your_opinion: {
    beginner: { conversationAnswer: 'I think so too.', typingAnswer: 'I think so too.', reviewPrompt: 'Review a simple agreement phrase.', aiConversationPrompt: 'Share your opinion with the AI.', nativeHint: '私もそう思う。', mixHint: 'I think そう too.', aiQuestionText: 'What do you think?' },
    intermediate: { conversationAnswer: "I see your point, but I think there might be a better way.", typingAnswer: 'I think there might be a better way.', reviewPrompt: 'Review how to politely disagree.', aiConversationPrompt: 'Practice sharing a different opinion with the AI.', nativeHint: '言いたいことは分かるけど、もっといい方法があるかも。', mixHint: 'I see your point, but もっといい方法 might be.', aiQuestionText: 'What would you suggest?' },
    advanced: { conversationAnswer: "I respect your opinion, but from my experience, taking the slower approach tends to give better results in the long run.", typingAnswer: 'The slower approach tends to give better results.', reviewPrompt: 'Review how to disagree respectfully with supporting evidence.', aiConversationPrompt: 'Discuss with the AI how you express opinions constructively.', nativeHint: 'あなたの意見は尊重するけど、経験上、ゆっくりやる方が長い目で見て結果がいい。', mixHint: 'I respect your opinion, but 経験上 slower approach tends to 長い目で better results.', aiQuestionText: 'What makes you think that?' },
  },
}

function getFallbackSceneContent(sceneKey: string): SceneContent {
  const label = titleizeSceneKey(sceneKey)
  const l = label.toLowerCase()

  return {
    beginner: {
      conversationAnswer: `Let's talk about ${l}.`,
      typingAnswer: `Let's talk about ${l}.`,
      reviewPrompt: `Review a simple English expression for ${l}.`,
      aiConversationPrompt: `Talk to the AI about ${l}.`,
      nativeHint: `${l}について話しましょう。`,
      mixHint: `Let's ${l}について talk.`,
      aiQuestionText: `What do you usually do for ${l}?`,
    },
    intermediate: {
      conversationAnswer: `I'd like to practice talking about ${l}.`,
      typingAnswer: `I'd like to practice talking about ${l}.`,
      reviewPrompt: `Review useful English expressions for ${l}.`,
      aiConversationPrompt: `Explain your experience with ${l} to the AI.`,
      nativeHint: `${l}について練習したいです。`,
      mixHint: `I'd like to ${l}について practice talking.`,
      aiQuestionText: `How does ${l} fit into your day?`,
    },
    advanced: {
      conversationAnswer: `Let me tell you about ${l} and how it fits into my day.`,
      typingAnswer: `Let me tell you how it fits into my day.`,
      reviewPrompt: `Review more detailed English expressions for ${l}.`,
      aiConversationPrompt: `Discuss ${l} with the AI in a more detailed and natural way.`,
      nativeHint: `${l}について、日常にどう関わるか話させて。`,
      mixHint: `Let me ${l}について tell you and 日常にどう関わるか.`,
      aiQuestionText: `Tell me about your experience with ${l}.`,
    },
  }
}

/**
 * Handcrafted semantic chunks per scene+level.
 * Each chunk is a meaningful English unit with its Japanese meaning.
 * Only includes chunks that are pedagogically useful for beginner–advanced learners.
 */
// Chunk order rule: context/time first → core action → result/feeling
/** High-frequency verb chunks shared across all scenes for broader meaning matching. */
const COMMON_VERB_CHUNKS: SemanticChunk[] = [
  { chunk: 'talk with', meaning: '〜と話す', type: 'phrase' },
  { chunk: 'go to', meaning: '〜へ行く', type: 'phrase' },
  { chunk: 'have lunch', meaning: '昼ごはんを食べる', type: 'phrase' },
  { chunk: 'wake up', meaning: '起きる', type: 'phrase' },
  { chunk: 'go home', meaning: '家に帰る', type: 'phrase' },
  { chunk: 'hang out', meaning: '遊ぶ', type: 'phrase' },
  { chunk: 'eat dinner', meaning: '夕食を食べる', type: 'phrase' },
  { chunk: 'take a bath', meaning: 'お風呂に入る', type: 'phrase' },
  { chunk: 'get ready', meaning: '準備する', type: 'phrase' },
  { chunk: 'come home', meaning: '帰宅する', type: 'phrase' },
  { chunk: 'go for a walk', meaning: '散歩に行く', type: 'phrase' },
  { chunk: 'make breakfast', meaning: '朝食を作る', type: 'phrase' },
  { chunk: 'make dinner', meaning: '夕食を作る', type: 'phrase' },
  { chunk: 'go to bed', meaning: '寝る', type: 'phrase' },
  { chunk: 'watch videos', meaning: '動画を見る', type: 'phrase' },
  { chunk: 'today', meaning: '今日', type: 'word' },
  { chunk: 'yesterday', meaning: '昨日', type: 'word' },
  { chunk: 'this morning', meaning: '今朝', type: 'word' },
  { chunk: 'this weekend', meaning: '今週末', type: 'word' },
  { chunk: 'every day', meaning: '毎日', type: 'word' },
]

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
      { chunk: 'stay up too late', meaning: '夜更かしする', type: 'phrase' },
      { chunk: 'still pretty tired', meaning: 'まだけっこう眠い', type: 'phrase' },
    ],
  },
  alarm_clock: {
    beginner: [
      { chunk: 'alarm goes off', meaning: '目覚ましが鳴る', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'alarm goes off', meaning: '目覚ましが鳴る', type: 'phrase' },
      { chunk: 'hit snooze', meaning: 'スヌーズを押す', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'go to bed earlier', meaning: '早く寝る', type: 'phrase' },
      { chunk: 'wake up on my own', meaning: '自力で起きる', type: 'phrase' },
    ],
  },
  make_bed: {
    beginner: [
      { chunk: 'make my bed', meaning: '布団をたたむ', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'make my bed', meaning: '布団をたたむ', type: 'phrase' },
      { chunk: 'look much better', meaning: 'ずっときれいに見える', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'make my bed', meaning: '布団をたたむ', type: 'phrase' },
      { chunk: 'feel accomplished', meaning: '達成感がある', type: 'phrase' },
    ],
  },
  wash_face: {
    beginner: [
      { chunk: 'wash my face', meaning: '顔を洗う', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'wash my face', meaning: '顔を洗う', type: 'phrase' },
      { chunk: 'wake myself up', meaning: '目を覚ます', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'wash my face', meaning: '顔を洗う', type: 'phrase' },
      { chunk: 'feel refreshed', meaning: 'すっきりする', type: 'phrase' },
    ],
  },
  brush_teeth: {
    beginner: [
      { chunk: 'brush my teeth', meaning: '歯を磨く', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'brush my teeth', meaning: '歯を磨く', type: 'phrase' },
      { chunk: 'before I leave', meaning: '出かける前に', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'brush my teeth', meaning: '歯を磨く', type: 'phrase' },
      { chunk: 'feel prepared for the day', meaning: '一日の準備ができた気がする', type: 'phrase' },
    ],
  },
  take_a_shower: {
    beginner: [
      { chunk: 'take a shower', meaning: 'シャワーを浴びる', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'take a shower', meaning: 'シャワーを浴びる', type: 'phrase' },
      { chunk: 'feel awake', meaning: '目が覚める', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'take a shower', meaning: 'シャワーを浴びる', type: 'phrase' },
      { chunk: 'start the day fresh', meaning: 'さっぱりして一日を始める', type: 'phrase' },
    ],
  },
  get_dressed: {
    beginner: [
      { chunk: 'get dressed', meaning: '着替える', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'get dressed', meaning: '着替える', type: 'phrase' },
      { chunk: 'check the weather', meaning: '天気を確認する', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'choose my outfit', meaning: '服を選ぶ', type: 'phrase' },
      { chunk: 'get dressed', meaning: '着替える', type: 'phrase' },
    ],
  },
  make_breakfast: {
    beginner: [
      { chunk: 'make breakfast', meaning: '朝食を作る', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'make something simple', meaning: '簡単なものを作る', type: 'phrase' },
      { chunk: 'when I have time', meaning: '時間があるとき', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'eat something healthy', meaning: '体にいいものを食べる', type: 'phrase' },
      { chunk: 'run out of energy', meaning: 'エネルギー切れになる', type: 'phrase' },
    ],
  },
  eat_breakfast: {
    beginner: [
      { chunk: 'eat breakfast', meaning: '朝食を食べる', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'eat breakfast at home', meaning: '家で朝食を食べる', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'eat breakfast with my family', meaning: '家族と朝食を食べる', type: 'phrase' },
      { chunk: 'stay focused all morning', meaning: '午前中ずっと集中できる', type: 'phrase' },
    ],
  },
  clean_up_after_breakfast: {
    beginner: [
      { chunk: 'clean up the dishes', meaning: 'お皿を片付ける', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'clean up after breakfast', meaning: '朝食の後片付けをする', type: 'phrase' },
      { chunk: 'leave on time', meaning: '時間通りに出る', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'clean up before heading out', meaning: '出かける前に片付ける', type: 'phrase' },
    ],
  },
  get_ready_to_leave: {
    beginner: [
      { chunk: 'grab my bag', meaning: 'カバンを持つ', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'grab my bag and go', meaning: 'カバンを持って出かける', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'do a quick check before leaving', meaning: '出る前にさっと確認する', type: 'phrase' },
    ],
  },
  arrive_at_work: {
    beginner: [
      { chunk: 'get to work', meaning: '仕事に着く', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'get to work early', meaning: '早めに仕事に着く', type: 'phrase' },
      { chunk: 'grab a coffee', meaning: 'コーヒーを買う', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'make it just in time', meaning: 'ギリギリ間に合う', type: 'phrase' },
      { chunk: 'have to rush', meaning: '急がなきゃいけない', type: 'phrase' },
    ],
  },
  greet_coworkers: {
    beginner: [
      { chunk: 'say good morning', meaning: 'おはようと言う', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'say good morning at work', meaning: '職場でおはようと言う', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'say hi to everyone', meaning: 'みんなに挨拶する', type: 'phrase' },
      { chunk: 'set a good vibe for the day', meaning: '一日のいい雰囲気を作る', type: 'phrase' },
    ],
  },
  go_to_a_convenience_store: {
    beginner: [
      { chunk: 'go to the store', meaning: 'お店に行く', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'go to the convenience store', meaning: 'コンビニに行く', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'stop by the convenience store', meaning: 'コンビニに立ち寄る', type: 'phrase' },
      { chunk: 'need something quick', meaning: 'さっと何か食べたい', type: 'phrase' },
    ],
  },
  order_at_a_restaurant: {
    beginner: [
      { chunk: 'have the pasta', meaning: 'パスタにする', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'get the lunch set', meaning: 'ランチセットにする', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'go with the special', meaning: 'おすすめにする', type: 'phrase' },
      { chunk: 'what do you recommend', meaning: 'おすすめは何ですか', type: 'phrase' },
    ],
  },
  lunch_break: {
    beginner: [
      { chunk: 'lunch time', meaning: 'お昼の時間', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'eat lunch at my desk', meaning: 'デスクでお昼を食べる', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'take a proper lunch break', meaning: 'ちゃんと昼休みを取る', type: 'phrase' },
      { chunk: 'end up working through it', meaning: '結局仕事してしまう', type: 'phrase' },
    ],
  },
  talk_with_friends: {
    beginner: [
      { chunk: 'talk with a friend', meaning: '友達と話す', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'run into a friend', meaning: '友達にばったり会う', type: 'phrase' },
      { chunk: 'chat for a bit', meaning: 'ちょっとおしゃべりする', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'bump into an old friend', meaning: '昔の友達にばったり会う', type: 'phrase' },
      { chunk: 'end up talking for a while', meaning: '結局しばらく話し込む', type: 'phrase' },
    ],
  },
  shop_at_the_supermarket: {
    beginner: [
      { chunk: 'go shopping', meaning: '買い物に行く', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'stop by the supermarket', meaning: 'スーパーに立ち寄る', type: 'phrase' },
      { chunk: 'pick up dinner stuff', meaning: '夕飯の材料を買う', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'swing by the store after work', meaning: '仕事帰りにお店に寄る', type: 'phrase' },
      { chunk: 'grab something fresh', meaning: '新鮮なものを買う', type: 'phrase' },
    ],
  },
  come_home: {
    beginner: [
      { chunk: 'get home', meaning: '家に着く', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'get home', meaning: '家に着く', type: 'phrase' },
      { chunk: 'take a quick break', meaning: 'ちょっと休憩する', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'take a break to recharge', meaning: '充電のために休憩する', type: 'phrase' },
      { chunk: 'jump into dinner and chores', meaning: '夕飯と家事に取りかかる', type: 'phrase' },
    ],
  },
  make_dinner: {
    beginner: [
      { chunk: 'make dinner', meaning: '夕食を作る', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'cook at home', meaning: '家で料理する', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'cook at home to save money', meaning: '節約のために家で作る', type: 'phrase' },
    ],
  },
  take_a_bath: {
    beginner: [
      { chunk: 'take a bath', meaning: 'お風呂に入る', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'take a bath to relax', meaning: 'リラックスのためにお風呂に入る', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'unwind and let go of the day', meaning: '気持ちをほぐして一日を手放す', type: 'phrase' },
    ],
  },
  watch_videos: {
    beginner: [
      { chunk: 'watch videos', meaning: '動画を見る', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'watch YouTube before bed', meaning: '寝る前にYouTubeを見る', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'end up watching too many videos', meaning: '結局動画を見すぎてしまう', type: 'phrase' },
    ],
  },
  go_to_bed: {
    beginner: [
      { chunk: 'go to bed', meaning: '寝る', type: 'phrase' },
    ],
    intermediate: [
      { chunk: 'go to bed early', meaning: '早く寝る', type: 'phrase' },
      { chunk: 'wake up feeling better', meaning: 'すっきり起きられる', type: 'phrase' },
    ],
    advanced: [
      { chunk: 'stay up too late', meaning: '夜更かしする', type: 'phrase' },
      { chunk: 'useless the next day', meaning: '翌日使い物にならない', type: 'phrase' },
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

export function getSemanticChunks(sceneKey: string, level: CurrentLevel): SemanticChunk[] | null {
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

/**
 * Reverse-lookup: find the nativeHint for a given English answer across all scenes/levels.
 * Used by review injection to populate nativeHint for review items.
 */
/** Reverse-lookup: find the sceneKey and nativeHint for a given English answer. */
export function lookupSceneByAnswer(englishAnswer: string): { sceneKey: string; nativeHint: string } | null {
  if (!englishAnswer) return null
  const needle = englishAnswer.trim().toLowerCase()
  for (const sceneKey of Object.keys(SCENE_CONTENT)) {
    const scene = SCENE_CONTENT[sceneKey]
    for (const bucket of ['beginner', 'intermediate', 'advanced'] as const) {
      const level = scene[bucket]
      if (level.conversationAnswer.trim().toLowerCase() === needle) return { sceneKey, nativeHint: level.nativeHint }
      if ('variations' in level && Array.isArray((level as SceneLevelWithVariations).variations)) {
        for (const v of (level as SceneLevelWithVariations).variations ?? []) {
          if (v.conversationAnswer.trim().toLowerCase() === needle) return { sceneKey, nativeHint: v.nativeHint }
        }
      }
    }
  }
  return null
}

/** Convenience wrapper — returns only the nativeHint. */
export function lookupNativeHintByAnswer(englishAnswer: string): string | null {
  return lookupSceneByAnswer(englishAnswer)?.nativeHint ?? null
}

function buildEnglishPrompt(input: {
  blockType: LessonBlueprintBlockType
  sceneKey: string
  level: CurrentLevel
}): { prompt: string; answer: string | null; nativeHint: string | null; mixHint: string | null; aiQuestionText: string | null; semanticChunks: SemanticChunk[] | null; typingVariations: string[] | null } {
  const repo = getLessonContentRepository()
  const phrase = repo.getScenePhrase(input.sceneKey, input.level)

  // Fallback to direct catalog read if repository returns null (should not happen for known scenes)
  if (!phrase) {
    const scene = getSceneContent(input.sceneKey, input.level)
    return {
      prompt: scene.conversationAnswer,
      answer: scene.conversationAnswer,
      nativeHint: scene.nativeHint || null,
      mixHint: scene.mixHint || null,
      aiQuestionText: scene.aiQuestionText || null,
      semanticChunks: getSemanticChunks(input.sceneKey, input.level),
      typingVariations: null,
    }
  }

  const hint = phrase.nativeHint || null
  const mix = phrase.mixHint || null
  const question = phrase.aiQuestionText || null
  const chunks = phrase.semanticChunks.length > 0 ? phrase.semanticChunks : null

  switch (input.blockType) {
    case 'conversation':
      return {
        prompt: 'Listen to the English audio carefully and repeat the sentence naturally.',
        answer: phrase.conversationAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
        typingVariations: null,
      }

    case 'typing': {
      const variations = phrase.variations
        .map((v) => v.typingAnswer)
        .filter((t): t is string => Boolean(t?.trim()))
      return {
        prompt: phrase.typingAnswer || phrase.conversationAnswer || '',
        answer: phrase.typingAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
        typingVariations: variations.length > 0 ? variations : null,
      }
    }

    case 'review':
      return {
        prompt: phrase.reviewPrompt,
        answer: phrase.conversationAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
        typingVariations: null,
      }

    case 'ai_conversation':
      return {
        prompt: phrase.aiConversationPrompt,
        answer: phrase.conversationAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
        typingVariations: null,
      }

    default:
      return {
        prompt: `Practice English for this scene: ${input.sceneKey}`,
        answer: phrase.conversationAnswer,
        nativeHint: hint,
        mixHint: mix,
        aiQuestionText: question,
        semanticChunks: chunks,
        typingVariations: null,
      }
  }
}

function mapBlockToDraft(
  block: LessonBlueprintBlock,
  uiLanguage: string,
  level: CurrentLevel,
  sceneCategory: string,
  targetRegionSlug: string | null
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

  // Resolve region + age (defaults until settings integration)
  const region = targetRegionSlug ?? 'en_us_general'
  const ageGroup = '20s' // TODO: read from user profile when available

  // Overlay catalog content when available (scene + region + age + level)
  const repo = getLessonContentRepository()
  const enrichment = repo.getConversationEnrichment(sceneKey, region, ageGroup, level)
  const aiQuestionText = enrichment?.aiQuestionText ?? englishContent.aiQuestionText
  const typingVariations = enrichment?.typingVariations ?? englishContent.typingVariations
  const relatedExpressions = enrichment?.relatedExpressions ?? null
  // Merge semantic chunks: catalog coreChunks + scene chunks + shared verb dictionary
  const catalogChunks: SemanticChunk[] = enrichment?.coreChunks
    ? enrichment.coreChunks.map((c): SemanticChunk => ({ chunk: c.chunk, meaning: c.meaning, type: 'phrase' }))
    : []
  const sceneChunks: SemanticChunk[] = englishContent.semanticChunks ?? []
  const seen = new Set(catalogChunks.map((c) => c.chunk.toLowerCase()))
  const merged = [
    ...catalogChunks,
    ...sceneChunks.filter((c) => !seen.has(c.chunk.toLowerCase())),
    ...COMMON_VERB_CHUNKS.filter((c) => !seen.has(c.chunk.toLowerCase())),
  ]
  const semanticChunks: SemanticChunk[] | null = merged.length > 0 ? merged : null

  const aiQuestionChoices = enrichment?.aiQuestionChoices ?? null
  const items = [createDraftItem(englishContent.prompt, englishContent.answer, englishContent.nativeHint, englishContent.mixHint, aiQuestionText, imageUrl, semanticChunks, typingVariations, relatedExpressions, aiQuestionChoices)]

  const blockBase = { title: block.title, description: sceneLabel, items, image_prompt: imagePrompt, sceneId: sceneKey, sceneCategory, region, ageGroup }

  switch (block.type) {
    case 'conversation':
      return { type: 'conversation', estimatedMinutes: 5, ...blockBase }

    case 'typing':
      return { type: 'typing', estimatedMinutes: 4, ...blockBase }

    case 'review':
      return { type: 'review', estimatedMinutes: 3, ...blockBase }

    case 'ai_conversation':
      return { type: 'ai_conversation', estimatedMinutes: 6, ...blockBase }

    default: {
      const _: never = block.type
      return { type: block.type, estimatedMinutes: 3, ...blockBase }
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
      mapBlockToDraft(block, uiLanguage, blueprint.level, block.sceneCategory, blueprint.targetRegionSlug)
    ),
  }
}
