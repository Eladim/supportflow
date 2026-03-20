# SupportFlow Web

Next.js App Router, Tailwind, shadcn/ui, TanStack Query, next-themes, Socket.IO client.

## Env

Copy `.env.example` to `.env.local`:

- `NEXT_PUBLIC_API_URL` — API origin (default `http://localhost:4000`)
- `NEXT_PUBLIC_WS_URL` — optional override; otherwise derived from API URL (`http` → `ws`)

## Commands

- `pnpm dev` — Next dev server (Turbopack)
- `pnpm build` / `pnpm start` — production

API must set `CORS_ORIGIN` to this app’s origin (e.g. `http://localhost:3000`) and use `credentials: true` (already configured on both sides).

## Docker

From the repo root, `docker compose up` builds and runs Postgres, API, and Web. The web image bakes in `NEXT_PUBLIC_API_URL=http://localhost:4000` and `NEXT_PUBLIC_WS_URL=ws://localhost:4000` (see `docker-compose.yml` build args) so the **browser** can reach the API on the host. Free host port **4000** if something else is using it, or change the API port mapping and rebuild web with matching URLs.
