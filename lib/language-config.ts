/**
 * Language & region configuration.
 *
 * Two distinct concepts:
 * - UiLanguageCode: language used to display app text (buttons, labels)
 * - LearningLanguageVariant: target language/region/city for lesson content
 *
 * Structured for easy DB migration — replace arrays with DB queries,
 * keep helper function signatures unchanged.
 */

// ── UI Language ──

export type UiLanguageCode =
  | 'en' | 'es' | 'fr' | 'pt' | 'vi' | 'it' | 'ru' | 'tr' | 'fa' | 'th'
  | 'sv' | 'no' | 'pl' | 'el' | 'cs' | 'id' | 'ms' | 'tl' | 'fil-en'
  | 'zh-mandarin' | 'yue' | 'ar-msa' | 'ar-eg' | 'ar-gulf'
  | 'hi' | 'bn' | 'ta'
  | 'ja' | 'ko' | 'de' | 'nl'

export type UiLanguageOption = {
  code: UiLanguageCode
  displayNameJa: string
  displayNameEn: string
  nativeName: string
  isActive: boolean
  sortOrder: number
}

export const UI_LANGUAGE_OPTIONS: UiLanguageOption[] = [
  { code: 'ja', displayNameJa: '日本語', displayNameEn: 'Japanese', nativeName: '日本語', isActive: true, sortOrder: 1 },
  { code: 'en', displayNameJa: '英語', displayNameEn: 'English', nativeName: 'English', isActive: true, sortOrder: 2 },
  { code: 'ko', displayNameJa: '韓国語', displayNameEn: 'Korean', nativeName: '한국어', isActive: true, sortOrder: 3 },
  { code: 'zh-mandarin', displayNameJa: '中国語（普通話）', displayNameEn: 'Chinese (Mandarin)', nativeName: '中文（普通话）', isActive: true, sortOrder: 4 },
  { code: 'yue', displayNameJa: '広東語', displayNameEn: 'Cantonese', nativeName: '粵語', isActive: true, sortOrder: 5 },
  { code: 'es', displayNameJa: 'スペイン語', displayNameEn: 'Spanish', nativeName: 'Español', isActive: true, sortOrder: 6 },
  { code: 'fr', displayNameJa: 'フランス語', displayNameEn: 'French', nativeName: 'Français', isActive: true, sortOrder: 7 },
  { code: 'pt', displayNameJa: 'ポルトガル語', displayNameEn: 'Portuguese', nativeName: 'Português', isActive: true, sortOrder: 8 },
  { code: 'de', displayNameJa: 'ドイツ語', displayNameEn: 'German', nativeName: 'Deutsch', isActive: true, sortOrder: 9 },
  { code: 'nl', displayNameJa: 'オランダ語', displayNameEn: 'Dutch', nativeName: 'Nederlands', isActive: true, sortOrder: 10 },
  { code: 'it', displayNameJa: 'イタリア語', displayNameEn: 'Italian', nativeName: 'Italiano', isActive: true, sortOrder: 11 },
  { code: 'ru', displayNameJa: 'ロシア語', displayNameEn: 'Russian', nativeName: 'Русский', isActive: true, sortOrder: 12 },
  { code: 'tr', displayNameJa: 'トルコ語', displayNameEn: 'Turkish', nativeName: 'Türkçe', isActive: true, sortOrder: 13 },
  { code: 'fa', displayNameJa: 'ペルシア語', displayNameEn: 'Persian', nativeName: 'فارسی', isActive: true, sortOrder: 14 },
  { code: 'th', displayNameJa: 'タイ語', displayNameEn: 'Thai', nativeName: 'ไทย', isActive: true, sortOrder: 15 },
  { code: 'vi', displayNameJa: 'ベトナム語', displayNameEn: 'Vietnamese', nativeName: 'Tiếng Việt', isActive: true, sortOrder: 16 },
  { code: 'id', displayNameJa: 'インドネシア語', displayNameEn: 'Indonesian', nativeName: 'Bahasa Indonesia', isActive: true, sortOrder: 17 },
  { code: 'ms', displayNameJa: 'マレー語', displayNameEn: 'Malay', nativeName: 'Bahasa Melayu', isActive: true, sortOrder: 18 },
  { code: 'tl', displayNameJa: 'タガログ語', displayNameEn: 'Tagalog', nativeName: 'Tagalog', isActive: true, sortOrder: 19 },
  { code: 'fil-en', displayNameJa: 'フィリピン英語', displayNameEn: 'Philippine English', nativeName: 'Philippine English', isActive: true, sortOrder: 20 },
  { code: 'hi', displayNameJa: 'ヒンディー語', displayNameEn: 'Hindi', nativeName: 'हिन्दी', isActive: true, sortOrder: 21 },
  { code: 'bn', displayNameJa: 'ベンガル語', displayNameEn: 'Bengali', nativeName: 'বাংলা', isActive: true, sortOrder: 22 },
  { code: 'ta', displayNameJa: 'タミル語', displayNameEn: 'Tamil', nativeName: 'தமிழ்', isActive: true, sortOrder: 23 },
  { code: 'ar-msa', displayNameJa: 'アラビア語（標準）', displayNameEn: 'Arabic (MSA)', nativeName: 'العربية الفصحى', isActive: true, sortOrder: 24 },
  { code: 'ar-eg', displayNameJa: 'エジプトアラビア語', displayNameEn: 'Egyptian Arabic', nativeName: 'مصري', isActive: true, sortOrder: 25 },
  { code: 'ar-gulf', displayNameJa: '湾岸アラビア語', displayNameEn: 'Gulf Arabic', nativeName: 'خليجي', isActive: true, sortOrder: 26 },
  { code: 'sv', displayNameJa: 'スウェーデン語', displayNameEn: 'Swedish', nativeName: 'Svenska', isActive: true, sortOrder: 27 },
  { code: 'no', displayNameJa: 'ノルウェー語', displayNameEn: 'Norwegian', nativeName: 'Norsk', isActive: true, sortOrder: 28 },
  { code: 'pl', displayNameJa: 'ポーランド語', displayNameEn: 'Polish', nativeName: 'Polski', isActive: true, sortOrder: 29 },
  { code: 'el', displayNameJa: 'ギリシャ語', displayNameEn: 'Greek', nativeName: 'Ελληνικά', isActive: true, sortOrder: 30 },
  { code: 'cs', displayNameJa: 'チェコ語', displayNameEn: 'Czech', nativeName: 'Čeština', isActive: true, sortOrder: 31 },
]

// ── Learning Language Variants ──

export type LearningLanguageVariant = {
  id: string
  languageCode: string
  uiLanguageCode: UiLanguageCode
  familyCode: string | null
  countryCode: string | null
  cityCode: string | null
  variantCode: string | null
  displayNameJa: string
  displayNameEn: string
  nativeName: string
  supportsLearning: boolean
  supportsUi: boolean
  isDefaultForUi: boolean
  isActive: boolean
  sortOrder: number
}

function v(
  id: string, languageCode: string, uiLanguageCode: UiLanguageCode, familyCode: string | null,
  countryCode: string | null, cityCode: string | null, variantCode: string | null,
  displayNameJa: string, displayNameEn: string, nativeName: string,
  opts: { supportsUi?: boolean; isDefaultForUi?: boolean; sortOrder?: number } = {},
): LearningLanguageVariant {
  return {
    id, languageCode, uiLanguageCode, familyCode, countryCode, cityCode, variantCode,
    displayNameJa, displayNameEn, nativeName,
    supportsLearning: true, supportsUi: opts.supportsUi ?? false,
    isDefaultForUi: opts.isDefaultForUi ?? false, isActive: true,
    sortOrder: opts.sortOrder ?? 99,
  }
}

export const LEARNING_LANGUAGE_VARIANTS: LearningLanguageVariant[] = [
  // ── English ──
  v('en-us-nyc', 'en', 'en', 'germanic', 'us', 'nyc', null, '英語（ニューヨーク）', 'English (New York)', 'English (NYC)', { supportsUi: true, isDefaultForUi: true, sortOrder: 1 }),
  v('en-us-lax', 'en', 'en', 'germanic', 'us', 'lax', null, '英語（ロサンゼルス）', 'English (Los Angeles)', 'English (LA)', { sortOrder: 2 }),
  v('en-gb-lon', 'en', 'en', 'germanic', 'gb', 'lon', null, '英語（ロンドン）', 'English (London)', 'English (London)', { sortOrder: 3 }),
  v('en-au-syd', 'en', 'en', 'germanic', 'au', 'syd', null, '英語（シドニー）', 'English (Sydney)', 'English (Sydney)', { sortOrder: 4 }),

  // ── Spanish ──
  v('es-es-mad', 'es', 'es', 'romance', 'es', 'mad', null, 'スペイン語（マドリード）', 'Spanish (Madrid)', 'Español (Madrid)', { supportsUi: true, isDefaultForUi: true, sortOrder: 10 }),
  v('es-mx-mex', 'es', 'es', 'romance', 'mx', 'mex', null, 'スペイン語（メキシコシティ）', 'Spanish (Mexico City)', 'Español (CDMX)', { sortOrder: 11 }),
  v('es-ar-bue', 'es', 'es', 'romance', 'ar', 'bue', null, 'スペイン語（ブエノスアイレス）', 'Spanish (Buenos Aires)', 'Español (Buenos Aires)', { sortOrder: 12 }),

  // ── French ──
  v('fr-fr-par', 'fr', 'fr', 'romance', 'fr', 'par', null, 'フランス語（パリ）', 'French (Paris)', 'Français (Paris)', { supportsUi: true, isDefaultForUi: true, sortOrder: 15 }),
  v('fr-ca-mtl', 'fr', 'fr', 'romance', 'ca', 'mtl', null, 'フランス語（モントリオール）', 'French (Montreal)', 'Français (Montréal)', { sortOrder: 16 }),

  // ── Portuguese ──
  v('pt-br-sao', 'pt', 'pt', 'romance', 'br', 'sao', null, 'ポルトガル語（サンパウロ）', 'Portuguese (São Paulo)', 'Português (São Paulo)', { supportsUi: true, isDefaultForUi: true, sortOrder: 20 }),
  v('pt-pt-lis', 'pt', 'pt', 'romance', 'pt', 'lis', null, 'ポルトガル語（リスボン）', 'Portuguese (Lisbon)', 'Português (Lisboa)', { sortOrder: 21 }),

  // ── Vietnamese ──
  v('vi-vn-han', 'vi', 'vi', null, 'vn', 'han', null, 'ベトナム語（ハノイ）', 'Vietnamese (Hanoi)', 'Tiếng Việt (Hà Nội)', { supportsUi: true, isDefaultForUi: true, sortOrder: 25 }),
  v('vi-vn-hcm', 'vi', 'vi', null, 'vn', 'hcm', null, 'ベトナム語（ホーチミン）', 'Vietnamese (Ho Chi Minh)', 'Tiếng Việt (TP.HCM)', { sortOrder: 26 }),

  // ── Italian / Russian / Turkish / Persian / Thai ──
  v('it-it-rom', 'it', 'it', 'romance', 'it', 'rom', null, 'イタリア語（ローマ）', 'Italian (Rome)', 'Italiano (Roma)', { supportsUi: true, isDefaultForUi: true, sortOrder: 30 }),
  v('ru-ru-mos', 'ru', 'ru', 'slavic', 'ru', 'mos', null, 'ロシア語（モスクワ）', 'Russian (Moscow)', 'Русский (Москва)', { supportsUi: true, isDefaultForUi: true, sortOrder: 31 }),
  v('tr-tr-ist', 'tr', 'tr', 'turkic', 'tr', 'ist', null, 'トルコ語（イスタンブール）', 'Turkish (Istanbul)', 'Türkçe (İstanbul)', { supportsUi: true, isDefaultForUi: true, sortOrder: 32 }),
  v('fa-ir-teh', 'fa', 'fa', 'iranian', 'ir', 'teh', null, 'ペルシア語（テヘラン）', 'Persian (Tehran)', 'فارسی (تهران)', { supportsUi: true, isDefaultForUi: true, sortOrder: 33 }),
  v('th-th-bkk', 'th', 'th', null, 'th', 'bkk', null, 'タイ語（バンコク）', 'Thai (Bangkok)', 'ไทย (กรุงเทพ)', { supportsUi: true, isDefaultForUi: true, sortOrder: 34 }),

  // ── Nordic / European ──
  v('sv-se-sto', 'sv', 'sv', 'germanic', 'se', 'sto', null, 'スウェーデン語（ストックホルム）', 'Swedish (Stockholm)', 'Svenska (Stockholm)', { supportsUi: true, isDefaultForUi: true, sortOrder: 40 }),
  v('no-no-osl', 'no', 'no', 'germanic', 'no', 'osl', null, 'ノルウェー語（オスロ）', 'Norwegian (Oslo)', 'Norsk (Oslo)', { supportsUi: true, isDefaultForUi: true, sortOrder: 41 }),
  v('pl-pl-war', 'pl', 'pl', 'slavic', 'pl', 'war', null, 'ポーランド語（ワルシャワ）', 'Polish (Warsaw)', 'Polski (Warszawa)', { supportsUi: true, isDefaultForUi: true, sortOrder: 42 }),
  v('el-gr-ath', 'el', 'el', 'hellenic', 'gr', 'ath', null, 'ギリシャ語（アテネ）', 'Greek (Athens)', 'Ελληνικά (Αθήνα)', { supportsUi: true, isDefaultForUi: true, sortOrder: 43 }),
  v('cs-cz-pra', 'cs', 'cs', 'slavic', 'cz', 'pra', null, 'チェコ語（プラハ）', 'Czech (Prague)', 'Čeština (Praha)', { supportsUi: true, isDefaultForUi: true, sortOrder: 44 }),

  // ── Southeast Asian ──
  v('id-id-jkt', 'id', 'id', 'austronesian', 'id', 'jkt', null, 'インドネシア語（ジャカルタ）', 'Indonesian (Jakarta)', 'Bahasa Indonesia (Jakarta)', { supportsUi: true, isDefaultForUi: true, sortOrder: 50 }),
  v('ms-my-kul', 'ms', 'ms', 'austronesian', 'my', 'kul', null, 'マレー語（クアラルンプール）', 'Malay (Kuala Lumpur)', 'Bahasa Melayu (KL)', { supportsUi: true, isDefaultForUi: true, sortOrder: 51 }),
  v('tl-ph-mnl', 'tl', 'tl', 'austronesian', 'ph', 'mnl', null, 'タガログ語（マニラ）', 'Tagalog (Manila)', 'Tagalog (Maynila)', { supportsUi: true, isDefaultForUi: true, sortOrder: 52 }),
  v('fil-en-ph-mnl', 'fil-en', 'fil-en', 'austronesian', 'ph', 'mnl', null, 'フィリピン英語（マニラ）', 'Philippine English (Manila)', 'Philippine English (Manila)', { supportsUi: true, isDefaultForUi: true, sortOrder: 53 }),

  // ── Chinese (separate learning languages) ──
  v('zh-mandarin-cn-beijing', 'zh-mandarin', 'zh-mandarin', 'chinese', 'cn', 'beijing', null, '中国語 普通話（北京）', 'Mandarin (Beijing)', '普通话（北京）', { supportsUi: true, isDefaultForUi: true, sortOrder: 60 }),
  v('zh-mandarin-tw-taipei', 'zh-mandarin', 'zh-mandarin', 'chinese', 'tw', 'taipei', null, '中国語 普通話（台北）', 'Mandarin (Taipei)', '國語（台北）', { sortOrder: 61 }),
  v('yue-cn-guangdong', 'yue', 'yue', 'chinese', 'cn', 'guangdong', null, '広東語（広東）', 'Cantonese (Guangdong)', '粵語（廣東）', { supportsUi: true, isDefaultForUi: true, sortOrder: 62 }),
  v('yue-hk-hongkong', 'yue', 'yue', 'chinese', 'hk', 'hongkong', null, '広東語（香港）', 'Cantonese (Hong Kong)', '粵語（香港）', { sortOrder: 63 }),

  // ── Arabic (separate learning languages) ──
  v('ar-msa', 'ar-msa', 'ar-msa', 'semitic', null, null, null, 'アラビア語（標準）', 'Arabic (MSA)', 'العربية الفصحى', { supportsUi: true, isDefaultForUi: true, sortOrder: 70 }),
  v('ar-eg-cairo', 'ar-eg', 'ar-eg', 'semitic', 'eg', 'cairo', null, 'エジプトアラビア語（カイロ）', 'Egyptian Arabic (Cairo)', 'مصري (القاهرة)', { supportsUi: true, isDefaultForUi: true, sortOrder: 71 }),
  v('ar-gulf-riyadh', 'ar-gulf', 'ar-gulf', 'semitic', 'sa', 'riyadh', null, '湾岸アラビア語（リヤド）', 'Gulf Arabic (Riyadh)', 'خليجي (الرياض)', { supportsUi: true, isDefaultForUi: true, sortOrder: 72 }),

  // ── South Asian (separate learning languages) ──
  v('hi-in-delhi', 'hi', 'hi', 'indo-aryan', 'in', 'delhi', null, 'ヒンディー語（デリー）', 'Hindi (Delhi)', 'हिन्दी (दिल्ली)', { supportsUi: true, isDefaultForUi: true, sortOrder: 80 }),
  v('bn-in-kolkata', 'bn', 'bn', 'indo-aryan', 'in', 'kolkata', null, 'ベンガル語（コルカタ）', 'Bengali (Kolkata)', 'বাংলা (কলকাতা)', { supportsUi: true, isDefaultForUi: true, sortOrder: 81 }),
  v('ta-in-chennai', 'ta', 'ta', 'dravidian', 'in', 'chennai', null, 'タミル語（チェンナイ）', 'Tamil (Chennai)', 'தமிழ் (சென்னை)', { supportsUi: true, isDefaultForUi: true, sortOrder: 82 }),

  // ── MVP condensed ──
  v('ja-jp-tokyo', 'ja', 'ja', 'japonic', 'jp', 'tokyo', null, '日本語（東京）', 'Japanese (Tokyo)', '日本語（東京）', { supportsUi: true, isDefaultForUi: true, sortOrder: 90 }),
  v('ko-kr-seoul', 'ko', 'ko', 'koreanic', 'kr', 'seoul', null, '韓国語（ソウル）', 'Korean (Seoul)', '한국어 (서울)', { supportsUi: true, isDefaultForUi: true, sortOrder: 91 }),
  v('de-de-berlin', 'de', 'de', 'germanic', 'de', 'berlin', null, 'ドイツ語（ベルリン）', 'German (Berlin)', 'Deutsch (Berlin)', { supportsUi: true, isDefaultForUi: true, sortOrder: 92 }),
  v('nl-nl-amsterdam', 'nl', 'nl', 'germanic', 'nl', 'amsterdam', null, 'オランダ語（アムステルダム）', 'Dutch (Amsterdam)', 'Nederlands (Amsterdam)', { supportsUi: true, isDefaultForUi: true, sortOrder: 93 }),
  v('nl-be-flanders', 'nl', 'nl', 'germanic', 'be', 'flanders', null, 'オランダ語（フランダース）', 'Dutch (Flanders)', 'Nederlands (Vlaanderen)', { sortOrder: 94 }),
]

// ── Helper functions ──

export function getLearningLanguageVariantById(id: string): LearningLanguageVariant | undefined {
  return LEARNING_LANGUAGE_VARIANTS.find((v) => v.id === id)
}

export function getActiveLearningLanguageVariants(): LearningLanguageVariant[] {
  return LEARNING_LANGUAGE_VARIANTS.filter((v) => v.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getUiLanguageOptions(): UiLanguageOption[] {
  return UI_LANGUAGE_OPTIONS.filter((o) => o.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getLearningVariantsByUiLanguageCode(code: UiLanguageCode): LearningLanguageVariant[] {
  return LEARNING_LANGUAGE_VARIANTS.filter((v) => v.uiLanguageCode === code && v.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getDefaultLearningVariantForUiLanguage(code: UiLanguageCode): LearningLanguageVariant | undefined {
  return LEARNING_LANGUAGE_VARIANTS.find((v) => v.uiLanguageCode === code && v.isDefaultForUi && v.isActive)
}

// ── Backward-compatible exports ──
// These maintain API compatibility with existing consumers.

export type LanguageOption = {
  code: string
  label: string
  labelJa: string
  regions: { code: string; label: string; labelJa: string }[]
}

/** @deprecated Use LEARNING_LANGUAGE_VARIANTS + helpers instead */
export const SUPPORTED_LANGUAGES: LanguageOption[] = (() => {
  const grouped = new Map<string, LanguageOption>()
  for (const v of LEARNING_LANGUAGE_VARIANTS) {
    if (!grouped.has(v.languageCode)) {
      grouped.set(v.languageCode, { code: v.languageCode, label: v.displayNameEn.split('(')[0].trim(), labelJa: v.displayNameJa.split('（')[0].trim(), regions: [] })
    }
    const entry = grouped.get(v.languageCode)!
    if (v.countryCode && !entry.regions.some((r) => r.code === v.countryCode)) {
      entry.regions.push({ code: v.countryCode, label: v.countryCode.toUpperCase(), labelJa: v.displayNameJa.match(/（(.+?)）/)?.[1] ?? v.countryCode })
    }
  }
  return [...grouped.values()]
})()

/** @deprecated Use getLearningLanguageVariantById or getActiveLearningLanguageVariants */
export function getLanguageLabel(code: string): string {
  const variant = LEARNING_LANGUAGE_VARIANTS.find((v) => v.languageCode === code || v.id === code)
  return variant?.displayNameJa ?? code
}

/** @deprecated Use getLearningLanguageVariantById */
export function getRegionLabel(langCode: string, regionCode: string): string {
  const variant = LEARNING_LANGUAGE_VARIANTS.find((v) => v.languageCode === langCode && v.countryCode === regionCode)
  return variant?.displayNameJa ?? regionCode
}
