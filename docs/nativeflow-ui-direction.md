# NativeFlow UI Direction

## Positioning

NativeFlow is an **AI Daily Life Speaking Simulator**. The UI must reflect that: it is a **daily speaking action app**, not a feature-heavy language dashboard. Every design choice should make it faster and easier to start speaking, not to browse options.

---

## Core UX Goal

**Users should start speaking within 10 seconds after opening the app.**

The home screen must answer one question: “What do I do now?” The answer must be obvious: **Start today’s lesson.** No mode picker, no long list of scenes, no dashboard of widgets. One primary action, above the fold.

---

## One App, One Daily Goal, One Primary Action

**Principle:** One app, one daily goal, one primary action.

- **One app** — NativeFlow does one job: get you speaking in daily-life situations with AI. It is not a vocabulary app, a grammar app, or a generic chatbot.
- **One daily goal** — Each day has a single focus (e.g. today’s lesson + any due reviews). We do not ask the user to choose among many daily goals.
- **One primary action** — On each screen, there is at most one main CTA (e.g. “Start today’s lesson,” “Start lesson,” “Speak,” “End conversation”). Secondary actions (e.g. retry, hint) support that action; they do not compete with it.

This keeps the product feeling like a **daily speaking training product**, not a dashboard of features.

---

## Recommended Navigation

**Bottom navigation (MVP):**

- **Today** — Home. Today’s speaking mission and the primary start CTA.
- **Review** — Lightweight SRS review (due count, phrase cards, speak again).
- **Progress** — Continuity and growth (streak, time, lessons, phrases).

Tabs are few and stable. “Today” is the default. Users are not forced to choose modes or sections before speaking; the app leads them to **one** next step.

---

## Why Home Must Prioritize These

**Today’s speaking mission** — One sentence that says what “done” looks like today (e.g. “Complete Coffee Shop” or “Do your reviews + one lesson”). No long lists.

**Primary start CTA** — One large, obvious button: “Start today’s lesson” (or “Start lesson” when the mission is clear). This is the only main action above the fold.

**Small continuity information** — Streak, optional review reminder, estimated time. These support motivation and context; they do not become the focus. No charts, no complex stats on Home.

If we clutter Home with scene lists, multiple CTAs, or feature blocks, we violate “one primary action” and slow users down. Home must answer “What do I do now?” in one glance and one tap.

---

## Why We Do Not Force Mode Choice Before Speaking

Users must **not** be forced to choose among many modes (e.g. “Vocabulary / Grammar / Conversation / Review”) before they can speak. That would:

- Increase time-to-first-speech and undermine the “10 seconds to speaking” goal.
- Make the product feel like a dashboard of tools instead of a single daily habit.
- Raise the output barrier instead of lowering it.

The app should **recommend** the next step (today’s lesson, or review if due) and present one primary action. Optional settings (e.g. scene preference, session length) can live in settings or be inferred from profile; they must not block the main path to “Start lesson.”

---

## Speaking Ladder UI Progression

The in-lesson flow follows the **speaking ladder** in order. The UI should make the step type clear and keep the same interaction pattern where possible:

1. **Listen** — Play model; show text; step label “Listen.” No speak button required for this step.
2. **Repeat** — Show prompt; large **Speak** button; retry and hint as needed.
3. **Pattern Practice** — Show pattern and slots; large **Speak** button; hint with example.
4. **Guided Conversation** — Show question or prompt; large **Speak** button; hints or choices if needed.
5. **Free Conversation** — Scene reminder; AI prompt; large **Speak** button; optional hints; clear “End conversation” when done.

Each step has **one main action** (listen or speak). The layout (progress, step label, scene context, main prompt, hint area, speak button) stays consistent so the user is not learning a new UI at each rung—only the content and difficulty change.

---

## UI Rules

- **One screen, one purpose** — Each screen has a single primary job (e.g. “start lesson,” “do this step,” “see result,” “do reviews”).
- **Large primary action button** — The main CTA is big, tappable, and easy to find. Same region across similar screens (e.g. bottom or center).
- **Consistent button placement** — Primary action in a stable position so users build muscle memory.
- **Minimal navigation** — Few tabs; no deep hierarchies. Today / Review / Progress is enough for MVP.
- **Progress emphasizes continuity, not complexity** — Streak, time, counts. No heavy charts or dashboard feel. Progress says “you’re building a habit,” not “here are 20 metrics.”

---

## What NativeFlow Must Feel Like

- A **daily speaking training product** — Open app → see today’s mission → tap once → start speaking.
- An **AI Daily Life Speaking Simulator** — Scenes and steps feel like real situations, not abstract drills.

## What NativeFlow Must Not Feel Like

- A **vocabulary app** — Lists and flashcards are not the focus; speaking is.
- A **grammar app** — Grammar supports the ladder; it is not the main UI.
- A **generic chatbot** — Conversations are scene-based and structured (ladder + scenes), not open chat from zero.
- A **feature-heavy dashboard** — No widget grid, no many modes, no “choose your path” before the first action.

All future UI work should be checked against this document so the product stays a single, clear daily speaking action app.
