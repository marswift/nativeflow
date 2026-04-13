# Implementation Spec: Next.js + Supabase + OpenAI

**Architecture summary**: NativeFlow is an AI-powered language learning SaaS built on Next.js 15 App Router, Supabase (Auth/DB/Storage), OpenAI (chat/TTS/STT), and Stripe. The app currently serves Japanese-speaking English learners with partial Korean support scaffolded. This spec covers the multilingual expansion: UI localization, locale-aware routing, language preference persistence, AI prompt parameterization, analytics, and rollout strategy.

---

## 1. Repository Findings

### Confirmed

| Item | Finding |
|---|---|
| Framework | Next.js 15.2, App Router, React 19, TypeScript strict mode |
| Path alias | `@/*` maps to project root |
| Supabase | `@supabase/ssr` ^0.9 + `@supabase/supabase-js` ^2.78; browser client (`lib/supabase/browser-client.ts`), server client (`lib/supabase-server.ts` with service role) |
| OpenAI | `openai` ^6.27; server-only singleton (`lib/openai-client.ts`); chat completions, TTS (`gpt-4o-mini-tts`), STT (`gpt-4o-transcribe`) |
| Stripe | `stripe` ^20.4; checkout, portal, webhooks |
| CSS | Tailwind CSS v4 |
| i18n library | **None installed**. Manual copy objects in `lib/auth-copy.ts`, `lib/onboarding-copy.ts`, `lib/lesson-copy.ts` |
| Analytics | Custom lightweight: `lib/analytics.ts` fires to `/api/track`; 5 event types; no third-party SDK |
| Testing | **No test framework configured**. Three `.test.ts` files exist as utility checks (no runner) |
| Feature flags | Single flag: `NEXT_PUBLIC_LESSON_DEBUG`. No framework |
| ORM | None. Direct Supabase API + custom repository pattern |
| Middleware | `middleware.ts` handles rate limiting only (no auth, no i18n) |
| DB tables | 28 tables; 18 SQL migrations in `supabase/migrations/` |
| User profile | `UserProfileRow` with 103 fields including `ui_language_code`, `native_language_code`, `target_language_code`, `target_region_slug` |
| Language registry | `language_registry` DB table with `enabled_for_ui`, `enabled_for_learning`, `supports_tts/stt/ai_generation` flags; accessed via `lib/language-registry-repository.ts` |
| User language prefs | `user_language_preferences` DB table with `app_locale`, `learning_language`, `base_language`, `cefr_level`, `preferred_region`, `preferred_age_band` |
| Content pipeline | 9 files in `lib/content-pipeline/` with lifecycle, monitoring, anomaly detection, safety actions |
| API routes | 36 routes under `app/api/`; Bearer token auth pattern; service role for admin |
| Existing copy system | `lib/auth-copy.ts` (ja/en/ko for login+signup), `lib/onboarding-copy.ts` (ja/en/ko for onboarding), `lib/lesson-copy.ts` (ja only, typed `LessonCopy`) |

### Assumed

| Item | Assumption | Basis |
|---|---|---|
| No `.env.example` | Env vars documented from code grep only | No file found |
| Supabase RLS active | Migrations include RLS policies | `20260411_rls_urgent_fixes.sql` |
| No CI/CD config visible | No `.github/workflows/` inspected | Not in scope of file inspection |

---

## 2. Scope and Non-Goals

### In Scope

- UI localization infrastructure (i18n library integration)
- Locale-aware middleware and routing
- Language preference persistence (localStorage + DB + cookie)
- Onboarding language selection improvements
- AI prompt parameterization (target language + feedback language)
- Lesson copy English translation (extend existing `LessonCopy` type)
- Analytics event taxonomy for multilingual flows
- Testing strategy definition
- Feature flag and rollout plan
- Extend existing `language_registry` and `user_language_preferences` tables

### Non-Goals

- Full translation of all 240+ hardcoded Japanese strings (tracked separately)
- Korean lesson content creation (catalog entries, corpus data)
- Dashboard/settings/legal page localization (later phase)
- RTL layout support
- Currency localization beyond JPY
- Third-party analytics SDK integration
- CI/CD pipeline setup
- Mobile app or PWA
- Global CDN/edge i18n (use origin SSR)

---

## 3. Feature Breakdown and Engineering Tasks

### 3.1 Localization Infrastructure

**Objective**: Install and configure `next-intl` for App Router with typed messages, lazy locale loading, and SSR support.

**Backend tasks**:
- Add `next-intl` to dependencies
- Create `i18n/request.ts` for server-side locale resolution
- Create `i18n/routing.ts` for locale config

**Frontend tasks**:
- Create message files: `messages/ja.json`, `messages/en.json`
- Create `app/[locale]/layout.tsx` wrapper with `NextIntlClientProvider`
- Move existing app routes under `app/[locale]/`
- Update `middleware.ts` to handle locale detection and redirect

**Data tasks**:
- Extract all strings from `lib/auth-copy.ts`, `lib/onboarding-copy.ts`, `lib/lesson-copy.ts` into message JSON files
- Establish namespace structure: `auth.login.*`, `auth.signup.*`, `onboarding.*`, `lesson.*`

**Edge cases**:
- User has `ui_language_code='ko'` in DB but Korean messages are incomplete: fall back to `ja`
- Browser `Accept-Language` conflicts with stored preference: DB wins
- SSR hydration mismatch if cookie locale differs from URL locale

**Dependencies**: None (first task)

**Definition of done**:
- `next-intl` installed and configured
- At least `ja` and `en` message files exist with auth + onboarding namespaces
- `useTranslations('auth.login')` works in login-client.tsx
- Fallback to `ja` works when key is missing

### 3.2 Locale-Aware Routing

**Objective**: Add `[locale]` segment to URL structure so `/login` becomes `/ja/login` or `/en/login`.

**Backend tasks**:
- Update `middleware.ts`: detect locale from cookie > Accept-Language > default `ja`; redirect to `/{locale}/...` if missing
- Configure `next-intl` middleware with `locales: ['ja', 'en']`, `defaultLocale: 'ja'`

**Frontend tasks**:
- Create `app/[locale]/layout.tsx` as the locale-aware root layout
- Move all page routes under `app/[locale]/`
- Update `<Link>` components to use locale-aware paths (or rely on middleware prefix)
- Update `router.replace('/lesson')` calls to respect current locale

**Data tasks**: None

**Edge cases**:
- API routes (`/api/*`) must NOT have locale prefix
- Static assets (`/images/*`) must NOT be locale-prefixed
- Auth callback URLs (`/auth/confirm`) need locale handling after redirect

**Dependencies**: 3.1

**Definition of done**:
- `/en/login` renders login in English
- `/ja/login` renders login in Japanese
- `/login` redirects to `/{detected-locale}/login`
- API routes unaffected

### 3.3 Locale Persistence

**Objective**: Persist user language preference across sessions and sync between localStorage, cookie, and DB.

**Backend tasks**:
- Update `POST /api/user/change-language` to also accept `ui_language` field and update `user_profiles.ui_language_code`
- On auth confirm, read `user_profiles.ui_language_code` and set locale cookie

**Frontend tasks**:
- On onboarding save, call `writeUiLanguageToStorage()` (already exists) AND set cookie for middleware
- On login success, read profile's `ui_language_code` and set cookie + localStorage
- Language switcher writes to all three: state, localStorage, cookie

**Data tasks**:
- `user_profiles.ui_language_code` is already a DB column (confirmed)
- `user_language_preferences.app_locale` is already a DB column (confirmed)
- Ensure both stay in sync on write

**Edge cases**:
- New user (no profile): use browser `Accept-Language` or default `ja`
- OAuth callback: profile may not exist yet; use cookie from pre-auth selection
- localStorage unavailable (private browsing): cookie is primary fallback

**Dependencies**: 3.1, 3.2

**Definition of done**:
- Changing language in onboarding persists to DB, localStorage, and cookie
- Subsequent page loads (including after browser restart) use persisted locale
- Login restores locale from DB profile

### 3.4 Onboarding Language Selection

**Objective**: Onboarding UI language selector correctly switches display language and persists the choice.

**Backend tasks**: None (already saves `ui_language_code` to DB)

**Frontend tasks**:
- Already implemented: `uiLanguage` state, `writeUiLanguageToStorage()`, `getOnboardingCopy(uiLanguage)`
- Migrate from manual copy objects to `next-intl` `useTranslations()` when i18n is installed
- Add cookie write on language change for middleware consistency

**Data tasks**: None

**Edge cases**:
- User selects `en` in onboarding but navigates away before saving: localStorage has `en`, DB has nothing. Next visit should use `en` from localStorage.

**Dependencies**: 3.1, 3.3

**Definition of done**:
- Selecting English in onboarding immediately switches all onboarding text
- Preference survives page reload
- Login/signup screens also render in English on next visit

### 3.5 AI Prompt Parameterization

**Objective**: AI conversation and lesson generation prompts use the user's target language and region instead of hardcoded "English" and "Japanese feedback".

**Backend tasks**:
- `lib/ai-conversation-prompt.ts`: Replace hardcoded `"Use short, natural spoken English"` with template using `targetLanguageCode`
- `lib/ai-conversation-prompt.ts`: Replace hardcoded `"Japanese feedback"` with template using `feedbackLanguageCode` (derived from `ui_language_code` or `native_language_code`)
- `lib/character-prompt.ts`: Replace `"beginner-friendly English"` with target language parameter
- `lib/ai-conversation-fallback.ts`: Create per-language fallback pools (currently 4 hardcoded Japanese strings)
- `lib/lesson-run-service.ts`: Expand `REGION_SLUG_LABELS` to cover all enabled regions in `REGION_MASTER`

**Frontend tasks**: None (prompts are server-side)

**Data tasks**:
- Add `feedbackLanguageCode` field to conversation session creation flow
- Ensure `target_language_code` is available in all prompt construction paths

**Edge cases**:
- Korean learner with Japanese UI: AI speaks Korean, feedback in Japanese
- Unknown language code in prompt: fall back to English conversation + Japanese feedback
- Region slug not in `REGION_SLUG_LABELS`: skip region context (already null-safe)

**Dependencies**: None (can proceed in parallel)

**Definition of done**:
- AI conversation prompt references `targetLanguageCode` not hardcoded "English"
- AI feedback language uses `ui_language_code` not hardcoded "Japanese"
- Character prompts parameterized
- Existing English lesson flow produces identical output (regression check)

### 3.6 Lesson Copy Translation

**Objective**: Extend the existing `LessonCopy` type with English translations.

**Backend tasks**: None

**Frontend tasks**:
- Create `LESSON_COPY_EN` in `lib/lesson-copy.ts` (English variant of all ~150 strings)
- Add `getLessonCopy(lang)` getter function (same pattern as `getOnboardingCopy`)
- Update `app/lesson/page.tsx` to use `getLessonCopy(uiLanguage)` instead of `LESSON_COPY_JA`
- Wire `uiLanguage` from cookie/localStorage in lesson page

**Data tasks**: None

**Edge cases**:
- Some lesson copy keys reference target language ("英語で返してみましょう"): these must be parameterized, not just translated

**Dependencies**: 3.3 (needs locale persistence for lesson page)

**Definition of done**:
- All `LessonCopy` keys have English translations
- Lesson page renders in English when `ui_language_code` is `en`
- Japanese remains default

### 3.7 Analytics and Telemetry

**Objective**: Extend the existing `/api/track` system with multilingual flow events.

**Backend tasks**:
- Extend `TrackEventName` type with new event names
- Add locale fields to event payload

**Frontend tasks**:
- Fire events at appropriate points in onboarding, language switching, lesson flow

**Data tasks**:
- Ensure `lesson_events` table can store locale metadata in `metadata` jsonb column

**Edge cases**: None significant (fire-and-forget pattern is resilient)

**Dependencies**: 3.1

**Definition of done**:
- All events in the taxonomy (Section 10) are implemented
- Events include `locale` and `target_language` in payload

### 3.8 Testing and QA

**Objective**: Establish test infrastructure and cover multilingual critical paths.

**Backend tasks**:
- Install Vitest for unit/integration tests
- Install Playwright for E2E tests
- Create test utilities for Supabase and OpenAI mocking

**Frontend tasks**:
- Write Playwright scenarios for locale switching, onboarding, auth flows

**Data tasks**:
- Create locale fixture files for test data

**Edge cases**: Covered in Section 11

**Dependencies**: All feature work

**Definition of done**:
- `npm test` runs unit tests
- `npm run test:e2e` runs Playwright scenarios
- Multilingual critical paths covered

---

## 4. Database Design

### Existing Tables to Extend

No new tables are needed. The existing schema already has the right columns.

#### `user_profiles` (extend)

Already contains:
```sql
ui_language_code    text    -- 'ja', 'en', 'ko', 'zh'
native_language_code text   -- user's native language
target_language_code text   -- language being learned
target_region_slug   text   -- e.g. 'en_us_new_york'
```

No schema change needed. The `ui_language_code` column already stores the UI language preference.

#### `user_language_preferences` (extend)

Already contains:
```sql
user_id           uuid    -- FK to auth.users
app_locale        text    -- UI locale
learning_language text    -- target language
base_language     text    -- native/support language
cefr_level        text    -- proficiency level
preferred_region  text    -- region preference
preferred_age_band text   -- age group
```

No schema change needed. `app_locale` maps to `ui_language_code`.

#### `language_registry` (existing, no changes)

Already contains all needed fields:
```sql
code                    text    -- 'en', 'ko', 'ja'
english_name            text
native_name             text
enabled_for_ui          boolean -- can this language be used as UI language?
enabled_for_learning    boolean -- can this language be learned?
rtl                     boolean
status                  text    -- 'draft'|'beta'|'active'|'disabled'
supports_tts            boolean
supports_stt            boolean
supports_ai_generation  boolean
sort_order              integer
```

### New Migration: Locale Cookie Support Index

```sql
-- supabase/migrations/20260413_add_ui_language_code_index.sql

-- Rationale: Speed up locale lookup on login when reading user profile for cookie setting.
-- This column is read on every authenticated page load for locale resolution.
CREATE INDEX IF NOT EXISTS idx_user_profiles_ui_language_code
  ON public.user_profiles (ui_language_code)
  WHERE ui_language_code IS NOT NULL;

-- Rationale: Speed up language registry lookups filtered by status.
-- Called on every onboarding page load to populate language selector.
CREATE INDEX IF NOT EXISTS idx_language_registry_status_sort
  ON public.language_registry (status, sort_order)
  WHERE status IN ('active', 'beta');
```

### Migration for Analytics Event Locale

```sql
-- supabase/migrations/20260413_add_locale_to_lesson_events.sql

-- Rationale: Enable filtering lesson events by locale for per-language health monitoring.
-- Uses existing metadata jsonb column; this migration adds a generated column for indexing.
ALTER TABLE public.lesson_events
  ADD COLUMN IF NOT EXISTS locale text GENERATED ALWAYS AS (metadata->>'locale') STORED;

CREATE INDEX IF NOT EXISTS idx_lesson_events_locale
  ON public.lesson_events (locale)
  WHERE locale IS NOT NULL;
```

---

## 5. API Surface

### 5.1 Update User Language

**Existing route**: `POST /api/user/change-language`
**File**: `app/api/user/change-language/route.ts`
**Auth**: Bearer token required

Extend to accept `ui_language` in addition to `language`:

```typescript
// Request
interface ChangeLanguageRequest {
  language?: string        // learning language (existing)
  ui_language?: string     // UI display language (new)
}

// Response
interface ChangeLanguageResponse {
  success: boolean
  error?: string
}
```

**Validation**:
- `ui_language` must be in `['ja', 'en']` (production-ready list)
- `language` must be in `ENABLED_TARGET_LANGUAGE_OPTIONS` values
- At least one field must be provided

**Error cases**:
- 401: Missing/invalid token
- 400: Invalid language code
- 500: DB update failed

**Implementation**: Update both `user_profiles.ui_language_code` and `user_language_preferences.app_locale` in a single transaction.

### 5.2 Get Locale Bootstrap

**New route**: `GET /api/user/locale`
**File**: `app/api/user/locale/route.ts`
**Auth**: Bearer token required

```typescript
// Response
interface LocaleBootstrapResponse {
  ui_language: string          // 'ja' | 'en'
  target_language: string      // 'en'
  target_region_slug: string | null
  native_language: string | null
}
```

**Purpose**: Called on app load to sync client locale with DB preference. Returns user's language settings in one call.

**Error cases**:
- 401: Missing token
- 404: No profile found (return defaults: `{ ui_language: 'ja', target_language: 'en', ... }`)

### 5.3 Track Event (extend existing)

**Existing route**: `POST /api/track`
**File**: `app/api/track/route.ts`

Extend `TrackEventName` union type:

```typescript
type TrackEventName =
  // existing
  | 'lesson_start'
  | 'ai_question_answer'
  | 'typing_answer'
  | 'conversation_complete'
  | 'paywall_clicked'
  // new multilingual events
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'language_selected'
  | 'language_changed'
  | 'locale_auto_detected'
  | 'localized_content_viewed'
  | 'ai_generation_requested'
  | 'ai_generation_completed'
  | 'ai_generation_failed'
  | 'translation_fallback_used'
```

Extend payload to include:

```typescript
interface TrackEventPayload {
  // existing fields...
  locale?: string              // UI language at time of event
  target_language?: string     // learning language
  target_region?: string       // region slug
}
```

---

## 6. Frontend Architecture

### 6.1 Proposed Directory Structure

```
app/
├── [locale]/                    # NEW: locale-aware layout wrapper
│   ├── layout.tsx               # NextIntlClientProvider + locale validation
│   ├── page.tsx                 # Landing page (moved from app/page.tsx)
│   ├── login/
│   │   ├── page.tsx
│   │   └── login-client.tsx
│   ├── signup/
│   │   ├── page.tsx
│   │   └── signup-client.tsx
│   ├── onboarding/
│   │   └── page.tsx
│   ├── auth/
│   │   ├── confirm/
│   │   ├── verify-notice/
│   │   └── reset-password/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── lesson/
│   │   └── page.tsx
│   ├── settings/
│   │   └── ...
│   └── ...
├── api/                         # UNCHANGED: no locale prefix
│   └── ...
├── layout.tsx                   # Root layout (html, body, fonts)
└── not-found.tsx
```

### 6.2 Server/Client Component Boundaries

| Component | Type | Reason |
|---|---|---|
| `app/[locale]/layout.tsx` | Server | Reads locale from params, provides `NextIntlClientProvider` |
| `app/[locale]/login/page.tsx` | Server | Suspense wrapper |
| `login-client.tsx` | Client | Interactive form, uses `useTranslations()` |
| `signup-client.tsx` | Client | Interactive form |
| `onboarding/page.tsx` | Client | Complex form state |
| `lesson/page.tsx` | Client | Real-time lesson state |

### 6.3 Component Tree (Locale Layer)

```
RootLayout (server)
└── [locale]/layout.tsx (server)
    ├── NextIntlClientProvider messages={messages}
    └── children
        ├── LoginPage (server) → LoginClient (client)
        ├── SignupPage (server) → SignupClient (client)
        ├── OnboardingPage (client)
        ├── DashboardPage (client)
        └── LessonPage (client)
```

### 6.4 Data Fetching

| Flow | Strategy |
|---|---|
| Locale detection | Middleware reads cookie > Accept-Language > default |
| Message loading | `next-intl` loads only current locale's messages (lazy) |
| User profile | Client-side `supabase.from('user_profiles').select()` on mount |
| Language list | Static `ENABLED_TARGET_LANGUAGE_OPTIONS` (build-time constant) |
| Region list | Static `getRegionsForLanguage()` (build-time constant) |

---

## 7. React Hooks and Context

### 7.1 `useLocale()` (from next-intl)

- **Purpose**: Get current locale in client components
- **Source**: URL `[locale]` segment
- **File**: Provided by `next-intl`
- **Inputs**: None
- **Outputs**: `string` (`'ja'` or `'en'`)
- **Storage**: URL (primary), cookie (persistence), localStorage (pre-auth fallback)

### 7.2 `useTranslations(namespace)` (from next-intl)

- **Purpose**: Get typed translation function
- **Source**: Message files loaded by `NextIntlClientProvider`
- **File**: Provided by `next-intl`
- **Inputs**: Namespace string (e.g., `'auth.login'`)
- **Outputs**: `t(key)` function

### 7.3 `useCurrentLanguage()` (existing)

- **Purpose**: Get/set current learning language
- **File**: `lib/use-current-language.ts`
- **Storage**: `user_profiles.current_learning_language` in DB
- **No change needed**: Already works independently of UI locale

### 7.4 `useChangeLocale()` (new)

- **Purpose**: Change UI locale across all persistence layers
- **File**: `lib/hooks/use-change-locale.ts`
- **Inputs**: `newLocale: string`
- **Outputs**: `changeLocale(locale)` function
- **Behavior**:
  1. Set `next-intl` locale (triggers URL change)
  2. Write to localStorage via `writeUiLanguageToStorage()`
  3. Set cookie `NEXT_LOCALE` for middleware
  4. Fire `language_changed` analytics event
  5. If authenticated, POST to `/api/user/change-language` with `ui_language`

### Hydration Strategy

| Layer | Server | Client | Sync |
|---|---|---|---|
| URL locale | `[locale]` param | `useLocale()` | Automatic (next-intl) |
| Cookie | Read in middleware | Set on locale change | Manual write |
| localStorage | N/A | `readUiLanguageFromStorage()` | Manual write |
| DB | Read via API | Write via API | Async (non-blocking) |

**Priority on load**: URL (set by middleware from cookie) > localStorage > `Accept-Language` > `'ja'`

---

## 8. i18n Integration Guide

### 8.1 Dependencies

```bash
npm install next-intl
```

### 8.2 Configuration Files

**`i18n/request.ts`**:
```typescript
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

**`i18n/routing.ts`**:
```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
})
```

### 8.3 Middleware Changes

Update `middleware.ts` to compose rate limiting with i18n:

```typescript
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  // Skip locale handling for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return handleRateLimit(request)
  }
  // Apply locale middleware, then rate limiting
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!_next|images|favicon.ico).*)'],
}
```

### 8.4 Message File Structure

```
messages/
├── ja.json
└── en.json
```

**Namespace structure**:
```json
{
  "auth": {
    "login": {
      "title": "ログイン",
      "subtitle": "お好みの方法でログインしてください。",
      "googleButton": "Googleでログイン"
    },
    "signup": { ... }
  },
  "onboarding": {
    "title": "NativeFlow へようこそ",
    "labels": { ... },
    "hints": { ... }
  },
  "lesson": {
    "buttons": { ... },
    "stages": { ... }
  },
  "shared": {
    "loading": "読み込み中...",
    "error": "エラー"
  }
}
```

### 8.5 Fallback Behavior

- Missing key in `en.json`: `next-intl` returns key name (configurable to fall back to `ja`)
- Configure `onError` in `getRequestConfig` to log missing translations without crashing
- Set `getMessageFallback` to return Japanese value when English is missing

### 8.6 Type-Safe Patterns

Use `next-intl`'s type generation:

```typescript
// global.d.ts
type Messages = typeof import('./messages/ja.json')
declare interface IntlMessages extends Messages {}
```

This gives autocomplete for `t('auth.login.title')`.

---

## 9. Analytics and Telemetry

### Event Taxonomy

| Event | Trigger | Payload |
|---|---|---|
| `onboarding_started` | Onboarding page mounted | `{ locale }` |
| `onboarding_completed` | Profile saved successfully | `{ locale, target_language, target_region }` |
| `language_selected` | First language selection in onboarding | `{ locale, selected_language, source: 'onboarding' }` |
| `language_changed` | User changes UI language | `{ locale, previous_locale, source: 'onboarding'\|'settings' }` |
| `locale_auto_detected` | Middleware detects locale from browser | `{ detected_locale, applied_locale }` |
| `localized_content_viewed` | Lesson loaded with locale context | `{ locale, target_language, target_region, lesson_theme }` |
| `ai_generation_requested` | AI prompt sent | `{ locale, target_language, prompt_type: 'conversation'\|'lesson' }` |
| `ai_generation_completed` | AI response received | `{ locale, target_language, duration_ms }` |
| `ai_generation_failed` | AI call failed | `{ locale, target_language, error_code }` |
| `translation_fallback_used` | Missing translation key detected | `{ locale, key, fallback_locale }` |

**Sample payload**:
```json
{
  "event": "language_changed",
  "properties": {
    "locale": "en",
    "previous_locale": "ja",
    "source": "onboarding",
    "user_id": "uuid",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

**Destination**: `POST /api/track` (existing endpoint, extended payload)

---

## 10. Testing Strategy

### 10.1 Framework Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom playwright @playwright/test
```

**`vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

### 10.2 Test Layers

| Layer | Tool | Focus | Location |
|---|---|---|---|
| Unit | Vitest | Copy getters, locale utils, region mapping | `lib/__tests__/` |
| Integration | Vitest | API routes with mocked Supabase | `app/api/__tests__/` |
| E2E | Playwright | Full user flows per locale | `tests/e2e/` |

### 10.3 Unit Tests

| Test | File | What |
|---|---|---|
| `getAuthCopy` returns correct locale | `lib/__tests__/auth-copy.test.ts` | All supported locales + fallback |
| `getOnboardingCopy` returns correct locale | `lib/__tests__/onboarding-copy.test.ts` | All supported locales + fallback |
| `buildRegionPromptContext` | `lib/__tests__/lesson-run-service.test.ts` | All region slugs + null handling |
| `deriveNativeLanguageCode` | `lib/__tests__/onboarding-utils.test.ts` | All country codes + unknown fallback |
| `getEnabledRegionOptions` | `lib/__tests__/region-options.test.ts` | Per-language filtering |

### 10.4 Integration Tests

| Test | What |
|---|---|
| `POST /api/user/change-language` | Sets both `ui_language` and `learning_language` |
| `GET /api/user/locale` | Returns correct defaults for new user |
| `POST /api/track` | Accepts new event types with locale payload |

**Mocking strategy**:
- Supabase: Mock `createClient` to return in-memory store
- OpenAI: Mock `generateChatCompletion` to return canned responses

### 10.5 E2E Scenarios (Playwright)

| Scenario | Steps |
|---|---|
| Onboarding in English | Navigate to `/en/onboarding`, verify all labels are English |
| Language switch during onboarding | Start in Japanese, switch to English, verify immediate re-render |
| Login after locale change | Set locale to `en` in onboarding, navigate to `/login`, verify English |
| Lesson in English UI | Complete onboarding in English, start lesson, verify English buttons |
| Fallback on missing translation | Force a missing key scenario, verify fallback to Japanese |

### 10.6 Edge Cases to Test

- SSR hydration: locale in URL matches cookie matches rendered content
- Race condition: user changes language while lesson is loading
- Persisted `ko` in localStorage but `ko` not in production list: should fall back to `ja`
- OAuth callback with locale: `/auth/confirm?plan=monthly` preserves locale through redirect

---

## 11. Rollout and Feature Flags

### 11.1 Feature Flags

| Flag | Gates | Default (dev) | Default (prod) |
|---|---|---|---|
| `FF_I18N_ENABLED` | Locale routing, language switcher, translated UI | `true` | `false` |
| `FF_AI_LANGUAGE_PARAM` | AI prompt parameterization (non-English target) | `true` | `false` |
| `FF_ANALYTICS_LOCALE` | New locale-aware analytics events | `true` | `true` |

**Implementation**: Environment variables (`NEXT_PUBLIC_FF_*` for client, `FF_*` for server).

### 11.2 Phased Rollout

**Phase 0: Infrastructure (no user impact)**
- Install `next-intl`
- Create message files (extract from existing copy objects)
- Set up `[locale]` layout
- All behind `FF_I18N_ENABLED=false`

**Phase 1: English UI (internal only)**
- Enable `FF_I18N_ENABLED` for internal team (check via `isInternalUser()`)
- Verify all auth/onboarding/lesson flows in English
- Monitor for hydration errors, missing keys

**Phase 2: English UI (all users)**
- Enable `FF_I18N_ENABLED=true` in production
- Language switcher visible in onboarding
- Monitor `translation_fallback_used` events
- Kill switch: set `FF_I18N_ENABLED=false` to revert to Japanese-only

**Phase 3: AI prompt parameterization**
- Enable `FF_AI_LANGUAGE_PARAM=true`
- AI prompts use `target_language_code` instead of hardcoded "English"
- Monitor AI response quality via `ai_generation_*` events

### 11.3 Rollback Plan

| Scenario | Action |
|---|---|
| Hydration errors spike | Set `FF_I18N_ENABLED=false`, remove `[locale]` middleware |
| Missing translations cause UX issues | Add missing keys to `en.json`, deploy |
| AI quality degrades with parameterized prompts | Set `FF_AI_LANGUAGE_PARAM=false` |

### 11.4 Observability Checkpoints

- `translation_fallback_used` count per deploy
- Error rate on `/[locale]/*` routes vs baseline
- Lesson completion rate per locale (via `lesson_events.locale`)
- AI conversation evaluation scores per locale

---

## 12. Open Questions and Decisions Needed

### Q1: Locale in URL vs cookie-only?

**Decision needed**: Should the locale appear in the URL (`/en/lesson`) or be cookie-only (`/lesson` with cookie determining language)?

**Options**:
- **A. URL-based** (`/en/lesson`): SEO-friendly, shareable, clear. Requires route restructuring.
- **B. Cookie-only** (`/lesson`): No route changes, simpler migration. No SEO benefit.

**Tradeoffs**: URL-based is more work upfront but is the standard for production i18n. Cookie-only is faster to implement but harder to debug and not SEO-compatible.

**Recommendation**: URL-based. NativeFlow is a SaaS with public-facing pages (pricing, legal) that benefit from locale URLs. `next-intl` supports this natively.

### Q2: When to add Korean UI?

**Decision needed**: Korean copy exists in `auth-copy.ts` and `onboarding-copy.ts` but is AI-generated and unreviewed.

**Options**:
- **A. Ship after human review**: Get native Korean speaker to review, then add `'ko'` to `ONBOARDING_UI_LANGUAGES` filter.
- **B. Ship as beta**: Add `'ko'` with a beta badge, collect feedback.
- **C. Wait for Korean lesson content**: Don't ship Korean UI until Korean lessons exist.

**Recommendation**: A. Review existing translations, ship when verified. Korean UI is independent of Korean lesson content.

### Q3: Should `native_language_code` drive AI feedback language?

**Decision needed**: Currently AI feedback is hardcoded Japanese. Should it use `native_language_code` or `ui_language_code`?

**Options**:
- **A. `ui_language_code`**: Feedback matches the UI language the user chose.
- **B. `native_language_code`**: Feedback in user's native language regardless of UI setting.

**Recommendation**: A. Use `ui_language_code`. Users expect feedback in the same language as the rest of the UI. `native_language_code` is a fallback if `ui_language_code` is not set.

---

## 13. Execution Checklist

### Phase 0: Infrastructure
- [ ] Install `next-intl`
- [ ] Create `i18n/request.ts` and `i18n/routing.ts`
- [ ] Create `messages/ja.json` with all existing copy keys
- [ ] Create `messages/en.json` with all existing English translations
- [ ] Create `app/[locale]/layout.tsx` with `NextIntlClientProvider`
- [ ] Add `FF_I18N_ENABLED` environment variable
- [ ] Update `middleware.ts` to handle locale detection (behind flag)

### Phase 1: Migrate Auth Screens
- [ ] Move `app/login/` to `app/[locale]/login/`
- [ ] Replace `getAuthCopy()` calls with `useTranslations('auth.login')`
- [ ] Move `app/signup/` to `app/[locale]/signup/`
- [ ] Replace `getAuthCopy()` calls with `useTranslations('auth.signup')`
- [ ] Move `app/auth/` to `app/[locale]/auth/`
- [ ] Update auth redirect URLs to include locale

### Phase 2: Migrate Onboarding
- [ ] Move `app/onboarding/` to `app/[locale]/onboarding/`
- [ ] Replace `getOnboardingCopy()` with `useTranslations('onboarding')`
- [ ] Ensure language selector writes to cookie + localStorage + DB
- [ ] Add `useChangeLocale()` hook

### Phase 3: Migrate Lesson
- [ ] Create `LESSON_COPY_EN` in `lib/lesson-copy.ts`
- [ ] Add `getLessonCopy()` getter
- [ ] Wire lesson page to locale
- [ ] Verify all stage components use English strings (already done for critical strings)

### Phase 4: AI Parameterization
- [ ] Parameterize AI conversation language in `ai-conversation-prompt.ts`
- [ ] Parameterize AI feedback language
- [ ] Parameterize character prompts in `character-prompt.ts`
- [ ] Expand `REGION_SLUG_LABELS` to match `REGION_MASTER`
- [ ] Create per-language AI fallback pools

### Phase 5: Analytics & Testing
- [ ] Extend `TrackEventName` with multilingual events
- [ ] Install Vitest + Playwright
- [ ] Write unit tests for copy getters and locale utils
- [ ] Write E2E tests for locale switching flows
- [ ] Add observability for `translation_fallback_used`

### Phase 6: Production Rollout
- [ ] Enable `FF_I18N_ENABLED` for internal team
- [ ] Verify all flows in English
- [ ] Enable `FF_I18N_ENABLED` for all users
- [ ] Monitor fallback events and error rates
- [ ] Enable `FF_AI_LANGUAGE_PARAM` when stable

---

## Appendix: Document Creation

### Target file path
docs/implementation-spec.md

### Exact edit location
Create new file

### BEFORE
File did not exist.

### AFTER
A complete implementation specification exists at `docs/implementation-spec.md` covering feature breakdown, schema, APIs, frontend architecture, hooks/context, i18n integration, analytics, testing, and rollout.
