/**
 * Lesson UI copy for the NativeFlow MVP.
 * Japanese only; structure is ready for future i18n.
 * UI-independent; consumed by app/lesson/page.tsx or other lesson UI.
 */

export type LessonCopy = {
  loading: string
  pageErrors: {
    default: string
    profileLoadFailed: string
  }
  intro: {
    title: string
    body1: string
    body2: string
  }
  meta: {
    theme: string
    level: string
    estimatedTime: string
  }
  generated: {
    theme: string
    scenario: string
    learnerGoal: string
    localeFocus: string
    conversationTopic: string
    reviewFocus: string
    typingFocus: string
  }
  blueprint: {
    sectionTitle: string
    theme: string
    level: string
    goal: string
  }
  draft: {
    sectionTitle: string
    theme: string
    type: string
    title: string
    description: string
    estimatedMinutes: string
    prompt: string
    answer: string
  }
  mappedSession: {
    sectionTitle: string
    theme: string
    level: string
    totalEstimatedMinutes: string
    id: string
    type: string
    title: string
    description: string
    estimatedMinutes: string
    prompt: string
    answer: string
  }
  aiPromptPayload: {
    sectionTitle: string
    systemPurpose: string
    lessonInput: string
    sessionConfig: string
    blueprint: string
    draft: string
    mappedSession: string
    theme: string
    scenario: string
    learnerGoal: string
    localeFocus: string
    conversationTopic: string
    reviewFocus: string
    typingFocus: string
    blocks: string
    level: string
    totalEstimatedMinutes: string
  }
  aiMessages: {
    sectionTitle: string
    messageCount: string
    role: string
    content: string
  }
  block: {
    estimatedPrefix: string
    estimatedSuffix: string
  }
  progress: {
    progressPercent: string
    completed: string
    typing: string
  }
  typing: {
    placeholder: string
    checkButton: string
    correct: string
    incorrect: string
    answerLabel: string
  }
  buttons: {
    next: string
    complete: string
    startLesson: string
    backToDashboard: string
  }
  completion: {
    completed: string
    progressPercent: string
    typing: string
    stopFirstHeading: string
    stopFirstSubheading: string
    stopFirstSupport: string
    primaryAction: string
    secondaryAction: string
    extraSessionConfirm: string
  }
  /** lesson-active-card で使用する文字列 */
  activeCard: {
    /** 「今日やること」セクションのラベル */
    nowDoingLabel: string
    /** タイピング入力エリアのラベル */
    typingInputLabel: string
    /** 正解表示エリアのラベル */
    correctAnswerLabel: string
    /** 参考表現エリアのラベル */
    referenceLabel: string
    /** タイピング以外のブロックで表示するガイドテキスト */
    nonTypingGuide: string
    stageListenRepeatLabel: string
    stageListenLabel: string
    stageRepeatLabel: string
    stageAiQuestionLabel: string
    stageTypingLabel: string
    stageAiConversationLabel: string
    stageDefaultLabel: string
    guideAlexTitle: string
    guideEmmaTitle: string
    guideDefaultTitle: string
    hintLabel: string
    listenAction: string
    repeatAction: string
    aiQuestionAction: string
    // AI Question listening comprehension
    aiQPlayButton: string
    aiQReplayButton: string
    aiQInstruction: string
    aiQChoiceAction: string
    aiQChoiceTime: string
    aiQChoiceFood: string
    aiQChoicePerson: string
    aiQChoiceFeeling: string
    aiQChoicePlace: string
    aiQChoiceUnsure: string
    aiQHint: string
    aiQCorrect: string
    aiQIncorrect: string
    aiQSpeakPrompt: string
    aiQRecordButton: string
    aiQStopButton: string
    aiQSpokenFeedback: string
    aiQIntentPool: Record<string, string[]>
    typingAction: string
    aiConversationAction: string
    listenPrimary: string
    listenSecondary: string
    repeatPrimary: string
    repeatSecondary: string
    aiQuestionPrimary: string
    aiQuestionSecondary: string
    typingCorrectPrimary: string
    typingIncorrectPrimary: string
    typingNeutralPrimary: string
    typingSecondary: string
    aiConversationPrimary: string
    challengeListeningPrimary: string
    challengeSpeakingPrimary: string
    aiConversationSecondary: string
    guideDefaultPrimary: string
    guideDefaultSecondary: string
    lessonHeadingTemplate: string
    timelineListenRepeat: string
    timelineListen: string
    timelineRepeat: string
    timelineAiQuestion: string
    timelineTyping: string
    timelineAiConversation: string
    aiConversationPrompt: string
    stageScaffoldLabel: string
    scaffoldAction: string
    scaffoldPrimary: string
    scaffoldSecondary: string
    questionLabel: string
    blockProgressLabel: string
    questionProgressLabel: string
    listenInstruction: string
    listenStartRepeatInstruction: string
    listenPlayButton: string
    listenStopButton: string
    listenRecordingButton: string
    listenPlayingLabel: string
    listenAudioNotReady: string
    repeatSpeakInstruction: string
    repeatRetryAudioButton: string
    repeatRecordingButton: string
    repeatRecordAgainButton: string
    repeatScorePrompt: string
    repeatAfterRecordingInstruction: string
    repeatStopRecordingButton: string
    repeatPlayRecordedButton: string
    compareAudioButton: string
    comparingAudioLabel: string
    repeatScoreButton: string
    repeatScoringLabel: string
    repeatBrowserUnsupported: string
    repeatRecordedReady: string
    repeatRecognitionResultLabel: string
    repeatYourSpeechLabel: string
    repeatExpectedSpeechLabel: string
    repeatPassedLabel: string
    repeatRetryLabel: string
    repeatNextQuestionButton: string
    repeatAttemptCountLabel: string
    repeatAttemptLimitReachedLabel: string
    repeatScoreExcellent: string
    repeatScoreGood: string
    repeatScoreExcellentSub: string
    repeatScoreGoodSub: string
    repeatAttemptSuffix: string
    repeatScoreSuffix: string
    repeatAttemptLimitEncouragement: string
    repeatAttemptLimitAdvance: string
    repeatTipPerfect: string
    repeatTipCompleteness: string
    repeatTipCompletenessMissing: string
    repeatTipWordMatch: string
    repeatTipWordMatchMissing: string
    repeatTipClarity: string
    repeatTipRhythm: string
    repeatTipGenericLow: string
    repeatTipGenericGood: string
    aiConvYouLabel: string
    aiConvThinking: string
    aiConvRetryButton: string
    aiConvAdvanceButton: string
    aiConvExamplePrefix: string
    aiQuestionPlaying: string
    aiQuestionRetryPlay: string
    aiQuestionShowExample: string
    aiQuestionExampleLabel: string
    aiQuestionAudioError: string
    scaffoldAudioPreparing: string
    scaffoldPlayButton: string
    audioPreparing: string
    scaffoldStepLabel: string
    scaffoldPlayingLabel: string
    scaffoldAutoPlayDoneLabel: string
    scaffoldRestartButton: string
    scaffoldNextButton: string
    scaffoldBackToListenButton: string
    backToOverview: string
    backToRepeat: string
    backToScaffold: string
    backToAiQuestion: string
    backToTyping: string
    backToConversation: string
    // ── Meaning-emerges learning flow ──
    rationaleToggle: string
    rationaleTitle: string
    rationaleBody1: string
    rationaleBody2: string
    rationaleBody3: string
    rationaleProgression: string
    rationaleClose: string
    predictPrompt: string
    predictGreeting: string
    predictQuestion: string
    predictRequest: string
    predictThanks: string
    meaningGuessPrompt: string
    meaningGuessGreeting: string
    meaningGuessQuestion: string
    meaningGuessRequest: string
    meaningGuessFeeling: string
    meaningGuessUnsure: string
    meaningGuessUnsureHint: string
    confirmMeaningLabel: string
    /** CTA template: "{stage}へ進む". Use {stage} placeholder. */
    ctaAdvanceTemplate: string
    /** CTA label for viewing lesson results at final stage. */
    ctaViewResults: string
    scaffoldInstruction: string
    scaffoldMeaningLabel: string
    aiQuestionInputGuide: string
    aiQuestionPlayButton: string
    aiQuestionLabel: string
    conversationFlowLabel: string
    aiQuestionFirstTurnRewrite: string
    aiQuestionFirstTurnRewriteBeginner: string
    aiQuestionFirstTurnRewriteIntermediate: string
    aiQuestionFirstTurnRepeat: string
    aiQuestionPartial: string
    aiQuestionGoalLabel: string
    aiQuestionGoalUse: string
    hintEncouragementCollapsed: string
    hintEncouragementHidden: string
    hintEncouragementOptional: string
    hintShowButton: string
    unclearToken: string
    aiQuestionR2PersonWho: string
    aiQuestionR2PersonConfirm: string
    aiQuestionR2TimeWhen: string
    aiQuestionR2TimeConfirm: string
    aiQuestionR2Generic: string
    aiQuestionR3FullSentence: string
    aiQuestionR3FullSentencePerson: string
    aiQuestionR3FullSentenceTime: string
    aiQuestionR3FullSentenceBoth: string
    aiQuestionR3WhatElse: string
    aiQuestionR3Generic: string
    aiQuestionInstruction: string
    aiQuestionRecordButton: string
    aiQuestionStopButton: string
    aiQuestionRecognizing: string
    aiQuestionYourAnswer: string
    aiQuestionNextQuestion: string
    aiQuestionNextStage: string
    aiQuestionRoundLabel: string
    aiQuestionGood: string
    aiQuestionClose: string
    aiQuestionRetry: string
    aiQuestionSilent: string
    aiQuestionBetterWay: string
    aiQuestionFollowUp: string
    aiQuestionFinalRound: string
    aiQuestionRetryTurn: string
    aiQuestionRetryAll: string
    typingCheckButton: string
    typingEmptyGuidance: string
    typingPlayButton: string
    typingNextButton: string
    aiConversationStartButton: string
    aiConvGreeting: string
    aiConvTopic: string
    aiConvImpression: string
    aiConvGoodbye: string
    aiConvFeedbackTitle: string
    aiConvAdviceTitle: string
    aiConvRecordButton: string
    aiConvShowHint: string
    aiConvStopButton: string
    aiConvRecognizing: string
    aiConvYourReply: string
    aiConvNextTurn: string
    aiConvRetryAll: string
    paywallTitle: string
    paywallSubtitle: string
    paywallValue: string
    paywallCtaPrimary: string
    paywallCtaSecondary: string
    paywallFreeLimit: string
    aiConvSpeaking: string
    aiConvYourTurn: string
    aiConvShowFlow: string
    aiConvNextProblem: string
    aiConvFinishLesson: string
    // Micro-feedback
    repeatSuccessGood: string
    repeatSuccessOk: string
    repeatImproved: string
    repeatStable: string
    repeatSlightDrop: string
    repeatWeaknessMissing: string
    repeatWeaknessSound: string
    aiQuestionSuccess: string
    typingSuccess: string
    aiConversationSuccess: string
    lessonSentenceCompleted: string
    soundGameTitle: string
    soundGameCorrect: string
    soundGameIncorrect: string
    soundGameComplete: string
    quickResponseTitle: string
    quickResponseListen: string
    quickResponseCorrect: string
    quickResponseTryAgain: string
    quickResponseComplete: string
    recallTitle: string
    recallPrompt: string
    recallCorrect: string
    recallTryAgain: string
    recallComplete: string
    miniReviewNice: string
    miniReviewAlmost: string
    miniReviewWho: string
    miniReviewWhen: string
    miniReviewWhichChanges: string
    miniReviewSayWith: string
    miniReviewSayFor: string
    miniReviewRecallPrompt: string
    miniReviewWhichSentence: string
    miniReviewValidationCta: string
    miniReviewRetryChallenge: string
    challengeTitle: string
    challengeDescription: string
    challengeStart: string
    challengeAudioPlaying: string
    challengeCorrect: string
    challengeIncorrect: string
    miniReviewTransferPick: string
    miniReviewTenseTransfer: string
    miniReviewSubjectTransfer: string
    miniReviewListenFirst: string
    miniReviewListenAgain: string
    miniReviewSpeakNow: string
    miniReviewSpeechDetected: string
    miniReviewNoSpeech: string
    lessonChecking: string
    lessonPreparingNext: string

    repeatClarityLabel: string
    repeatWordMatchLabel: string
    repeatRhythmLabel: string
    repeatCompletenessLabel: string

    repeatStopError: string
    repeatEmptyRecordingError: string
    repeatNoRecordingForScore: string
    repeatMicError: string
    repeatPlaybackError: string
    repeatScoreError: string
    audioLoading: string
    audioRetry: string
    audioUnavailable: string
  }
  /** lesson-overview-card で使用する文字列 */
  overviewCard: {
    headerBadge: string
    title: string
    learningLanguage: string
    sceneLabel: string
    defaultSceneLabel: string
    defaultSceneDescription: string
    levelLabel: string
    newPhraseLabel: string
    lessonStartLabel: string
    lessonStartTitle: string
    lessonStartDescription: string
    startButton: string
    stageListenRepeatDesc: string
    stageScaffoldTitle: string
    stageScaffoldDesc: string
    stageAiQuestionDesc: string
    stageTypingDesc: string
    stageAiConversationDesc: string
    stageSectionTitle: string
    guideText: string
    guideEncouragement: string
    lessonTimeLabel: string
    practiceSummary: string
    /** Short focus hint shown inside the timeline area. */
    focusTip: string
    featureSpeakTitle: string
    featureSpeakDescription: string
    featureAnswerTitle: string
    featureAnswerDescription: string
    featureConversationTitle: string
    featureConversationDescription: string
    /** Title template for region-aware title. Use {region} and {lang} placeholders. */
    titleTemplate: string
    pillLanguage: string
    pillLevel: string
    pillRegion: string
    pillGoal: string
    pillAge: string
    questionCountLabel: string
    /** Unit suffix for question count. Use {n} placeholder. */
    questionCountValue: string
    skillEstimateTitle: string
    skillEstimateNote: string
    skillConversation: string
    skillListening: string
    skillSpeaking: string
    skillWriting: string
    lessonFlowTitle: string
    lessonFlowSubtitle: string
    flowStep1Label: string
    flowStep1Sub: string
    flowStep2Label: string
    flowStep2Sub: string
    flowStep3Label: string
    flowStep3Sub: string
    flowStep4Label: string
    flowStep4Sub: string
    flowStep5Label: string
    flowStep5Sub: string
    flowStep6Label: string
    flowStep6Sub: string
    /** Review CTA subtitle. Use {count} placeholder. */
    reviewCountSubtitle: string
  }
  /** daily-flow-selector で使用する文字列 */
  dailyFlow: {
    badge: string
    title: string
    instruction: string
    startButton: string
    pickProgress: string
    skipButton: string
    selectedActionsTitle: string
  }
}

const ESTIMATED_MINUTES_LABEL = '想定分'
const LABEL_THEME = 'テーマ'

/** Japanese lesson copy. Use this in the lesson page until language switching is added. */
export const LESSON_COPY_JA = {
  loading: '読み込み中...',
  pageErrors: {
    default: 'レッスンを読み込めませんでした。もう一度お試しください。',
    profileLoadFailed: 'プロフィールを読み込めませんでした。',
  },
  intro: {
    title: '今日のレッスン',
    body1: '今日の学習を始めましょう。',
    body2: '今日の目標に合わせて、会話・復習・入力を組み合わせたレッスンを始めます。',
  },
  meta: {
    theme: '学習テーマ',
    level: 'レベル',
    estimatedTime: '想定時間',
  },
  generated: {
    theme: LABEL_THEME,
    scenario: 'シナリオ',
    learnerGoal: '学習目標',
    localeFocus: '地域',
    conversationTopic: '会話トピック',
    reviewFocus: '復習の焦点',
    typingFocus: '入力の焦点',
  },
  blueprint: {
    sectionTitle: 'ブループリント',
    theme: LABEL_THEME,
    level: 'レベル',
    goal: '目標',
  },
  draft: {
    sectionTitle: 'ドラフト',
    theme: LABEL_THEME,
    type: 'タイプ',
    title: 'タイトル',
    description: '説明',
    estimatedMinutes: ESTIMATED_MINUTES_LABEL,
    prompt: 'プロンプト',
    answer: '答え',
  },
  mappedSession: {
    sectionTitle: 'マップ済みセッション',
    theme: LABEL_THEME,
    level: 'レベル',
    totalEstimatedMinutes: '合計想定分',
    id: 'ID',
    type: 'タイプ',
    title: 'タイトル',
    description: '説明',
    estimatedMinutes: ESTIMATED_MINUTES_LABEL,
    prompt: 'プロンプト',
    answer: '答え',
  },
  aiPromptPayload: {
    sectionTitle: 'AIプロンプトペイロード',
    systemPurpose: 'システム目的',
    lessonInput: 'レッスン入力',
    sessionConfig: 'セッション設定',
    blueprint: 'ブループリント',
    draft: 'ドラフト',
    mappedSession: 'マップ済みセッション',
    theme: LABEL_THEME,
    scenario: 'シナリオ',
    learnerGoal: '学習目標',
    localeFocus: '地域',
    conversationTopic: '会話トピック',
    reviewFocus: '復習の焦点',
    typingFocus: '入力の焦点',
    blocks: 'ブロック数',
    level: 'レベル',
    totalEstimatedMinutes: '合計想定分',
  },
  aiMessages: {
    sectionTitle: 'AIメッセージ',
    messageCount: 'メッセージ数',
    role: '役割',
    content: '内容',
  },
  block: {
    estimatedPrefix: '約',
    estimatedSuffix: '分',
  },
  progress: {
    progressPercent: '進捗率',
    completed: '完了',
    typing: 'typing',
  },
  typing: {
    placeholder: '入力してください',
    checkButton: '答えを確認',
    correct: '正解です',
    incorrect: 'もう少しです',
    answerLabel: '正解: ',
  },
  buttons: {
    next: '次へ',
    complete: 'レッスン完了',
    startLesson: 'レッスンを開始する',
    backToDashboard: 'ダッシュボードへ戻る',
  },
  completion: {
    completed: '完了',
    progressPercent: '進捗率',
    typing: 'typing',
    stopFirstHeading: '今日はここまで！',
    stopFirstSubheading: '明日も続けましょう',
    stopFirstSupport: '少し物足りないくらいが、いちばん続きます',
    primaryAction: '明日はここから再開',
    secondaryAction: 'もう1レッスンやる',
    extraSessionConfirm: '続けるのはOKですが、短く区切る方が効果的です',
  },
  /**
   * NOTE:
   * This object currently contains mixed concerns (labels, guide, errors).
   * Will be refactored into smaller groups after MVP stabilization.
   */
  activeCard: {
    nowDoingLabel: '今日やること',
    typingInputLabel: '入力して確認',
    correctAnswerLabel: '正解',
    referenceLabel: '参考表現',
    nonTypingGuide: '内容を確認したら、下のボタンで次に進みます。',
    stageListenRepeatLabel: '聞き取りとリピート',
    stageListenLabel: '聞く',
    stageRepeatLabel: 'リピート',
    stageAiQuestionLabel: 'AIからの質問',
    stageTypingLabel: 'タイピング',
    stageAiConversationLabel: 'AIと会話',
    stageDefaultLabel: 'レッスン',
    guideAlexTitle: 'Alexのヒント',
    guideEmmaTitle: 'Emmaのヒント',
    guideDefaultTitle: 'ガイド',
    hintLabel: 'ヒント',
    listenPrimary: '音をよく聞いて意味をイメージしましょう',
    listenSecondary: '音をそのまま耳から口へ流すイメージで進めるのがコツだよ',
    repeatPrimary: '文法・文字は一切気にせずに音だけを意識しましょう',
    repeatSecondary: '文字ではなく、音のリズムと区切りを意識すると話しやすいよ',
    aiQuestionPrimary: '質問を聞いて、何について聞かれているか選ぼう',
    aiQuestionSecondary: 'わからないときは、もう一度聞いてみよう',
    typingCorrectPrimary: 'いい感じ。このまま英語の形をしっかり定着させよう',
    typingIncorrectPrimary: 'おしい。音とつづりのつながりを意識してもう一度見てみよう',
    typingNeutralPrimary: '聞こえた英語を思い出しながら、落ち着いて入力してみよう',
    typingSecondary: '耳で覚えた音を文字に変えることで、記憶がかなり強くなるよ',
    aiConversationPrimary: '会話は慣れるのが1番の上達の道。間違えてもいいので話してみよう！',
    challengeListeningPrimary: '何度も聞いていれば自然と音と文字が結びつきますよ！',
    challengeSpeakingPrimary: '音を聞いたら文字に変えず、音のまま覚えてそのまま返す意識をしましょう！',
    aiConversationSecondary: 'うまく話すより、実際に使うことが一番大切だよ',
    guideDefaultPrimary: '落ち着いて、ひとつずつ進めていこう',
    guideDefaultSecondary: '音を聞いて、マネして、使う。この流れを大切にしよう',
    lessonHeadingTemplate: '{scene}と{language}で会話',
    timelineListenRepeat: '聞く・リピート',
    timelineListen: '聞く',
    timelineRepeat: 'リピート',
    timelineAiQuestion: 'AIからの質問',
    timelineTyping: 'タイピング',
    timelineAiConversation: 'AIとの会話',
    aiConversationPrompt: 'AIと会話してください',
    listenAction: 'イメージと音をつなげる',
    repeatAction: 'マイクで話す',
    aiQuestionAction: '質問を聞いて選ぶ',
    aiQPlayButton: '再生する',
    aiQReplayButton: 'もう一度聞く',
    aiQInstruction: '何について聞かれていますか？',
    aiQChoiceAction: '行動・やること について聞いている',
    aiQChoiceTime: '時間・タイミング について聞いている',
    aiQChoiceFood: '食べ物・食事 について聞いている',
    aiQChoicePerson: '人・相手 について聞いている',
    aiQChoiceFeeling: '気持ち・感想 について聞いている',
    aiQChoicePlace: '場所・どこで について聞いている',
    aiQChoiceUnsure: 'まだわからない',
    aiQHint: 'まずは「何について聞いているか」だけわかれば大丈夫です。もう一度聞いてみましょう。',
    aiQCorrect: '正解！',
    aiQIncorrect: '惜しい！でも聞き取ろうとしたことが大事です。',
    aiQSpeakPrompt: '質問の内容がわかったので、短く英語で答えてみよう',
    aiQRecordButton: '答えを録音する',
    aiQStopButton: '録音を止める',
    aiQSpokenFeedback: '話してみた！それだけで十分です。',
    aiQIntentPool: {
      action_routine: ['ふだん何をするか聞いている', '日常の行動について聞いている'],
      action_clean: ['片付けについて聞いている', 'ふだん片付けをするか聞いている'],
      action_cook: ['料理をするかどうか聞いている', '食事の準備について聞いている'],
      action_go: ['どこかへ行くかどうか聞いている', '出かける予定について聞いている'],
      action_generic: ['何をするか聞いている', '行動について聞いている'],
      time: ['いつそれをするか聞いている', '時間やタイミングについて聞いている'],
      food: ['食べ物や食事について聞いている', '何を食べるか聞いている'],
      person: ['誰といっしょにいるか聞いている', '相手について聞いている'],
      feeling: ['どう思っているか聞いている', '気持ちについて聞いている'],
      place: ['どこでそれをするか聞いている', '場所について聞いている'],
      greeting: ['あいさつをしている', '調子を聞いている'],
    },
    typingAction: '英文を入力する',
    aiConversationAction: 'AIと会話する',
    stageScaffoldLabel: 'イメージ理解',
    scaffoldAction: '意味をイメージする',
    scaffoldPrimary: 'まとまった「かたまり」を音で覚えよう',
    scaffoldSecondary: '少しずつ英語に慣れていきます',
    questionLabel: '問題',
    blockProgressLabel: '今日の問題数',
    questionProgressLabel: '今はステップ {current} に取り組んでいます',
    listenInstruction: '音を何度か聞いて、意味を思い浮かべてみましょう',
    listenStartRepeatInstruction: '準備ができたらリピートへ進みましょう。',
    listenPlayButton: '▶ 再生',
    listenStopButton: '■ 停止',
    listenRecordingButton: '次へ',
    listenPlayingLabel: '音声再生中です',
    listenAudioNotReady: 'まだ音声ファイルがありません',
    repeatSpeakInstruction: 'STEP1で聞いた文章をマネして録音してください',
    repeatRetryAudioButton: '聞くに戻る',
    repeatRecordingButton: '録音開始',
    repeatRecordAgainButton: 'もう一度録音する',
    repeatScorePrompt: '音が終わったら採点ボタンを押してください',
    repeatAfterRecordingInstruction: '録音が終わったら採点ボタンを押してください',
    repeatStopRecordingButton: '■ 録音停止',
    repeatPlayRecordedButton: '🔊 自分の音声を再生',
    compareAudioButton: '聞き比べる',
    comparingAudioLabel: '聞き比べ中…',
    repeatScoreButton: '採点する',
    repeatScoringLabel: '採点中...',
    repeatBrowserUnsupported: 'このブラウザは録音に対応していません。Chrome系ブラウザで確認してください。',
    repeatRecordedReady: '録音が終わったら採点ボタンを押してください',
    repeatRecognitionResultLabel: '認識結果',
    repeatYourSpeechLabel: 'あなたの発音',
    repeatExpectedSpeechLabel: '正しい文章',
    repeatPassedLabel: '✔ 判定完了：次へ進めます',
    repeatRetryLabel: 'もう一度音声を確認してください',
    repeatNextQuestionButton: '次の問題へ',
    repeatAttemptCountLabel: 'チャレンジ回数: {current} / {max}',
    repeatAttemptLimitReachedLabel: '3回やったので次に進みましょう',
    repeatScoreExcellent: 'すごい！上手に言えました',
    repeatScoreGood: 'いい調子です！',
    repeatScoreExcellentSub: 'チャレンジ問題に進みましょう',
    repeatScoreGoodSub: 'もう少しで完璧です — もう一度聞いて真似してみましょう',
    repeatAttemptSuffix: '回目',
    repeatScoreSuffix: '点',
    repeatAttemptLimitEncouragement: '大丈夫！何度も聞くうちに自然と言えるようになります',
    repeatAttemptLimitAdvance: '次に進む',
    repeatTipPerfect: 'リズムは良いです。この調子です',
    repeatTipCompleteness: '最後まで言い切ると伝わりやすくなります',
    repeatTipCompletenessMissing: '「{word}」を意識して最後まで言い切ると良くなります',
    repeatTipWordMatch: 'もう一度聞いて音の違いを確認してみましょう',
    repeatTipWordMatchMissing: '「{word}」の音をもう少し意識してみましょう',
    repeatTipClarity: 'もう少しゆっくり話すと伝わりやすいです',
    repeatTipRhythm: '語尾を少しはっきり言うともっと良くなります',
    repeatTipGenericLow: 'もう一度聞いてから真似するとさらに良くなります',
    repeatTipGenericGood: 'いい感じです。繰り返すほど自然になります',
    aiConvYouLabel: 'あなた',
    aiConvThinking: 'AIが返答を考えています',
    aiConvRetryButton: 'もう一度話す',
    aiConvAdvanceButton: '次へ進む',
    aiConvExamplePrefix: '💬 例',
    aiQuestionPlaying: '再生中…',
    aiQuestionRetryPlay: 'もう一度聞く',
    aiQuestionShowExample: '回答例を見る',
    aiQuestionExampleLabel: '例',
    aiQuestionAudioError: '音声を再生できませんでした。もう一度お試しください。',
    scaffoldAudioPreparing: '音声を準備中...',
    scaffoldPlayButton: '▶ 再生',
    audioPreparing: '音声を準備中です…',
    scaffoldStepLabel: 'Step {current} / {total}',
    scaffoldPlayingLabel: '音声 {current} / {total} を再生中...',
    scaffoldAutoPlayDoneLabel: '3つの音声を聞き終えました',
    scaffoldRestartButton: 'もう一度はじめから聞く',
    scaffoldNextButton: '次へ',
    scaffoldBackToListenButton: '聞くに戻る',
    backToOverview: '← レッスン案内へ戻る',
    backToRepeat: 'リピートに戻る',
    backToScaffold: 'イメージ理解に戻る',
    backToAiQuestion: 'AIからの質問に戻る',
    backToTyping: 'AIとの会話に戻る',
    backToConversation: 'AIとの会話に戻る',
    // ── Meaning-emerges learning flow ──
    rationaleToggle: '今、理解できなくても大丈夫！その理由は→',
    rationaleTitle: '今、理解できなくても大丈夫な理由',
    rationaleBody1: '',
    rationaleBody2: '言葉の意味は、同じような場面で何度も聞くうちに少しずつつながっていきます。',
    rationaleBody3: '最初は音だけに感じても、繰り返すうちに「あいさつっぽい」「こういう時に使う表現だ」とわかるようになります。完璧に訳せなくても、使われ方が少しずつわかれば十分です。',
    rationaleProgression: '1回目: よくわからない\n5回目: よく出る音だと気づく\n10回目: あいさつっぽいと感じる\n20回目: こういう時の表現だとわかる',
    rationaleClose: '閉じる',
    predictPrompt: 'この場面で、相手はどんなことを言いそう？',
    predictGreeting: 'あいさつ',
    predictQuestion: '質問',
    predictRequest: 'お願い',
    predictThanks: 'お礼',
    meaningGuessPrompt: '今の英語はどんな意味に近かったですか？',
    meaningGuessGreeting: 'あいさつしている',
    meaningGuessQuestion: '質問している',
    meaningGuessRequest: 'お願いしている',
    meaningGuessFeeling: '気持ちを伝えている',
    meaningGuessUnsure: 'まだよくわからない',
    meaningGuessUnsureHint: '大丈夫です。同じような場面で繰り返し聞くうちに、自然とわかるようになります。',
    confirmMeaningLabel: 'この表現について',
    ctaAdvanceTemplate: '次へ',
    ctaViewResults: 'レッスン結果を見る',
    scaffoldInstruction: '音声が3回流れます。1回目は英語、2回目は大事な部分を英語と日本語で、3回目でもう一度英語が流れます。',
    scaffoldMeaningLabel: '意味',
    aiQuestionInputGuide: '英語で答えてみましょう',
    aiQuestionPlayButton: '質問を再生',
    aiQuestionLabel: 'AIからの質問',
    conversationFlowLabel: '会話の流れ',
    aiQuestionFirstTurnRewrite: 'さっき練習した文章を思い出してください。「{from}」を「{to}」に変えて言ってみましょう。',
    aiQuestionFirstTurnRewriteBeginner: '「{to}」を使って言ってみましょう。',
    aiQuestionFirstTurnRewriteIntermediate: '「{to}」を使って文章を言ってみましょう。',
    aiQuestionFirstTurnRepeat: 'さっき練習した文章をもう一度言ってみましょう。',
    aiQuestionPartial: 'おしい！もう少しです。',
    aiQuestionGoalLabel: 'こう言ってみよう：',
    aiQuestionGoalUse: '使う表現：',
    hintEncouragementCollapsed: '必要ならヒントを見ながら進められます',
    hintEncouragementHidden: '中級に近づいています。まずはヒントなしで試してみましょう',
    hintEncouragementOptional: 'いい感じです！まずは自分の力で言ってみましょう',
    hintShowButton: 'ヒントを見る',
    unclearToken: '[不明]',
    aiQuestionR2PersonWho: 'いいですね。誰と話しましたか？',
    aiQuestionR2PersonConfirm: 'なるほど。{person}のことですか？',
    aiQuestionR2TimeWhen: 'いいですね。それはいつのことですか？',
    aiQuestionR2TimeConfirm: 'なるほど。{time}にしましたか？',
    aiQuestionR2Generic: 'いいですね。もう一度、文章で言ってみましょう。',
    aiQuestionR3FullSentence: 'いいですね！では、文章全体でもう一度言ってみましょう。',
    aiQuestionR3FullSentencePerson: 'いいですね！「{person}」を使って、文章全体でもう一度言ってみましょう。',
    aiQuestionR3FullSentenceTime: 'いいですね！「{time}」を使って、文章全体でもう一度言ってみましょう。',
    aiQuestionR3FullSentenceBoth: 'いいですね！「{person}」と「{time}」を使って、文章全体でもう一度言ってみましょう。',
    aiQuestionR3WhatElse: '他に何かありましたか？',
    aiQuestionR3Generic: 'もう少し詳しく言ってみましょう。',
    aiQuestionInstruction: '質問を聞いて、学んだ文章で答えてみましょう',
    aiQuestionRecordButton: '録音して答える',
    aiQuestionStopButton: '■ 録音停止',
    aiQuestionRecognizing: '認識中...',
    aiQuestionYourAnswer: 'あなたの回答',
    aiQuestionNextQuestion: '次の質問へ',
    aiQuestionNextStage: 'タイピングへ進む',
    aiQuestionRoundLabel: '質問 {current} / {total}',
    aiQuestionGood: 'いいですね！ちゃんと伝わっています。',
    aiQuestionClose: 'OK！伝わっています。ネイティブはこう言うことが多いですよ。',
    aiQuestionRetry: '質問に合った答えを言ってみましょう。',
    aiQuestionSilent: 'うまく聞こえなかったみたいです。もう一度話してみてください！',
    aiQuestionBetterWay: 'よく使われる言い方: ',
    aiQuestionFollowUp: 'もう少し詳しく教えてください。',
    aiQuestionFinalRound: '最後に、文章全体を言ってみましょう。',
    aiQuestionRetryTurn: 'もう一度やってみる',
    aiQuestionRetryAll: 'もう一度やってみる',
    typingCheckButton: 'チェック',
    typingEmptyGuidance: 'まずは入力してみましょう',
    typingPlayButton: '音声を再生',
    typingNextButton: '次へ進む',
    aiConversationStartButton: '💬 会話開始',
    aiConvGreeting: '会話を始めましょう',
    aiConvTopic: 'レッスンの内容について話しましょう',
    aiConvImpression: '今日のレッスンはどうでしたか？',
    aiConvGoodbye: '会話終了',
    aiConvFeedbackTitle: 'AIからのフィードバック',
    aiConvAdviceTitle: 'もっと良くなるためのアドバイス',
    aiConvRecordButton: '話す',
    aiConvShowHint: 'ヒントを見る',
    aiConvStopButton: '■ 録音停止',
    aiConvRecognizing: '認識中...',
    aiConvYourReply: 'あなたの返答',
    aiConvNextTurn: '次の会話へ',
    aiConvRetryAll: 'もう一度会話する',
    paywallTitle: 'よくできました！',
    paywallSubtitle: '',
    paywallValue: '毎日続けると自然と話せるようになるよ',
    paywallCtaPrimary: '',
    paywallCtaSecondary: '無料で続ける（制限あり）',
    paywallFreeLimit: '無料期間中は1日3問までです。',
    aiConvSpeaking: '話しています…',
    aiConvYourTurn: 'あなたの番です',
    aiConvShowFlow: '会話の流れを見る',
    aiConvNextProblem: 'チャレンジ問題へ進む',
    aiConvFinishLesson: 'レッスンを終了する',
    repeatSuccessGood: 'いいですね！かなり自然です',
    repeatSuccessOk: 'いい感じです。伝わる発音です',
    repeatImproved: 'さっきより自然です',
    repeatStable: '安定しています',
    repeatSlightDrop: 'あと少しです。もう一度いきましょう',
    repeatWeaknessMissing: '「{word}」を忘れないようにしましょう',
    repeatWeaknessSound: '「{word}」の音をもう一度聞いてみましょう',
    aiQuestionSuccess: 'いいですね！実際の会話でも使えます',
    typingSuccess: 'いいですね！思い出せています',
    aiConversationSuccess: '実際の会話でも自然に聞こえます',
    lessonSentenceCompleted: '',
    soundGameTitle: '聞き取りチャレンジ',
    soundGameCorrect: 'Nice!',
    soundGameIncorrect: 'もう一度聞いてみましょう',
    soundGameComplete: 'クリア！',
    quickResponseTitle: 'リピートチャレンジ',
    quickResponseListen: '音声と同じように言ってみましょう',
    quickResponseCorrect: 'Nice!',
    quickResponseTryAgain: 'もう一度！',
    quickResponseComplete: 'クリア！',
    recallTitle: 'スピーキングチャレンジ',
    recallPrompt: '日本語を見て、英語で言ってみましょう',
    recallCorrect: 'Nice!',
    recallTryAgain: 'もう一度！',
    recallComplete: 'クリア！',
    miniReviewNice: '実際の会話で使えます',
    miniReviewAlmost: 'もう一度聞いてみよう',
    miniReviewWho: '誰と？',
    miniReviewWhen: 'いつ？',
    miniReviewWhichChanges: '変わるのはどっち？',
    miniReviewSayWith: '{value}で言ってみよう',
    miniReviewSayFor: '{value}に変えて言ってみよう',
    miniReviewRecallPrompt: '音声の文はどっち？',
    miniReviewWhichSentence: '正しいのはどっち？',
    miniReviewValidationCta: 'チャレンジ問題へ',
    miniReviewRetryChallenge: 'もう一度チャレンジする',
    challengeTitle: 'チャレンジ問題',
    challengeDescription: '音声を聞いて、正しい文章はどちらか選んでください。',
    challengeStart: '開始',
    challengeAudioPlaying: '音声再生中',
    challengeCorrect: '○ 正解です！',
    challengeIncorrect: '× もう一度聞いてみましょう',
    miniReviewTransferPick: '{value}の場合は？',
    miniReviewTenseTransfer: '{value}だったら？',
    miniReviewSubjectTransfer: '{value}が主語だったら？',
    miniReviewListenFirst: '聞いてから選ぼう',
    miniReviewListenAgain: 'もう一度聞く',
    miniReviewSpeakNow: '声に出してみよう',
    miniReviewSpeechDetected: '声が聞こえました！',
    miniReviewNoSpeech: 'もう一度話してみましょう',
    lessonChecking: 'いま確認しています…',
    lessonPreparingNext: '次のステップを準備しています…',
    repeatClarityLabel: '発音明瞭性',
    repeatWordMatchLabel: '語の一致率',
    repeatRhythmLabel: 'リズム/区切り',
    repeatCompletenessLabel: '語の抜け漏れ',

    repeatStopError: '録音停止に失敗しました。もう一度お試しください。',
    repeatEmptyRecordingError: '録音データがありません。',
    repeatNoRecordingForScore: '音声が確認できません。録音してから採点してください。',
    repeatMicError: 'マイクへのアクセスに失敗しました。',
    repeatPlaybackError: '音声の再生に失敗しました。',
    repeatScoreError: '採点に失敗しました。',
    audioLoading: '音声を読み込み中…',
    audioRetry: 'タップして再試行',
    audioUnavailable: '音声が利用できません',
  },
  overviewCard: {
    headerBadge: '今日のレッスン',
    title: '今日の実践英語レッスン',
    learningLanguage: '学習言語',
    sceneLabel: '今日の会話シーン',
    defaultSceneLabel: '日常の短いやり取り',
    defaultSceneDescription: '今日は実践を通して、聞く・話す・入力する・会話で使う流れを体験します。',
    levelLabel: 'レベル',
    newPhraseLabel: '新しい言葉 / 文',
    lessonStartLabel: 'レッスン開始',
    lessonStartTitle: '今日習う表現を、実際に使える形まで進めます',
    lessonStartDescription:
      '聞く・リピート・AIへの返答・タイピング・会話まで、順番に進めながら定着させます。',
    startButton: '今日のレッスンを始める',
    stageListenRepeatDesc: '音を聞いて、そのまま声に出して練習します。',
    stageScaffoldTitle: 'イメージ理解',
    stageScaffoldDesc: '画像と音声で、意味をつかむ練習をします。',
    stageAiQuestionDesc: '習った表現を使って、声で答える練習をします。',
    stageTypingDesc: '実際に入力して、語順とスペルを定着させます。',
    stageAiConversationDesc: '今日の表現を使いながら、実践的なやり取りに進みます。',
    stageSectionTitle: 'レッスン構成',
    guideText: '今日のレッスンをナビゲートします',
    lessonTimeLabel: 'このレッスンの目安時間',
    practiceSummary:
      '聞くだけで終わらず、声に出して実際に使い、入力し、最後はAIとの会話まで進みます。',
    focusTip: 'このレッスンでは短いフレーズを自然に言えるようになることが目標です',
    featureSpeakTitle: '声に出して練習',
    featureSpeakDescription: 'まずは聞いて、真似して、自然な言い方をつかみます。',
    featureAnswerTitle: '質問に答える練習',
    featureAnswerDescription: '習った表現をその場で使い、短い返答に慣れていきます。',
    featureConversationTitle: '会話で使って定着',
    featureConversationDescription: '最後はAIとのやり取りで、今日の英語を実践します。',
    guideEncouragement: '今日も一緒にやってみよう！',
    titleTemplate: '{region}で話す{lang}レッスン',
    pillLanguage: '学習言語',
    pillLevel: 'レベル',
    pillRegion: '地域',
    pillGoal: '目標',
    pillAge: '年代',
    questionCountLabel: '今日の問題数',
    questionCountValue: '{n}問',
    skillEstimateTitle: 'スキル推定',
    skillEstimateNote: '現在のレッスン結果から見た推定値',
    skillConversation: '会話到達度',
    skillListening: 'リスニング',
    skillSpeaking: 'スピーキング',
    skillWriting: 'ライティング',
    lessonFlowTitle: 'レッスンの流れ',
    lessonFlowSubtitle: '聞く → 話す → 理解する → 聞き取る → 会話する → チャレンジ の順で進みます',
    flowStep1Label: '聞く',
    flowStep1Sub: '画像と音を結びつける',
    flowStep2Label: 'まねする',
    flowStep2Sub: '音とリズムを再現する',
    flowStep3Label: 'かたまりで理解',
    flowStep3Sub: 'フレーズ単位で理解',
    flowStep4Label: 'AIに回答する',
    flowStep4Sub: '言語の出し入れ練習',
    flowStep5Label: 'ライティング',
    flowStep5Sub: '記憶の定着強化',
    flowStep6Label: 'AIと会話',
    flowStep6Sub: 'アウトプット練習',
    reviewCountSubtitle: '今日の復習は{count}問あります',
  },
  dailyFlow: {
    badge: 'Daily Flow',
    title: '今日の英語デーを計画しよう',
    instruction: '各時間帯で1つずつ行動を選ぶか、「おまかせで始める」を選択してレッスンを開始してください',
    startButton: 'レッスンを開始',
    pickProgress: '朝から就寝までの生活に沿って進みます',
    skipButton: 'おまかせで始める',
    selectedActionsTitle: '今日のレッスン内容',
  },
} as const satisfies LessonCopy

export const LESSON_COPY_EN = {
  loading: 'Loading...',
  pageErrors: {
    default: 'Failed to load the lesson. Please try again.',
    profileLoadFailed: 'Failed to load your profile.',
  },
  intro: {
    title: "Today's Lesson",
    body1: "Let's start today's practice.",
    body2: 'We will combine conversation, review, and typing practice based on your goal today.',
  },
  meta: {
    theme: 'Theme',
    level: 'Level',
    estimatedTime: 'Estimated time',
  },
  generated: {
    theme: 'Theme',
    scenario: 'Scenario',
    learnerGoal: 'Learning goal',
    localeFocus: 'Region',
    conversationTopic: 'Conversation topic',
    reviewFocus: 'Review focus',
    typingFocus: 'Typing focus',
  },
  blueprint: {
    sectionTitle: 'Blueprint',
    theme: 'Theme',
    level: 'Level',
    goal: 'Goal',
  },
  draft: {
    sectionTitle: 'Draft',
    theme: 'Theme',
    type: 'Type',
    title: 'Title',
    description: 'Description',
    estimatedMinutes: 'Estimated min',
    prompt: 'Prompt',
    answer: 'Answer',
  },
  mappedSession: {
    sectionTitle: 'Mapped session',
    theme: 'Theme',
    level: 'Level',
    totalEstimatedMinutes: 'Total estimated min',
    id: 'ID',
    type: 'Type',
    title: 'Title',
    description: 'Description',
    estimatedMinutes: 'Estimated min',
    prompt: 'Prompt',
    answer: 'Answer',
  },
  aiPromptPayload: {
    sectionTitle: 'AI prompt payload',
    systemPurpose: 'System purpose',
    lessonInput: 'Lesson input',
    sessionConfig: 'Session config',
    blueprint: 'Blueprint',
    draft: 'Draft',
    mappedSession: 'Mapped session',
    theme: 'Theme',
    scenario: 'Scenario',
    learnerGoal: 'Learning goal',
    localeFocus: 'Region',
    conversationTopic: 'Conversation topic',
    reviewFocus: 'Review focus',
    typingFocus: 'Typing focus',
    blocks: 'Blocks',
    level: 'Level',
    totalEstimatedMinutes: 'Total estimated min',
  },
  aiMessages: {
    sectionTitle: 'AI messages',
    messageCount: 'Message count',
    role: 'Role',
    content: 'Content',
  },
  block: {
    estimatedPrefix: '',
    estimatedSuffix: ' min',
  },
  progress: {
    progressPercent: 'Progress',
    completed: 'Completed',
    typing: 'typing',
  },
  typing: {
    placeholder: 'Type your answer',
    checkButton: 'Check answer',
    correct: 'Correct',
    incorrect: 'Almost there',
    answerLabel: 'Answer: ',
  },
  buttons: {
    next: 'Next',
    complete: 'Complete lesson',
    startLesson: 'Start lesson',
    backToDashboard: 'Back to dashboard',
  },
  completion: {
    completed: 'Completed',
    progressPercent: 'Progress',
    typing: 'typing',
    stopFirstHeading: "That's enough for today!",
    stopFirstSubheading: 'See you tomorrow',
    stopFirstSupport: 'Stopping while you want more is the best way to keep going.',
    primaryAction: 'Continue tomorrow',
    secondaryAction: 'Do one more lesson',
    extraSessionConfirm: "It's OK to continue, but shorter sessions are more effective.",
  },
  activeCard: {
    nowDoingLabel: 'What to do now',
    typingInputLabel: 'Type and check',
    correctAnswerLabel: 'Correct answer',
    referenceLabel: 'Reference',
    nonTypingGuide: 'After checking the content, use the button below to continue.',
    stageListenRepeatLabel: 'Listen and repeat',
    stageListenLabel: 'Listen',
    stageRepeatLabel: 'Repeat',
    stageAiQuestionLabel: 'AI question',
    stageTypingLabel: 'Typing',
    stageAiConversationLabel: 'Talk with AI',
    stageDefaultLabel: 'Lesson',
    guideAlexTitle: "Alex's tip",
    guideEmmaTitle: "Emma's tip",
    guideDefaultTitle: 'Guide',
    hintLabel: 'Hint',
    listenPrimary: 'First, focus only on the sounds without looking at the text.',
    listenSecondary: 'It helps to let the sound flow directly from your ears to your mouth.',
    repeatPrimary: "Focus only on the sound — don't worry about grammar or spelling.",
    repeatSecondary: 'Focus on rhythm and chunking rather than spelling.',
    aiQuestionPrimary: 'Listen to the question and choose what it is asking about.',
    aiQuestionSecondary: "If you're not sure, try listening again.",
    typingCorrectPrimary: "Nice. Let's make that English pattern stick.",
    typingIncorrectPrimary: 'Close. Check the connection between sound and spelling one more time.',
    typingNeutralPrimary: 'Recall the English you heard and type it calmly.',
    typingSecondary: 'Turning sound into text makes the memory much stronger.',
    aiConversationPrimary: "You can speak freely here. Using even one phrase from today is enough.",
    challengeListeningPrimary: 'Listen carefully and the sounds will naturally connect to the words!',
    challengeSpeakingPrimary: 'When you hear a sound, try to repeat it directly without converting to text first!',
    aiConversationSecondary: 'What matters most is actually using it.',
    guideDefaultPrimary: "Take it one step at a time.",
    guideDefaultSecondary: 'Listen, repeat, and use it. Keep that flow going.',
    lessonHeadingTemplate: 'Talk with {scene} in {language}',
    timelineListenRepeat: 'Listen / Repeat',
    timelineListen: 'Listen',
    timelineRepeat: 'Repeat',
    timelineAiQuestion: 'AI Question',
    timelineTyping: 'Typing',
    timelineAiConversation: 'Talk with AI',
    aiConversationPrompt: 'Please talk with the AI.',
    listenAction: 'Connect image and sound',
    repeatAction: 'Speak into the mic',
    aiQuestionAction: 'Listen and choose',
    aiQPlayButton: 'Listen to the question',
    aiQReplayButton: 'Listen again',
    aiQInstruction: 'What is the question asking about?',
    aiQChoiceAction: 'Asking about an action',
    aiQChoiceTime: 'Asking about time',
    aiQChoiceFood: 'Asking about food/meals',
    aiQChoicePerson: 'Asking about a person',
    aiQChoiceFeeling: 'Asking about feelings',
    aiQChoicePlace: 'Asking about a place',
    aiQChoiceUnsure: 'Not sure yet',
    aiQHint: "Just try to catch what the question is about. That's enough for now. Try listening again.",
    aiQCorrect: 'Correct!',
    aiQIncorrect: 'Close! But trying to listen is what matters.',
    aiQSpeakPrompt: 'Now you know what was asked — try answering briefly in English',
    aiQRecordButton: 'Record your answer',
    aiQStopButton: 'Stop recording',
    aiQSpokenFeedback: 'You spoke! That alone is great progress.',
    aiQIntentPool: {
      action_routine: ['Asking what you usually do', 'Asking about your daily routine'],
      action_clean: ['Asking about cleaning up', 'Asking about your cleaning routine'],
      action_cook: ['Asking if you cook', 'Asking about preparing food'],
      action_go: ['Asking if you go somewhere', 'Asking about your plans to go out'],
      action_generic: ['Asking what you do', 'Asking about your daily actions'],
      time: ['Asking when you do it', 'Asking about the timing'],
      food: ['Asking about food or meals', 'Asking what you eat'],
      person: ['Asking who you are with', 'Asking about another person'],
      feeling: ['Asking how you feel about it', 'Asking about your feelings'],
      place: ['Asking where you do it', 'Asking about the location'],
      greeting: ['Saying hello', 'Asking how you are'],
    },
    typingAction: 'Type the sentence',
    aiConversationAction: 'Talk with AI',
    stageScaffoldLabel: 'Scaffold transition',
    scaffoldAction: 'Bridge meaning into English',
    scaffoldPrimary: 'Learn phrases as chunks through sound.',
    scaffoldSecondary: 'You will get used to English little by little.',
    questionLabel: 'Question',
    blockProgressLabel: "Today's questions",
    questionProgressLabel: 'You are now working on question {current}.',
    listenInstruction: 'Listen a few times and connect the image with the sound.',
    listenStartRepeatInstruction: 'As you listen, try to imagine how it would sound when you say it.\nWhen ready, go to repeat.',
    listenPlayButton: '▶ Play',
    listenStopButton: '■ Stop',
    listenRecordingButton: 'Next',
    listenPlayingLabel: 'Audio is playing',
    listenAudioNotReady: 'Audio file is not ready yet',
    repeatSpeakInstruction: 'Repeat and record the sentence you heard in STEP 1.',
    repeatRetryAudioButton: 'Back to listen',
    repeatRecordingButton: 'Start recording',
    repeatRecordAgainButton: 'Record again',
    repeatScorePrompt: 'Press the score button after the audio finishes.',
    repeatAfterRecordingInstruction: 'Recording complete. Press the score button.',
    repeatStopRecordingButton: '■ Stop recording',
    repeatPlayRecordedButton: '🔊 Play your recording',
    compareAudioButton: 'Compare audio',
    comparingAudioLabel: 'Comparing…',
    repeatScoreButton: 'Score it',
    repeatScoringLabel: 'Scoring...',
    repeatBrowserUnsupported: 'This browser does not support recording. Please use a Chromium-based browser.',
    repeatRecordedReady: 'Press the score button after recording.',
    repeatRecognitionResultLabel: 'Recognition result',
    repeatYourSpeechLabel: 'Your speech',
    repeatExpectedSpeechLabel: 'Expected sentence',
    repeatPassedLabel: '✔ Passed: you can move on',
    repeatRetryLabel: 'Please check the audio once more',
    repeatNextQuestionButton: 'Next question',
    repeatAttemptCountLabel: 'Attempts: {current} / {max}',
    repeatAttemptLimitReachedLabel: "You have tried 3 times, so let's move on",
    repeatScoreExcellent: 'Great job!',
    repeatScoreGood: 'Getting there!',
    repeatScoreExcellentSub: "Let's go to the listening challenge.",
    repeatScoreGoodSub: 'Almost perfect — try listening and repeating once more.',
    repeatAttemptSuffix: '',
    repeatScoreSuffix: '',
    repeatAttemptLimitEncouragement: "It's okay! You'll get it naturally with more listening.",
    repeatAttemptLimitAdvance: 'Move on',
    repeatTipPerfect: 'Great rhythm. Keep it up!',
    repeatTipCompleteness: 'Try to say the whole sentence to the end.',
    repeatTipCompletenessMissing: 'Focus on saying "{word}" and finish the full sentence.',
    repeatTipWordMatch: 'Listen again and check the sound differences.',
    repeatTipWordMatchMissing: 'Pay attention to the sound of "{word}".',
    repeatTipClarity: 'Try speaking a little more slowly.',
    repeatTipRhythm: 'Try to pronounce the endings more clearly.',
    repeatTipGenericLow: 'Listen once more and try imitating again.',
    repeatTipGenericGood: 'Looking good! It gets more natural with practice.',
    aiConvYouLabel: 'You',
    aiConvThinking: 'AI is preparing a reply',
    aiConvRetryButton: 'Try again',
    aiConvAdvanceButton: 'Next',
    aiConvExamplePrefix: '💬 e.g.',
    aiQuestionPlaying: 'Playing…',
    aiQuestionRetryPlay: 'Listen again',
    aiQuestionShowExample: 'Show example answer',
    aiQuestionExampleLabel: 'Example',
    aiQuestionAudioError: 'Could not play audio. Please try again.',
    scaffoldAudioPreparing: 'Preparing audio...',
    scaffoldPlayButton: '▶ Play',
    audioPreparing: 'Preparing audio…',
    scaffoldStepLabel: 'Step {current} / {total}',
    scaffoldPlayingLabel: 'Playing audio {current} / {total}...',
    scaffoldAutoPlayDoneLabel: 'All 3 audio clips finished',
    scaffoldRestartButton: 'Listen from the beginning',
    scaffoldNextButton: 'Next',
    scaffoldBackToListenButton: 'Back to repeat',
    backToOverview: '← Back to lesson overview',
    backToRepeat: 'Back to repeat',
    backToScaffold: 'Back to image understanding',
    backToAiQuestion: 'Back to AI question',
    backToTyping: 'Back to AI conversation',
    backToConversation: 'Back to AI conversation',
    rationaleToggle: "It's OK if you don't understand right now! Here's why →",
    rationaleTitle: "Why it's OK not to understand right now",
    rationaleBody1: '',
    rationaleBody2: 'Meaning connects gradually through repeated exposure in similar situations.',
    rationaleBody3: "At first it's just sound, but over time you'll start recognizing patterns — \"this sounds like a greeting\" or \"people say this in this kind of moment.\" You don't need a perfect translation.",
    rationaleProgression: '1st time: Not sure what it means\n5th time: I notice this sound keeps appearing\n10th time: Feels like a greeting\n20th time: I know when to use this',
    rationaleClose: 'Close',
    predictPrompt: 'What do you think the other person will say?',
    predictGreeting: 'Greeting',
    predictQuestion: 'Question',
    predictRequest: 'Request',
    predictThanks: 'Thanks',
    meaningGuessPrompt: 'What kind of meaning did you hear?',
    meaningGuessGreeting: 'A greeting',
    meaningGuessQuestion: 'Asking something',
    meaningGuessRequest: 'Requesting something',
    meaningGuessFeeling: 'Expressing a feeling',
    meaningGuessUnsure: 'Not sure yet',
    meaningGuessUnsureHint: "That's totally fine. You'll start to feel the meaning after hearing it in similar situations a few more times.",
    confirmMeaningLabel: 'About this expression',
    ctaAdvanceTemplate: 'Next',
    ctaViewResults: 'View lesson results',
    scaffoldInstruction: 'The audio plays 3 times: first in English, second with important parts in English and your language, and third in English again.',
    scaffoldMeaningLabel: 'Meaning',
    aiQuestionInputGuide: 'Try answering in English.',
    aiQuestionPlayButton: 'Play question',
    aiQuestionLabel: 'AI Question',
    conversationFlowLabel: 'Conversation flow',
    aiQuestionFirstTurnRewrite: 'Think about the sentence you practiced. Can you say the sentence with \'{to}\' instead of \'{from}\'?',
    aiQuestionFirstTurnRewriteBeginner: 'Say it with \'{to}\'.',
    aiQuestionFirstTurnRewriteIntermediate: 'Can you say it with \'{to}\'?',
    aiQuestionFirstTurnRepeat: 'Try saying the sentence you practiced one more time.',
    aiQuestionPartial: 'Almost! You\'re close.',
    aiQuestionGoalLabel: 'Say this:',
    aiQuestionGoalUse: 'Use:',
    hintEncouragementCollapsed: 'You can check the hint if you need it.',
    hintEncouragementHidden: "You're getting close to intermediate. Try without the hint first.",
    hintEncouragementOptional: "Looking good! Try it on your own first.",
    hintShowButton: 'Show hint',
    unclearToken: '[unclear]',
    aiQuestionR2PersonWho: 'Nice. Who did you talk with?',
    aiQuestionR2PersonConfirm: 'I see. Was it {person}?',
    aiQuestionR2TimeWhen: 'Nice. When was that?',
    aiQuestionR2TimeConfirm: 'I see. Did you do it {time}?',
    aiQuestionR2Generic: 'Great. Can you say that again as a full sentence?',
    aiQuestionR3FullSentence: 'Nice! Can you say the whole sentence one more time?',
    aiQuestionR3FullSentencePerson: 'Nice! Can you say the whole sentence with \'{person}\' one more time?',
    aiQuestionR3FullSentenceTime: 'Nice! Can you say the whole sentence for \'{time}\' one more time?',
    aiQuestionR3FullSentenceBoth: 'Nice! Can you say the whole sentence with \'{person}\' for \'{time}\' one more time?',
    aiQuestionR3WhatElse: 'What else happened?',
    aiQuestionR3Generic: 'Can you say a little more?',
    aiQuestionInstruction: 'Listen and answer using what you learned.',
    aiQuestionRecordButton: 'Record your answer',
    aiQuestionStopButton: '■ Stop recording',
    aiQuestionRecognizing: 'Recognizing...',
    aiQuestionYourAnswer: 'Your answer',
    aiQuestionNextQuestion: 'Next question',
    aiQuestionNextStage: 'Go to typing',
    aiQuestionRoundLabel: 'Question {current} / {total}',
    aiQuestionGood: 'Nice! That totally makes sense.',
    aiQuestionClose: 'That works! Natives often say it like this:',
    aiQuestionRetry: 'Try answering the question. Listen again and give it another go.',
    aiQuestionSilent: "I didn't quite hear you. Give it another try!",
    aiQuestionBetterWay: 'Common way to say it: ',
    aiQuestionFollowUp: 'Can you tell me more about that?',
    aiQuestionFinalRound: 'Last one — say the full sentence.',
    aiQuestionRetryTurn: 'Try again',
    aiQuestionRetryAll: 'Try again from the start',
    typingCheckButton: 'Check',
    typingEmptyGuidance: 'Try typing it first',
    typingPlayButton: 'Play audio',
    typingNextButton: 'Next step',
    aiConversationStartButton: '💬 Start conversation',
    aiConvGreeting: 'Let\'s start a conversation',
    aiConvTopic: 'Let\'s talk about the lesson',
    aiConvImpression: 'How was today\'s lesson?',
    aiConvGoodbye: 'End conversation',
    aiConvFeedbackTitle: 'AI Feedback',
    aiConvAdviceTitle: 'Tips for improvement',
    aiConvRecordButton: 'Speak',
    aiConvShowHint: 'Show hint',
    aiConvStopButton: '■ Stop',
    aiConvRecognizing: 'Recognizing...',
    aiConvYourReply: 'Your reply',
    aiConvNextTurn: 'Next',
    aiConvRetryAll: 'Try again',
    paywallTitle: 'Nice work!',
    paywallSubtitle: '',
    paywallValue: 'Keep practicing daily and you\'ll speak naturally.',
    paywallCtaPrimary: 'Start free trial',
    paywallCtaSecondary: 'Continue free (limited)',
    paywallFreeLimit: 'Free plan: up to 3 problems per day.',
    aiConvSpeaking: 'Speaking…',
    aiConvYourTurn: 'Your turn',
    aiConvShowFlow: 'See the conversation flow',
    aiConvNextProblem: 'Go to challenge',
    aiConvFinishLesson: 'Finish lesson',
    repeatSuccessGood: 'Nice! That sounded natural.',
    repeatSuccessOk: 'Good job. That was easy to understand.',
    repeatImproved: 'Nice! That was better than before.',
    repeatStable: 'That was consistent. Nice.',
    repeatSlightDrop: 'Almost there. Try once more.',
    repeatWeaknessMissing: "Don't forget \"{word}\".",
    repeatWeaknessSound: 'Listen to \"{word}\" again.',
    aiQuestionSuccess: 'Nice! That works in real conversation.',
    typingSuccess: 'Nice! You remembered it.',
    aiConversationSuccess: 'That sounds natural in real conversation.',
    lessonSentenceCompleted: '',
    soundGameTitle: 'Challenge',
    soundGameCorrect: 'Nice!',
    soundGameIncorrect: 'Almost. Listen again.',
    soundGameComplete: 'All clear!',
    quickResponseTitle: 'Repeat Challenge',
    quickResponseListen: 'Listen and repeat instantly',
    quickResponseCorrect: 'Nice!',
    quickResponseTryAgain: 'Try again!',
    quickResponseComplete: 'All clear!',
    recallTitle: 'Say It in English Challenge',
    recallPrompt: 'Look at the Japanese and say it in English',
    recallCorrect: 'Nice!',
    recallTryAgain: 'Try again!',
    recallComplete: 'All clear!',
    miniReviewNice: 'You can use this in real conversation.',
    miniReviewAlmost: 'Listen once more.',
    miniReviewWho: 'Who?',
    miniReviewWhen: 'When?',
    miniReviewWhichChanges: 'Which part changes?',
    miniReviewSayWith: 'Say it with {value}.',
    miniReviewSayFor: 'Say it for {value}.',
    miniReviewRecallPrompt: 'Which sentence did you just practice?',
    miniReviewWhichSentence: 'Which one is correct?',
    miniReviewValidationCta: 'Listening challenge',
    miniReviewRetryChallenge: 'Try again',
    challengeTitle: 'Challenge',
    challengeDescription: 'Listen to the audio and choose the correct sentence.',
    challengeStart: 'Start',
    challengeAudioPlaying: 'Playing audio',
    challengeCorrect: '○ Correct!',
    challengeIncorrect: '× Listen once more.',
    miniReviewTransferPick: 'What about {value}?',
    miniReviewTenseTransfer: 'What if it were {value}?',
    miniReviewSubjectTransfer: 'What if {value} said it?',
    miniReviewListenFirst: 'Listen, then choose.',
    miniReviewListenAgain: 'Listen again',
    miniReviewSpeakNow: 'Say it now.',
    miniReviewSpeechDetected: 'I heard you!',
    miniReviewNoSpeech: 'Try speaking again.',
    lessonChecking: 'Checking that now...',
    lessonPreparingNext: 'Preparing the next step...',
    repeatClarityLabel: 'Clarity',
    repeatWordMatchLabel: 'Word match',
    repeatRhythmLabel: 'Rhythm / chunking',
    repeatCompletenessLabel: 'Completeness',
    
    repeatStopError: 'Failed to stop recording. Please try again.',
    repeatEmptyRecordingError: 'No recording data found.',
    repeatNoRecordingForScore: 'No audio detected. Please record before scoring.',
    repeatMicError: 'Failed to access microphone.',
    repeatPlaybackError: 'Failed to play audio.',
    repeatScoreError: 'Failed to score your speech.',
    audioLoading: 'Loading audio...',
    audioRetry: 'Tap to retry',
    audioUnavailable: 'Audio unavailable',
  },
  overviewCard: {
    headerBadge: "Today's Lesson",
    title: "Today's Practical English Lesson",
    learningLanguage: 'Learning language',
    sceneLabel: "Today's conversation scene",
    defaultSceneLabel: 'Short daily interaction',
    defaultSceneDescription: 'Today you will practice listening, speaking, typing, and using the expression in conversation.',
    levelLabel: 'Level',
    newPhraseLabel: 'New word / phrase',
    lessonStartLabel: 'Lesson start',
    lessonStartTitle: "We will take today's expression to a level where you can actually use it.",
    lessonStartDescription:
      'You will build it step by step through listening, repeating, answering the AI, typing, and conversation.',
    startButton: 'Start lesson',
    stageListenRepeatDesc: 'Listen and repeat the sound out loud.',
    stageScaffoldTitle: 'Image understanding',
    stageScaffoldDesc: 'Grasp the meaning using images and audio.',
    stageAiQuestionDesc: 'Answer using what you learned, by voice.',
    stageTypingDesc: 'Type it out to lock in spelling and word order.',
    stageAiConversationDesc: 'Practice real conversation using today\'s expressions.',
    stageSectionTitle: 'Lesson structure',
    guideText: "We will guide you through today's lesson",
    guideEncouragement: "Let's do it together today!",
    lessonTimeLabel: 'Estimated time',
    practiceSummary:
      "You will not stop at listening. You will speak, type, and finish by using today's English in conversation with the AI.",
    focusTip: 'Focus on speaking short phrases naturally in this lesson',
    featureSpeakTitle: 'Practice out loud',
    featureSpeakDescription: 'First listen, repeat, and get used to natural phrasing.',
    featureAnswerTitle: 'Answer questions',
    featureAnswerDescription: 'Use the expression immediately and get comfortable with short responses.',
    featureConversationTitle: 'Use it in conversation',
    featureConversationDescription: "Finish by practicing today's English in an AI conversation.",
    titleTemplate: '{lang} Lesson — Speaking in {region}',
    pillLanguage: 'Language',
    pillLevel: 'Level',
    pillRegion: 'Region',
    pillGoal: 'Goal',
    pillAge: 'Age group',
    questionCountLabel: 'Questions today',
    questionCountValue: '{n}',
    skillEstimateTitle: 'Skill estimate',
    skillEstimateNote: 'Based on your recent lesson results',
    skillConversation: 'Conversation',
    skillListening: 'Listening',
    skillSpeaking: 'Speaking',
    skillWriting: 'Writing',
    lessonFlowTitle: "Today's flow",
    lessonFlowSubtitle: 'Listen → Repeat → Understand → Comprehend → Converse → Challenge',
    flowStep1Label: 'Listen',
    flowStep1Sub: 'Visualize the situation',
    flowStep2Label: 'Repeat',
    flowStep2Sub: 'Mimic sounds and rhythm',
    flowStep3Label: 'Chunk',
    flowStep3Sub: 'Understand phrases in chunks',
    flowStep4Label: 'Respond',
    flowStep4Sub: 'Respond to AI prompts',
    flowStep5Label: 'Reinforce',
    flowStep5Sub: 'Write to reinforce memory',
    flowStep6Label: 'Use',
    flowStep6Sub: 'Use it in conversation',
    reviewCountSubtitle: "Today's review has {count} questions",
  },
  dailyFlow: {
    badge: 'Daily Flow',
    title: 'Plan Your English Day',
    instruction: 'Pick one action for each time block, or tap "Auto-select & start" to begin right away',
    startButton: 'Start Lesson',
    pickProgress: 'Pick your actions',
    skipButton: 'Auto-select & start',
    selectedActionsTitle: "Today's actions",
  },
} as const satisfies LessonCopy

const COPY_MAP = {
  ja: LESSON_COPY_JA,
  en: LESSON_COPY_EN,
} as const

type SupportedLang = keyof typeof COPY_MAP

export function getLessonCopy(uiLanguageCode?: string | null): LessonCopy {
  const normalized = (uiLanguageCode ?? 'ja').toLowerCase()

  const lang = Object.keys(COPY_MAP).find(l =>
    normalized.startsWith(l)
  ) as SupportedLang | undefined

  return COPY_MAP[lang ?? 'ja']
}

// ── Emma Hints ──────────────────────────────────────────────
// Level-aware, stage-specific guidance from Emma.
// Short, warm, supportive. Reflects NativeFlow learning philosophy:
// scene/image first → sound-to-meaning → chunk understanding → speaking readiness.

export type EmmaHintStage = 'listen' | 'repeat' | 'scaffold' | 'aiQuestion' | 'typing'
export type EmmaHintLevel = 'beginner' | 'intermediate' | 'advanced'

export type EmmaHintSet = Record<EmmaHintStage, string>
export type EmmaHintsByLevel = Record<EmmaHintLevel, EmmaHintSet>
export type EmmaHintsByLang = Record<string, EmmaHintsByLevel>

export const EMMA_HINTS: EmmaHintsByLang = {
  ja: {
    beginner: {
      listen: 'まずは場面と音をつなげよう。文字は気にしなくてOK',
      repeat: '完璧じゃなくて大丈夫。意味を浮かべながら声に出そう',
      scaffold: 'かたまりで音と意味をつなげてみよう',
      aiQuestion: '短くていいよ。思いついた言葉で答えてみよう',
      typing: '聞こえた通りに書いてみよう。スペルは気にしすぎないで',
    },
    intermediate: {
      listen: '場面を思い浮かべながら、フレーズのまとまりを聞き取ろう',
      repeat: 'かたまりで真似してみよう。一語ずつじゃなくて大丈夫',
      scaffold: 'かたまりでつかむと、会話でそのまま使いやすいよ',
      aiQuestion: '習った表現を使って、自然に返してみよう',
      typing: 'フレーズのまとまりを意識して書いてみよう',
    },
    advanced: {
      listen: '会話全体の流れと、話し手の気持ちをつかもう',
      repeat: 'リズムとイントネーションも意識して再現してみよう',
      scaffold: '場面の中で、表現がどう使われているか感じてみよう',
      aiQuestion: '自然な流れで返せるかを意識してみよう',
      typing: '自分の言葉で書き直せるくらい、表現を自分のものにしよう',
    },
  },
  en: {
    beginner: {
      listen: 'Start with the scene and the sound, not the text.',
      repeat: "You don't need to be perfect. Picture the meaning and say it.",
      scaffold: 'Connect the chunks to the sounds you heard.',
      aiQuestion: 'A short answer is fine. Just try.',
      typing: "Write what you heard. Don't worry about spelling.",
    },
    intermediate: {
      listen: 'Picture the scene and catch the phrases as chunks.',
      repeat: 'Try to repeat in chunks, not word by word.',
      scaffold: 'Chunks are easier to reuse in real conversation.',
      aiQuestion: 'Use what you learned. Aim for a natural response.',
      typing: 'Write in phrase chunks, not individual words.',
    },
    advanced: {
      listen: 'Catch the flow and the speaker\'s intent.',
      repeat: 'Match the rhythm and intonation, not just the words.',
      scaffold: 'Feel how the expression works inside the scene.',
      aiQuestion: 'Aim for a natural response, not just a correct one.',
      typing: 'Make the expression yours. Rephrase if you can.',
    },
  },
}

/**
 * Returns Emma hint text for a given stage, level, and UI language.
 * Falls back to Japanese if the language is not supported.
 */
export function getEmmaHint(
  stage: EmmaHintStage,
  level: EmmaHintLevel,
  uiLanguageCode?: string | null
): string {
  const lang = (uiLanguageCode ?? 'ja').toLowerCase()
  const langHints = EMMA_HINTS[lang] ?? EMMA_HINTS['ja']
  const levelHints = langHints[level] ?? langHints['beginner']
  return levelHints[stage] ?? ''
}