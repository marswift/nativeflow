type OptionItem<TValue extends string> = {
  value: TValue
  label: string
}

// ─── UI language (app interface) ───────────────────────────────────────────
// App interface language is fixed to Japanese for now. This structure is designed
// for future expansion: the app UI must support 10+ languages later (language switcher, i18n).
// Do not confuse with "target learning language" below.
/** UI language: language of the app interface. */
export const UI_LANGUAGE_OPTIONS: readonly OptionItem<'ja' | 'en' | 'ko' | 'zh'>[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: '英語' },
  { value: 'ko', label: '韓国語' },
  { value: 'zh', label: '中国語' },
] as const

export type UiLanguageCode = (typeof UI_LANGUAGE_OPTIONS)[number]['value']

/** MVP: app interface language is fixed to Japanese. Use this when a single UI language is required. */
export const UI_LANGUAGE_FIXED = 'ja' as const

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE MASTER — single source of truth for all learning languages
// ═══════════════════════════════════════════════════════════════════════════

export type LanguageMasterEntry = {
  code: string
  label: string
  enabled: boolean
  hasConversationContent: boolean
}

export const LANGUAGE_MASTER: readonly LanguageMasterEntry[] = [
  // ── Available (production) ──
  { code: 'en', label: '英語', enabled: true, hasConversationContent: true },
  { code: 'ko', label: '韓国語', enabled: true, hasConversationContent: true },
  // ── Preparing (future) ──
  { code: 'ja', label: '日本語', enabled: false, hasConversationContent: false },
  { code: 'zh', label: '中国語', enabled: false, hasConversationContent: false },
  { code: 'es', label: 'スペイン語', enabled: false, hasConversationContent: false },
  { code: 'fr', label: 'フランス語', enabled: false, hasConversationContent: false },
  { code: 'de', label: 'ドイツ語', enabled: false, hasConversationContent: false },
  { code: 'it', label: 'イタリア語', enabled: false, hasConversationContent: false },
  { code: 'pt', label: 'ポルトガル語', enabled: false, hasConversationContent: false },
  { code: 'th', label: 'タイ語', enabled: false, hasConversationContent: false },
  { code: 'vi', label: 'ベトナム語', enabled: false, hasConversationContent: false },
  { code: 'nl', label: 'オランダ語', enabled: false, hasConversationContent: false },
  { code: 'sv', label: 'スウェーデン語', enabled: false, hasConversationContent: false },
  { code: 'no', label: 'ノルウェー語', enabled: false, hasConversationContent: false },
  { code: 'pl', label: 'ポーランド語', enabled: false, hasConversationContent: false },
  { code: 'el', label: 'ギリシャ語', enabled: false, hasConversationContent: false },
  { code: 'cs', label: 'チェコ語', enabled: false, hasConversationContent: false },
  { code: 'tr', label: 'トルコ語', enabled: false, hasConversationContent: false },
  { code: 'fa', label: 'ペルシャ語', enabled: false, hasConversationContent: false },
  { code: 'ru', label: 'ロシア語', enabled: false, hasConversationContent: false },
  { code: 'ar', label: 'アラビア語', enabled: false, hasConversationContent: false },
  { code: 'hi', label: 'ヒンディー語', enabled: false, hasConversationContent: false },
  { code: 'bn', label: 'ベンガル語', enabled: false, hasConversationContent: false },
  { code: 'ta', label: 'タミル語', enabled: false, hasConversationContent: false },
  { code: 'tl', label: 'タガログ語', enabled: false, hasConversationContent: false },
] as const

// ═══════════════════════════════════════════════════════════════════════════
// REGION MASTER — single source of truth for all country/city variants
// ═══════════════════════════════════════════════════════════════════════════

export type RegionMasterEntry = {
  code: string
  languageCode: string
  countryLabel: string
  cityLabel: string
  displayLabel: string
  enabled: boolean
  hasConversationContent: boolean
}

export const REGION_MASTER: readonly RegionMasterEntry[] = [
  // ── English ──
  { code: 'en_us_new_york', languageCode: 'en', countryLabel: 'アメリカ', cityLabel: 'ニューヨーク', displayLabel: 'アメリカ / ニューヨーク', enabled: true, hasConversationContent: true },
  { code: 'en_us_los_angeles', languageCode: 'en', countryLabel: 'アメリカ', cityLabel: 'ロサンゼルス', displayLabel: 'アメリカ / ロサンゼルス', enabled: true, hasConversationContent: true },
  { code: 'en_gb_london', languageCode: 'en', countryLabel: 'イギリス', cityLabel: 'ロンドン', displayLabel: 'イギリス / ロンドン', enabled: true, hasConversationContent: true },
  { code: 'en_au_sydney', languageCode: 'en', countryLabel: 'オーストラリア', cityLabel: 'シドニー', displayLabel: 'オーストラリア / シドニー', enabled: true, hasConversationContent: true },
  // ── Japanese ──
  { code: 'ja_jp_tokyo', languageCode: 'ja', countryLabel: '日本', cityLabel: '東京', displayLabel: '日本 / 東京', enabled: false, hasConversationContent: false },
  { code: 'ja_jp_osaka', languageCode: 'ja', countryLabel: '日本', cityLabel: '大阪', displayLabel: '日本 / 大阪', enabled: false, hasConversationContent: false },
  { code: 'ja_jp_kyoto', languageCode: 'ja', countryLabel: '日本', cityLabel: '京都', displayLabel: '日本 / 京都', enabled: false, hasConversationContent: false },
  { code: 'ja_jp_hiroshima', languageCode: 'ja', countryLabel: '日本', cityLabel: '広島', displayLabel: '日本 / 広島', enabled: false, hasConversationContent: false },
  { code: 'ja_jp_fukuoka', languageCode: 'ja', countryLabel: '日本', cityLabel: '福岡', displayLabel: '日本 / 福岡', enabled: false, hasConversationContent: false },
  // ── Korean ──
  { code: 'ko_kr_seoul', languageCode: 'ko', countryLabel: '韓国', cityLabel: 'ソウル', displayLabel: '韓国 / ソウル', enabled: true, hasConversationContent: true },
  { code: 'ko_kr_busan', languageCode: 'ko', countryLabel: '韓国', cityLabel: '釜山', displayLabel: '韓国 / 釜山', enabled: false, hasConversationContent: false },
  // ── Chinese ──
  { code: 'zh_cn_beijing', languageCode: 'zh', countryLabel: '中国', cityLabel: '北京', displayLabel: '中国 / 北京', enabled: false, hasConversationContent: false },
  { code: 'zh_cn_guangdong', languageCode: 'zh', countryLabel: '中国', cityLabel: '広東', displayLabel: '中国 / 広東', enabled: false, hasConversationContent: false },
  { code: 'zh_tw_taipei', languageCode: 'zh', countryLabel: '台湾', cityLabel: '台北', displayLabel: '台湾 / 台北', enabled: false, hasConversationContent: false },
  // ── Spanish ──
  { code: 'es_es_madrid', languageCode: 'es', countryLabel: 'スペイン', cityLabel: 'マドリード', displayLabel: 'スペイン / マドリード', enabled: false, hasConversationContent: false },
  { code: 'es_mx_mexico_city', languageCode: 'es', countryLabel: 'メキシコ', cityLabel: 'メキシコシティ', displayLabel: 'メキシコ / メキシコシティ', enabled: false, hasConversationContent: false },
  { code: 'es_ar_buenos_aires', languageCode: 'es', countryLabel: 'アルゼンチン', cityLabel: 'ブエノスアイレス', displayLabel: 'アルゼンチン / ブエノスアイレス', enabled: false, hasConversationContent: false },
  // ── French ──
  { code: 'fr_fr_paris', languageCode: 'fr', countryLabel: 'フランス', cityLabel: 'パリ', displayLabel: 'フランス / パリ', enabled: false, hasConversationContent: false },
  { code: 'fr_ca_montreal', languageCode: 'fr', countryLabel: 'カナダ', cityLabel: 'モントリオール', displayLabel: 'カナダ / モントリオール', enabled: false, hasConversationContent: false },
  // ── Portuguese ──
  { code: 'pt_br_sao_paulo', languageCode: 'pt', countryLabel: 'ブラジル', cityLabel: 'サンパウロ', displayLabel: 'ブラジル / サンパウロ', enabled: false, hasConversationContent: false },
  { code: 'pt_pt_lisbon', languageCode: 'pt', countryLabel: 'ポルトガル', cityLabel: 'リスボン', displayLabel: 'ポルトガル / リスボン', enabled: false, hasConversationContent: false },
  // ── German ──
  { code: 'de_de_berlin', languageCode: 'de', countryLabel: 'ドイツ', cityLabel: 'ベルリン', displayLabel: 'ドイツ / ベルリン', enabled: false, hasConversationContent: false },
  { code: 'de_ch_zurich', languageCode: 'de', countryLabel: 'スイス', cityLabel: 'チューリッヒ', displayLabel: 'スイス / チューリッヒ', enabled: false, hasConversationContent: false },
  // ── Arabic ──
  { code: 'ar_msa', languageCode: 'ar', countryLabel: '国際', cityLabel: '標準アラビア語', displayLabel: '国際 / 標準アラビア語', enabled: false, hasConversationContent: false },
  { code: 'ar_eg_cairo', languageCode: 'ar', countryLabel: 'エジプト', cityLabel: 'カイロ', displayLabel: 'エジプト / カイロ', enabled: false, hasConversationContent: false },
  { code: 'ar_sa_riyadh', languageCode: 'ar', countryLabel: 'サウジアラビア', cityLabel: 'リヤド', displayLabel: 'サウジアラビア / リヤド', enabled: false, hasConversationContent: false },
  // ── Italian ──
  { code: 'it_it_rome', languageCode: 'it', countryLabel: 'イタリア', cityLabel: 'ローマ', displayLabel: 'イタリア / ローマ', enabled: false, hasConversationContent: false },
  // ── Thai ──
  { code: 'th_th_bangkok', languageCode: 'th', countryLabel: 'タイ', cityLabel: 'バンコク', displayLabel: 'タイ / バンコク', enabled: false, hasConversationContent: false },
  // ── Vietnamese ──
  { code: 'vi_vn_hanoi', languageCode: 'vi', countryLabel: 'ベトナム', cityLabel: 'ハノイ', displayLabel: 'ベトナム / ハノイ', enabled: false, hasConversationContent: false },
  { code: 'vi_vn_ho_chi_minh', languageCode: 'vi', countryLabel: 'ベトナム', cityLabel: 'ホーチミン', displayLabel: 'ベトナム / ホーチミン', enabled: false, hasConversationContent: false },
  // ── Dutch ──
  { code: 'nl_nl_amsterdam', languageCode: 'nl', countryLabel: 'オランダ', cityLabel: 'アムステルダム', displayLabel: 'オランダ / アムステルダム', enabled: false, hasConversationContent: false },
  { code: 'nl_be_brussels', languageCode: 'nl', countryLabel: 'ベルギー', cityLabel: 'ブリュッセル', displayLabel: 'ベルギー / ブリュッセル', enabled: false, hasConversationContent: false },
  // ── Swedish ──
  { code: 'sv_se_stockholm', languageCode: 'sv', countryLabel: 'スウェーデン', cityLabel: 'ストックホルム', displayLabel: 'スウェーデン / ストックホルム', enabled: false, hasConversationContent: false },
  // ── Norwegian ──
  { code: 'no_no_oslo', languageCode: 'no', countryLabel: 'ノルウェー', cityLabel: 'オスロ', displayLabel: 'ノルウェー / オスロ', enabled: false, hasConversationContent: false },
  // ── Polish ──
  { code: 'pl_pl_warsaw', languageCode: 'pl', countryLabel: 'ポーランド', cityLabel: 'ワルシャワ', displayLabel: 'ポーランド / ワルシャワ', enabled: false, hasConversationContent: false },
  // ── Greek ──
  { code: 'el_gr_athens', languageCode: 'el', countryLabel: 'ギリシャ', cityLabel: 'アテネ', displayLabel: 'ギリシャ / アテネ', enabled: false, hasConversationContent: false },
  // ── Czech ──
  { code: 'cs_cz_prague', languageCode: 'cs', countryLabel: 'チェコ', cityLabel: 'プラハ', displayLabel: 'チェコ / プラハ', enabled: false, hasConversationContent: false },
  // ── Turkish ──
  { code: 'tr_tr_istanbul', languageCode: 'tr', countryLabel: 'トルコ', cityLabel: 'イスタンブール', displayLabel: 'トルコ / イスタンブール', enabled: false, hasConversationContent: false },
  // ── Persian ──
  { code: 'fa_ir_tehran', languageCode: 'fa', countryLabel: 'イラン', cityLabel: 'テヘラン', displayLabel: 'イラン / テヘラン', enabled: false, hasConversationContent: false },
  // ── Russian ──
  { code: 'ru_ru_moscow', languageCode: 'ru', countryLabel: 'ロシア', cityLabel: 'モスクワ', displayLabel: 'ロシア / モスクワ', enabled: false, hasConversationContent: false },
  // ── Hindi ──
  { code: 'hi_in_delhi', languageCode: 'hi', countryLabel: 'インド', cityLabel: 'デリー', displayLabel: 'インド / デリー', enabled: false, hasConversationContent: false },
  // ── Bengali ──
  { code: 'bn_in_kolkata', languageCode: 'bn', countryLabel: 'インド', cityLabel: 'コルカタ', displayLabel: 'インド / コルカタ', enabled: false, hasConversationContent: false },
  // ── Tamil ──
  { code: 'ta_in_chennai', languageCode: 'ta', countryLabel: 'インド', cityLabel: 'チェンナイ', displayLabel: 'インド / チェンナイ', enabled: false, hasConversationContent: false },
  // ── Tagalog ──
  { code: 'tl_ph_manila', languageCode: 'tl', countryLabel: 'フィリピン', cityLabel: 'マニラ', displayLabel: 'フィリピン / マニラ', enabled: false, hasConversationContent: false },
] as const

// ═══════════════════════════════════════════════════════════════════════════
// Derived exports — backward-compatible with existing consumers
// ═══════════════════════════════════════════════════════════════════════════

// ─── Target learning language ───────────────────────────────────────────────
// Derived from LANGUAGE_MASTER. Preserves the exact shape consumers expect:
// { value, label, enabled, hasConversationContent }

/** Target learning language with enabled flag and content availability. */
export const TARGET_LANGUAGE_OPTIONS = LANGUAGE_MASTER.map((entry) => ({
  value: entry.code,
  label: entry.label,
  enabled: entry.enabled,
  hasConversationContent: entry.hasConversationContent,
}))

export type TargetLanguageOption = (typeof TARGET_LANGUAGE_OPTIONS)[number]
export type TargetLanguageCode = LanguageMasterEntry['code']

/** MVP: target learning language is fixed to English. Use this when a single learning language is required. */
export const TARGET_LANGUAGE_FIXED = 'en' as const

/** Korean fixed region slug (only Seoul supported in MVP). */
export const KOREAN_FIXED_REGION_SLUG = 'ko_kr_seoul' as const

/** Options for languages that are currently enabled (onboarding shows only these). */
export const ENABLED_TARGET_LANGUAGE_OPTIONS = TARGET_LANGUAGE_OPTIONS.filter(
  (option) => option.enabled
)

// ─── Country/region options per language ─────────────────────────────────────
// Derived from REGION_MASTER. Consumers get { value, label } arrays per language code.

/** Country/region options per target learning language. Derived from REGION_MASTER. */
export const COUNTRY_BY_LANGUAGE: Record<string, readonly OptionItem<string>[]> = (() => {
  const map: Record<string, OptionItem<string>[]> = {}
  for (const lang of LANGUAGE_MASTER) {
    map[lang.code] = []
  }
  for (const region of REGION_MASTER) {
    if (!map[region.languageCode]) map[region.languageCode] = []
    map[region.languageCode].push({ value: region.code, label: region.displayLabel })
  }
  return map
})()

/** Look up a region entry by its code. */
export function getRegionByCode(code: string): RegionMasterEntry | undefined {
  return REGION_MASTER.find((r) => r.code === code)
}

/** Get all regions for a language code. */
export function getRegionsForLanguage(languageCode: string): readonly RegionMasterEntry[] {
  return REGION_MASTER.filter((r) => r.languageCode === languageCode)
}

/** Look up a language entry by its code. */
export function getLanguageByCode(code: string): LanguageMasterEntry | undefined {
  return LANGUAGE_MASTER.find((l) => l.code === code)
}

// ─── Level & session length ─────────────────────────────────────────────────

/** Current level (MVP: beginner, intermediate, advanced) */
export const CURRENT_LEVEL_OPTIONS: readonly OptionItem<'beginner' | 'intermediate' | 'advanced'>[] = [
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '上級' },
] as const

export type CurrentLevel = (typeof CURRENT_LEVEL_OPTIONS)[number]['value']

/** Preferred session length (MVP: short, standard, deep) */
export const PREFERRED_SESSION_LENGTH_OPTIONS: readonly OptionItem<'short' | 'standard' | 'deep'>[] = [
  { value: 'short', label: '短い' },
  { value: 'standard', label: '標準' },
  { value: 'deep', label: '長め' },
] as const

export type PreferredSessionLength =
  (typeof PREFERRED_SESSION_LENGTH_OPTIONS)[number]['value']
