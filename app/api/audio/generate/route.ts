import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { createClient } from "@supabase/supabase-js"
import { generateSpeech } from "@/lib/openai-client"
import { requireLessonEntitlement } from "@/lib/api-auth"

export const runtime = "nodejs"

type GenerateAudioRequest = {
  text: string
  locale?: string
  voice?: string
  speed?: number
}

type GenerateAudioResponse = {
  ok: boolean
  audio_url: string | null
  audio_status: "ready" | "missing" | "error"
  audio_voice: string | null
  audio_provider: "openai" | null
  audio_cache_key: string | null
  error?: string
}

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim()
}

function buildAudioCacheKey(params: {
  text: string
  locale: string
  voice: string
  speed: number
}) {
  const normalized = `${normalizeText(params.text)}|${params.locale}|${params.voice}|${params.speed}|openai-v1`
  return createHash("sha256").update(normalized).digest("hex")
}

function buildStoragePath(params: {
  locale: string
  voice: string
  cacheKey: string
}) {
  return `${params.locale}/${params.voice}/${params.cacheKey}.mp3`
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.")
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireLessonEntitlement(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = (await request.json()) as GenerateAudioRequest

    const text = normalizeText(body.text ?? "")
    const locale = body.locale?.trim() || "en-US"
    const voice = body.voice?.trim() || "alloy"
    const speed = typeof body.speed === "number" ? body.speed : 1

    if (!text) {
      return NextResponse.json<GenerateAudioResponse>(
        {
          ok: false,
          audio_url: null,
          audio_status: "error",
          audio_voice: null,
          audio_provider: null,
          audio_cache_key: null,
          error: "text is required",
        },
        { status: 400 },
      )
    }

    const cacheKey = buildAudioCacheKey({ text, locale, voice, speed })
    const storagePath = buildStoragePath({ locale, voice, cacheKey })
    const supabase = getServiceSupabase()
    const bucket = "lesson-audio"

    const { data: existingPublicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    const { data: existingFile, error: existingFileError } = await supabase.storage
      .from(bucket)
      .download(storagePath)

    if (!existingFileError && existingFile) {
      return NextResponse.json<GenerateAudioResponse>({
        ok: true,
        audio_url: existingPublicUrl.publicUrl,
        audio_status: "ready",
        audio_voice: voice,
        audio_provider: "openai",
        audio_cache_key: cacheKey,
      })
    }

    const audioBuffer = await generateSpeech({
      text,
      voice,
      responseFormat: 'mp3',
      speed,
    })
    
    if (!audioBuffer) {
      return NextResponse.json<GenerateAudioResponse>(
        {
          ok: false,
          audio_url: null,
          audio_status: 'error',
          audio_voice: voice,
          audio_provider: 'openai',
          audio_cache_key: cacheKey,
          error: 'speech generation failed',
        },
        { status: 500 },
      )
    }
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json<GenerateAudioResponse>(
        {
          ok: false,
          audio_url: null,
          audio_status: "error",
          audio_voice: voice,
          audio_provider: "openai",
          audio_cache_key: cacheKey,
          error: uploadError.message,
        },
        { status: 500 },
      )
    }

    const { data: uploadedPublicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    return NextResponse.json<GenerateAudioResponse>({
      ok: true,
      audio_url: uploadedPublicUrl.publicUrl,
      audio_status: "ready",
      audio_voice: voice,
      audio_provider: "openai",
      audio_cache_key: cacheKey,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown audio generation error"

    return NextResponse.json<GenerateAudioResponse>(
      {
        ok: false,
        audio_url: null,
        audio_status: "error",
        audio_voice: null,
        audio_provider: null,
        audio_cache_key: null,
        error: message,
      },
      { status: 500 },
    )
  }
}