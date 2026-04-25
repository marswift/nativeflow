/**
 * Region registry repository: reads region data from DB.
 *
 * Single source of truth for region selection at runtime.
 * Falls back to REGION_MASTER constants if DB is unreachable.
 */
import { createClient } from '@supabase/supabase-js'
import { getRegionsForLanguage as getRegionsFromConstants } from '@/lib/constants'

// ── Types ──

export type RegionRegistryRow = {
  id: string
  region_code: string
  language_code: string
  display_name: string
  native_display_name: string | null
  country_code: string | null
  city_or_variant: string | null
  is_default: boolean
  status: 'draft' | 'internal' | 'beta' | 'released' | 'archived'
  created_at: string
  updated_at: string
}

export type RegionRegistryItem = {
  code: string
  languageCode: string
  displayName: string
  nativeDisplayName: string | null
  countryCode: string | null
  cityOrVariant: string | null
  isDefault: boolean
  status: RegionRegistryRow['status']
}

const COLUMNS = 'id,region_code,language_code,display_name,native_display_name,country_code,city_or_variant,is_default,status' as const
const ACTIVE_STATUSES = ['released', 'beta'] as const

// ── Supabase ──

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function mapRow(row: RegionRegistryRow): RegionRegistryItem {
  return {
    code: row.region_code,
    languageCode: row.language_code,
    displayName: row.display_name,
    nativeDisplayName: row.native_display_name,
    countryCode: row.country_code,
    cityOrVariant: row.city_or_variant,
    isDefault: row.is_default,
    status: row.status,
  }
}

// ── Queries ──

/** Get active/beta regions for a language from DB. */
export async function getActiveRegionsForLanguage(languageCode: string): Promise<RegionRegistryItem[]> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('region_registry')
    .select(COLUMNS)
    .eq('language_code', languageCode)
    .in('status', [...ACTIVE_STATUSES])
    .order('is_default', { ascending: false })
    .order('display_name', { ascending: true })

  if (error) throw new Error(`Region registry: ${error.message}`)
  return (data as RegionRegistryRow[] ?? []).map(mapRow)
}

/** Get default region for a language. Returns null if none set. */
export async function getDefaultRegionForLanguage(languageCode: string): Promise<RegionRegistryItem | null> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('region_registry')
    .select(COLUMNS)
    .eq('language_code', languageCode)
    .eq('is_default', true)
    .in('status', [...ACTIVE_STATUSES])
    .maybeSingle()

  if (error) throw new Error(`Region registry default: ${error.message}`)
  return data ? mapRow(data as RegionRegistryRow) : null
}

// ── Fallback ──

/** Fallback: read from hardcoded REGION_MASTER when DB is unreachable. */
export function getRegionsFallback(languageCode: string): RegionRegistryItem[] {
  return getRegionsFromConstants(languageCode)
    .filter((r) => r.enabled)
    .map((r) => ({
      code: r.code,
      languageCode: r.languageCode,
      displayName: r.displayLabel,
      nativeDisplayName: null,
      countryCode: null,
      cityOrVariant: r.cityLabel,
      isDefault: false,
      status: 'released' as const,
    }))
}
