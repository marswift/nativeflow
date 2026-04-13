'use client'

/**
 * AI Conversation Stage
 *
 * Short back-and-forth with AI. Shows simple evaluation feedback.
 *
 * Purely presentational — no AI logic, no fetch, no validation.
 * Parent controls messages, evaluation, and navigation.
 */

export type AiConversationMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

export type AiEvaluation = {
  result: 'good' | 'ok' | 'retry'
  hint?: string | null
}

export type AiConversationStageProps = {
  messages: AiConversationMessage[]
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onNext: () => void
  isSending?: boolean
  evaluation?: AiEvaluation | null
}

const EVAL_STYLE: Record<AiEvaluation['result'], { bg: string; text: string; label: string }> = {
  good:  { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'いい感じです！' },
  ok:    { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  label: '伝わっています！' },
  retry: { bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700', label: 'もう少しやってみよう' },
}

export default function AiConversationStage({
  messages,
  value,
  onChange,
  onSend,
  onNext,
  isSending = false,
  evaluation = null,
}: AiConversationStageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {messages.map((message) => {
          const isAssistant = message.role === 'assistant'

          return (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                isAssistant
                  ? 'self-start border border-[#e8e2d8] bg-white text-[#2d2d3a]'
                  : 'self-end border border-[#f5d0a5] bg-[#fff7ed] text-[#2d2d3a]'
              }`}
            >
              {message.text}
            </div>
          )
        })}
      </div>

      {evaluation && (
        <div className={`rounded-2xl border px-4 py-3 ${EVAL_STYLE[evaluation.result].bg}`}>
          <p className={`text-sm font-semibold ${EVAL_STYLE[evaluation.result].text}`}>
            {EVAL_STYLE[evaluation.result].label}
          </p>
          {evaluation.hint && (
            <p className="mt-1 text-xs text-[#4a4a6a]">{evaluation.hint}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Reply in English"
          className="w-full rounded-2xl border border-[#e8e2d8] px-4 py-3 text-sm outline-none transition focus:border-[#f59e0b]"
        />
        <button
          type="button"
          onClick={onSend}
          className="shrink-0 rounded-2xl bg-[#6366f1] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onNext}
          className="rounded-2xl bg-[#f59e0b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          Next
        </button>
      </div>
    </div>
  )
}
