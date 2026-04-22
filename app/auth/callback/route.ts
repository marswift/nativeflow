import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?confirm_error=1`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] code exchange failed', error.message)
    return NextResponse.redirect(`${origin}/login?confirm_error=1`)
  }

  // Preserve plan param for onboarding routing
  const plan = searchParams.get('plan')
  const confirmParams = new URLSearchParams()
  if (plan === 'monthly' || plan === 'yearly') confirmParams.set('plan', plan)
  const qs = confirmParams.toString()

  return NextResponse.redirect(`${origin}/auth/confirm${qs ? `?${qs}` : ''}`)
}
