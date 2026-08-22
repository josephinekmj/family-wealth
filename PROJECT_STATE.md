# Project State

## Current phase

Phase 2 - Savings domain

## Current increment

React frontend reads and displays read-only savings goals from GET /api/goals.

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
- Added GET /api/goals route in Fastify using SavingsGoalQueries.
- Added server composition wiring with in-memory repository and demo seed data.
- Added API tests for status, response shape, seeded payload, and date serialization.
- Added Vite development proxy from /api to http://127.0.0.1:3000.
- Added frontend API fetch function for /api/goals.
- Added read-only React goals view with loading, success, empty, and error states.
- Added unit tests for fetchSavingsGoals boundary behavior.
- Validation gates pass: tests, typecheck, lint, and build.

## Next

- Commit and push this read-only frontend increment to origin.
- Start next small increment: add optional manual refresh in the read-only goals UI.

## Known issues

- Repository storage is process-memory only and resets on restart.
- Frontend data is read-only and reflects demo in-memory backend data.

## Architecture decisions

- Keep a single modular monolith in one private repository.
- Keep domain layer independent from framework and infrastructure code.

## Security decisions

- SAXO secrets are backend-only and excluded from git via .env patterns.
- No financial write capability is introduced in this phase.