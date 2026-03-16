# NativeFlow Cursor Rules

This repository builds NativeFlow. This file is the canonical implementation rule file for the project.

---

# Product Identity

- NativeFlow is an AI language learning SaaS.
- It focuses on **life simulation language learning**.
- Core learning model: **experience → conversation → repetition → habit → fluency**.
- MVP target: Japanese learners studying English.

---

# Core Product Principles

- Keep MVP simple.
- Build core logic first.
- Avoid unnecessary features.
- Test logic before UI polish.
- Ship early and iterate.
- Never overbuild.

---

# Learning Philosophy

- Language is acquired through **conversation**, not memorization.
- Learning should mirror **real-life situations**.
- **Daily habit formation** is essential.
- NativeFlow is **phrase-centered**, not vocabulary-centered.

---

# Daily Life Simulation

Canonical daily flow:

- Wake up
- Breakfast
- Commute
- Work / Study
- Lunch
- Shopping
- Dinner
- Relax
- Sleep

---

# Visual Learning Architecture (MVP)

- Lightweight **illustration-based storytelling**.
- No video in MVP.
- **Comic-style scenes**.
- **Phrase-level illustrations**.
- **Mascot characters** must be part of the learning experience.

---

# Mascot System

- **Alex** — Penguin
- **Emma** — Cat
- **Leo** — Dog

---

# AI / Story Architecture

Design the system so future expansion is straightforward for:

- AI conversation
- Story-driven learning
- Spaced repetition
- Habit retention systems
- Emotional engagement via mascots and story scenes
- AI Story Generator
- Daily Story Engine

---

# Architecture Expectations

The codebase supports and should maintain:

- **Lesson Engine** — lesson and step logic
- **Runtime Controller** — lesson run state and transitions
- **Conversation Facade** — conversation-lesson API surface
- **API Routes** — Next.js route handlers for conversation lesson flow
- **API Client** — thin browser-safe API wrapper
- **React Hooks** — client-side state and actions (e.g. `useConversationLesson`)
- **UI Components** — pages and components consuming hooks and API

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- Supabase
- Stripe
- OpenAI
- Vercel

Do not change the tech stack unless explicitly requested.

---

# UI Principles

- **Simple**, **warm**, **clear**.
- Avoid heavy design systems during MVP.
- **Japanese-first UI** for now.
- Structure code so **future multilingual expansion** is possible.

---

# Database / Backend Rules

- **Supabase** is the backend.
- **Existing tables must not be modified** unless explicitly requested.
- Keep the currently listed key tables if already present.
- Future additions must be **deliberate and minimal**.

Key tables (if present):

- user_profiles
- phrase_master
- user_phrase_progress
- lessons
- lesson_blocks

---

# Collaboration Model

- **Product decisions** → ChatGPT
- **Specification clarification** → Claude
- **Implementation** → Cursor

Cursor must follow architecture decisions and **must not invent product scope**.

---

# Implementation Behavior

- Finish **one file cleanly** before moving to the next.
- Prefer **minimal, robust** implementations.
- Avoid **premature abstractions**.
- Do **not** create extra features not requested.
- Keep **naming consistent and clear**.
- Prefer **reusable domain logic** over duplicated UI logic.
- Do not change architecture unless explicitly requested.
- Do not modify database schema unless instructed.
- Prefer small incremental changes.

---

# Frozen / Approved Files

## app/dashboard/page.tsx

**Status:** Approved and frozen.

- Do not modify unless the dashboard orchestration contract changes.
- This file is the dashboard orchestration layer.
- Keep these internal helpers stable: `formatStudyDiff`, `getTargetLanguageLabel`, `getCurrentLevelLabel`, `InfoCard`.
- Keep redirect behavior: no session → `/login`, no profile → `/onboarding`.
- Do not add logout/settings/my-page logic in this file.
- Keep current links unchanged unless the dashboard navigation contract intentionally changes.

## app/login/page.tsx

**Status:** Approved and frozen.

- Do not modify unless the login page contract changes.
- Keep visible UI output unchanged unless the authentication UX contract intentionally changes.
- Keep routes: already logged in → `/dashboard`, successful login → `/dashboard`, signup link → `/signup`.
- Keep current error handling and loading/submitting states.
- Do not add social login or billing logic in this file.

## app/signup/page.tsx

**Status:** Approved and frozen.

- Do not modify unless the signup page contract changes.
- Keep visible UI output unchanged unless the authentication UX contract intentionally changes.
- Keep routes: already logged in → `/dashboard`, successful signup → `/onboarding`, login link → `/login`.
- Keep current error handling and loading/submitting states.
- Do not add social login or billing logic in this file.

## app/onboarding/page.tsx

**Status:** Approved and frozen.

- Do not modify unless the onboarding contract changes.
- Keep redirect behavior: no session → `/login`, successful save → `/dashboard`.
- Keep all current fields, validation rules, study-plan calculation flow, and payload structure unchanged.
- Do not move onboarding logic into unrelated files.
- Keep visible UI output unchanged unless the onboarding UX contract intentionally changes.

## app/settings/page.tsx

**Status:** Approved and frozen.

- Do not modify unless the settings hub contract changes.
- Keep internal helper stable: `SettingsSection`.
- Keep current routes: `/settings/profile`, `/settings/learning`, `/settings/billing`, `/dashboard`, `/lesson`, `/history`.
- Keep existing session check and logout behavior.
- Do not add direct Stripe logic or edit forms in this file.

## app/settings/profile/page.tsx

**Status:** Approved and frozen.

- Keep unauthenticated redirect: no session → `/login`.
- Keep email display-only until editable profile/email flows are added.
- Keep displayName and profilePhotoUrl as local UI-only state until real persistence fields exist.
- Keep the explicit MVP honesty message and explanatory note.
- Do not fake persistence in this file.
- Keep the back link to `/settings` unchanged.

## app/settings/learning/page.tsx

**Status:** Approved and frozen.

- Keep: no session → `/login`, no profile → `/onboarding`, successful update → show success message and refresh.
- Keep all current editable fields, validation flow, and save payload structure unchanged.
- Keep `applyProfile` as the internal hydration helper.
- Keep the back link to `/settings` unchanged.
- Do not add billing logic or unrelated settings in this file.

## app/settings/billing/page.tsx

**Status:** Approved and frozen.

- Keep unauthenticated redirect: no session → `/login`.
- Keep Stripe status messaging honest until real billing integration is added.
- Keep internal helper stable: `BillingRow`.
- Keep all current placeholder values unchanged unless real billing data is wired in.
- Keep the disabled Stripe button and the back link to `/settings` unchanged.

---

# Settings Architecture

Settings are hub + subpages. Do not put all edit forms on the hub.

- **/settings** — Hub. Links to profile, learning, billing.
- **/settings/profile** — Name, profile photo, email, logout.
- **/settings/learning** — Target language, country/region, level, target outcome, speak-by deadline, daily study minutes, preferred session length, dating context toggle.
- **/settings/billing** — Plan, next billing date, plan update, manage payment (Stripe), billing history entry. Use Stripe Customer Portal; do not store raw card details.

---

# Implementation Priorities

Unless explicitly instructed otherwise:

1. Stabilize lesson flow
2. Stabilize review flow
3. Wire real integrations carefully
4. Improve internal consistency
5. Avoid broad refactors late in MVP

---

# Editable vs Sensitive Areas

Prefer implementing changes in **non-frozen** files.

Treat as sensitive: authentication flow, onboarding contract, dashboard orchestration, settings hub and approved settings subpages.

Before editing sensitive areas: inspect current contract, minimize surface area, avoid UI regressions.

---

# Refactor Policy

Late-stage MVP refactors must be conservative.

Do not: reorganize folders broadly, rename stable public helpers without reason, rewrite working pages for style only, introduce new abstractions unless they remove real duplication or unblock a feature.

Prefer: local fixes, additive helpers, targeted cleanup, contract-preserving improvements.

---

# Local Execution / Test Environment Rules

- Before suggesting or running any local test command, always verify the active Node.js version first.
- For this repository, Node.js v20+ is the expected environment.
- Do not assume Node 16 or older unless the user explicitly shows that version.
- If a local execution issue occurs, do not modify production code, test architecture, package.json, or add custom inline test runners as a workaround unless explicitly requested.
- Do not replace node:test-based tests with custom runners.
- Do not introduce workaround refactors just because a command failed once.
- First diagnose the actual environment and exact stderr output.
- If node:test execution fails, report the exact command and exact error before proposing any code changes.
- Prefer minimal diagnosis steps over speculative fixes.

# Command Execution Confirmation Rule

- A Cursor command approval dialog is not an execution error.
- Do not diagnose a command failure before the command has actually run.
- Do not infer test or environment problems from the pre-run approval popup.
- Only treat something as an execution failure after capturing the actual stdout/stderr and exit result.
- If a test command fails, report the exact command and exact stderr output before proposing any code or configuration changes.
- Do not speculate from the approval UI alone.

# Test Command Consistency Rule

When suggesting or executing tests:

- Prefer existing npm scripts if available.
- Do not generate ad-hoc Node execution commands when a stable command can be used.
- Avoid repeatedly generating long commands such as:
  node --import tsx --test <file>
- Prefer standardized execution patterns.

Example preferred pattern:

npm run test:<target>

If a direct node command must be used, keep the command stable and do not modify flags unless the failure requires it.

Never change the test execution strategy without confirming the real stderr output.

# Cursor Execution Safety Rule

Cursor must not:

- infer errors from command approval dialogs
- generate new execution commands if a previous command has not yet been executed
- attempt to fix environment issues without first capturing the exact stderr output

Always follow this sequence:

1. verify Node version
2. run command
3. capture stdout/stderr
4. diagnose failure
5. propose minimal fix

Do not skip steps.

---

# Lesson Domain Model

NativeFlow lessons follow a strict domain model.

Lesson structure:

- Lesson
- Scene
- Phrase
- ConversationTurn
- ReviewItem

Explanation:

- **Lesson** — Represents a daily-life situation such as "Morning Routine" or "At a Cafe".
- **Scene** — Represents a moment inside a lesson. Example: wake up, ordering coffee, meeting a friend.
- **Phrase** — A natural conversational phrase used inside a scene.
- **ConversationTurn** — Represents one exchange between the user and the AI.
- **ReviewItem** — Represents a phrase scheduled for spaced repetition review.

Cursor must not invent alternative lesson models.

---

# Conversation System Rules

AI conversation must follow controlled interaction rules.

Conversation flow:

```
Scene Context
↓
User Input
↓
AI Response
↓
Conversation Turn Builder
↓
Next Prompt Context
```

Rules:

- AI responses must stay within the current scene context.
- Avoid long explanations.
- Prefer natural conversational replies.
- Encourage user responses rather than lecture.
- Keep responses concise.

The conversation system must prioritize:

- natural dialogue
- context awareness
- short response cycles

---

# AI Cost Control Rules

AI usage must be designed for SaaS scalability.

Implementation guidelines:

- Limit token usage in prompts.
- Reuse system prompts where possible.
- Avoid sending unnecessary context.
- Cache reusable AI outputs when possible.
- Prefer phrase reuse over generating new content.

Cursor must not implement expensive AI patterns without instruction.

---

# Code Organization Rules

Keep domain logic separate from UI logic.

Preferred structure:

- lib/lesson
- lib/conversation
- lib/review
- lib/api

React components should consume hooks.

Hooks should call API client.

API client calls API routes.

API routes call domain logic.

---

# Important Principle

NativeFlow must remain maintainable by a very small team.

Architecture decisions should always favor:

- clarity
- simplicity
- predictability
- low AI cost
