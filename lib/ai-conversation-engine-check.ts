import type { StepPromptBuildResult } from './lesson-step-prompt-builder'
import {
  trimOrNull,
  normalizeComparableText,
  buildAIConversationPromptBundle,
  buildAIConversationAssistantReply,
  resolveFeedbackMode,
  evaluateAIConversationTurn,
  buildAIConversationTurnResult,
} from './ai-conversation-engine'

export type AIConversationEngineCheckResult = {
  name: string
  passed: boolean
  details: string
}

export function buildMockStepPromptResult(): StepPromptBuildResult {
  return {
    system: 'SYSTEM PROMPT',
    user: 'USER PROMPT',
    metadata: {
      stepId: 'step-1',
      stepType: 'repeat',
      expectedAnswer: 'Good morning.',
      hint: null,
      aiRole: null,
      patternSlotName: null,
      patternSlotOptions: [],
    },
  }
}

export function checkTrimOrNull(): AIConversationEngineCheckResult {
  const a = trimOrNull('  hello  ') === 'hello'
  const b = trimOrNull('   ') === null
  const c = trimOrNull(null) === null
  const passed = a && b && c
  return {
    name: 'checkTrimOrNull',
    passed,
    details: passed
      ? 'trimOrNull trims and returns null for empty/null'
      : `a=${a}, b=${b}, c=${c}`,
  }
}

export function checkNormalizeComparableText(): AIConversationEngineCheckResult {
  const a = normalizeComparableText('  Hello   WORLD ') === 'hello world'
  const b = normalizeComparableText(null) === ''
  const passed = a && b
  return {
    name: 'checkNormalizeComparableText',
    passed,
    details: passed
      ? 'lowercase, trim, collapse whitespace; null => empty string'
      : `a=${a}, b=${b}`,
  }
}

export function checkBuildAIConversationPromptBundle(): AIConversationEngineCheckResult {
  const mock = buildMockStepPromptResult()
  const bundle = buildAIConversationPromptBundle({
    stepPromptResult: mock,
  })
  const passed =
    bundle.stepType === 'repeat' &&
    bundle.systemPrompt === 'SYSTEM PROMPT' &&
    bundle.userPrompt === 'USER PROMPT' &&
    bundle.metadata.stepId === 'step-1'
  return {
    name: 'checkBuildAIConversationPromptBundle',
    passed,
    details: passed
      ? 'stepType repeat, system/user prompts and metadata match mock'
      : `stepType=${bundle.stepType}, stepId=${bundle.metadata.stepId}`,
  }
}

export function checkBuildAIConversationAssistantReplyDefaults(): AIConversationEngineCheckResult {
  const reply = buildAIConversationAssistantReply({ text: ' Hi ' })
  const passed =
    reply.text === 'Hi' && reply.ssml === null && reply.status === 'ready'
  return {
    name: 'checkBuildAIConversationAssistantReplyDefaults',
    passed,
    details: passed
      ? 'text trimmed to Hi, ssml null, status ready'
      : `text=${reply.text}, ssml=${reply.ssml}, status=${reply.status}`,
  }
}

export function checkResolveFeedbackMode(): AIConversationEngineCheckResult {
  const listen = resolveFeedbackMode({ stepType: 'listen', quality: 'correct' }) === 'hidden'
  const repeat = resolveFeedbackMode({ stepType: 'repeat', quality: 'correct' }) === 'light'
  const free = resolveFeedbackMode({ stepType: 'free_conversation', quality: 'correct' }) === 'full'
  const review = resolveFeedbackMode({ stepType: 'review', quality: 'correct' }) === 'full'
  const passed = listen && repeat && free && review
  return {
    name: 'checkResolveFeedbackMode',
    passed,
    details: passed
      ? 'listen=hidden, repeat=light, free_conversation/review=full'
      : `listen=${listen}, repeat=${repeat}, free=${free}, review=${review}`,
  }
}

export function checkEvaluateListenStep(): AIConversationEngineCheckResult {
  const e = evaluateAIConversationTurn({
    stepType: 'listen',
    learnerUtterance: null,
    expectedAnswer: 'Good morning.',
  })
  const passed =
    e.quality === 'unknown' &&
    e.feedbackMode === 'hidden' &&
    e.shouldRetry === false &&
    e.canProceed === true
  return {
    name: 'checkEvaluateListenStep',
    passed,
    details: passed
      ? 'listen step: unknown, hidden, no retry, canProceed'
      : `quality=${e.quality}, feedbackMode=${e.feedbackMode}, shouldRetry=${e.shouldRetry}, canProceed=${e.canProceed}`,
  }
}

export function checkEvaluateEmptyLearnerUtterance(): AIConversationEngineCheckResult {
  const e = evaluateAIConversationTurn({
    stepType: 'repeat',
    learnerUtterance: '   ',
    expectedAnswer: 'Good morning.',
  })
  const passed =
    e.quality === 'needs_retry' &&
    e.shouldRetry === true &&
    e.canProceed === false &&
    e.correctedAnswer === 'Good morning.'
  return {
    name: 'checkEvaluateEmptyLearnerUtterance',
    passed,
    details: passed
      ? 'empty utterance: needs_retry, shouldRetry, correctedAnswer set'
      : `quality=${e.quality}, shouldRetry=${e.shouldRetry}, canProceed=${e.canProceed}, correctedAnswer=${e.correctedAnswer}`,
  }
}

export function checkEvaluateExactMatch(): AIConversationEngineCheckResult {
  const e = evaluateAIConversationTurn({
    stepType: 'repeat',
    learnerUtterance: 'Good morning.',
    expectedAnswer: 'Good morning.',
  })
  const passed =
    e.quality === 'correct' && e.shouldRetry === false && e.canProceed === true
  return {
    name: 'checkEvaluateExactMatch',
    passed,
    details: passed
      ? 'exact match: correct, no retry, canProceed'
      : `quality=${e.quality}, shouldRetry=${e.shouldRetry}, canProceed=${e.canProceed}`,
  }
}

export function checkEvaluateAcceptableContainsMatch(): AIConversationEngineCheckResult {
  const e = evaluateAIConversationTurn({
    stepType: 'guided',
    learnerUtterance: 'Good morning',
    expectedAnswer: 'Good morning.',
  })
  const passed = e.quality === 'acceptable'
  return {
    name: 'checkEvaluateAcceptableContainsMatch',
    passed,
    details: passed
      ? 'expectedAnswer includes learnerUtterance => acceptable'
      : `quality=${e.quality} (expected acceptable per normalization)`,
  }
}

export function checkEvaluateNoExpectedAnswer(): AIConversationEngineCheckResult {
  const e = evaluateAIConversationTurn({
    stepType: 'free_conversation',
    learnerUtterance: 'I am fine.',
    expectedAnswer: null,
  })
  const passed =
    e.quality === 'acceptable' &&
    e.shouldRetry === false &&
    e.canProceed === true &&
    e.feedbackMode === 'full'
  return {
    name: 'checkEvaluateNoExpectedAnswer',
    passed,
    details: passed
      ? 'no expectedAnswer: acceptable, canProceed, full feedback'
      : `quality=${e.quality}, canProceed=${e.canProceed}, feedbackMode=${e.feedbackMode}`,
  }
}

export function checkBuildAIConversationTurnResultRetry(): AIConversationEngineCheckResult {
  const result = buildAIConversationTurnResult({
    stepPromptResult: buildMockStepPromptResult(),
    assistantText: 'Try again.',
    learnerUtterance: '',
    expectedAnswer: 'Good morning.',
  })
  const passed =
    result.assistantReply.status === 'needs_retry' &&
    result.evaluation.quality === 'needs_retry' &&
    result.promptBundle.stepType === 'repeat'
  return {
    name: 'checkBuildAIConversationTurnResultRetry',
    passed,
    details: passed
      ? 'empty learnerUtterance: status needs_retry, quality needs_retry, stepType repeat'
      : `status=${result.assistantReply.status}, quality=${result.evaluation.quality}, stepType=${result.promptBundle.stepType}`,
  }
}

export function checkBuildAIConversationTurnResultReady(): AIConversationEngineCheckResult {
  const result = buildAIConversationTurnResult({
    stepPromptResult: buildMockStepPromptResult(),
    assistantText: 'Nice.',
    learnerUtterance: 'Good morning.',
    expectedAnswer: 'Good morning.',
  })
  const passed =
    result.assistantReply.status === 'ready' &&
    result.evaluation.quality === 'correct' &&
    result.evaluation.canProceed === true
  return {
    name: 'checkBuildAIConversationTurnResultReady',
    passed,
    details: passed
      ? 'exact match: status ready, quality correct, canProceed true'
      : `status=${result.assistantReply.status}, quality=${result.evaluation.quality}, canProceed=${result.evaluation.canProceed}`,
  }
}

export function runAllAIConversationEngineChecks(): AIConversationEngineCheckResult[] {
  return [
    checkTrimOrNull(),
    checkNormalizeComparableText(),
    checkBuildAIConversationPromptBundle(),
    checkBuildAIConversationAssistantReplyDefaults(),
    checkResolveFeedbackMode(),
    checkEvaluateListenStep(),
    checkEvaluateEmptyLearnerUtterance(),
    checkEvaluateExactMatch(),
    checkEvaluateAcceptableContainsMatch(),
    checkEvaluateNoExpectedAnswer(),
    checkBuildAIConversationTurnResultRetry(),
    checkBuildAIConversationTurnResultReady(),
  ]
}
