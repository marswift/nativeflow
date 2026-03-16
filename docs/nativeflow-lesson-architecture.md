# NativeFlow Lesson Architecture

## Product Definition

**NativeFlow** is an **AI Daily Life Speaking Simulator**. It is not a vocabulary app, a grammar drill app, or a generic chatbot. It is a product that simulates real-life speaking situations and guides learners through a structured speaking ladder so they can overcome the output barrier and start speaking in the target language.

---

## The Speaking-First Learning Ladder

NativeFlow uses a **speaking-first learning ladder**—a fixed progression of step types that take the learner from passive listening to free conversation within a single lesson. The ladder is:

1. **Listen** — Hear the model (phrase, pattern, or prompt). No output required; build a mental model.
2. **Repeat** — Reproduce what was heard. Low cognitive load; focus on accuracy and pronunciation.
3. **Pattern Practice** — Substitute parts of a sentence while keeping the structure. Bridges fixed phrases to flexible output.
4. **Guided Conversation** — Answer a question or complete a turn with strong scaffolding (e.g. hints, choices). Reduces “what do I say?” anxiety.
5. **Free Conversation** — Open turn in the same scene with minimal scaffolding. Final step of the lesson. Free Conversation is not a blank generic chat; it remains scene-bound and psychologically supported.

This order is intentional: each step lowers the **output barrier** for the next.

---

## The Output Barrier

Many learners **cannot start speaking** because they do not know what to say. They have input (words, grammar) but lack:

- Ready phrases for the situation
- A safe sequence to try (listen → repeat → vary → answer → speak freely)
- Scene-specific context so the conversation feels real

The speaking ladder solves this by:

- **Listen & Repeat** — Provide the exact words and sounds; no generation required.
- **Pattern Practice** — Give one structure; learner only fills slots. Low “what to say” load.
- **Guided Conversation** — Provide prompts, hints, or options so the learner always has a possible answer.
- **Free Conversation** — Only after preparation in the same scene, so context and vocabulary are already activated.

Learners are never dropped into a blank box and asked to “just talk.” They are led step by step to the point where free speaking is natural.

---

## Scene-Based Learning

Lessons are organized by **scenes**—concrete daily-life situations (e.g. wake up, coffee shop, shopping, restaurant). Each lesson is tied to one scene so that:

- Language is learned in context (when and where to say it).
- Vocabulary and phrases recur within and across lessons in the same scene.
- The AI can play a consistent role (e.g. barista, server) and keep the conversation coherent.

### MVP Scenes

- **wake_up** — Morning routine; greetings; simple plans.
- **coffee_shop** — Ordering; small talk; clarifying.
- **shopping** — Asking for items; size/price; preferences.
- **restaurant** — Ordering food; dietary needs; paying.

Scenes can be extended later (e.g. commute, work, travel) without changing the core ladder or SRS design. MVP lessons should feel short, finite, and achievable; target duration is around 3–5 minutes when possible.

---

## Lesson Candidates

A **lesson candidate** is a unit that can be scheduled for “today” or for review. It represents:

- A **scene** (e.g. `coffee_shop`).
- A **sequence of steps** along the speaking ladder (Listen → Repeat → Pattern Practice → Guided Conversation, and optionally Free Conversation).
- **Metadata** used by the daily lesson engine: estimated time, difficulty, skill tags, goal tags, region/language, and whether it is review or new content.

Candidates are selected by the lesson engine (e.g. `generate-daily-lesson`) using phases (overdue review → due review → new content), deadline urgency, goal/weakness matching, and diversity so that the plan is deterministic, explainable, and aligned with the user’s level and goals.

---

## SRS: What Can Be Reviewed

Spaced repetition (SRS) in NativeFlow is **speaking-oriented**. Review items are things the learner can **say again** or **rehear and repeat**, not only recognize. Reviewable types include:

- **Phrase** — A fixed phrase (e.g. “I’d like a large latte.”). Review = hear and repeat or use in a mini-prompt.
- **Sentence pattern** — A template with slots (e.g. “I’d like [size] [item].”). Review = produce an instance.
- **Scene expression** — A scene-specific chunk (e.g. “Can I get the bill?” in restaurant). Review = use in a guided prompt in that scene.
- **Guided output item** — A question–answer or prompt–response pair from a guided step. Review = see prompt, speak the answer again.

Review items should be generated from lesson outputs (e.g. phrases or patterns produced or encountered in a lesson), not only from pre-authored phrase lists. Reviews are scheduled (e.g. due/overdue) and mixed with new content according to the daily plan and deadline urgency so that the experience stays “speaking first” and not flashcard-heavy.

---

## Scaling to 10+ Languages

The architecture is built to scale to many target languages:

- **Language-agnostic ladder** — Listen → Repeat → Pattern Practice → Guided Conversation → Free Conversation is independent of language. Only content (prompts, phrases, patterns) is localized.
- **Scene library per language** — Scenes (wake_up, coffee_shop, etc.) are defined once; each language has its own scripts, phrases, and patterns for those scenes.
- **Lesson candidates** — Tagged with `languageCode` (and optionally region). The daily engine filters and scores by target language; country/region can drive variety (e.g. US vs UK English).
- **SRS and review types** — Phrase, pattern, scene expression, and guided output are universal; only the actual text and audio are localized.
- **UI and copy** — App UI language (e.g. Japanese) and target learning language are separated in constants and copy so that adding a new learning language does not require redefining the ladder or the engine.

---

## Phase 2 Features (Post-MVP)

Planned enhancements that stay aligned with “AI Daily Life Speaking Simulator”:

- **Speaking score** — Lightweight feedback on clarity, pace, or key sounds (no heavy assessment UI). Used to nudge practice, not to overwhelm.
- **Streak system** — Consecutive days with completed speaking (e.g. lesson or review). Surfaces on Home and Result to emphasize continuity.
- **Daily speaking mission** — One clear mission per day (e.g. “Complete Coffee Shop” or “Do 3 reviews + 1 new lesson”). Keeps “one primary action” and avoids mode overload.
- **Progress visualization** — Streak, total speaking time, weekly minutes, lessons completed, phrases reviewed. Emphasizes continuity and long-term growth, not complex dashboards.

These are additive: they support the same ladder, scenes, and lesson/review model without turning the product into a feature-heavy dashboard.

---

## Implementation Notes for MVP

Minimum implementation-oriented structure:

**Lesson:** `lessonId`, `sceneId`, `targetLanguageCode`, `targetCountryCode` (optional), `difficulty`, `estimatedMinutes`, step sequence, review targets.

**Step:** `stepType`, `prompt`, `hint` (optional), `exampleAnswer` (optional), `expectedAnswer` or validation rule (optional), audio support if relevant.
