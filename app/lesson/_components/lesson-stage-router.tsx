'use client'

/**
 * Lesson Stage Router
 *
 * Maps the current lesson stage to the correct stage component.
 * Purely presentational — no data fetching, no state management,
 * no runtime transformation. Receives pre-built props from LessonRunner.
 */

import ListenStage, { type ListenStageProps } from './stages/listen-stage'
import RepeatStage, { type RepeatStageProps } from './stages/repeat-stage'
import ScaffoldStage, { type ScaffoldStageProps } from './stages/scaffold-stage'
import AiQuestionStage, { type AiQuestionStageProps } from './stages/ai-question-stage'
import TypingStage, { type TypingStageProps } from './stages/typing-stage'
import FeedbackStage, { type FeedbackStageProps } from './stages/feedback-stage'
import AiConversationStage, { type AiConversationStageProps } from './stages/ai-conversation-stage'

export type LessonStage =
  | 'scene'
  | 'listen'
  | 'repeat'
  | 'scaffold'
  | 'ai_question'
  | 'typing'
  | 'ai_conversation'
  | 'feedback'

export type SceneProps = {
  title: string
  description: string
  onStart: () => void
}

export type LessonStageRouterProps = {
  stage: LessonStage
  sceneProps?: SceneProps
  listenProps?: ListenStageProps
  repeatProps?: RepeatStageProps
  scaffoldProps?: ScaffoldStageProps
  aiQuestionProps?: AiQuestionStageProps
  typingProps?: TypingStageProps
  aiConversationProps?: AiConversationStageProps
  feedbackProps?: FeedbackStageProps
}

function StagePlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[#e8e2d8] bg-white p-4 text-sm text-[#4a4a6a] shadow-sm">
      {label}
    </div>
  )
}

export default function LessonStageRouter({
  stage,
  sceneProps,
  listenProps,
  repeatProps,
  scaffoldProps,
  aiQuestionProps,
  typingProps,
  aiConversationProps,
  feedbackProps,
}: LessonStageRouterProps) {
  switch (stage) {
    case 'scene':
      return sceneProps ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-xl font-semibold text-[#2d2d3a]">{sceneProps.title}</p>
          <p className="text-sm text-[#4a4a6a]">{sceneProps.description}</p>
          <button
            type="button"
            onClick={sceneProps.onStart}
            className="rounded-2xl bg-[#f59e0b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            はじめる
          </button>
        </div>
      ) : <StagePlaceholder label="Scene Introduction" />

    case 'listen':
      return listenProps ? <ListenStage {...listenProps} /> : <StagePlaceholder label="Listen" />

    case 'repeat':
      return repeatProps ? <RepeatStage {...repeatProps} /> : <StagePlaceholder label="Repeat" />

    case 'scaffold':
      return scaffoldProps ? <ScaffoldStage {...scaffoldProps} /> : <StagePlaceholder label="Scaffold" />

    case 'ai_question':
      return aiQuestionProps ? <AiQuestionStage {...aiQuestionProps} /> : <StagePlaceholder label="AI Question" />

    case 'typing':
      return typingProps ? <TypingStage {...typingProps} /> : <StagePlaceholder label="Typing" />

    case 'ai_conversation':
      return aiConversationProps ? <AiConversationStage {...aiConversationProps} /> : <StagePlaceholder label="AI Conversation" />

    case 'feedback':
      return feedbackProps ? <FeedbackStage {...feedbackProps} /> : <StagePlaceholder label="Feedback" />

    default: {
      const _exhaustive: never = stage
      return <StagePlaceholder label={`Unknown (${_exhaustive})`} />
    }
  }
}
