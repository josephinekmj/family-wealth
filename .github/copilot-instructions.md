# Family Wealth Copilot Instructions

Follow this loop for every increment:

1. Inspect before modifying.
2. Plan one small increment.
3. Implement.
4. Test.
5. Typecheck.
6. Lint.
7. Build.
8. Review diff.
9. Update PROJECT_STATE.md.
10. Stop.

Guardrails:

- Security first.
- Domain must not depend on infrastructure.
- Saxo API calls belong only in the Saxo adapter.
- Never commit secrets.
- LIVE writes disabled by default.
- Human approval required for financial writes.
- AI must never have direct financial execution capability.