# Project State

## Current phase

Phase 2 - Savings domain

## Current increment

Add in-memory SavingsGoalRepository and application integration tests to prove
the persistence boundary before introducing SQLite.

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
- Added InMemorySavingsGoalRepository in src/application/in-memory-savings-goal-repository.ts.
- Added listSavingsGoals use case in src/application/savings-goal-queries.ts.
- Added repository behavior tests and application integration tests.
- Validation gates pass: tests, typecheck, lint, and build.

## Next

- Commit and push this in-memory repository increment to origin.
- Start next small increment in Phase 2: add an application command/use case
  for creating or updating a savings goal through the repository interface.

## Known issues

- Repository storage is process-memory only and resets on restart.

## Architecture decisions

- Keep a single modular monolith in one private repository.
- Keep domain layer independent from framework and infrastructure code.

## Security decisions

- SAXO secrets are backend-only and excluded from git via .env patterns.
- No financial write capability is introduced in this phase.