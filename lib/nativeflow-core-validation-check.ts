import {
  toModuleReport,
  runNativeFlowCoreValidation,
  formatNativeFlowValidationReport,
} from './nativeflow-core-validation'

export type NativeFlowCoreValidationCheckResult = {
  name: string
  passed: boolean
  details: string
}

export function checkToModuleReportCounts(): NativeFlowCoreValidationCheckResult {
  const report = toModuleReport({
    module: 'test-module',
    results: [
      { name: 'a', passed: true, details: 'ok-a' },
      { name: 'b', passed: false, details: 'ng-b' },
      { name: 'c', passed: true, details: 'ok-c' },
    ],
  })
  const passed =
    report.total === 3 &&
    report.passed === 2 &&
    report.failed === 1 &&
    report.checks.length === 3 &&
    report.checks[1].module === 'test-module'
  return {
    name: 'checkToModuleReportCounts',
    passed,
    details: passed
      ? 'total 3, passed 2, failed 1, checks length 3, checks[1].module test-module'
      : `total=${report.total}, passed=${report.passed}, failed=${report.failed}, length=${report.checks.length}, checks[1].module=${report.checks[1]?.module}`,
  }
}

export function checkToModuleReportPreservesOrder(): NativeFlowCoreValidationCheckResult {
  const report = toModuleReport({
    module: 'order-test',
    results: [
      { name: 'first', passed: true, details: 'a' },
      { name: 'second', passed: true, details: 'b' },
      { name: 'third', passed: true, details: 'c' },
    ],
  })
  const orderOk =
    report.checks[0].name === 'first' &&
    report.checks[1].name === 'second' &&
    report.checks[2].name === 'third'
  return {
    name: 'checkToModuleReportPreservesOrder',
    passed: orderOk,
    details: orderOk
      ? 'checks names in order first, second, third'
      : `names=${report.checks.map((c) => c.name).join(',')}`,
  }
}

export async function checkRunNativeFlowCoreValidationSummaryMatchesModules(): Promise<NativeFlowCoreValidationCheckResult> {
  const report = await runNativeFlowCoreValidation()
  const sumTotal = report.modules.reduce((s, m) => s + m.total, 0)
  const sumPassed = report.modules.reduce((s, m) => s + m.passed, 0)
  const sumFailed = report.modules.reduce((s, m) => s + m.failed, 0)
  const passed =
    report.summary.totalModules === report.modules.length &&
    report.summary.totalChecks === sumTotal &&
    report.summary.totalPassed === sumPassed &&
    report.summary.totalFailed === sumFailed
  return {
    name: 'checkRunNativeFlowCoreValidationSummaryMatchesModules',
    passed,
    details: passed
      ? 'summary totals match sum of modules'
      : `totalModules=${report.summary.totalModules} vs ${report.modules.length}, totalChecks=${report.summary.totalChecks} vs ${sumTotal}, totalPassed=${report.summary.totalPassed} vs ${sumPassed}, totalFailed=${report.summary.totalFailed} vs ${sumFailed}`,
  }
}

const EXPECTED_MODULE_ORDER = [
  'lesson-progress-check',
  'lesson-completion-handoff-check',
  'habit-retention-check',
  'ai-conversation-engine-check',
  'review-scheduler-check',
  'lesson-runtime-controller-check',
  'conversation-lesson-runtime-facade-check',
]

export async function checkRunNativeFlowCoreValidationIncludesSevenModules(): Promise<NativeFlowCoreValidationCheckResult> {
  const report = await runNativeFlowCoreValidation()
  let orderOk = report.modules.length === EXPECTED_MODULE_ORDER.length
  if (orderOk) {
    for (let i = 0; i < report.modules.length; i++) {
      if (report.modules[i].module !== EXPECTED_MODULE_ORDER[i]) {
        orderOk = false
        break
      }
    }
  }
  return {
    name: 'checkRunNativeFlowCoreValidationIncludesSevenModules',
    passed: orderOk,
    details: orderOk
      ? 'seven modules in exact order'
      : `modules=${report.modules.map((m) => m.module).join(',')}`,
  }
}

export async function checkRunNativeFlowCoreValidationAllPassCurrently(): Promise<NativeFlowCoreValidationCheckResult> {
  const report = await runNativeFlowCoreValidation()
  const passed =
    report.summary.totalFailed === 0 &&
    report.summary.failedChecks.length === 0 &&
    report.summary.totalChecks > 0
  return {
    name: 'checkRunNativeFlowCoreValidationAllPassCurrently',
    passed,
    details: passed
      ? 'totalFailed 0, failedChecks length 0, totalChecks > 0'
      : `totalFailed=${report.summary.totalFailed}, failedChecks.length=${report.summary.failedChecks.length}, totalChecks=${report.summary.totalChecks}`,
  }
}

export async function checkFormatNativeFlowValidationReportHeader(): Promise<NativeFlowCoreValidationCheckResult> {
  const report = await runNativeFlowCoreValidation()
  const formatted = formatNativeFlowValidationReport(report)
  const hasTitle = formatted.includes('NativeFlow Core Pure-Logic Validation Report')
  const hasModules = formatted.includes('Modules: ')
  const hasTotalChecks = formatted.includes('Total checks: ')
  const hasPassed = formatted.includes('Passed: ')
  const hasFailed = formatted.includes('Failed: ')
  const passed = hasTitle && hasModules && hasTotalChecks && hasPassed && hasFailed
  return {
    name: 'checkFormatNativeFlowValidationReportHeader',
    passed,
    details: passed
      ? 'formatted string includes all header lines'
      : `title=${hasTitle}, Modules=${hasModules}, TotalChecks=${hasTotalChecks}, Passed=${hasPassed}, Failed=${hasFailed}`,
  }
}

export async function checkFormatNativeFlowValidationReportContainsModuleBlocks(): Promise<NativeFlowCoreValidationCheckResult> {
  const report = await runNativeFlowCoreValidation()
  const formatted = formatNativeFlowValidationReport(report)
  const hasLessonProgress = formatted.includes('[lesson-progress-check]')
  const hasReviewScheduler = formatted.includes('[review-scheduler-check]')
  const hasFacade = formatted.includes('[conversation-lesson-runtime-facade-check]')
  const passed = hasLessonProgress && hasReviewScheduler && hasFacade
  return {
    name: 'checkFormatNativeFlowValidationReportContainsModuleBlocks',
    passed,
    details: passed
      ? 'formatted string includes all three module blocks'
      : `lesson-progress=${hasLessonProgress}, review-scheduler=${hasReviewScheduler}, facade=${hasFacade}`,
  }
}

export async function checkFormatNativeFlowValidationReportNoFailuresLine(): Promise<NativeFlowCoreValidationCheckResult> {
  const report = await runNativeFlowCoreValidation()
  const formatted = formatNativeFlowValidationReport(report)
  const hasFailedChecksLabel = formatted.includes('Failed checks:')
  const hasNone = formatted.includes('- none')
  const passed = hasFailedChecksLabel && hasNone
  return {
    name: 'checkFormatNativeFlowValidationReportNoFailuresLine',
    passed,
    details: passed
      ? 'formatted string includes Failed checks: and - none'
      : `Failed checks:=${hasFailedChecksLabel}, - none=${hasNone}`,
  }
}

export async function runAllNativeFlowCoreValidationChecks(): Promise<NativeFlowCoreValidationCheckResult[]> {
  return Promise.all([
    Promise.resolve(checkToModuleReportCounts()),
    Promise.resolve(checkToModuleReportPreservesOrder()),
    checkRunNativeFlowCoreValidationSummaryMatchesModules(),
    checkRunNativeFlowCoreValidationIncludesSevenModules(),
    checkRunNativeFlowCoreValidationAllPassCurrently(),
    checkFormatNativeFlowValidationReportHeader(),
    checkFormatNativeFlowValidationReportContainsModuleBlocks(),
    checkFormatNativeFlowValidationReportNoFailuresLine(),
  ])
}
