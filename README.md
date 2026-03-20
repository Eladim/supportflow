# SupportFlow

Production-style monorepo: **Next.js (App Router)** + **Express + Prisma + PostgreSQL** + **Socket.IO**, strict TypeScript, **OpenAPI/Swagger**, Docker Compose for local infrastructure.

You can develop either **fully on the host** (`pnpm` + local or containerized Postgres — see [Quick start (local)](#quick-start-local)) or **run the whole stack in Docker** (`postgres` + `api` + `web` — see [Docker (full stack)](#docker-full-stack)).

## Structure

- `apps/web` — SaaS UI (shadcn/ui, TanStack Query, dark/light theme, realtime client)
- `apps/api` — REST `/api/v1`, JWT access + httpOnly refresh cookie, Socket.IO
- `packages/shared` — optional Zod/constants (extend as needed)
- `docs/` — planning notes (`SUPPORTFLOW_PLAN.md`) and **[project documentation](docs/PROJECT.md)** (architecture, API, env vars)

## Tech stack

| Layer | Technologies |
|--------|----------------|
| **Monorepo** | [pnpm](https://pnpm.io/) workspaces (`apps/*`, `packages/*`), Node **20+**, TypeScript |
| **Web** (`apps/web`) | [Next.js](https://nextjs.org/) 15 (App Router), [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (Radix primitives), [TanStack Query](https://tanstack.com/query), [react-hook-form](https://react-hook-form.com/) + [Zod](https://zod.dev/), [next-themes](https://github.com/pacocoursey/next-themes), [Recharts](https://recharts.org/), [Socket.IO client](https://socket.io/docs/v4/client-api/), [sonner](https://sonner.emilkowal.ski/) toasts |
| **API** (`apps/api`) | [Express](https://expressjs.com/) 4, [Socket.IO](https://socket.io/) (same process as HTTP), [Prisma](https://www.prisma.io/) ORM, [Zod](https://zod.dev/) validation, [JWT](https://github.com/auth0/node-jsonwebtoken) access tokens + httpOnly refresh cookie ([cookie-parser](https://github.com/expressjs/cookie-parser)), [Argon2](https://github.com/ranisalt/node-argon2) passwords, [Helmet](https://helmetjs.github.io/), [CORS](https://github.com/expressjs/cors), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit), [Pino](https://getpino.io/) logging, [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) + hand-written OpenAPI spec |
| **Data** | [PostgreSQL](https://www.postgresql.org/), Prisma migrations under `apps/api/prisma/migrations` |
| **API style** | REST-ish JSON under `/api/v1`, OpenAPI at `/openapi.json` and `/api-docs`; realtime over WebSockets (Socket.IO) |

**Local / deploy:** [Docker Compose](https://docs.docker.com/compose/) for Postgres + optional full stack (`docker-compose.yml`); Dockerfiles for `apps/api` and `apps/web` (Next [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)).

## Prerequisites

- Node **20+**, **pnpm** (`corepack enable` recommended)
- **PostgreSQL** (local or Docker)

## Quick start (local)

1. **Database** — start Postgres (example via Docker):

   ```bash
   docker compose up -d postgres
   ```

2. **API env** — copy and edit:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   Set at least `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (each ≥32 chars).

3. **Install & migrate & seed**

   ```bash
   pnpm install
   cd apps/api && pnpm exec prisma migrate deploy && pnpm run db:seed && cd ../..
   ```

   If `migrate deploy` complains, ensure the DB is empty or migrations match; for first run you can use `pnpm exec prisma db push` in dev (not for production).

4. **Web env**

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

5. **Run dev**

   ```bash
   pnpm dev
   ```

   - Web: [http://localhost:3000](http://localhost:3000)
   - API: [http://localhost:4000](http://localhost:4000)
   - Swagger: [http://localhost:4000/api-docs](http://localhost:4000/api-docs)

### Demo login (after seed)

- `admin@supportflow.local` / `demo12345`
- `manager@supportflow.local` / `demo12345`
- `agent0@supportflow.local` / `demo12345`

## Scripts

| Command | Description |
| -------- | ----------- |
| `pnpm dev` | API + web in parallel |
| `pnpm --filter @supportflow/api dev` | API only (tsx watch) |
| `pnpm dev:web` | Next only (same as `pnpm --filter @supportflow/web dev`) |
| `pnpm db:migrate` | `prisma migrate deploy` in API |
| `pnpm db:seed` | Reseed demo data |

## API highlights

- **Auth**: `POST /api/v1/auth/login` sets `sf_refresh` httpOnly cookie; responses include short-lived `accessToken` (also stored in `sessionStorage` on the client for API + sockets).
- **RBAC**: `ADMIN` / `MANAGER` / `AGENT` — e.g. ticket delete & assign restricted to admin/manager.
- **Realtime**: Socket.IO auth via handshake `auth.token` or `Authorization` header; rooms `ticket:{id}`, `user:{id}`.

## Docker (full stack)

From the **repository root**, Compose runs **PostgreSQL**, the **API** (`apps/api`), and the **Next.js app** (`apps/web`).

1. **First time** (or after you change Dockerfiles or dependencies that affect the image):

   ```bash
   docker compose up --build
   ```

   `--build` forces images to rebuild so the stack matches the repo. After that, plain `docker compose up` is enough unless you need a fresh build.

2. **URLs** — Web [http://localhost:3000](http://localhost:3000), API [http://localhost:4000](http://localhost:4000), Swagger [http://localhost:4000/api-docs](http://localhost:4000/api-docs).

3. **Env** — API and Postgres settings for Compose are in `docker-compose.yml` (not `apps/api/.env`). The web image is built with `NEXT_PUBLIC_API_URL=http://localhost:4000` so the browser can reach the API on your machine.

4. **Ports** — Host port **4000** must be free for the API container. Stop a local `pnpm dev:api` (or anything else on 4000) before starting Compose.

5. **Seed demo data** — Migrations run when the API container starts; seed does not.

   While **`docker compose up`** is running, use a **second terminal** in the same repo (or run after `docker compose up -d`) once the **api** service has finished starting (migrations + server). Then:

   ```bash
   docker compose exec api pnpm exec prisma db seed
   ```

   Equivalent: `docker compose exec api pnpm run db:seed`. This needs the `api` container up—`exec` runs a one-off command inside it and uses Compose `DATABASE_URL` (`postgres` as the DB host on Docker’s network). Safe to run again; the seed uses upserts.

   **From the host instead:** keep Compose Postgres up, set `apps/api/.env` `DATABASE_URL` to `postgresql://supportflow:supportflow@localhost:5432/supportflow?schema=public`, then run `pnpm db:seed` from the repo root.

## Legacy folder

An older `backend/` Express stub may still exist from prior experiments; the supported backend is `apps/api`.

## License

MIT (portfolio project).
