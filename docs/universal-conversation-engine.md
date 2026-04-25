# NativeFlow Universal Conversation Engine

Design document for extending NativeFlow's AI conversation system to support natural conversation across all languages. This is a forward-looking architecture spec — no runtime changes are made by this document.

---

## 1. Purpose

NativeFlow is a language learning platform that must support natural conversation practice across all supported languages. The current AI conversation engine is English-only, stable at 33/33 quality spec tests, and must not be rewritten.

The Universal Conversation Engine adds an extensible layer on top of the existing system:

- Shared intent detection across languages
- Language-specific reply rendering via packs
- Scene-agnostic conversation control
- Deterministic safety guards that prevent free-form LLM output from reaching users

### Design principles

- **Additive, not replacement.** The current engine stays. New layers wrap it.
- **Language packs, not hardcoded strings.** All user-facing reply text lives in per-language files.
- **Intent-first, not text-first.** The engine decides WHAT to say (intent), then a language pack decides HOW to say it.
- **Deterministic over generative.** Templates and pools, not LLM free-form text, produce the final reply.

---

## 2. Current Stable Baseline

As of April 2026:

| Metric | Status |
|---|---|
| Quality spec tests | 33/33 PASS |
| Universal social intent detector | Active (`lib/universal-conversation-intents.ts`) |
| V1 fallback reciprocal guard | Active (uses universal detector) |
| Slot-based dialogue (V2.6) | Active with repair templates |
| Value-aware bridge templates | Active across 11 scenes |
| Comment-only turns | Active (turn 2, object/people) |
| Audio-first UX | Active (text hidden during playback) |
| TypeScript | 0 errors |
| Lint | 0 new errors |

### Files that define the current engine

| File | Role |
|---|---|
| `lib/ai-conversation-prompt.ts` | V2.5 LLM prompt + V2.6/V2.7 deterministic assembly |
| `lib/ai-conversation-state.ts` | Conversation state machine, intent selection, dimension progression |
| `lib/ai-conversation-scene-questions.ts` | Scene question pools, slot schemas, bridge templates |
| `lib/ai-conversation-fallback.ts` | Client-side fallback when API unavailable |
| `lib/universal-conversation-intents.ts` | Universal social intent detection |
| `app/api/ai-conversation/reply/route.ts` | Server API route |
| `docs/ai-conversation-quality-spec.md` | Quality spec with 33 test cases |

---

## 3. Architecture

```
User Speech
  |
  v
ASR Transcript (Whisper STT)
  |
  v
Language Context (from user profile: target language + region)
  |
  v
Universal Intent Detection
  - Social intents: greeting, reciprocal, thanks, apology, farewell
  - Control intents: confusion, continuation
  - Answer intents: yes, no, object, person, time, frequency, feeling
  |
  v
Scene Slot Detection
  - Match scene from lesson phrase
  - Validate answer against dimension slot schema
  - Select repair strategy if mismatch
  |
  v
Conversation State
  - Track turn index, covered dimensions, repair count
  - Select next dimension or wrap
  |
  v
Reply Policy
  - Determine reply shape: greeting, ack+reaction+question, comment-only, repair, wrap
  - Select bridge template if value-aligned
  - Apply comment-only rule if applicable
  |
  v
Language Pack Rendering
  - Map intent + policy decision to language-specific template
  - Replace {value} placeholders
  - Select from pools by turn index
  |
  v
Deterministic Safety Guard
  - Echo sanitizer (strip user phrase copies)
  - Duplicate ack check
  - V1 fallback override for reciprocal/social
  |
  v
Final AI Reply (text + TTS audio)
```

### Current vs future ownership

| Layer | Current owner | Future owner |
|---|---|---|
| Intent detection | `classifyUserInput` (state.ts) + LLM + universal detector | Universal Intent Layer |
| Slot validation | `validateSlot` (prompt.ts) | Scene Slot Layer |
| Reply assembly | `assembleReplyV25` (prompt.ts) | Reply Policy + Language Pack |
| Template data | `ACKS`, `REACTION_BY_MEANING`, bridge templates | Language Pack files |
| Safety guards | `sanitizeEchoFromReply`, V1 guard | Deterministic Safety Layer |

---

## 4. Intent Taxonomy

### Social intents
| Intent | Description | Example |
|---|---|---|
| `greeting` | User says hello | "Hi!", "Good morning" |
| `reciprocal_greeting` | User asks how you are | "And you?", "How are you?" |
| `thanks` | User expresses gratitude | "Thank you", "Thanks" |
| `apology` | User apologizes | "Sorry", "My bad" |
| `farewell` | User says goodbye | "Bye", "See you" |

### Conversation control intents
| Intent | Description | Example |
|---|---|---|
| `confusion` | User doesn't understand | "I don't understand", "What?" |
| `continuation` | User wants more | "Tell me more", "Go on" |
| `off_topic` | User changes subject | "I saw a cat video" |
| `fragment` | User gives very short input | "Um", single word |
| `garbled` | ASR noise / nonsense | "mekwinyapalawan" |

### Answer intents
| Intent | Meaning type | Example |
|---|---|---|
| `answer_yes` | Affirmative | "Yes, I do" |
| `answer_no` | Negative | "No, not really" |
| `answer_object` | Thing/activity | "The dishes", "Ramen" |
| `answer_person` | Person/people | "With my mom", "Alone" |
| `answer_time` | Time/duration | "Around seven", "Ten minutes" |
| `answer_frequency` | How often | "Every day", "Sometimes" |
| `answer_feeling` | Emotion/opinion | "It's hard", "I enjoy it" |

### Learning-specific intents (future)
| Intent | Description | Example |
|---|---|---|
| `request_hint` | User wants help | "Can you give me a hint?" |
| `request_repeat` | User wants to hear again | "Say that again?" |
| `self_correction` | User corrects themselves | "I mean, the dishes" |
| `question_about_word` | User asks about vocabulary | "What does that mean?" |

---

## 5. Language Pack Structure

### File layout

```
lib/conversation-language-packs/
  index.ts          -- pack registry, getLanguagePack(code)
  types.ts          -- ConversationLanguagePack type
  en.ts             -- English templates
  ko.ts             -- Korean templates (future)
  ja.ts             -- Japanese templates (future, for JP-learning-JP scenarios)
```

### ConversationLanguagePack type

```typescript
type ConversationLanguagePack = {
  code: string                    // 'en', 'ko', 'ja'

  // Social reply templates
  reciprocalGreeting: string[]    // ["I'm good too, thanks!", "Doing well!"]
  genericGreeting: string[]       // ["Hey!", "Hi there!"]
  farewellReply: string[]         // ["See you later!", "Bye!"]
  thanksReply: string[]           // ["You're welcome!", "No problem!"]

  // Acknowledgment pools
  acks: string[]                  // ["Got it.", "I see.", "Okay."]

  // Reaction pools by meaning type
  reactions: Record<string, string[]>

  // Repair/clarification
  clarifyGarbled: string[]
  clarifyConfusion: string[]

  // Comment-only soft prompt
  softPrompt: string              // "Tell me more."

  // Wrap templates
  wrapTemplates: string[]
}
```

### Registry

```typescript
// lib/conversation-language-packs/index.ts
import { en } from './en'

const packs: Record<string, ConversationLanguagePack> = { en }

export function getLanguagePack(code: string): ConversationLanguagePack {
  return packs[code] ?? packs.en
}
```

### Migration path

Currently, `ACKS`, `REACTION_BY_MEANING`, wrap prompts, and bridge templates are defined inline in `ai-conversation-prompt.ts` and `ai-conversation-scene-questions.ts`. Migration to language packs:

1. Extract current English constants into `en.ts`
2. Update `assembleReplyV25` to read from pack instead of inline constants
3. Add `ko.ts` for Korean pilot
4. Scene bridge templates stay in scene files (they are scene-specific, not language-specific)

---

## 6. Scene Integration

### Current model

Each scene in `ai-conversation-scene-questions.ts` defines:
- `dimensions` — question pools per dimension
- `slotSchema` — expected answer keywords per dimension
- `bridgeTemplates` — value-aware reaction templates
- `clarificationPrompts` — repair/confusion templates

These are currently English-only strings.

### Future model

Scenes should define semantic slots, not language-specific strings:

```typescript
type UniversalSceneDefinition = {
  id: string
  dimensions: Dimension[]
  slots: Record<Dimension, {
    acceptKeywords: Record<string, string[]>  // { en: [...], ko: [...] }
    questionKey: string                        // references language pack
  }>
}
```

The language pack maps `questionKey` to actual text:

```typescript
// en.ts
questions: {
  'breakfast_cleanup.object.q1': 'What do you clean first?',
  'breakfast_cleanup.object.q2': 'Do you wash dishes too?',
}
```

This separation allows:
- Adding a new language without touching scene definitions
- Sharing slot schemas across languages (same semantic validation)
- Scene-level A/B testing of question variants

---

## 7. Future DB Schema Direction

These tables would support admin-managed conversation content. Not implemented yet.

### conversation_intents

```sql
CREATE TABLE conversation_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_code text NOT NULL UNIQUE,     -- 'reciprocal_greeting'
  category text NOT NULL,               -- 'social', 'answer', 'control'
  description text,
  created_at timestamptz DEFAULT now()
);
```

### conversation_language_templates

```sql
CREATE TABLE conversation_language_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,           -- 'en', 'ko'
  template_key text NOT NULL,            -- 'ack.0', 'reaction.yes.1'
  template_text text NOT NULL,
  category text,                         -- 'ack', 'reaction', 'bridge', 'wrap'
  UNIQUE (language_code, template_key)
);
```

### conversation_scene_slots

```sql
CREATE TABLE conversation_scene_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id text NOT NULL,                -- 'breakfast_cleanup'
  dimension text NOT NULL,               -- 'object'
  language_code text NOT NULL,
  accept_keywords text[] NOT NULL,
  repair_templates text[] NOT NULL,
  accept_yes_no boolean DEFAULT false,
  UNIQUE (scene_id, dimension, language_code)
);
```

### conversation_quality_tests

```sql
CREATE TABLE conversation_quality_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_code text NOT NULL UNIQUE,        -- 'T01'
  input_text text NOT NULL,
  language_code text NOT NULL DEFAULT 'en',
  expected_intent text,
  expected_reply_pattern text,
  category text,                         -- 'normal', 'reciprocal', 'error', 'cross_scene'
  created_at timestamptz DEFAULT now()
);
```

### conversation_test_results

```sql
CREATE TABLE conversation_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES conversation_quality_tests(id),
  run_at timestamptz DEFAULT now(),
  actual_reply text,
  passed boolean NOT NULL,
  failure_reason text,
  engine_version text                    -- 'v2.7', 'v3.0'
);
```

---

## 8. QA Framework

### Intent detection tests

Run `detectUniversalSocialIntent` against all 33 spec cases. Must pass 33/33.

```typescript
import { detectUniversalSocialIntent } from './lib/universal-conversation-intents'

// T01: "Hi!" → greeting
// T02: "I'm good, and you?" → reciprocal_greeting
// T29: "Yes I do." → null
// ... all 33 cases
```

### Reply policy tests

Trace `assembleReplyV25` for each spec case with known LLM output. Verify:
- Reciprocal inputs get answer + question
- Comment-only turns have "Tell me more."
- Wrong-slot answers get correct repair template
- Bridge-dimension alignment holds

### Fallback path tests

Verify V1 fallback guard fires correctly:
- LLM returns `{ aiReply: "Oh good." }` for "And you?" → override to reciprocal answer
- LLM returns `{ aiReply: "Nice." }` for "The dishes." → no override

### Multi-language tests (future)

When language packs are added:
- Same intent taxonomy applies across languages
- Reply templates are language-appropriate
- Slot validation keywords are language-specific
- Bridge templates reference correct language pack

---

## 9. Migration Plan

### Phase 0: Current stable baseline (COMPLETE)

- 33/33 quality spec
- Universal social intent detector
- V2.6 slot-based dialogue
- V2.7 quality patches
- Bridge templates for all 11 scenes
- Audio-first UX

### Phase 1: Universal social intent stabilization (COMPLETE)

- `lib/universal-conversation-intents.ts` created
- 7 intent types detected
- Integrated into V2.5 assembly + V1 fallback
- English patterns defined
- Structure supports language extension

### Phase 2: Universal answer intent layer

- Extract answer classification from LLM dependency
- Client-side `classifyUserInput` becomes primary
- LLM used only for evaluation (score, feedback, correction)
- Answer intents: yes, no, object, person, time, frequency, feeling

### Phase 3: Language pack renderer

- Create `lib/conversation-language-packs/` structure
- Extract English constants from inline code to `en.ts`
- Update assembly to read from language pack
- Verify 33/33 spec still passes after extraction

### Phase 4: Korean readiness layer

- Create `ko.ts` language pack
- Add Korean patterns to universal intent detector
- Add Korean slot keywords to scene definitions
- Create Korean quality spec test cases

### Phase 5: Korean runtime pilot

- Enable Korean conversation for beta testers
- Monitor intent detection accuracy
- Monitor reply naturalness
- Iterate on Korean templates

### Phase 6: Admin expansion system

- Migrate templates to DB tables
- Admin UI for template management
- A/B testing for question variants
- Quality test runner in admin dashboard

---

## 10. Safety Rules

These rules are permanent. Any code change must comply.

1. **Do not rewrite the current 33/33 passing engine.** Extend it, don't replace it.

2. **Do not let LLM free-form output bypass deterministic guards.** The V1 fallback guard and `assembleReplyV25` are the final authority on reply text.

3. **Do not hardcode one language deeply into scene logic.** Scene definitions should be semantic (dimension + slot), not linguistic (English question text).

4. **Do not change lesson flow.** Conversation is one stage within the lesson. It must not alter lesson progression, review system, or billing.

5. **Always test both V2.5 and V1 fallback paths.** Any change to reply assembly must verify behavior when the LLM returns structured JSON (V2.5) AND when it returns bare `aiReply` (V1).

6. **Universal intent detection must not break scene-specific behavior.** Social intents fire before scene logic. Scene logic handles everything else. These layers must not conflict.

7. **New languages must pass their own quality spec before going live.** No language ships without a passing test matrix equivalent to the English 33-case spec.

8. **TypeScript must stay at 0 errors. Lint must have 0 new errors.** Every commit must verify.

---

## 11. Current Universal Conversation Engine Progress

Status as of April 26, 2026. All items below are implemented and committed.

### 11.1 Universal Social Intent Layer — COMPLETE

- `lib/universal-conversation-intents.ts` runtime-integrated for English
- `detectUniversalSocialIntent` called in both V2.5 assembly path and V1 fallback guard
- 7 social intents detected: greeting, reciprocal_greeting, thanks, apology, farewell, confusion, continuation
- Prevents bare LLM replies like "Oh good." when user asks reciprocal/social questions
- Raw `userMessage` checked directly — does not depend on LLM classification

### 11.2 AI Conversation Quality Spec — 33/33 PASS

- `docs/ai-conversation-quality-spec.md` is the single source of truth
- 33 social/runtime test cases + 20 answer intent test cases + 10 Korean detection cases
- Covers: normal flow, reciprocal, error handling, cross-scene, social variants, negative cases
- Acceptance criteria: all tests pass, reciprocal 100%, no wrong repair, audio-first UX

### 11.3 Universal Answer Intent Layer — COMPLETE (detection only)

- `detectUniversalAnswerIntent` exported from `lib/universal-conversation-intents.ts`
- 10 answer types: yes_answer, no_answer, object_answer, person_answer, place_answer, time_answer, frequency_answer, feeling_answer, preference_answer, reason_answer
- English patterns active, 20/20 test cases pass
- **Not connected to runtime** — detection only, does not influence reply assembly

### 11.4 Language Pack Renderer Skeleton — COMPLETE (structure only)

- `lib/conversation-language-packs/index.ts` — `ConversationLanguagePack` type + `getConversationLanguagePack` registry
- `lib/conversation-language-packs/en.ts` — English templates mirroring current inline constants
- Covers: acks, reactions (7 types), social replies, soft prompt, wrap templates
- **Not connected to runtime** — `assembleReplyV25` still reads inline constants

### 11.5 Korean Readiness Layer — COMPLETE (detection only)

- Korean social intent patterns added to `KO_PATTERNS` in `lib/universal-conversation-intents.ts`
- 7 intent types with natural Korean patterns (안녕, 너는?, 고마워, 미안해, 잘 가, 모르겠어, 계속해)
- Only active when explicitly called with `languageCode='ko'`
- Cross-language isolation verified: Korean input with `lang='en'` returns null
- 10/10 Korean detection tests pass (K01-K10)
- **No Korean runtime replies** — detection infrastructure only

### 11.6 Safety Status

| Check | Status |
|---|---|
| English runtime behavior | Preserved, unchanged |
| Quality spec | 33/33 social + 20/20 answer + 10/10 Korean = 63 total tests |
| TypeScript | 0 errors |
| Lint | 0 new errors |
| DB changes | None |
| Lesson flow changes | None |
| State machine changes | None |
| LLM prompt changes | None since V2.5 |

### 11.7 Recommended Next Phase

Do not connect all layers to runtime at once. Incremental migration order:

1. **Korean language pack skeleton** — Create `lib/conversation-language-packs/ko.ts` with Korean templates. Structure only, no runtime connection.

2. **English language pack rendering migration (single group)** — Replace one inline constant group (e.g. `ACKS`) in `assembleReplyV25` with a read from `getConversationLanguagePack('en').acks`. Verify 33/33 still passes.

3. **Full English pack migration** — Replace all inline constants with language pack reads. One group at a time, testing after each.

4. **Korean runtime pilot** — Connect `assembleReplyV25` to use `getConversationLanguagePack(userLanguage)` for Korean beta users only.

5. **Korean quality spec** — Create Korean-equivalent test matrix (33+ cases) that must pass before Korean goes live.

---

## Version History

| Date | Version | Changes |
|---|---|---|
| 2026-04-26 | 1.0 | Initial design document |
| 2026-04-26 | 1.1 | Added section 11: current progress, safety status, next phase recommendation |
