import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '../../../../../lib/supabase-server'
import { generateChatCompletion } from '../../../../../lib/openai-client'
import { verifyAdminRequest } from '@/lib/admin-api-guard'
import {
  normalizeRegionInput,
  slugify,
  buildAliasCandidates,
  validateDraftDeterministic,
  type RegionDraft,
  type RegionDraftInput,
} from '../../../../../lib/admin/region-draft'

export async function POST(req: NextRequest) {
  // ── Auth: admin role check ──
  const adminUserId = await verifyAdminRequest(req)
  if (!adminUserId) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })

  // ── Parse input ──
  let input: RegionDraftInput
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const { languageCode, countryCode, regionInput } = input
  if (!languageCode || !countryCode || !regionInput?.trim()) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
  }

  const normalized = normalizeRegionInput(regionInput)
  const citySlug = slugify(normalized) || slugify(regionInput)
  const inputAliases = buildAliasCandidates(normalized)

  // ── AI prompt ──
  const systemPrompt = `あなたは多言語の地域文化コンテンツ専門家です。
語学学習アプリの地域イマージョン（没入）コンテンツを生成します。

重要ルール:
- 方言生成は禁止。標準語のみ。
- 地域の雰囲気、ランドマーク、食文化、場所、トピックに焦点を当てる。
- 観光偏重を避け、日常生活に使える内容を優先する。
- 出力は必ず以下のJSON形式で返してください。

{
  "displayNameJa": "日本語の地域名",
  "displayNameEn": "English region name",
  "nativeName": "現地語での地域名（該当する場合）",
  "aliases": ["多言語の別名を含む配列: 日本語表記、英語表記、現地語表記、ローマ字、よくある表記揺れなど"],
  "landmarkExamples": ["ランドマーク例 3-5個"],
  "foodExamples": ["地域の食べ物例 3-5個"],
  "placeExamples": ["日常的な場所例 3-5個"],
  "topicExamples": ["会話トピック例 3-5個"],
  "vibeTags": ["雰囲気タグ 3-5個（例: urban, relaxed, traditional）"],
  "politeness": "casual | neutral | polite",
  "slangLevel": "low | medium | high",
  "canonicalMatch": true/false（日英名が同じ場所を指すか）,
  "aliasConsistency": true/false（別名が一貫しているか）,
  "confidence": 0.0-1.0（生成品質の自信度）,
  "validationNotes": ["検証メモの配列"]
}`

  const userPrompt = [
    `言語コード: ${languageCode}`,
    `国コード: ${countryCode}`,
    `地域入力: ${normalized}`,
    `入力別名候補: ${inputAliases.join(', ')}`,
    '',
    'この地域の没入コンテンツドラフトをJSON形式で生成してください。',
  ].join('\n')

  try {
    const { text } = await generateChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 1000,
    })

    // Parse JSON from AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ message: 'AI returned invalid format', raw: text }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Build draft
    const draft: RegionDraft = {
      id: `${languageCode}-${countryCode}-${citySlug}`,
      languageCode,
      countryCode,
      cityCode: citySlug,
      displayNameJa: parsed.displayNameJa ?? normalized,
      displayNameEn: parsed.displayNameEn ?? normalized,
      nativeName: parsed.nativeName ?? null,
      aliases: [...new Set([...inputAliases, ...(Array.isArray(parsed.aliases) ? parsed.aliases : [])])],
      landmarkExamples: Array.isArray(parsed.landmarkExamples) ? parsed.landmarkExamples : [],
      foodExamples: Array.isArray(parsed.foodExamples) ? parsed.foodExamples : [],
      placeExamples: Array.isArray(parsed.placeExamples) ? parsed.placeExamples : [],
      topicExamples: Array.isArray(parsed.topicExamples) ? parsed.topicExamples : [],
      vibeTags: Array.isArray(parsed.vibeTags) ? parsed.vibeTags : [],
      politeness: ['casual', 'neutral', 'polite'].includes(parsed.politeness) ? parsed.politeness : 'neutral',
      slangLevel: ['low', 'medium', 'high'].includes(parsed.slangLevel) ? parsed.slangLevel : 'low',
      avoidDialect: true,
      validation: {
        canonicalMatch: parsed.canonicalMatch ?? true,
        aliasConsistency: parsed.aliasConsistency ?? true,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        notes: Array.isArray(parsed.validationNotes) ? parsed.validationNotes : [],
      },
    }

    // Run deterministic validation on top of AI validation
    draft.validation = validateDraftDeterministic(draft)

    return NextResponse.json({ ok: true, draft })
  } catch (err) {
    console.error('[admin/regions/draft] AI error:', err)
    return NextResponse.json({ message: 'AI generation failed' }, { status: 500 })
  }
}
