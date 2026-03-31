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
    stageAiQuestionLabel: string
    stageTypingLabel: string
    stageAiConversationLabel: string
    stageDefaultLabel: string
    guideAlexTitle: string
    guideEmmaTitle: string
    guideDefaultTitle: string
    listenAction: string
    repeatAction: string
    aiQuestionAction: string
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
    aiConversationSecondary: string
    guideDefaultPrimary: string
    guideDefaultSecondary: string
    lessonHeadingTemplate: string
    timelineListenRepeat: string
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
    repeatStopRecordingButton: string
    repeatPlayRecordedButton: string
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
    scaffoldStepLabel: string
    scaffoldPlayingLabel: string
    scaffoldAutoPlayDoneLabel: string
    scaffoldRestartButton: string
    scaffoldNextButton: string
    scaffoldInstruction: string
    aiQuestionInputGuide: string
    aiQuestionPlayButton: string
    aiQuestionInstruction: string
    aiQuestionRecordButton: string
    aiQuestionStopButton: string
    aiQuestionRecognizing: string
    aiQuestionYourAnswer: string
    aiQuestionNextQuestion: string
    aiQuestionRoundLabel: string
    aiQuestionGood: string
    aiQuestionClose: string
    aiQuestionRetry: string
    aiQuestionSilent: string
    aiQuestionBetterWay: string
    aiQuestionFollowUp: string
    aiQuestionFinalRound: string
    aiQuestionRetryAll: string
    typingCheckButton: string
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
    aiConvStopButton: string
    aiConvRecognizing: string
    aiConvYourReply: string
    aiConvNextTurn: string
    aiConvRetryAll: string
    aiConvFinishLesson: string

    repeatClarityLabel: string
    repeatWordMatchLabel: string
    repeatRhythmLabel: string
    repeatCompletenessLabel: string

    repeatStopError: string
    repeatEmptyRecordingError: string
    repeatMicError: string
    repeatPlaybackError: string
    repeatScoreError: string
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
    featureSpeakTitle: string
    featureSpeakDescription: string
    featureAnswerTitle: string
    featureAnswerDescription: string
    featureConversationTitle: string
    featureConversationDescription: string
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
    stageAiQuestionLabel: 'AIからの質問',
    stageTypingLabel: '書き取り',
    stageAiConversationLabel: 'AIと会話',
    stageDefaultLabel: 'レッスン',
    guideAlexTitle: 'Alexのヒント',
    guideEmmaTitle: 'Emmaのヒント',
    guideDefaultTitle: 'ガイド',
    listenPrimary: 'まずは文字を見ずに、聞こえた音だけに集中してみよう',
    listenSecondary: '音をそのまま耳から口へ流すイメージで進めるのがコツだよ',
    repeatPrimary: '完璧じゃなくて大丈夫。聞こえた音をそのままマネしてみよう',
    repeatSecondary: '文字ではなく、音のリズムと区切りを意識すると話しやすいよ',
    aiQuestionPrimary: '短くても大丈夫。まずは英語で返してみよう',
    aiQuestionSecondary: '正確さより、まず口から出すことを優先しようね',
    typingCorrectPrimary: 'いい感じ。このまま英語の形をしっかり定着させよう',
    typingIncorrectPrimary: 'おしい。音とつづりのつながりを意識してもう一度見てみよう',
    typingNeutralPrimary: '聞こえた英語を思い出しながら、落ち着いて入力してみよう',
    typingSecondary: '耳で覚えた音を文字に変えることで、記憶がかなり強くなるよ',
    aiConversationPrimary: 'ここは自由に話してOK。今日の表現を1つでも使えたら十分だよ',
    aiConversationSecondary: 'うまく話すより、実際に使うことが一番大切だよ',
    guideDefaultPrimary: '落ち着いて、ひとつずつ進めていこう',
    guideDefaultSecondary: '音を聞いて、マネして、使う。この流れを大切にしよう',
    lessonHeadingTemplate: '{scene}の{language}',
    timelineListenRepeat: '聞く・リピート',
    timelineAiQuestion: 'AIからの質問',
    timelineTyping: 'タイピング',
    timelineAiConversation: 'AIとの会話',
    aiConversationPrompt: 'AIと会話してください',
    listenAction: '音声を聞く',
    repeatAction: 'マイクで話す',
    aiQuestionAction: '質問に答える',
    typingAction: '英文を入力する',
    aiConversationAction: 'AIと会話する',
    stageScaffoldLabel: 'イメージ理解',
    scaffoldAction: '意味をイメージする',
    scaffoldPrimary: '日本語から英語への流れを意識しましょう',
    scaffoldSecondary: '少しずつ英語に慣れていきます',
    questionLabel: '問題',
    blockProgressLabel: '今日の問題数',
    questionProgressLabel: '今はステップ {current} に取り組んでいます',
    listenInstruction: '「再生」を押して会話を聞いてみましょう',
    listenStartRepeatInstruction: '聞き取れたら、そのままマネして話してみましょう。\n「録音開始」を押してください。',
    listenPlayButton: '▶ 再生',
    listenStopButton: '■ 停止',
    listenRecordingButton: '🎤 録音開始',
    listenPlayingLabel: '音声再生中です',
    listenAudioNotReady: 'まだ音声ファイルがありません',
    repeatSpeakInstruction: '真似して発音してください',
    repeatRetryAudioButton: '🔄 もう一度音声を確認する',
    repeatRecordingButton: '🎤 録音開始',
    repeatStopRecordingButton: '■ 録音停止',
    repeatPlayRecordedButton: '🔊 自分の音声を再生',
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
    scaffoldStepLabel: 'Step {current} / {total}',
    scaffoldPlayingLabel: '音声 {current} / {total} を再生中...',
    scaffoldAutoPlayDoneLabel: '3つの音声を聞き終えました',
    scaffoldRestartButton: 'もう一度はじめから聞く',
    scaffoldNextButton: '次のステップへ',
    scaffoldInstruction: '画像と音声だけで意味をつかんでみましょう',
    aiQuestionInputGuide: '英語で答えてみましょう',
    aiQuestionPlayButton: 'AIからの質問を聞く',
    aiQuestionInstruction: '質問を聞いて、学んだ文章で答えてみましょう',
    aiQuestionRecordButton: '🎤 録音して答える',
    aiQuestionStopButton: '■ 録音停止',
    aiQuestionRecognizing: '認識中...',
    aiQuestionYourAnswer: 'あなたの回答',
    aiQuestionNextQuestion: '次の質問へ',
    aiQuestionRoundLabel: '質問 {current} / {total}',
    aiQuestionGood: 'いいですね！ちゃんと伝わっています。',
    aiQuestionClose: 'OK！伝わっています。ネイティブはこう言うことが多いですよ。',
    aiQuestionRetry: '',
    aiQuestionSilent: '音声が聞き取れませんでした。もう一度話してみましょう。',
    aiQuestionBetterWay: 'よく使われる言い方: ',
    aiQuestionFollowUp: 'もう少し詳しく教えてください。',
    aiQuestionFinalRound: '最後に、文章全体を言ってみましょう。',
    aiQuestionRetryAll: 'もう一度やってみる',
    typingCheckButton: 'チェック',
    typingPlayButton: '音声を再生',
    typingNextButton: '次へ進む',
    aiConversationStartButton: '💬 会話開始',
    aiConvGreeting: '会話を始めましょう',
    aiConvTopic: 'レッスンの内容について話しましょう',
    aiConvImpression: '今日のレッスンはどうでしたか？',
    aiConvGoodbye: '会話終了',
    aiConvFeedbackTitle: 'AIからのフィードバック',
    aiConvAdviceTitle: 'もっと良くなるためのアドバイス',
    aiConvRecordButton: '🎤 話してみる',
    aiConvStopButton: '■ 録音停止',
    aiConvRecognizing: '認識中...',
    aiConvYourReply: 'あなたの返答',
    aiConvNextTurn: '次の会話へ',
    aiConvRetryAll: 'もう一度会話する',
    aiConvFinishLesson: 'レッスンを終了する',
    repeatClarityLabel: '発音明瞭性',
    repeatWordMatchLabel: '語の一致率',
    repeatRhythmLabel: 'リズム/区切り',
    repeatCompletenessLabel: '語の抜け漏れ',

    repeatStopError: '録音停止に失敗しました。もう一度お試しください。',
    repeatEmptyRecordingError: '録音データがありません。',
    repeatMicError: 'マイクへのアクセスに失敗しました。',
    repeatPlaybackError: '音声の再生に失敗しました。',
    repeatScoreError: '採点に失敗しました。',
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
    startButton: 'レッスンを開始する',
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
    featureSpeakTitle: '声に出して練習',
    featureSpeakDescription: 'まずは聞いて、真似して、自然な言い方をつかみます。',
    featureAnswerTitle: '質問に答える練習',
    featureAnswerDescription: '習った表現をその場で使い、短い返答に慣れていきます。',
    featureConversationTitle: '会話で使って定着',
    featureConversationDescription: '最後はAIとのやり取りで、今日の英語を実践します。',
    guideEncouragement: '今日も一緒にやってみよう！'
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
    stageAiQuestionLabel: 'AI question',
    stageTypingLabel: 'Typing',
    stageAiConversationLabel: 'Talk with AI',
    stageDefaultLabel: 'Lesson',
    guideAlexTitle: "Alex's tip",
    guideEmmaTitle: "Emma's tip",
    guideDefaultTitle: 'Guide',
    listenPrimary: 'First, focus only on the sounds without looking at the text.',
    listenSecondary: 'It helps to let the sound flow directly from your ears to your mouth.',
    repeatPrimary: "It doesn't have to be perfect. Try copying the sound as you hear it.",
    repeatSecondary: 'Focus on rhythm and chunking rather than spelling.',
    aiQuestionPrimary: 'A short answer is fine. Just try answering in English first.',
    aiQuestionSecondary: 'Getting the words out matters more than being perfect.',
    typingCorrectPrimary: "Nice. Let's make that English pattern stick.",
    typingIncorrectPrimary: 'Close. Check the connection between sound and spelling one more time.',
    typingNeutralPrimary: 'Recall the English you heard and type it calmly.',
    typingSecondary: 'Turning sound into text makes the memory much stronger.',
    aiConversationPrimary: "You can speak freely here. Using even one phrase from today is enough.",
    aiConversationSecondary: 'What matters most is actually using it.',
    guideDefaultPrimary: "Take it one step at a time.",
    guideDefaultSecondary: 'Listen, repeat, and use it. Keep that flow going.',
    lessonHeadingTemplate: '{language} for {scene}',
    timelineListenRepeat: 'Listen / Repeat',
    timelineAiQuestion: 'AI Question',
    timelineTyping: 'Typing',
    timelineAiConversation: 'Talk with AI',
    aiConversationPrompt: 'Please talk with the AI.',
    listenAction: 'Listen to the audio',
    repeatAction: 'Speak into the mic',
    aiQuestionAction: 'Answer the question',
    typingAction: 'Type the sentence',
    aiConversationAction: 'Talk with AI',
    stageScaffoldLabel: 'Scaffold transition',
    scaffoldAction: 'Bridge meaning into English',
    scaffoldPrimary: 'Imagine the flow from your native language into English.',
    scaffoldSecondary: 'You will get used to English little by little.',
    questionLabel: 'Question',
    blockProgressLabel: "Today's questions",
    questionProgressLabel: 'You are now working on question {current}.',
    listenInstruction: 'Press play and listen to the conversation.',
    listenStartRepeatInstruction: 'Once you catch it, try saying it aloud.\nPress start recording.',
    listenPlayButton: '▶ Play',
    listenStopButton: '■ Stop',
    listenRecordingButton: '🎤 Start recording',
    listenPlayingLabel: 'Audio is playing',
    listenAudioNotReady: 'Audio file is not ready yet',
    repeatSpeakInstruction: 'Try pronouncing it by copying the sound.',
    repeatRetryAudioButton: '🔄 Listen again',
    repeatRecordingButton: '🎤 Start recording',
    repeatStopRecordingButton: '■ Stop recording',
    repeatPlayRecordedButton: '🔊 Play your recording',
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
    repeatAttemptLimitReachedLabel: 'You have tried 3 times, so let’s move on',
    scaffoldStepLabel: 'Step {current} / {total}',
    scaffoldPlayingLabel: 'Playing audio {current} / {total}...',
    scaffoldAutoPlayDoneLabel: 'All 3 audio clips finished',
    scaffoldRestartButton: 'Listen from the beginning',
    scaffoldNextButton: 'Next step',
    scaffoldInstruction: 'Try to grasp the meaning from image and audio alone.',
    aiQuestionInputGuide: 'Try answering in English.',
    aiQuestionPlayButton: 'Listen to AI question',
    aiQuestionInstruction: 'Listen and answer using what you learned.',
    aiQuestionRecordButton: '🎤 Record your answer',
    aiQuestionStopButton: '■ Stop recording',
    aiQuestionRecognizing: 'Recognizing...',
    aiQuestionYourAnswer: 'Your answer',
    aiQuestionNextQuestion: 'Next question',
    aiQuestionRoundLabel: 'Question {current} / {total}',
    aiQuestionGood: 'Nice! That totally makes sense.',
    aiQuestionClose: 'That works! Natives often say it like this:',
    aiQuestionRetry: '',
    aiQuestionSilent: 'Could not catch that. Try speaking again.',
    aiQuestionBetterWay: 'Common way to say it: ',
    aiQuestionFollowUp: 'Can you tell me more about that?',
    aiQuestionFinalRound: 'Last one — say the full sentence.',
    aiQuestionRetryAll: 'Try again from the start',
    typingCheckButton: 'Check',
    typingPlayButton: 'Play audio',
    typingNextButton: 'Next step',
    aiConversationStartButton: '💬 Start conversation',
    aiConvGreeting: 'Let\'s start a conversation',
    aiConvTopic: 'Let\'s talk about the lesson',
    aiConvImpression: 'How was today\'s lesson?',
    aiConvGoodbye: 'End conversation',
    aiConvFeedbackTitle: 'AI Feedback',
    aiConvAdviceTitle: 'Tips for improvement',
    aiConvRecordButton: '🎤 Speak',
    aiConvStopButton: '■ Stop',
    aiConvRecognizing: 'Recognizing...',
    aiConvYourReply: 'Your reply',
    aiConvNextTurn: 'Next',
    aiConvRetryAll: 'Try again',
    aiConvFinishLesson: 'Finish lesson',
    repeatClarityLabel: 'Clarity',
    repeatWordMatchLabel: 'Word match',
    repeatRhythmLabel: 'Rhythm / chunking',
    repeatCompletenessLabel: 'Completeness',
    
    repeatStopError: 'Failed to stop recording. Please try again.',
    repeatEmptyRecordingError: 'No recording data found.',
    repeatMicError: 'Failed to access microphone.',
    repeatPlaybackError: 'Failed to play audio.',
    repeatScoreError: 'Failed to score your speech.',
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
    lessonStartTitle: 'We will take today’s expression to a level where you can actually use it.',
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
    guideText: 'We will guide you through today’s lesson',
    guideEncouragement: "Let's do it together today!",
    lessonTimeLabel: 'Estimated time',
    practiceSummary:
      'You will not stop at listening. You will speak, type, and finish by using today’s English in conversation with the AI.',
    featureSpeakTitle: 'Practice out loud',
    featureSpeakDescription: 'First listen, repeat, and get used to natural phrasing.',
    featureAnswerTitle: 'Answer questions',
    featureAnswerDescription: 'Use the expression immediately and get comfortable with short responses.',
    featureConversationTitle: 'Use it in conversation',
    featureConversationDescription: 'Finish by practicing today’s English in an AI conversation.',
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