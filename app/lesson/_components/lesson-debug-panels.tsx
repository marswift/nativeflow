'use client'

import type { LessonCopy } from '../../../lib/lesson-copy'
import type { CurrentLevel } from '../../../lib/constants'
import type { LessonSessionInput } from '../../../lib/lesson-generator-service'
import type { LessonSessionFactoryOutput } from '../../../lib/lesson-session-factory'
import type { LessonBlueprint } from '../../../lib/lesson-blueprint-service'
import type { LessonBlueprintDraft } from '../../../lib/lesson-blueprint-adapter'
import type { LessonDraftSession } from '../../../lib/lesson-draft-session-mapper'
import type { LessonAIPromptPayload } from '../../../lib/lesson-ai-prompt-builder'
import type { LessonAIMessage } from '../../../lib/lesson-ai-message-builder'

const FALLBACK = '—'

function fallback(value: string | null | undefined): string {
  return value ?? FALLBACK
}

function DebugRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#7c7c7c]">{label}</p>
      <p className="mt-0.5 text-[#2c2c2c]">{value}</p>
    </div>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-[#e8e4df] bg-white px-4 py-4 space-y-3">
      {children}
    </div>
  )
}

function BlockItemBorder({
  children,
  className = 'border-b border-[#e8e4df] pb-3 last:border-0 last:pb-0',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}

function NestedItemList({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 space-y-1 pl-2 border-l-2 border-[#e8e4df]">
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-[#7c7c7c]">{children}</p>
}

function MutedText({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={`text-xs text-[#5c5c5c] ${className}`.trim()}>{children}</p>
}

function AIMessageCard({
  msg,
  copy,
}: {
  msg: LessonAIMessage
  copy: LessonCopy
}) {
  return (
    <div className="border border-[#e8e4df] rounded p-2 space-y-1">
      <p className="text-xs font-medium text-[#7c7c7c]">{copy.aiMessages.role}: {fallback(msg.role)}</p>
      <p className="text-xs font-medium text-[#7c7c7c]">{copy.aiMessages.content}:</p>
      <pre className="text-xs text-[#2c2c2c] whitespace-pre-wrap break-words overflow-x-auto max-h-48 overflow-y-auto bg-[#faf8f5] p-2 rounded">{fallback(msg.content)}</pre>
    </div>
  )
}

export type LessonDebugPanelsProps = {
  copy: LessonCopy
  getLevelLabel: (level: CurrentLevel) => string
  lessonInput: LessonSessionInput | null
  lessonSessionConfig: LessonSessionFactoryOutput | null
  lessonBlueprint: LessonBlueprint | null
  lessonBlueprintDraft: LessonBlueprintDraft | null
  lessonDraftSession: LessonDraftSession | null
  lessonAIPromptPayload: LessonAIPromptPayload | null
  lessonAIMessages: LessonAIMessage[] | null
}

export function LessonDebugPanels({
  copy,
  getLevelLabel,
  lessonInput,
  lessonSessionConfig,
  lessonBlueprint,
  lessonBlueprintDraft,
  lessonDraftSession,
  lessonAIPromptPayload,
  lessonAIMessages,
}: LessonDebugPanelsProps) {
  return (
    <>
      {lessonInput && (
        <SectionCard>
          <DebugRow label={copy.generated.theme} value={fallback(lessonInput.theme)} />
          <DebugRow label={copy.generated.scenario} value={fallback(lessonInput.scenario)} />
          <DebugRow label={copy.generated.learnerGoal} value={fallback(lessonInput.learnerGoal)} />
          <DebugRow label={copy.generated.localeFocus} value={fallback(lessonInput.localeFocus)} />
          {lessonSessionConfig && (
            <>
              <DebugRow label={copy.generated.conversationTopic} value={fallback(lessonSessionConfig.conversationTopic)} />
              <DebugRow label={copy.generated.reviewFocus} value={fallback(lessonSessionConfig.reviewFocus)} />
              <DebugRow label={copy.generated.typingFocus} value={fallback(lessonSessionConfig.typingFocus)} />
            </>
          )}
        </SectionCard>
      )}

      {lessonBlueprint && (
        <SectionCard>
          <SectionTitle>{copy.blueprint.sectionTitle}</SectionTitle>
          <p className="text-sm text-[#2c2c2c]">{copy.blueprint.theme}: {fallback(lessonBlueprint.theme)}</p>
          <p className="text-sm text-[#2c2c2c]">{copy.blueprint.level}: {getLevelLabel(lessonBlueprint.level)}</p>
          <div className="space-y-2 pt-1">
            {lessonBlueprint.blocks.map((block, i) => (
              <BlockItemBorder key={`${block.type}-${i}`} className="border-b border-[#e8e4df] pb-2 last:border-0 last:pb-0">
                <p className="text-xs font-medium text-[#7c7c7c]">{block.type}</p>
                <p className="text-sm text-[#2c2c2c]">{fallback(block.title)}</p>
                <MutedText>{copy.blueprint.goal}: {fallback(block.goal)}</MutedText>
              </BlockItemBorder>
            ))}
          </div>
        </SectionCard>
      )}

      {lessonBlueprintDraft && (
        <SectionCard>
          <SectionTitle>{copy.draft.sectionTitle}</SectionTitle>
          <p className="text-sm text-[#2c2c2c]">{copy.draft.theme}: {fallback(lessonBlueprintDraft.theme)}</p>
          <div className="space-y-3 pt-1">
            {lessonBlueprintDraft.blocks.map((block, i) => (
              <BlockItemBorder key={`${block.type}-${i}`}>
                <p className="text-xs font-medium text-[#7c7c7c]">{copy.draft.type}: {block.type}</p>
                <p className="text-sm text-[#2c2c2c]">{copy.draft.title}: {fallback(block.title)}</p>
                <MutedText>{copy.draft.description}: {fallback(block.description)}</MutedText>
                <MutedText>{copy.draft.estimatedMinutes}: {block.estimatedMinutes}</MutedText>
                <NestedItemList>
                  {block.items.map((item, j) => (
                    <div key={`item-${i}-${j}`}>
                      <p className="text-xs text-[#2c2c2c]">{copy.draft.prompt}: {fallback(item.prompt)}</p>
                      <MutedText>{copy.draft.answer}: {fallback(item.answer)}</MutedText>
                    </div>
                  ))}
                </NestedItemList>
              </BlockItemBorder>
            ))}
          </div>
        </SectionCard>
      )}

      {lessonDraftSession && (
        <SectionCard>
          <SectionTitle>{copy.mappedSession.sectionTitle}</SectionTitle>
          <p className="text-sm text-[#2c2c2c]">{copy.mappedSession.theme}: {fallback(lessonDraftSession.theme)}</p>
          <p className="text-sm text-[#2c2c2c]">{copy.mappedSession.level}: {getLevelLabel(lessonDraftSession.level)}</p>
          <MutedText>{copy.mappedSession.totalEstimatedMinutes}: {lessonDraftSession.totalEstimatedMinutes}</MutedText>
          <div className="space-y-3 pt-1">
            {lessonDraftSession.blocks.map((block) => (
              <BlockItemBorder key={block.id}>
                <p className="text-xs font-medium text-[#7c7c7c]">{copy.mappedSession.id}: {block.id}</p>
                <p className="text-xs text-[#2c2c2c]">{copy.mappedSession.type}: {block.type}</p>
                <p className="text-sm text-[#2c2c2c]">{copy.mappedSession.title}: {fallback(block.title)}</p>
                <MutedText>{copy.mappedSession.description}: {fallback(block.description)}</MutedText>
                <MutedText>{copy.mappedSession.estimatedMinutes}: {block.estimatedMinutes}</MutedText>
                <NestedItemList>
                  {block.items.map((item) => (
                    <div key={item.id}>
                      <p className="text-xs text-[#7c7c7c]">{copy.mappedSession.id}: {item.id}</p>
                      <p className="text-xs text-[#2c2c2c]">{copy.mappedSession.prompt}: {fallback(item.prompt)}</p>
                      <MutedText>{copy.mappedSession.answer}: {fallback(item.answer)}</MutedText>
                    </div>
                  ))}
                </NestedItemList>
              </BlockItemBorder>
            ))}
          </div>
        </SectionCard>
      )}

      {lessonAIPromptPayload && (
        <SectionCard>
          <SectionTitle>{copy.aiPromptPayload.sectionTitle}</SectionTitle>
          <MutedText>{copy.aiPromptPayload.systemPurpose}: {fallback(lessonAIPromptPayload.systemPurpose)}</MutedText>
          <p className="text-sm text-[#2c2c2c] mt-2">{copy.aiPromptPayload.lessonInput}: {copy.aiPromptPayload.theme} {fallback(lessonAIPromptPayload.lessonInput.theme)} · {copy.aiPromptPayload.scenario} {fallback(lessonAIPromptPayload.lessonInput.scenario)} · {copy.aiPromptPayload.learnerGoal} {fallback(lessonAIPromptPayload.lessonInput.learnerGoal)} · {copy.aiPromptPayload.localeFocus} {fallback(lessonAIPromptPayload.lessonInput.localeFocus)}</p>
          <MutedText>{copy.aiPromptPayload.sessionConfig}: {copy.aiPromptPayload.theme} {fallback(lessonAIPromptPayload.sessionConfig.theme)} · {copy.aiPromptPayload.conversationTopic} {fallback(lessonAIPromptPayload.sessionConfig.conversationTopic)} · {copy.aiPromptPayload.reviewFocus} {fallback(lessonAIPromptPayload.sessionConfig.reviewFocus)} · {copy.aiPromptPayload.typingFocus} {fallback(lessonAIPromptPayload.sessionConfig.typingFocus)}</MutedText>
          <MutedText>{copy.aiPromptPayload.blueprint}: {copy.aiPromptPayload.theme} {fallback(lessonAIPromptPayload.blueprint.theme)} · {copy.aiPromptPayload.blocks} {lessonAIPromptPayload.blueprint.blocks?.length ?? 0}</MutedText>
          <MutedText>{copy.aiPromptPayload.draft}: {copy.aiPromptPayload.theme} {fallback(lessonAIPromptPayload.draft.theme)} · {copy.aiPromptPayload.blocks} {lessonAIPromptPayload.draft.blocks?.length ?? 0}</MutedText>
          <MutedText>{copy.aiPromptPayload.mappedSession}: {copy.aiPromptPayload.theme} {fallback(lessonAIPromptPayload.mappedSession.theme)} · {copy.aiPromptPayload.level} {getLevelLabel(lessonAIPromptPayload.mappedSession.level)} · {copy.aiPromptPayload.totalEstimatedMinutes} {lessonAIPromptPayload.mappedSession.totalEstimatedMinutes} · {copy.aiPromptPayload.blocks} {lessonAIPromptPayload.mappedSession.blocks?.length ?? 0}</MutedText>
        </SectionCard>
      )}

      {lessonAIMessages && lessonAIMessages.length > 0 && (
        <SectionCard>
          <SectionTitle>{copy.aiMessages.sectionTitle}</SectionTitle>
          <MutedText>{copy.aiMessages.messageCount}: {lessonAIMessages.length}</MutedText>
          {lessonAIMessages.map((msg, i) => (
            <AIMessageCard key={`${msg.role}-${i}`} msg={msg} copy={copy} />
          ))}
        </SectionCard>
      )}
    </>
  )
}
