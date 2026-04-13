# Contributing

## Prerequisites

- **Node.js** >= 20 (see `.nvmrc`)
- **bash** — required for CI pre-check scripts (`scripts/check-node-env-guard.sh`).
  macOS and Linux include bash by default. On Windows, use WSL or Git Bash.

## CI Pre-checks

Before pushing, run:

```bash
npm run ci:precheck
```

This executes static guards that verify security-critical code patterns
(e.g., `NODE_ENV` comparisons in rate-limit routes must use exact
`=== 'development'` — no loose checks allowed).

## Environment Setup

Copy `.env.example` to `.env.local` and fill in the required values.
See the file comments for which vars are mandatory vs optional.

## CI Gate

CI blocks merge if `ci:precheck` fails.
Run it locally via `npm run ci:precheck` before pushing.
