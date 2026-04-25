/**
 * Fire-and-forget auth failure logger.
 * Sends failure metadata to /api/auth/failure for admin_audit_log persistence.
 * Never blocks UI — errors are silently ignored.
 */
export function logAuthFailure(params: {
  reason: string
  provider: 'email' | 'google' | 'magiclink' | 'pkce' | 'otp'
  route: string
  source: string
  email?: string
}): void {
  try {
    fetch('/api/auth/failure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).catch(() => { /* non-blocking */ })
  } catch {
    /* non-blocking */
  }
}
