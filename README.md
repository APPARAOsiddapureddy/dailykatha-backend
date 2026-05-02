# Daily Katha — production API (`src/app.js`)

Express service for `/health`, `/status`, **`/v1/auth` (phone OTP — WhatsApp delivery via Meta Cloud API; test numbers `123456xxxx` use fixed OTP `560102`)**, **`/v1/users/*` (JWT)**, and `/api/v1` (quotes, categories, moods, search, JWT favorites). Legacy card/feed API remains in `src/server.js` (`npm run legacy:start`).

## Environments (dev / staging / production)

| Branch / trigger | Suggested GitHub Environment | Notes |
|------------------|------------------------------|--------|
| PRs | — | `Backend CI` workflow |
| `develop` merges | `development` | Point `DATABASE_URL` at a dev Render Postgres instance |
| Manual `workflow_dispatch` | `staging` | `backend-cd-staging-render.yml` |
| `main` merges | `production` | `backend-cd-render.yml` + deploy hook |

Use **separate databases** for the new v1 schema (`users` with integer `id`, `quotes`, `favorites`, `api_logs`) and the older legacy schema in `src/db/migrations/*.sql` if you still run `server.js` against the same cluster.

## Local setup

1. Copy env: `cp .env.example .env` and set `DATABASE_URL`, `JWT_SECRET`, `CORS_WHITELIST` (comma-separated origins; mobile/native clients often send no `Origin` header and are still allowed). **`REDIS_URL` is optional** — without it, OTP uses Postgres (`otp_codes`); feed/today-picks caching is skipped; BullMQ generation jobs require Redis if you use that feature.
2. Start Postgres + Redis: `docker compose up -d` (Postgres on host port **15432**, Redis **16379**).
3. Apply schema: `cd backend && npm ci && npm run migrate` (loads `backend/.env` — **`DATABASE_URL` must include the database name**, e.g. `...5432/dailykatha`, not `...5432` alone; otherwise Postgres tries database `siva` or your macOS username.)
4. Run API: `npm run dev`

OpenAPI UI: `http://localhost:3000/api-docs` and `http://localhost:3000/daily-katha-api.swagger.json`.

## Render (managed Postgres)

1. Create a **Web Service** with root `backend`, build `npm ci`, start `npm start`.
2. Create **Managed Postgres** and set `DATABASE_URL` on the service.
3. **Redis is optional.** Add it only if you want Redis-backed caching or BullMQ workers; otherwise omit `REDIS_URL` and rely on Postgres for OTP (run migrations so `otp_codes` exists).
4. Set `JWT_SECRET`, `CORS_WHITELIST`, `NODE_ENV=production`, `ENVIRONMENT=production`, optional `SENTRY_DSN`.
   - **Redis:** optional; without `REDIS_URL` the API does not open a Redis connection.
5. **Build / release command** (or a one-off shell job): `cd backend && npm ci && npm run migrate:prod` using the same `DATABASE_URL`, then deploy. The included GitHub Action runs migrations before calling the deploy hook.
6. In Render dashboard, create a **Deploy Hook** and store it as `RENDER_DEPLOY_HOOK_URL` in GitHub **production** secrets.

## GitHub Actions secrets

**Production (`backend-cd-render.yml`):** `DATABASE_URL`, `JWT_SECRET` (required for migrate step if your migration tooling reads it; optional if only `DATABASE_URL` is needed), `RENDER_DEPLOY_HOOK_URL`.

**Staging (`backend-cd-staging-render.yml`):** `STAGING_DATABASE_URL`, `STAGING_RENDER_DEPLOY_HOOK_URL`.

Protect `production` and `staging` environments in GitHub with required reviewers so database migrations are not accidental.

## JWT (favorites)

Issue HS256 JWTs with a numeric `sub` claim equal to `users.id` in the v1 `users` table. The legacy `server.js` stack uses a different auth path and schema.

## Tests

- `npm test` — unit tests  
- `npm run test:integration` — needs Postgres (and optional Redis); CI runs `npm run migrate` first.
