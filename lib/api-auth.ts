import { NextResponse } from 'next/server'
import { supabaseServer } from './supabase-server'
import { canStartLesson } from './lesson-access'

type AuthSuccess = { userId: string }

/**
 * Require a valid Bearer token on an API route.
 * Returns { userId } on success, or a 401 NextResponse on failure.
 *
 * Usage:
 *   const auth = await requireAuth(req)
 *   if (auth instanceof NextResponse) return auth
 *   const { userId } = auth
 */
export async function requireAuth(req: Request): Promise<AuthSuccess | NextResponse> {
  const header = req.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error } = await supabaseServer.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { userId: user.id }
}

/**
 * Require a valid Bearer token AND active lesson entitlement.
 * Returns { userId } on success, 401 if not authenticated, 403 if not entitled.
 *
 * Uses canStartLesson from lib/lesson-access.ts — same logic as the client gate.
 */
export async function requireLessonEntitlement(req: Request): Promise<AuthSuccess | NextResponse> {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { data: profile } = await supabaseServer
    .from('user_profiles')
    .select('role, is_admin, billing_exempt, billing_exempt_until, subscription_status, subscription_current_period_end, trial_ends_at')
    .eq('id', auth.userId)
    .maybeSingle()

  const access = canStartLesson({
    role: profile?.role ?? null,
    is_admin: profile?.is_admin ?? null,
    billing_exempt: profile?.billing_exempt ?? null,
    billing_exempt_until: profile?.billing_exempt_until ?? null,
    subscription_status: profile?.subscription_status ?? null,
    subscription_current_period_end: profile?.subscription_current_period_end ?? null,
    trial_ends_at: profile?.trial_ends_at ?? null,
  })

  if (!access.allowed) {
    return NextResponse.json({ error: 'Lesson access requires an active plan' }, { status: 403 })
  }

  return { userId: auth.userId }
}
