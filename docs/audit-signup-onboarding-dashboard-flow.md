# Audit: Signup → Onboarding → My Plan Creation → Dashboard Flow

## A. Files involved

| File path | Role |
|-----------|------|
| `app/signup/page.tsx` | Signup page wrapper |
| `app/signup/signup-client.tsx` | Signup form, `signUp()`, session check, redirect to /onboarding or /auth/verify-notice |
| `app/login/page.tsx` | Login page wrapper |
| `app/login/login-client.tsx` | Login form, session check, redirect to /dashboard |
| `app/auth/confirm/page.tsx` | Auth confirm page wrapper |
| `app/auth/confirm/auth-confirm-client.tsx` | Email OTP verification, redirect to `next` or /login |
| `app/auth/verify-notice/page.tsx` | Static “check your email” notice (no redirect logic) |
| `app/onboarding/page.tsx` | Onboarding form, profile read/upsert, redirect to /dashboard when complete |
| `app/dashboard/page.tsx` | Dashboard: session + profile read (blocking), stats (non-blocking), redirect to /onboarding if no profile |
| `app/settings/page.tsx` | My Page: profile read/update, redirect to /onboarding if no profile |
| `app/settings/learning/page.tsx` | Learning settings: profile read/update |
| `app/settings/profile/page.tsx` | Profile display (no user_profiles columns listed in audit) |
| `lib/supabase.ts` | Supabase client used for auth and user_profiles |
| `lib/types.ts` | `UserProfileRow`, `PartialUserProfileRow` (no DB schema in repo) |
| `lib/lesson-page-loader.ts` | Lesson page: session + profile read, redirect to /onboarding if no profile |
| `lib/progression-service.ts` | Reads/updates user_profiles progression columns (streak, rank_code, avatar_level) |
| `lib/study-plan-service.ts` | Used by onboarding to compute `daily_study_minutes_goal` (no DB access) |
| `lib/constants.ts` | UI_LANGUAGE_FIXED, TARGET_LANGUAGE_FIXED, CURRENT_LEVEL_OPTIONS, etc. |
| `lib/onboarding-copy.ts` | Copy for onboarding UI |
| `lib/dashboard-copy.ts` | Copy for dashboard UI |

---

## B. Flow map

1. **Signup** (`app/signup/signup-client.tsx`)
   - `checkSession()` → if session exists → `router.replace('/dashboard')`.
   - `handleSubmit()` → `supabase.auth.signUp({ email, password, options: { emailRedirectTo: '/auth/confirm', data: planMeta } })`.
   - On success: `data?.session` ? `router.replace('/onboarding')` : `router.replace('/auth/verify-notice')`.
   - No `user_profiles` read or write.

2. **Auth confirm** (`app/auth/confirm/auth-confirm-client.tsx`)
   - User lands here from email link (e.g. after verify-notice).
   - `verifyOtp({ token_hash, type })` → on success → `router.replace(nextParam || '/login?confirmed=1')`.
   - No `user_profiles` read or write.

3. **Login** (`app/login/login-client.tsx`)
   - `checkSession()` → if session → `router.replace('/dashboard')`.
   - `handleSubmit()` → `signInWithPassword()` → on success → `router.replace('/dashboard')`.
   - No profile check; dashboard will load and may redirect to /onboarding.

4. **Onboarding** (`app/onboarding/page.tsx`)
   - `loadProfile()`: `getSession()` → if no session → `router.replace('/login')`.
   - Then `from('user_profiles').select(...).eq('id', session.user.id).maybeSingle()`.
   - If `fetchError`: only logged; no redirect, no setPageError; `setAuthChecked(true)` in finally → form shows empty.
   - If profile exists and `isOnboardingComplete(profile)` → `router.replace('/dashboard')`.
   - Else `applyProfile(profile, metaPlan)` to fill form.
   - On submit: `getSession()` → build payload → `from('user_profiles').upsert(payload, { onConflict: 'id' })` → on success → `router.replace('/dashboard')`.

5. **Dashboard** (`app/dashboard/page.tsx`)
   - `loadDashboard()`: `getSession()` → if no session → `router.replace('/login')`.
   - Then `from('user_profiles').select(...).eq('id', session.user.id).maybeSingle()`.
   - If `fetchError` → `setPageError(USER_FACING_ERROR)`, `setLoading(false)`, return (fatal error UI).
   - If `!row` → `router.replace('/onboarding')`, `setLoading(false)`.
   - Else `setProfile(row)`, then non-blocking daily stat + recent stats → `setTodayStat`, `setStreakDays`, `setLoading(false)`.
   - Render uses profile fields; optional/plan fields handled with `?? null` / `toSafeCount` etc.

---

## C. Read/write contract table

| File | Function / component | Table | Columns read | Columns written | Risk |
|------|----------------------|--------|-------------|----------------|------|
| `app/onboarding/page.tsx` | loadProfile | user_profiles | ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, username, age_group, country_code, planned_plan_code | — | **Low** (no id in select; minimal set) |
| `app/onboarding/page.tsx` | handleSubmit | user_profiles | — | id, ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, username, age_group, country_code, planned_plan_code | **Medium** (assumes all these columns exist; does not write preferred_session_length, enable_dating_contexts) |
| `app/dashboard/page.tsx` | loadDashboard | user_profiles | id, ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, preferred_session_length, enable_dating_contexts, current_streak_days, best_streak_days, last_streak_date, avatar_character_code, avatar_level, avatar_image_url, created_at | — | **High** (any missing column → fetchError → fatal error page) |
| `app/settings/page.tsx` | loadPage | user_profiles | id, target_language_code, target_country_code, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, username, age_group, country_code, planned_plan_code | — | **Low** (conservative select) |
| `app/settings/page.tsx` | handleSaveProfile | user_profiles | — | username, age_group, country_code, planned_plan_code, target_country_code, current_level, speak_by_deadline_text, target_outcome_text | **Low** |
| `app/settings/learning/page.tsx` | loadProfile | user_profiles | id, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal | — | **Low** |
| `app/settings/learning/page.tsx` | handleSubmit | user_profiles | — | target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal | **Low** |
| `lib/lesson-page-loader.ts` | loadLessonPage | user_profiles | id, ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, target_outcome_text, speak_by_deadline_text, daily_study_minutes_goal, preferred_session_length, enable_dating_contexts | — | **High** (preferred_session_length, enable_dating_contexts may not exist) |
| `lib/progression-service.ts` | updateProgressionForStudyDay | user_profiles | current_streak_days, best_streak_days, last_streak_date, rank_code, avatar_level | current_streak_days, best_streak_days, last_streak_date, rank_code, avatar_level | **High** (rank_code may not exist; used when recording study day) |

---

## D. user_profiles contract end-to-end

- **Written by onboarding (submit):**  
  id, ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, username, age_group, country_code, planned_plan_code.

- **Not written by onboarding (assumed to exist or be optional):**  
  preferred_session_length, enable_dating_contexts, current_streak_days, best_streak_days, last_streak_date, avatar_character_code, avatar_level, avatar_image_url, created_at, and any trial/payment columns.  
  If they are required or not yet in the DB, onboarding upsert can fail or leave them null.

- **Read by dashboard (current select):**  
  id, ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, **preferred_session_length**, **enable_dating_contexts**, current_streak_days, best_streak_days, last_streak_date, avatar_character_code, avatar_level, avatar_image_url, created_at.  
  **preferred_session_length** and **enable_dating_contexts** are in the dashboard select but are not written by onboarding. If these columns do not exist in the DB, the dashboard profile query returns an error and the user sees the fatal error screen.

- **UI assumptions vs writes:**  
  - Dashboard uses `profile.total_flow_points`, `profile.trial_start_at`, `profile.created_at`, and `getTrialDisplay(profile)` (trial_ends_at, subscription_status, lesson_data_delete_at, payment_method_*). Those columns were removed from the dashboard select in a prior fix, so they are undefined and the UI uses fallbacks.  
  - Dashboard still assumes **preferred_session_length** and **enable_dating_contexts** exist in the table (they are in the select). If the schema does not have them, that select fails.

---

## E. Plan / trial / payment fields

- **Onboarding:**  
  Writes only `planned_plan_code` (monthly/yearly). Does not write trial_start_at, trial_ends_at, subscription_status, lesson_data_delete_at, payment_method_*, or total_flow_points.

- **Dashboard:**  
  - Type `DashboardProfileRow` includes trial_*, subscription_status, lesson_data_delete_at, payment_*, total_flow_points.  
  - Current profile select does **not** include these (they were removed to avoid missing-column errors).  
  - Render uses `toSafeCount(profile.total_flow_points)`, `profile.trial_start_at ?? profile.created_at`, and `getTrialDisplay(profile)`; all safely handle undefined.  
  - So plan/trial/payment are **not** the cause of the current dashboard fatal error, as long as the select does not request non-existent columns.

- **Conclusion:**  
  Plan/trial/payment columns are either not selected (dashboard) or not written (onboarding). The remaining risk is **dashboard (and lesson loader) selecting columns that do not exist**, i.e. **preferred_session_length** and **enable_dating_contexts** (and elsewhere **rank_code** in progression-service).

---

## F. Failure points

1. **Dashboard profile select**  
   Uses `.maybeSingle()`. If the select list includes a column that does not exist in `user_profiles`, Supabase returns a **fetchError**. The dashboard treats any fetchError as fatal: `setPageError(USER_FACING_ERROR)` and error screen. **Most likely cause of “fatal error screen”** when onboarding has succeeded.

2. **Onboarding profile fetch**  
   On fetchError, onboarding only logs and continues; it does not set a page error or redirect. User sees the form (possibly empty). So a missing column in onboarding’s select would not show the same fatal screen as dashboard, but could leave the form empty or incomplete.

3. **Onboarding upsert**  
   If a column in the payload does not exist or is not nullable and has no default, upsert can fail; `upsertError` is shown as `copy.errors.saveFailed` (generic). No redirect on error.

4. **Redirects**  
   - Signup with session → /dashboard (no profile check).  
   - Login success → /dashboard.  
   - Dashboard: no profile row → /onboarding.  
   - No infinite loop observed; if profile is missing, user is sent to onboarding once.

5. **Lesson page**  
   `loadLessonPage()` selects `preferred_session_length` and `enable_dating_contexts`. If those columns are missing, it returns `{ error: LOAD_ERROR_PROFILE }`; the lesson page shows an error, not the dashboard.

6. **Progression service**  
   Selects and updates `rank_code`. If `rank_code` does not exist, the update (after a study day) fails; caller gets `error` in result. Not in the signup → onboarding → dashboard path but can affect post-dashboard flows.

---

## G. Likely root causes (ranked)

1. **Dashboard profile select includes columns that do not exist**  
   **preferred_session_length** and **enable_dating_contexts** are in the dashboard select and in `lib/types.ts` `UserProfileRow`, but are **not** written by onboarding. If the actual `user_profiles` table does not have these columns yet, the dashboard profile query fails with fetchError and the user sees the fatal error screen. This is the single most likely cause of the error screen after a successful onboarding.

2. **Lesson page loader select**  
   Same two columns in `lib/lesson-page-loader.ts` (PROFILE_SELECT). Fails when opening the lesson page if the columns are missing; does not directly cause the dashboard error screen but shows the same schema assumption.

3. **Progression service and rank_code**  
   If `rank_code` (or other progression columns) do not exist, progression updates fail when a study day is recorded. Does not block signup → onboarding → dashboard.

4. **Onboarding upsert column mismatch**  
   If the table has different names or constraints than the payload (e.g. required column not sent), upsert fails and the user sees a generic save error on onboarding. Less likely to cause the *dashboard* fatal screen, which is tied to the dashboard *read*.

5. **Auth/session vs profile timing**  
   If a trigger or backend is supposed to create a `user_profiles` row on signup and does not, dashboard gets `!row` and redirects to onboarding. That is expected behavior, not a crash. The fatal error screen is specifically when there *is* a fetchError (e.g. column missing), not when row is null.

---

## H. First fix recommendation

- **Change only the dashboard profile query** so it does not select columns that may not exist yet.
- **Remove from the dashboard `.select()` list:**  
  **preferred_session_length**  
  **enable_dating_contexts**
- Keep all other dashboard select columns that onboarding or the rest of the app assume (id, ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, current_streak_days, best_streak_days, last_streak_date, avatar_character_code, avatar_level, avatar_image_url, created_at).
- **Do not change** `DashboardProfileRow` or render logic: the UI already uses `profile.preferred_session_length` and `profile.enable_dating_contexts` with safe fallbacks (or they can be undefined). So removing them from the select only makes the query match the current schema; behavior stays correct.
- **Optional follow-up:** In `lib/lesson-page-loader.ts`, remove `preferred_session_length` and `enable_dating_contexts` from `PROFILE_SELECT` if the same table does not have those columns, and ensure lesson page still receives safe defaults for those values when building lesson data.

This keeps the fix minimal, avoids schema guesses, and targets the observed failure: dashboard blocking profile fetch failing due to selected columns not present in the database.
