# Family Wealth

Private single-user project for savings planning and controlled future Saxo integration.

## Stack

- Node.js 22.23.1
- TypeScript 5.9.x (strict)
- Fastify
- React + Vite
- Vitest
- ESLint + Prettier

## Project Structure

```text
src/
  domain/
  application/
  saxo/
  server/
  web/
tests/
docs/
.github/
```

## Scripts

```bash
npm run dev:server
npm run dev:web
npm run typecheck
npm test
npm run lint
npm run build
```

## Health Endpoint

- Route: GET /health
- Response:

```json
{
  "status": "ok"
}
```

## Security Notes

- Keep secrets only in .env (never in git).
- Keep SAXO credentials backend-only.
- No LIVE write capability in this phase.