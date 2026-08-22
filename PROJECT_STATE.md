# Project State

## Current phase

Phase 2 - Savings domain

## Current increment

Define SavingsGoal application contracts and mapping boundaries ahead of
persistence.

## Completed

- Workspace scaffolded with modular-monolith folders.
- Fastify backend with GET /health implemented.
- React/Vite minimal UI shell created.
- Vitest test for GET /health added.
- ESLint, Prettier, TypeScript strict configs added.
- GitHub Actions CI gate added.
- Added domain model and pure function in src/domain/savings-projection.ts.
- Added domain unit tests in tests/savings-projection.test.ts.
- Added application service in src/application/savings-projection-service.ts.
- Added application unit tests in tests/savings-projection-service.test.ts.
- Added contracts and repository interface in src/application/savings-goal-contracts.ts.
- Added mapping tests in tests/savings-goal-contracts.test.ts.
- Validation gates pass: tests, typecheck, lint, and build.

## Next

- Commit and push this contracts increment to origin.
- Start next small increment in Phase 2: add in-memory SavingsGoalRepository
  adapter for application-level integration tests before SQLite.

## Known issues

- None.

## Architecture decisions

- Keep a single modular monolith in one private repository.
- Keep domain layer independent from framework and infrastructure code.

## Security decisions

- SAXO secrets are backend-only and excluded from git via .env patterns.
- No financial write capability is introduced in this phase.