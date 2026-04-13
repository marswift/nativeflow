'use client'

import type { ReactNode } from 'react'

export type LessonShellProps = {
  /** Top section — progress bar, timeline, stage label, etc. */
  header: ReactNode
  /** Main lesson content — stage-specific UI. */
  children: ReactNode
  /** Bottom action area — next button, completion, etc. Optional. */
  footer?: ReactNode
  /** Additional className on the outermost wrapper. */
  className?: string
}

/**
 * Standardized lesson screen layout.
 *
 * Provides a stable header / main / footer structure.
 * Contains no lesson logic — purely presentational.
 * Stage components plug into children; actions plug into footer.
 */
export default function LessonShell({
  header,
  children,
  footer,
  className,
}: LessonShellProps) {
  return (
    <div
      className={`min-h-screen flex flex-col bg-[#f7f4ef] ${className ?? ''}`}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <header className="shrink-0 py-3">
        <div className="mx-auto w-full max-w-md px-4">
          {header}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-6">
          {children}
        </div>
      </main>

      {footer ? (
        <footer
          className="sticky bottom-0 shrink-0 border-t border-[#ede9e2] bg-white py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto w-full max-w-md px-4">
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  )
}
