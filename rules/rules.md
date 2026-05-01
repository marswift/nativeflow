# SaaS Development Rules (Generic)

## Purpose

This file defines generic, reusable rules for AI-assisted SaaS development.
Project-specific rules must be defined separately (for MoneyPon: `rules/rules_money.md`).

It must be read at the start of every session before proposing, reviewing, or editing anything.
Failure to follow these rules invalidates the task.

---

# Phase Control Rules (MANDATORY)

## Phase Definition

- Phase 0: Design Fix (NO CODE CHANGE)
- Phase 1: Analysis Only (NO CODE CHANGE)
- Phase 2: Minimal Fix
- Phase 3: Integration Test
- Phase 4: Release Validation

## Absolute Rule

- No implementation is allowed in Phase 0 or Phase 1.
- Any code change before analysis completion is INVALID.

---

# Universal Engineering Rules (MANDATORY)

## 1) Pre-Change Analysis (BLOCKING)

Before any create/edit/delete:

1. Related files
2. DB tables (read/write/affected)
3. FK / constraints
4. Auth / RLS impact
5. End-to-end data flow
6. Regression risks

If unclear -> STOP.

---

## 2) Integrity & Idempotency

- Never write child before parent.
- All operations must be retry-safe.
- No check-then-insert without constraint/upsert.
- Initialization/bootstrap must be idempotent.

---

## 3) Source of Truth Rule (CRITICAL)

Each domain must have exactly one source of truth.
Multiple truth sources are forbidden.

UI is projection only, not authoritative state.

---

## 4) State Transition Rule (CRITICAL)

All critical domains must define explicit state transitions.
Implicit transitions are forbidden.

All transitions must be:
- event-driven
- idempotent
- replay-safe

---

## 5) API Responsibility Rule

Each API must represent one domain action.

Forbidden:
- mixed unrelated domain mutations in a single API
- UI decision logic embedded in APIs

---

## 6) Dual Write Prohibition Rule (CRITICAL)

Never manually write the same domain state to multiple systems in one synchronous flow.

Prefer one authoritative write path + event-driven projection updates.

---

## 7) Event-Driven Consistency Rule

Critical updates must be event-driven.
Direct UI -> DB synchronization for externally-authoritative domains is forbidden.

---

## 8) Feature Lock Rule

Once a domain is stable:
- avoid cross-domain modifications
- prefer isolated fixes

---

## 9) Completion Gate

A task is NOT complete unless:

- Analysis done
- TypeScript passes
- Build passes
- No lint errors
- Regression risks resolved

---

## Cross-File Root Cause Analysis Rule (MANDATORY)

Single-file fixes are forbidden unless the issue is proven to be isolated.

Before proposing or implementing any fix, inspect all related layers:

1. UI/component file
2. Parent/layout/provider files
3. Hooks and shared utilities
4. API routes/actions
5. DB tables and data contracts
6. Auth/RLS/provider state
7. Async/race conditions
8. State ownership and source of truth

For every bug, report:

- suspected root cause
- all related files inspected
- all files intentionally not changed
- why the issue is isolated or not isolated
- whether the bug can be caused by another layer

If the same issue remains after one fix attempt:

- STOP
- do not patch the same file again
- perform full cross-file analysis
- inspect provider/layout/API/DB/state flow
- only then propose the next fix

A task is invalid if it fixes only the visible file without proving that upstream and downstream dependencies are irrelevant.

---

## Deployment Verification Rule (MANDATORY)

After any code change:

1. Run local checks:
   - TypeScript
   - Build
   - Lint

2. Commit changes:
   git add .
   git commit -m "<clear message>"

3. Push:
   git push

4. Confirm deployment:
   - Check latest deployment timestamp
   - Ensure it is newer than the fix

5. Verify in browser:
   - Hard reload (cmd + shift + R)
   - Confirm behavior change

6. If behavior does not change:
   - Assume old code is running
   - Do NOT debug further until deployment is confirmed

---

# DB Safety Rules (MANDATORY)

- Define invariants before DB change.
- Enforce in both code and DB constraints.
- Never modify key identity flows blindly (`*_id` parent/child paths).
- Always list breakpoints before editing.
- Always run DB verification after change.

---

# Code Structure Rules

- No domain logic duplication.
- Shared utilities first.
- Keep UI thin.
- Place business logic in server/domain layers.

---

# Absolute Principle

- Partial fixes are forbidden.
- Assumption-based fixes are forbidden.
- If structure is unclear -> STOP.
