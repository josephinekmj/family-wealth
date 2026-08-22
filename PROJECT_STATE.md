# Project State

## Current phase

Phase 3 - Minimal UI

## Current increment

Display the combined monthly savings requirement.

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
- Added validated application save command through SavingsGoalRepository.
- Added write-boundary validation before repository save.
- Added integration tests for save success, upsert behavior, and invalid input rejection.
- Added PUT /api/goals/:id with Fastify transport validation and stable 400 responses.
- Wired savings-goal queries and commands to one shared repository instance.
- Added API tests for create, update, invalid requests, and PUT-to-GET visibility.
- Added frontend PUT client for existing savings goals.
- Added an edit form with explicit number, percentage, and UTC date conversion.
- Added save-through-PUT followed by GET refetch before updating the displayed state.
- Added a node:sqlite repository adapter with deterministic schema initialization.
- Wired one shared runtime SQLite repository to savings-goal queries and commands.
- Added one-time generic demo seeding for a newly created database.
- Verified savings-goal persistence across a complete backend restart.
- Added isolated SQLite repository contract tests using in-memory databases.
- Added derived savings projections to each projectable goal in the browser.
- Reused the existing application projection service without persisting calculated values.
- Added a safe per-goal unavailable state for rejected projections.
- Added a combined monthly savings summary across all projectable goals.
- Made the combined value all-or-nothing when any goal is unavailable.
- Used one shared as-of date for the combined and per-goal projections in each render.
- Validation gates pass: tests, typecheck, lint, and build.

## Next

- Add creation of a new savings goal through the existing PUT contract.

## Known issues

- Frontend editing is limited to existing demo goals.
- Goals cannot be created or deleted from the browser yet.
- Persistence uses one local SQLite database and has no backup strategy yet.

## Architecture decisions

- Keep a single modular monolith in one public repository.
- Keep domain layer independent from framework and infrastructure code.
- Use PUT /api/goals/:id for idempotent full-record upserts with the ID sourced only from the URL.
- Keep SQLite behind SavingsGoalRepository and share one runtime adapter instance across reads and writes.
- Keep combined savings requirements derived from existing projections and never persist them.

## Security decisions

- SAXO secrets are backend-only and excluded from git via .env patterns.
- No external financial transaction or execution capability exists.
- HTTP goal writes are limited to validated local planning data and expose no internal errors.
- Keep the local database and all SQLite sidecar files outside Git through the ignored .data directory.
