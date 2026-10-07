# SocialScope API (backend)

Express 5 + TypeScript + PostgreSQL + Sequelize v6. Schema is owned by **db-migrate** SQL migrations (Sequelize never calls `sync()`).

## Quick start

```bash
cp .env.example .env              # then edit values (see below)
npm install
createdb socialscope               # or create it in pgAdmin / psql
npm run migrate:up                # runs migrations/*.js -> migrations/sqls/*-up.sql
npm run seed                      # optional: demo brand + 24 demo creators
npm run dev                       # http://localhost:4000/api/v1/health
```

Demo logins after seeding (password `Password123`): `brand@demo.com`, `creator1@demo.com` … `creator24@demo.com`.

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # ENCRYPTION_KEY (64 hex chars)
```

Env is validated with zod at boot (`src/configs/env.ts`). A bad or missing value stops the server with a readable error.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Watch mode with `tsx` |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run migrate:create -- add-something` | New migration (`.js` + `sqls/*-up.sql` + `sqls/*-down.sql`) |
| `npm run migrate:up` / `migrate:down` / `migrate:reset` | Apply / roll back one / roll back all |
| `npm run seed` | Demo data (idempotent) |

`database.json` reads the same `DB_*` variables from `.env`.

## Folder structure

```
src/
  app.ts, server.ts   Express app factory and bootstrap (graceful shutdown)
  configs/            env (zod-validated), database (Sequelize), app.config (business rules), zod messages
  models/             Sequelize models (one per table) + associations in index.ts
  routes/             Routers per domain; wire validation + auth middleware to controllers
  controllers/        Function-based request handlers (thin: read req, call service, send response)
  services/           Class-based business logic (exported as singletons)
  integrations/       Third parties: social/ (instagram, tiktok, youtube, mock) and stripe
  middleware/         auth, validate (zod), error handler, rate limit, guest id, request id
  validations/        zod schemas per domain
  libs/               logger, jwt, crypto (AES-256-GCM), stripe client, http client, scheduler
  utils/              ApiError, response helpers, pagination, cookies, helpers, seed
  types/              Shared types + Express request augmentation
migrations/           db-migrate files (.js + sqls/)
```

## Response format

```jsonc
// success
{ "success": true, "message": "optional", "data": { }, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed",
  "details": [{ "field": "email", "message": "Enter a valid email", "location": "body" }] }, "requestId": "…" }
```

Error codes you'll see: `VALIDATION_ERROR` (422), `UNAUTHORIZED` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` (401), `FORBIDDEN` (403), `GUEST_SEARCH_LIMIT` (403), `PAYMENT_REQUIRED` (402), `NOT_FOUND`, `CONFLICT` (409), `TOO_MANY_REQUESTS` (429), `BAD_GATEWAY` (502).

## Auth

* Access JWT (15 min) + rotating refresh token (30 days, stored hashed in `refresh_tokens`) in **httpOnly cookies**. Bearer header also accepted.
* Reusing a revoked refresh token revokes every session of that user (theft detection).
* A non-secret `ss_session=<role>` cookie lets the Next.js proxy route users before rendering.
* In production, if the API and web app are on different subdomains, set `COOKIE_DOMAIN=.socialscope.co`.

## API (prefix `/api/v1`)

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/health` | public | |
| POST | `/auth/register` | public | `role: creator` needs `username`; `role: brand` needs `companyName` |
| POST | `/auth/login` · `/auth/refresh` · `/auth/logout` | public | rate limited |
| GET | `/auth/me` | auth | |
| PATCH | `/auth/password` | auth | signs out other devices |
| GET | `/meta/categories` · `/meta/config` | public | fees, packages, limits, mock modes |
| GET | `/meta/stats` | public | landing-page numbers (listed creators, reach, category counts) |
| GET | `/creators/featured?limit=8` | public | small landing-page showcase (max 12, doesn't use search quota) |
| GET/PATCH | `/creators/me` | creator | includes listing checklist |
| GET | `/creators/me/insights` | creator | views, search appearances, follower history |
| CRUD | `/creators/me/rate-cards[/:id]` | creator | prices in major units in, cents out |
| CRUD | `/creators/me/portfolio[/:id]` | creator | |
| GET | `/creators/username-available?username=` | public | |
| GET | `/creators/:username` | public | media kit; unlisted visible to owner only |
| GET | `/social/accounts` | creator | |
| GET | `/social/:platform/connect` | creator | returns OAuth URL |
| GET | `/social/:platform/callback` | public | OAuth redirect target, then redirects to the frontend |
| POST | `/social/accounts/:id/sync` | creator | 1 per hour |
| GET | `/social/accounts/:id/history` | creator | |
| DELETE | `/social/accounts/:id` | creator | |
| GET/PATCH | `/brands/me` | brand | |
| GET/POST/DELETE | `/brands/me/saved[/:creatorProfileId]` | brand | shortlist |
| GET | `/search/creators` | guest or auth | quota enforced (see below) |
| GET | `/search/quota` | guest or auth | |
| GET/POST | `/collabs` | auth / brand | list (role-scoped) / create |
| GET | `/collabs/unread-count` · `/collabs/:id` | auth | |
| PATCH | `/collabs/:id/respond` | creator | `accept` / `decline` / `counter` (+`counterBudget`) |
| PATCH | `/collabs/:id/counter-response` | brand | `accept` / `decline` |
| PATCH | `/collabs/:id/cancel` · `/collabs/:id/complete` | brand | |
| GET/POST | `/collabs/:id/messages` | participants | GET marks as read |
| POST | `/payments/checkout` | auth | `creator_registration` or `search_credits` + `packageId` |
| GET | `/payments` · `/payments/:id` | auth | |
| POST | `/payments/:id/mock-confirm` | auth | only when Stripe is not configured and not in production |
| POST | `/payments/webhook` | Stripe | raw body, signature verified |
| DELETE | `/auth/me` | auth | body `{ password, confirm: "DELETE" }`, deletes everything, returns a confirmation code |
| POST | `/social/instagram/data-deletion` · `/social/instagram/deauthorize` | Meta | verifies `signed_request` with `INSTAGRAM_APP_SECRET`, returns `{ url, confirmation_code }` |
| GET | `/social/data-deletion/:code` | public | deletion request status (used by the frontend /data-deletion page) |

## Business rules

* **Creator listing**: a creator must have a category, a country and at least one connected social account, then pay `CREATOR_REGISTRATION_FEE_CENTS` once. The first `FOUNDING_CREATOR_FREE_SLOTS` creators are listed free with a *Founding* badge (set to `0` to disable).
* **Search quota**: guests get `GUEST_SEARCH_LIMIT` searches (tracked by an anonymous cookie, plus a per-IP daily cap). Logged-in users get `WEEKLY_FREE_SEARCH_LIMIT` per ISO week (resets Monday 00:00 UTC), then purchased credits are used. Paging or re-sorting the same filters within 30 minutes is free. Every search is logged in `search_logs`.
* **Collabs**: one open (pending/countered) request per brand-creator pair. Messaging is closed on declined/cancelled requests.
* Payments are fulfilled idempotently (row lock + status check), so webhook retries are safe.

## Social integrations

`SOCIAL_OAUTH_MOCK=true` (default in `.env.example`) skips the real OAuth screens and returns deterministic demo stats, so you can build without app approval. For real data:

| Platform | What to create | Redirect URI to register | Env |
| --- | --- | --- | --- |
| Instagram | Meta app with *Instagram API with Instagram Login*; scopes `instagram_business_basic`, `instagram_business_manage_insights` (App Review needed). Creators need a Professional account. | `{API_URL}/api/v1/social/instagram/callback` | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` |
| TikTok | TikTok for Developers app with Login Kit; scopes `user.info.basic,user.info.profile,user.info.stats,video.list` | `{API_URL}/api/v1/social/tiktok/callback` | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` |
| YouTube | Google Cloud OAuth client + YouTube Data API v3; scope `youtube.readonly` | `{API_URL}/api/v1/social/youtube/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

OAuth tokens are encrypted at rest (AES-256-GCM, `ENCRYPTION_KEY`) and never returned by the API. A cron job (`SOCIAL_SYNC_CRON`, every 12h by default) refreshes stats and stores a snapshot for history charts. Run the API as a single instance, or move the job to a worker, when you scale horizontally.

## Platform review URLs

| Where | Value |
| --- | --- |
| Privacy Policy | `https://socialscope.co/privacy` |
| Terms of Service | `https://socialscope.co/terms` |
| Data deletion instructions | `https://socialscope.co/data-deletion` |
| Meta data deletion callback | `https://api.socialscope.co/api/v1/social/instagram/data-deletion` |
| Meta deauthorize callback | `https://api.socialscope.co/api/v1/social/instagram/deauthorize` |

Retention jobs (daily): social accounts that could not be refreshed for 30 days are deleted (YouTube API policy), search logs older than 12 months and expired refresh tokens are purged. These match the Privacy Policy, so keep them in sync if you change either.

## Stripe

Leave `STRIPE_SECRET_KEY` empty in development and payments use a mock checkout page. For real payments set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and point a webhook at `/api/v1/payments/webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and `checkout.session.expired`. Locally: `stripe listen --forward-to localhost:4000/api/v1/payments/webhook`.
