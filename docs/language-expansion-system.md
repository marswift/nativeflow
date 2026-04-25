# NativeFlow Owner Admin Language Expansion System

Design document for adding new learning languages through admin tools instead of hardcoding in source code.

---

## 1. Purpose

NativeFlow aims to support multiple learning languages. Adding each language by editing TypeScript files, committing code, and deploying is not scalable. The Owner Admin Language Expansion System allows language content to be created, tested, and published through a database-backed admin dashboard.

Benefits:
- Non-engineer contributors can prepare language content
- Languages can be tested in isolation before going live
- Rollback is instant (unpublish, not revert code)
- Quality gates prevent broken languages from reaching users
- Multiple languages can be in progress simultaneously

---

## 2. Current State

| Item | Status |
|---|---|
| English conversation runtime | Stable, 53/53 quality spec |
| English language pack | Active, ACKS migrated to pack |
| Korean social intent detection | Code-level skeleton, detection only |
| Korean language pack | Code-level skeleton, not connected to runtime |
| Korean runtime replies | Not enabled |
| Russian | Not started — planned as first admin-added test language |
| Admin language UI | Not built |
| DB schema for languages | Not implemented |

### Key decisions

- **English** is the stable production baseline. All changes must preserve its behavior.
- **Korean** was added as code-level preparation to validate the universal engine architecture. It should eventually be migrated into DB-managed configuration.
- **No additional languages should be hardcoded.** Russian and all future languages should be added through the admin system once it exists.

---

## 3. Language Lifecycle

Every learning language moves through these statuses:

```
draft → configured → qa_ready → testing → published → archived
```

| Status | Description | Visible to users? |
|---|---|---|
| `draft` | Language created, metadata only | No |
| `configured` | Intent patterns, templates, and slots added | No |
| `qa_ready` | All required content complete, ready for testing | No |
| `testing` | Running QA test suite, admin preview available | No (admin only) |
| `published` | Live for users who select this language | Yes |
| `archived` | Removed from active selection, data preserved | No |

Transitions:
- `draft → configured`: owner adds content
- `configured → qa_ready`: owner marks content as complete
- `qa_ready → testing`: automated QA suite runs
- `testing → published`: all QA tests pass + owner approval
- `published → archived`: owner disables language
- `archived → configured`: owner re-enables for updates

---

## 4. Required Admin Features

### Language management
- Create new learning language (code, display name, native name)
- Edit language metadata
- Set language status
- Delete draft languages

### Region/accent management
- Add regions per language (e.g. US/UK/AU for English)
- Set default region
- Enable/disable regions independently

### Conversation content
- Add/edit social intent patterns (per language)
- Add/edit answer intent patterns (per language)
- Add/edit reply templates (acks, reactions, bridges, wraps)
- Add/edit scene slot keywords (per language per scene)
- Add/edit scene questions (per language per scene)
- Add/edit repair templates (per language per scene)

### QA tools
- Run intent detection test suite
- Run reply template validation
- Run false-positive checks
- Preview conversation flow for any scene
- View test results history

### Publishing
- Publish language (requires all QA passing)
- Unpublish language (instant, preserves data)
- View publish history with timestamps and actor

---

## 5. Suggested DB Schema

Documentation only. Not implemented.

### learning_languages

```sql
CREATE TABLE learning_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  native_display_name text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','configured','qa_ready','testing','published','archived')),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### learning_language_regions

```sql
CREATE TABLE learning_language_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL REFERENCES learning_languages(code),
  region_code text NOT NULL,
  display_name text NOT NULL,
  native_display_name text,
  is_default boolean DEFAULT false,
  enabled boolean DEFAULT true,
  UNIQUE (language_code, region_code)
);
```

### language_intent_patterns

```sql
CREATE TABLE language_intent_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  intent_type text NOT NULL,
  intent_category text NOT NULL CHECK (intent_category IN ('social','answer')),
  pattern text NOT NULL,
  is_regex boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### language_reply_templates

```sql
CREATE TABLE language_reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  template_group text NOT NULL,
  template_key text NOT NULL,
  template_text text NOT NULL,
  sort_order integer DEFAULT 0,
  UNIQUE (language_code, template_group, template_key)
);
```

### language_scene_slots

```sql
CREATE TABLE language_scene_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  scene_id text NOT NULL,
  dimension text NOT NULL,
  accept_keywords text[] NOT NULL,
  repair_templates text[] NOT NULL,
  bridge_templates text[],
  accept_yes_no boolean DEFAULT false,
  UNIQUE (language_code, scene_id, dimension)
);
```

### language_quality_tests

```sql
CREATE TABLE language_quality_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  test_code text NOT NULL,
  test_category text NOT NULL,
  input_text text NOT NULL,
  expected_intent text,
  expected_answer_intent text,
  expected_reply_pattern text,
  UNIQUE (language_code, test_code)
);
```

### language_publish_history

```sql
CREATE TABLE language_publish_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  action text NOT NULL CHECK (action IN ('published','unpublished','archived')),
  actor_user_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

---

## 6. QA Requirements

A language cannot be published unless all checks pass.

### Required checks

| Check | Description | Blocking? |
|---|---|---|
| Intent detection | All social intent test cases pass | Yes |
| False-positive | Normal scene answers do not trigger social intents | Yes |
| Answer intent | Answer type detection test cases pass | Yes |
| Reply templates | Every template group has at least 3 entries | Yes |
| Fallback path | V1 fallback guard produces correct reciprocal reply | Yes |
| Scene coverage | At least 3 scenes have complete slot/question data | Yes |
| Beginner safety | Templates use simple vocabulary appropriate for beginners | Yes |
| Audio/TTS readiness | TTS provider supports the language and produces natural output | Yes |
| Cross-language isolation | Language patterns do not match input from other languages | Yes |

### Test matrix size

Each language must have a quality spec equivalent to the English 33-case social + 20-case answer matrix. Minimum 50 test cases per language.

---

## 7. Russian Pilot Plan

Russian is planned as the first language added entirely through the admin system, validating the expansion workflow before scaling.

### Why Russian

- Cyrillic script tests Unicode handling
- Different grammar structure tests pattern flexibility
- Large learner market validates business case
- Not yet started in code — clean test of admin-only addition

### Pilot steps

1. Create Russian in admin UI (`status: draft`)
2. Add Russian social intent patterns via admin
3. Add Russian reply templates via admin
4. Add Russian scene slot keywords for 3 starter scenes
5. Run QA test suite via admin
6. Preview Russian conversation in admin
7. Fix any failing tests
8. Publish Russian (`status: published`)
9. Monitor beta user feedback
10. Iterate templates based on feedback

### Success criteria

- Russian added without any TypeScript code changes
- Russian QA spec passes 50+ cases
- Russian conversation feels natural to native speakers
- No regression in English behavior

---

## 8. Migration Plan

### Phase 0: Current state (COMPLETE)

- English runtime stable
- Korean code-level readiness
- Universal intent detector with EN + KO patterns
- Language pack skeleton with EN + KO
- ACKS migrated to language pack

### Phase 1: Create DB schema

- Implement the 7 tables documented in section 5
- Add RLS policies for owner/admin access
- Seed English data from current code constants
- Seed Korean data from current code skeletons

### Phase 2: Build owner admin language management UI

- Language list with status badges
- Language detail editor (metadata, regions)
- Intent pattern editor
- Reply template editor
- Scene slot editor
- QA test runner

### Phase 3: Migrate Korean into DB

- Move Korean intent patterns from code to DB
- Move Korean language pack from code to DB
- Update runtime to read from DB when available, fallback to code
- Verify Korean detection still passes 10/10

### Phase 4: Add Russian via admin

- Create Russian entirely through admin UI
- No code changes
- Run QA suite
- Preview conversations

### Phase 5: Publish Korean

- Complete Korean scene coverage
- Pass Korean QA spec (50+ cases)
- Publish through admin
- Monitor beta feedback

### Phase 6: Publish additional languages

- Use the same admin workflow for each new language
- Each language must pass its own QA spec before publishing
- No code changes required per language

---

## 9. Safety Rules

1. **Do not enable a language without QA pass.** Every language must pass its full test matrix before `status: published`.

2. **Do not connect incomplete language packs to runtime.** A language pack with missing template groups must not be selectable by users.

3. **Do not hardcode future languages unless explicitly approved.** Korean was a deliberate exception for architecture validation. Russian and all subsequent languages use the admin system.

4. **Keep English stable.** English is the production baseline. All changes must preserve 53/53 quality spec.

5. **Keep lesson flow unchanged.** Language expansion adds conversation content, not lesson stages or progression logic.

6. **All language additions must preserve TypeScript 0 and Lint 0.** Even DB-seeded content must not break the build.

7. **Owner-only access for language publishing.** Only users with `role: 'owner'` can publish or unpublish a language. Admins can edit content but not publish.

8. **Instant rollback.** Unpublishing a language immediately removes it from user selection. No deploy required.

9. **Cross-language isolation mandatory.** Adding a new language must not affect intent detection or reply quality for existing languages.

---

## Version History

| Date | Version | Changes |
|---|---|---|
| 2026-04-26 | 1.0 | Initial design document |
