import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  registerLocaleMocks,
  snapshotEnv,
  restoreSnapshot,
  restoreWarnMock,
  prepareDevFallback,
  prepareNonDevThrow,
} from '../fixtures/locale-route-env'

registerLocaleMocks()

beforeEach(() => {
  snapshotEnv()
})

afterEach(() => {
  restoreSnapshot()
  restoreWarnMock()
})

// ── Dev mode (NODE_ENV='development', no Upstash) ─────────────────────────

describe('Dev fallback warning', () => {
  it('fires exactly once per module lifecycle with exact text', async () => {
    prepareDevFallback()
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { DEV_FALLBACK_WARNING } = await import('@/app/api/user/locale/route')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![0]).toBe(DEV_FALLBACK_WARNING)
  })

  it('fires again after module reset (two total across two lifecycles)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    prepareDevFallback()
    await import('@/app/api/user/locale/route')
    expect(spy).toHaveBeenCalledTimes(1)

    prepareDevFallback()
    await import('@/app/api/user/locale/route')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

// ── Non-dev environments (throw, never warn) ──────────────────────────────

describe('Non-dev environments without Upstash → throw, no warn', () => {
  const envMatrix = [
    'test',
    'production',
    'staging',
    'preview',
    'ci',
    'local-prod',
    'undefined-env',
  ] as const

  for (const env of envMatrix) {
    it(`NODE_ENV='${env}' throws and does NOT warn`, async () => {
      prepareNonDevThrow(env)
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(
        import('@/app/api/user/locale/route')
      ).rejects.toThrow('Shared rate-limiting requires Upstash Redis')

      expect(spy).not.toHaveBeenCalled()
    })
  }
})
