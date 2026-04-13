/**
 * Derive the client IP from a request.
 *
 * Checks platform-specific headers in trust order:
 *   1. Vercel edge (req.ip — set by the platform, not spoofable)
 *   2. x-vercel-ip (Vercel serverless)
 *   3. x-real-ip (nginx / load balancer)
 *   4. cf-connecting-ip (Cloudflare)
 *   5. x-forwarded-for (generic proxy — first entry only)
 *
 * Returns null if no IP can be determined (e.g. local dev without proxy).
 */

const TRUSTED_HEADERS = ['x-vercel-ip', 'x-real-ip', 'cf-connecting-ip'] as const

export function getClientIp(request: Request & { ip?: string }): string | null {
  // Platform-provided IP (Vercel edge runtime sets this directly)
  if (request.ip) return request.ip

  // Trusted single-value headers
  for (const header of TRUSTED_HEADERS) {
    const value = request.headers.get(header)
    if (value) return value.split(',')[0]!.trim()
  }

  // x-forwarded-for: multi-hop, take leftmost (client-originated)
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  return null
}
