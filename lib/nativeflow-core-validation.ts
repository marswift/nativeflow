import { runAllLessonProgressChecks } from './lesson-progress-check'
import { runAllLessonCompletionHandoffChecks } from './lesson-completion-handoff-check'
import { runAllHabitRetentionChecks } from './habit-retention-check'
import { runAllAIConversationEngineChecks } from './ai-conversation-engine-check'
import { runAllReviewSchedulerChecks } from './review-scheduler-check'
import { runAllLessonRuntimeControllerChecks } from './lesson-runtime-controller-check'
import { runAllConversationLessonRuntimeFacadeChecks } from './conversation-lesson-runtime-facade-check'

export type NativeFlowValidationCheckResult = {
  module: string
  name: string
  passed: boolean
  details: string
}

export type NativeFlowValidationModuleReport = {
  module: string
  total: number
  passed: number
  failed: number
  checks: NativeFlowValidationCheckResult[]
}

export type NativeFlowValidationSummary = {
  totalModules: number
  totalChecks: number
  totalPassed: number
  totalFailed: number
  failedChecks: NativeFlowValidationCheckResult[]
}

export type NativeFlowValidationReport = {
  modules: NativeFlowValidationModuleReport[]
  summary: NativeFlowValidationSummary
}

type CheckResult = { name: string; passed: boolean; details: string }

const MODULE_ORDER: Array<{
  key: string
  run: () => CheckResult[] | Promise<CheckResult[]>
}> = [
  { key: 'lesson-progress-check', run: runAllLessonProgressChecks },
  { key: 'lesson-completion-handoff-check', run: runAllLessonCompletionHandoffChecks },
  { key: 'habit-retention-check', run: runAllHabitRetentionChecks },
  { key: 'ai-conversation-engine-check', run: runAllAIConversationEngineChecks },
  { key: 'review-scheduler-check', run: runAllReviewSchedulerChecks },
  { key: 'lesson-runtime-controller-check', run: runAllLessonRuntimeControllerChecks },
  { key: 'conversation-lesson-runtime-facade-check', run: runAllConversationLessonRuntimeFacadeChecks },
]

export function toModuleReport(args: {
  module: string
  results: Array<{ name: string; passed: boolean; details: string }>
}): NativeFlowValidationModuleReport {
  const checks: NativeFlowValidationCheckResult[] = args.results.map((r) => ({
    module: args.module,
    name: r.name,
    passed: r.passed,
    details: r.details,
  }))
  const total = checks.length
  const passed = checks.filter((c) => c.passed).length
  const failed = total - passed
  return {
    module: args.module,
    total,
    passed,
    failed,
    checks,
  }
}

export async function runNativeFlowCoreValidation(): Promise<NativeFlowValidationReport> {
  const modules: NativeFlowValidationModuleReport[] = []
  for (const { key, run } of MODULE_ORDER) {
    const results = await Promise.resolve(run())
    modules.push(toModuleReport({ module: key, results }))
  }
  const totalModules = modules.length
  const totalChecks = modules.reduce((s, m) => s + m.total, 0)
  const totalPassed = modules.reduce((s, m) => s + m.passed, 0)
  const totalFailed = totalChecks - totalPassed
  const failedChecks: NativeFlowValidationCheckResult[] = []
  for (const m of modules) {
    for (const c of m.checks) {
      if (!c.passed) failedChecks.push(c)
    }
  }
  const summary: NativeFlowValidationSummary = {
    totalModules,
    totalChecks,
    totalPassed,
    totalFailed,
    failedChecks,
  }
  return { modules, summary }
}

export function formatNativeFlowValidationReport(
  report: NativeFlowValidationReport
): string {
  const lines: string[] = []
  lines.push('NativeFlow Core Pure-Logic Validation Report')
  lines.push(`Modules: ${report.summary.totalModules}`)
  lines.push(`Total checks: ${report.summary.totalChecks}`)
  lines.push(`Passed: ${report.summary.totalPassed}`)
  lines.push(`Failed: ${report.summary.totalFailed}`)
  lines.push('')
  for (const m of report.modules) {
    lines.push(`[${m.module}]`)
    lines.push(`total: ${m.total}`)
    lines.push(`passed: ${m.passed}`)
    lines.push(`failed: ${m.failed}`)
    lines.push('')
  }
  lines.push('Failed checks:')
  if (report.summary.failedChecks.length === 0) {
    lines.push('- none')
  } else {
    for (const c of report.summary.failedChecks) {
      lines.push(`- ${c.module} / ${c.name}: ${c.details}`)
    }
  }
  return lines.join('\n')
}
