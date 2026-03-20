# SupportFlow API

Express + TypeScript + Prisma + PostgreSQL + Socket.IO.

## Commands

- `pnpm dev` — watch mode (`tsx watch src/server.ts`)
- `pnpm build` — emit `dist/`
- `pnpm start` — run `node dist/server.js`
- `pnpm exec prisma migrate deploy` — apply migrations
- `pnpm run db:seed` — demo users + tickets

## Env

See `.env.example`. Minimum: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥32 characters), `CORS_ORIGIN`.

## Docs

- Swagger UI: `GET /api-docs`
- OpenAPI JSON: `GET /openapi.json`
