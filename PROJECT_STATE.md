# Project State

## Current phase

Phase 6 - Saxo SIM read-only

## Current increment

Read-only Saxo SIM investment positions.

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
- Browser can create savings goals using the existing idempotent PUT contract and a GET refetch.
- Technical IDs use client-side crypto.randomUUID() and are never displayed or user-editable.
- Creation and editing reuse one form and conversion path, with only one form open at a time.
- New persisted goals automatically participate in per-goal and combined savings projections.
- Verified browser creation, cancel, saving/error states, editing, and persistence after backend restart.
- Documented manual local SQLite backup with the backend stopped and a verified copy outside Git.
- Documented restore with a verified safety copy of the current database before replacement.
- Verified round-trip recovery using disposable generic data: stopped backup, mutation, stopped restore, and restart.
- Confirmed the restored state through GET /api/goals and browser goals/projections.
- Added a generic InvestmentAccountGateway with read-only account summaries.
- Added a read-only investment account query that depends only on the gateway interface.
- Added a mock adapter with constructor seed isolation and safe copies on every read.
- Added contract/query tests covering delegation, empty results, failures, and mutation isolation.
- Added GET /api/investment-accounts through the existing application query and provider-neutral gateway dependency.
- Composed a generic default mock for investment accounts while retaining SQLite for savings goals.
- Added API tests for default/injected/empty gateways, public fields, and absent investment-account write routes.
- Verified local HTTP 200 responses for investment accounts, health, and savings goals.
- Added a frontend investment-account API client using the existing provider-neutral summary contract.
- Added independent account loading, error, and empty states in a focused React section.
- Added read-only account names/currencies with a Demo data label, completing the React-to-mock-adapter vertical slice.
- Verified account rendering states and savings create/edit/projection regression in Chrome.
- Added fail-closed investment provider configuration with Mock as the default and Saxo SIM as the only external option.
- Added backend-only Saxo SIM credential validation and fixed SIM authorization, token, and API endpoints.
- Added an access-token provider interface without implementing OAuth, token persistence, or network calls.
- Expanded environment-file ignores so local credential variants cannot be committed accidentally.
- Replaced generic Saxo credential variables with SIM-specific environment names.
- Added HTTP/HTTPS redirect URI parsing and normalization for Saxo SIM configuration.
- Added pure Saxo SIM authorization URL construction without scopes or secret exposure.
- Added cryptographically secure, URL-safe OAuth state generation using node:crypto.
- Added conditional Saxo SIM OAuth start and callback routes without changing the investment account adapter.
- Added one-time, ten-minute OAuth state validation with deterministic expiry and replay protection.
- Added backend-only, in-memory authorization-code capture without token exchange.
- Added generic authorization denial and callback failure responses that do not expose sensitive values.
- Added optional local .env loading through the Node 22 runtime without adding a dependency.
- Added Saxo SIM authorization-code exchange against the fixed SIM token endpoint.
- Added backend-only HTTP Basic client authentication and form-encoded token requests.
- Added strict token response validation with memory-only access and optional refresh-token state.
- Added a concrete SaxoAccessTokenProvider with deterministic access-token expiry handling.
- Wired the callback receiver to token exchange without changing the mock investment account gateway.
- Added on-demand refresh-token exchange when the current access token is expired.
- Added atomic access/refresh token rotation after complete response validation.
- Added refresh-token expiry checks and one-request coalescing for concurrent access callers.
- Kept prior token state intact when refresh transport or validation fails.
- Added an isolated SaxoInvestmentAccountGateway behind the existing provider-neutral contract.
- Added Bearer-authenticated read-only SIM account discovery through GET /port/v1/accounts/me.
- Added fail-closed mapping from private Saxo response fields to id, name, and currency only.
- Added stable opaque account IDs derived from AccountKey without exposing the provider identifier.
- Added explicit mock/SIM investment-account gateway selection in the composition root.
- Shared one SaxoSimAccessTokenProvider between OAuth code exchange and account discovery.
- Added the complete OAuth-to-read-only-account runtime path with fake transport coverage.
- Added a generic HTTP 503 response when investment accounts are unavailable.
- Added optional development-only Saxo SIM Developer Portal access-token configuration.
- Added an in-memory developer access-token provider with intentionally unknown expiry.
- Added developer-token runtime composition through the existing read-only Saxo account gateway.
- Preserved the existing OAuth composition unchanged and rejected ambiguous authentication configuration.
- Added a provider-neutral investment connection status endpoint without changing the accounts contract.
- Added dynamic mock, authenticated Saxo SIM, and unauthenticated Saxo SIM status composition.
- Updated React to show Demo data, Saxo SIM, or Saxo SIM not connected from backend status.
- Kept account data and connection status strictly read-only with no authentication details exposed.
- Added a provider-neutral client-level investment balance contract and application query.
- Added deterministic mock balance and read-only Saxo SIM GET /port/v1/balances/me adapters.
- Shared existing developer/OAuth token providers across account and balance gateways.
- Added GET /api/investment-balance with three-field success and generic 503 responses.
- Added independently loaded Total value and Cash balance to the React investment section.
- Added a provider-neutral investment positions contract and application query.
- Added read-only Saxo SIM GET /port/v1/positions/me with same-origin pagination safeguards.
- Added opaque position IDs, fail-closed mapping, and deterministic mock positions.
- Shared existing developer/OAuth token providers across account, balance, and positions gateways.
- Added GET /api/investment-positions and an independently loaded minimal positions UI.
- Validation gates pass: 287 tests, typecheck, lint, and build.

## Next

- Add isolated read-only Saxo instrument-reference lookup so positions can map Uic and AssetType to a user-friendly symbol/name without exposing provider identifiers.

## Known issues

- No delete capability.
- Backup is manual and requires stopping the backend.
- No automatic or off-device backup yet.
- No external brokerage integration.
- Mock remains the default runtime; Saxo SIM selection requires explicit configuration and manual OAuth.
- Developer Portal tokens expire externally after up to 24 hours; the app does not decode or infer their expiry and cannot refresh them.
- Access and optional refresh tokens are process-local and disappear on restart.
- Refresh occurs only on demand through getAccessToken; there are no timers or background jobs.
- OAuth state and token storage are process-local, ephemeral, and suitable only for the current single-process local application.
- Connection status reports only provider source and connected state; it exposes no authentication details.
- Balance is client/portfolio level rather than per-account and exposes only TotalValue and CashBalance.
- Positions expose asset type and numeric values only; there are no instrument names, tickers, or per-account filtering.
- No ASK detection or other Saxo OpenAPI resources are implemented.
- No Saxo LIVE configuration or integration exists.
- No real account balances or positions.
- No financial execution capability.

## Architecture decisions

- Keep a single modular monolith in one public repository.
- Keep domain layer independent from framework and infrastructure code.
- Use PUT /api/goals/:id for idempotent full-record upserts with the ID sourced only from the URL.
- Keep SQLite behind SavingsGoalRepository and share one runtime adapter instance across reads and writes.
- Keep combined savings requirements derived from existing projections and never persist them.
- Keep investment account queries provider-neutral behind InvestmentAccountGateway, with adapters in infrastructure.
- Keep Saxo authentication behind SaxoAccessTokenProvider and expose SIM endpoints only.
- Keep OAuth state and tokens in memory for the current single-user, single-process local runtime.

## Security decisions

- SAXO secrets are backend-only and excluded from git via .env patterns.
- Reject every investment provider other than Mock and Saxo SIM; no LIVE endpoint or mode exists.
- No external financial transaction or execution capability exists.
- HTTP goal writes are limited to validated local planning data and expose no internal errors.
- Keep the local database and all SQLite sidecar files outside Git through the ignored .data directory.
