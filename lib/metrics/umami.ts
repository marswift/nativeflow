import 'server-only'

/**
 * Lightweight Umami analytics tracker (server-only).
 *
 * Sends events to the Umami instance configured via UMAMI_TRACKING_URL.
 * No-op when the env var is unset. Fire-and-forget — never throws,
 * never produces unhandled rejections.
 */

const TRACKING_URL = process.env.UMAMI_TRACKING_URL ?? null

export async function track(
  event: string,
  data: Record<string, string | number | boolean>
): Promise<void> {
  if (!TRACKING_URL) return

  try {
    await fetch(TRACKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, timestamp: Date.now() }),
    })
  } catch {
    // Swallow all errors — analytics must never block or crash the request
  }
}
