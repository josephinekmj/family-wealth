# AGENTS

## Permanent Rules

1. Inspect before modifying.
2. Implement one small increment at a time.
3. Never continue automatically into the next phase.
4. Keep diffs small.
5. Use Node 22.23.1.
6. TypeScript strict.
7. Prefer simple implementations.
8. Do not introduce dependencies without a concrete reason.
9. Domain must not depend on infrastructure.
10. Saxo API calls belong only in the Saxo adapter.
11. Never log credentials or tokens.
12. Never commit secrets.
13. SIM before LIVE.
14. LIVE writes disabled by default.
15. Human approval required for financial writes.
16. AI must never have direct financial execution capability.
17. Add tests for business rules.
18. Run typecheck, tests, lint and build before completion.
19. Review git diff before completion.
20. Update PROJECT_STATE.md.
21. Stop after the requested increment.

## OUT OF SCOPE

- autonomous trading
- autonomous portfolio decisions
- day trading
- margin trading
- leveraged products
- options
- crypto trading
- autonomous money transfers
- unrestricted Saxo API access
- arbitrary HTTP tools for AI