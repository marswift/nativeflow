import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getActiveRegionsForLanguage, getRegionsFallback } from '@/lib/region-registry-repository'

type ChangeLanguageBody = {
  language?: string
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const body = (await req.json()) as ChangeLanguageBody
    const language = body.language?.trim()

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!language) {
      return NextResponse.json({ error: 'language is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server env is not configured' }, { status: 500 })
    }

    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Sync both fields so target_language_code never drifts from current_learning_language.
    // target_language_code is checked by profile-completion; current_learning_language is
    // used by dashboard and lesson loader. Both must stay in sync.
    const { error: updateProfileError } = await adminSupabase
      .from('user_profiles')
      .update({
        current_learning_language: language,
        target_language_code: language,
      })
      .eq('id', user.id)

    if (updateProfileError) {
      return NextResponse.json({ error: updateProfileError.message }, { status: 500 })
    }

    const {
        data: existingLearningProfile,
        error: existingLearningProfileError,
      } = await adminSupabase
        .from('user_learning_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('language_code', language)
        .maybeSingle()
      
      if (existingLearningProfileError) {
        return NextResponse.json({ error: existingLearningProfileError.message }, { status: 500 })
      }
      
      if (!existingLearningProfile) {
        // Pick a safe default region from registry (falls back to constants if DB fails)
        let enabledRegions: { code: string }[]
        try {
          enabledRegions = await getActiveRegionsForLanguage(language)
        } catch {
          enabledRegions = getRegionsFallback(language)
        }
        const defaultRegion = enabledRegions.length === 1 ? enabledRegions[0].code : null

        const { error: insertLearningProfileError } = await adminSupabase
          .from('user_learning_profiles')
          .insert({
            user_id: user.id,
            language_code: language,
            current_level: 'beginner',
            ...(defaultRegion ? { target_region_slug: defaultRegion } : {}),
          })
      
        if (insertLearningProfileError) {
          return NextResponse.json({ error: insertLearningProfileError.message }, { status: 500 })
        }
      }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/user/change-language failed', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}