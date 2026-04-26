import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '../../../../../lib/supabase-server'
import { generateChatCompletion } from '../../../../../lib/openai-client'
import { type RegenerationInput, type RegenerationOutput } from '../../../../../lib/admin/sentence-workbench'
import { verifyAdminRequest, logAdminAction } from '@/lib/admin-api-guard'
import { getLanguageLabel, getRegionLabel } from '../../../../../lib/language-config'

export async function POST(req: NextRequest) {
  // ── Auth: admin role check ──
  const adminUserId = await verifyAdminRequest(req)
  if (!adminUserId) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })

  // ── Parse input ──
  let input: RegenerationInput
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const { sentenceMasterId, targetLanguageCode, targetRegionCode, instructionJa } = input
  if (!sentenceMasterId || !targetLanguageCode || !instructionJa) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
  }

  // ── Fetch sentence master ──
  const { data: master, error: masterError } = await supabaseServer
    .from('sentence_masters')
    .select('*')
    .eq('id', sentenceMasterId)
    .single()

  if (masterError || !master) {
    return NextResponse.json({ message: 'Sentence not found' }, { status: 404 })
  }

  // ── Fetch current localization (if exists) ──
  let currentLocalization: string | null = null
  if (input.localizationId) {
    const { data: loc } = await supabaseServer
      .from('sentence_localizations')
      .select('localized_text')
      .eq('id', input.localizationId)
      .single()
    currentLocalization = loc?.localized_text ?? null
  }

  // ── Build AI prompt ──
  const langLabel = getLanguageLabel(targetLanguageCode)
  const regionLabel = targetRegionCode ? getRegionLabel(targetLanguageCode, targetRegionCode) : null

  const systemPrompt = `あなたは多言語コンテンツの専門家です。語学学習用の文章を自然な表現に翻訳・調整します。

出力は必ず以下のJSON形式で返してください:
{
  "localizedText": "翻訳・調整された文章",
  "reviewJa": "何をどう調整したかの日本語説明（1-2文）",
  "naturalnessScore": 0.0〜1.0の自然さスコア,
  "candidates": ["代替案1", "代替案2"]
}

ルール:
- 意味を保持すること
- ターゲット言語で自然な表現にすること
- 直訳を避けること
- 難易度レベルを考慮すること
- candidates は最大2つの代替案（不要なら空配列）`

  const userPrompt = [
    `【元の文章】${master.base_text}`,
    `【日本語の意味】${master.meaning_ja}`,
    `【難易度】${master.difficulty}`,
    `【ターゲット言語】${langLabel}`,
    regionLabel ? `【地域】${regionLabel}` : null,
    currentLocalization ? `【現在の翻訳】${currentLocalization}` : null,
    `【指示（日本語）】${instructionJa}`,
  ].filter(Boolean).join('\n')

  // ── Call AI ──
  try {
    const { text } = await generateChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 800,
    })

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ message: 'AI returned invalid format', raw: text }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as RegenerationOutput
    const output: RegenerationOutput = {
      localizedText: parsed.localizedText ?? '',
      reviewJa: parsed.reviewJa ?? '',
      naturalnessScore: typeof parsed.naturalnessScore === 'number' ? parsed.naturalnessScore : null,
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
    }

    logAdminAction(adminUserId, 'sentence_regenerate', {
      sentenceMasterId,
      targetLanguageCode,
      targetRegionCode: targetRegionCode ?? null,
    })

    return NextResponse.json({ ok: true, ...output })
  } catch (err) {
    console.error('[admin/regenerate] AI error:', err)
    return NextResponse.json({ message: 'AI generation failed' }, { status: 500 })
  }
}
