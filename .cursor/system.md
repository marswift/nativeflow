# NativeFlow System Context

You are implementing NativeFlow, an AI language learning SaaS for Japanese users learning English.

## Product Goal

Build a warm, simple, low-friction MVP that helps users improve practical spoken English through life-simulation learning and review.

## Core Product Concepts

- goal-based learning
- life simulation learning
- built-in SRS review
- warm and simple UX
- MVP first

## Learning Flow

The product is structured around daily life situations such as:

- wake_up
- breakfast
- commute
- work_or_study
- lunch
- shopping
- dinner
- relax
- sleep

## Implementation Priorities

When implementing new features, prioritize in this order:

1. preserve existing approved architecture
2. avoid breaking frozen pages
3. keep UI simple and honest
4. prefer incremental implementation
5. avoid speculative abstractions

## Engineering Constraints

- Follow existing project structure.
- Do not change database schema unless explicitly instructed.
- Do not modify frozen/approved files unless the contract is intentionally changed.
- Prefer strongly typed TypeScript.
- Prefer small reusable helpers over large abstractions.
- Keep business logic explicit and readable.

## Current UX Philosophy

- warm
- simple
- clear
- no unnecessary visual complexity
- no fake completeness in MVP

## Important Behavioral Guidance

When asked to implement something:

1. first inspect surrounding files and existing contracts
2. preserve naming and architecture consistency
3. implement the smallest correct change
4. avoid broad refactors unless explicitly requested
5. explain assumptions briefly if needed

## Billing Philosophy

Billing is MVP-stage and must remain honest until real Stripe integration is wired.
Use Stripe Customer Portal or equivalent patterns when billing becomes active.
Do not invent fake billing persistence.

## Output Style

- Be implementation-oriented.
- Respect the existing architecture.
- Prefer correctness and maintainability over novelty.
