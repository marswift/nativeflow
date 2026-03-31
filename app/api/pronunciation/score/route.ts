import { NextRequest, NextResponse } from 'next/server'
import { scorePronunciation } from '@/lib/pronunciation-score'
import { transcribeAudio } from '@/lib/openai-client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

type PronunciationScoreResponse = {
  ok: boolean
  transcript: string
  totalScore: number
  breakdown: {
    clarity: number
    wordMatch: number
    rhythm: number
    completeness: number
  } | null
  missingWords: string[]
  matchedWords: string[]
  error?: string
}

function normalizeTranscriptForGuard(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:'"()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function zeroScoreResponse(
  transcript: string,
  error: string,
  status = 200
) {
  return NextResponse.json<PronunciationScoreResponse>(
    {
      ok: false,
      transcript,
      totalScore: 0,
      breakdown: {
        clarity: 0,
        wordMatch: 0,
        rhythm: 0,
        completeness: 0,
      },
      missingWords: [],
      matchedWords: [],
      error,
    },
    { status }
  )
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'unauthorized' },
        { status: 401 }
      )
    }

    const file = formData.get('file')
    const expectedTextValue = formData.get('expectedText')
    const languageValue = formData.get('language')

    if (!(file instanceof File)) {
      return NextResponse.json<PronunciationScoreResponse>(
        {
          ok: false,
          transcript: '',
          totalScore: 0,
          breakdown: null,
          missingWords: [],
          matchedWords: [],
          error: 'audio file is required',
        },
        { status: 400 }
      )
    }

    const expectedText =
      typeof expectedTextValue === 'string' ? expectedTextValue.trim() : ''

    if (!expectedText) {
      return NextResponse.json<PronunciationScoreResponse>(
        {
          ok: false,
          transcript: '',
          totalScore: 0,
          breakdown: null,
          missingWords: [],
          matchedWords: [],
          error: 'expectedText is required',
        },
        { status: 400 }
      )
    }

    const language =
      typeof languageValue === 'string' && languageValue.trim() !== ''
        ? languageValue.trim()
        : 'en'

    const transcription = await transcribeAudio({
      file,
      language,
      prompt: `
Transcribe only the words that are actually spoken.
Do not use any reference sentence.
Do not guess missing words.
Do not fix grammar.
If the audio is silent, unclear, or no speech is detected, return an empty transcript.
Output only the spoken words.
      `.trim(),
    })

    const rawTranscript = typeof transcription.text === 'string' ? transcription.text.trim() : ''
    const normalizedTranscript = normalizeTranscriptForGuard(rawTranscript)
    const transcriptWords = normalizedTranscript === '' ? [] : normalizedTranscript.split(' ')
    const averageLogprob =
      typeof transcription.averageLogprob === 'number' && Number.isFinite(transcription.averageLogprob)
        ? transcription.averageLogprob
        : null

    if (!normalizedTranscript) {
      return zeroScoreResponse('', '音声が認識できませんでした。もう一度はっきり話してください。')
    }

    if (transcriptWords.length === 0 || rawTranscript.length < 2) {
      return zeroScoreResponse(rawTranscript, '発話が短すぎるため採点できませんでした。もう一度話してください。')
    }

    if (averageLogprob !== null && averageLogprob < -1.25 && transcriptWords.length <= 2) {
      return zeroScoreResponse(
        rawTranscript,
        '音声の認識精度が低いため採点できませんでした。もう一度はっきり話してください。'
      )
    }

    const score = scorePronunciation({
      expectedText,
      transcriptText: rawTranscript,
      averageLogprob,
    })

    if (!score.transcriptText.trim()) {
      return zeroScoreResponse('', '音声が認識できませんでした。もう一度はっきり話してください。')
    }

    if (score.totalScore === 100 && score.breakdown.wordMatch === 100 && averageLogprob !== null && averageLogprob < -1.0) {
      return zeroScoreResponse(
        score.transcriptText,
        '認識結果が不安定です。静かな場所でもう一度お試しください。'
      )
    }

    try {
      await supabase.from('pronunciation_scores').insert({
        user_id: user.id,
        expected_text: expectedText,
        transcript_text: score.transcriptText,
        total_score: score.totalScore,
        clarity_score: score.breakdown.clarity,
        word_match_score: score.breakdown.wordMatch,
        rhythm_score: score.breakdown.rhythm,
        completeness_score: score.breakdown.completeness,
      })
    } catch (e) {
      console.error('score save error', e)
    }

    return NextResponse.json<PronunciationScoreResponse>({
      ok: true,
      transcript: score.transcriptText,
      totalScore: score.totalScore,
      breakdown: score.breakdown,
      missingWords: score.missingWords,
      matchedWords: score.matchedWords,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown pronunciation scoring error'

    return NextResponse.json<PronunciationScoreResponse>(
      {
        ok: false,
        transcript: '',
        totalScore: 0,
        breakdown: null,
        missingWords: [],
        matchedWords: [],
        error: message,
      },
      { status: 500 }
    )
  }
}
