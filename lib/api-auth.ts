import { NextResponse } from 'next/server'
import { supabaseServer } from './supabase-server'

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
