# Staged Supabase Content Migration Checklist

## Scope

- This document defines staged migration behavior for lesson content resolution.
- Runtime code changes are out of scope for this document.

## Migration Policy

- Published scenes should prefer Supabase DB content.
- Unpublished scenes should continue using object catalog fallback.
- Full DB coverage is not required before release.

## 1) Decision Rule (Resolver Contract)

- [ ] DB hit with `is_active=true` => use database content.
- [ ] DB miss => fallback to object catalog.
- [ ] DB error => fallback to object catalog and emit warning log.
- [ ] Resolver must never block lesson start due to missing DB rows.

## 2) Logging Requirements

- [ ] Emit `[CONTENT_RESOLVE] DB hit` when DB-backed content is used.
- [ ] Emit `[CONTENT_RESOLVE] fallback` when object catalog is used.
- [ ] Emit `[LESSON_CONTENT_SOURCE]` summary per lesson start (DB/fallback mix).
- [ ] Include scene key, level, region, and reason (`miss` or `error`) in fallback logs.

## 3) Release Safety Rules

- [ ] Keep fallback path enabled until all target languages/scenes are verified in production-like checks.
- [ ] Do not gate release on 100% DB-backed scene coverage.
- [ ] Treat fallback usage as expected during staged rollout, not as immediate failure.

## 4) Admin Publish Validation Rules

- [ ] Publish action must create or activate DB rows for published scenes.
- [ ] Published scene must become DB-backed on subsequent resolution.
- [ ] Validation must fail publish if required rows are missing or inactive.
- [ ] Publish lifecycle status must remain auditable (`draft -> validated -> published -> archived`).

## 5) Required Test Cases

- [ ] Published scene uses DB content.
- [ ] Unpublished scene uses object catalog fallback.
- [ ] DB query error uses fallback with warning log.
- [ ] Missing DB rows do not block lesson start.
- [ ] Mixed lesson (some DB-backed, some fallback) resolves safely.

## 6) Future Fallback Removal Criteria

- [ ] All production target languages/scenes are DB-backed.
- [ ] Data verification is complete for all published scenes.
- [ ] Resolver logs show stable DB hit rates with no lesson-blocking incidents.
- [ ] Operational sign-off is completed for fallback removal.
- [ ] Only then remove object catalog fallback.

## Operational Note

- Until removal criteria are fully met, fallback remains part of expected system behavior.
