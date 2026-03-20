# SupportFlow — project documentation

This document describes architecture, configuration, and major features. For install commands, demo logins, and **running the full stack with Docker** (`docker compose up --build`), see the [root README](../README.md).

## Overview

SupportFlow is a **support ticketing** monorepo: agents and managers work tickets in a **Next.js** SPA while an **Express** API backed by **PostgreSQL** (via **Prisma**) handles auth, CRUD, and **Socket.IO** realtime updates.

## Repository layout

| Path | Role |
|------|------|
| `apps/web` | Next.js App Router UI (shadcn/ui, TanStack Query, theme toggle) |
| `apps/api` | REST API ` /api/v1`, OpenAPI/Swagger, Prisma, Socket.IO server |
| `packages/shared` | Shared types/constants (extend as needed) |
| `docs/` | Planning (`SUPPORTFLOW_PLAN.md`) and this file |

The older `frontend/` and `backend/` trees, if present, are legacy; the supported stack lives under `apps/`.

## Technology choices

- **Web:** Next.js (App Router), React 19, TypeScript, Tailwind, Radix/shadcn.
- **API:** Express 4, Zod validation, **JWT access** (Bearer) + **httpOnly refresh cookie** (`sf_refresh`), Argon2 password hashing.
- **Data:** PostgreSQL, Prisma ORM, migrations in `apps/api/prisma/migrations`.
- **Realtime:** Socket.IO; clients authenticate with the same access JWT.

## Environment variables

### API (`apps/api/.env`)

Copy from `apps/api/.env.example`. Typical variables:

- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random strings (≥32 chars).
- `PORT` — API listen port (default often `4000`).
- `WEB_ORIGIN` — allowed CORS origin for the Next app.

Run **`pnpm --filter @supportflow/api db:generate`** after install or schema changes so `@prisma/client` includes your models.

### Web (`apps/web/.env.local`)

Copy from `apps/web/.env.example`:

- `NEXT_PUBLIC_API_URL` — API base, e.g. `http://localhost:4000` (no trailing slash).
- `NEXT_PUBLIC_WS_URL` — optional override for Socket.IO (otherwise derived from the API URL).

REST calls should go through **`buildApiUrl`** in `apps/web/lib/api-url.ts` (used by `apiFetch`).

## Database and seeding

- **Migrations:** from repo root, `pnpm db:migrate` (runs Prisma migrate in the API package), or follow the README quick start. With **Docker Compose**, the API container runs `prisma migrate deploy` on startup (see [README — Docker (full stack)](../README.md#docker-full-stack)).
- **Seed:** `pnpm db:seed` from the repo root (host DB URL) creates demo users (including an **ADMIN**), managers, agents, and sample tickets. With the **full stack in Docker**, run seed inside the API container from another terminal while Compose is up: `docker compose exec api pnpm run db:seed` (details in the README). Credentials are listed under “Demo login” in the README.

Public **registration** creates users with role **AGENT** only; promote to **ADMIN** via DB/Prisma Studio or seed.

## Authentication

1. **Login / register** — `POST /api/v1/auth/login` and `POST /api/v1/auth/register`.
2. **Access token** — short-lived JWT in JSON (`accessToken`); the web app stores it in `sessionStorage` and sends `Authorization: Bearer <token>`.
3. **Refresh** — httpOnly cookie `sf_refresh`; `POST /api/v1/auth/refresh` rotates the session.
4. **Current user** — `GET /api/v1/auth/me`.

The Next **middleware** (`apps/web/middleware.ts`) redirects unauthenticated users away from protected app routes based on the refresh cookie (no access token needed for that check).

## API surface (v1)

Base path: **`/api/v1`**. Interactive docs: **`/api-docs`** on the API host (OpenAPI includes request bodies for **login/register**, ticket CRUD, profile, notifications, uploads, etc.; raw JSON at **`/openapi.json`**).

Major areas:

- **Auth** — login, register, refresh, logout, me.
- **Users** — list team (`GET /users`), patch current profile (`PATCH /users/me`), admin role updates.
- **Tickets** — list (filters below), CRUD, comments, internal notes, assign, activity, attachments (upload flow).
- **Analytics** — dashboard summary aggregates.

### Ticket list query parameters

`GET /api/v1/tickets` supports:

| Parameter | Description |
|-----------|-------------|
| `search` | Case-insensitive match on title/description |
| `status` | `OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, `CLOSED` |
| `priority` | `URGENT`, `HIGH`, `MEDIUM`, `LOW` |
| `assigneeId` | UUID — tickets assigned to this user |
| `unassigned` | `true` or `1` — only tickets with **no** assignee (takes precedence over `assigneeId` if both sent) |
| `category` | Exact category string |
| `from`, `to` | ISO date range on `createdAt` |
| `sort` | `newest`, `oldest`, `priority`, `dueDate` |
| `page`, `pageSize` | Pagination (`pageSize` max 100) |

The **Tickets** page in the app exposes search, status, sort, and **assignee** (all / unassigned / specific user).

## Roles (RBAC)

- **ADMIN** — full control; can change user roles, etc.
- **MANAGER** — operational control (e.g. assign, many destructive actions per routes).
- **AGENT** — day-to-day ticket work.

Exact rules are enforced in API middleware and route handlers.

## Realtime (Socket.IO)

- Server attaches to the HTTP server in `apps/api`.
- Clients connect with JWT (handshake `auth.token` or `Authorization` header).
- Rooms such as `ticket:{id}` receive ticket/comment/note updates for live UIs.

## Local development scripts (repo root)

| Command | Purpose |
|---------|---------|
| `pnpm dev` | API + web together |
| `pnpm dev:api` | API only |
| `pnpm dev:web` | Next only |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Reseed demo data |
| `pnpm db:generate` | Regenerate Prisma client |

## Further reading

- [SUPPORTFLOW_PLAN.md](./SUPPORTFLOW_PLAN.md) — product/technical plan and backlog ideas.

## License

See root [README](../README.md) (MIT for this portfolio project).
