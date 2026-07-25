# Operations Guide

## Local development

Prerequisites: Node.js 22, npm 10, Docker Desktop (recommended for local
PostgreSQL), and a valid `.env`. The development compose file supplies the
database; it does not start the web application.

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Use the seeded local accounts listed in the root [README](../README.md) only
for development. Change all secrets and credentials outside local development.

## Commands

| Command | Use |
| --- | --- |
| `npm run dev` | Starts the Next.js development server. Stop it with `Ctrl+C` when finished. |
| `npm run dev:fresh` | Safely removes `.next/dev`, then starts the development server. Use if local cache is corrupt. |
| `npm run clean:dev` | Removes only `.next/dev`; all dev servers must be stopped first. |
| `npm run verify` | Runs ESLint, TypeScript checking, then the Vitest suite. Required before hand-off. |
| `npm run test:e2e` | Runs the complete Playwright browser suite against a disposable seeded database. |
| `npm run test:e2e:responsive` | Runs the dashboard responsive regression suite at phone, tablet, and desktop widths. |
| `npm run build` | Creates the production build and standalone output. |
| `npm run start` | Starts the built standalone server, loading `.env` when it exists locally. Run `npm run build` first. |
| `npm run db:generate` | Generates the Prisma client after installing or changing the schema. |
| `npm run db:migrate:deploy` | Applies committed migrations; use for shared, staging, and production databases. |
| `npm run db:seed` | Seeds local test data. Do not use this against an environment containing real data. |

`npm run start` executes `scripts/start-standalone.mjs`. That helper makes the
static and public assets available to Next.js standalone output before starting
the server.

## Environment variables

Copy `.env.example`; never commit `.env` or put secret values in documentation.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL. |
| `BETTER_AUTH_SECRET` | Yes | At least 32 characters; signs authentication state. |
| `BETTER_AUTH_URL` | Yes | Canonical server URL used by Better Auth. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application base URL. |
| `UPLOADTHING_TOKEN` | Yes | At least 32 characters; UploadThing integration token. |
| `CRON_SECRET` | Production scheduler | At least 32 characters; bearer secret for internal scheduled routes. |
| `RESEND_API_KEY` | Production email | Resend API key; optional locally when delivery is intentionally disabled. |
| `RESEND_FROM_EMAIL` | Production email | Verified sender address for transactional email. |
| `MOCK_PAYMENT_MODE` | No | `true` by default. Enables the simulated payment provider only; setting `false` does not connect a real provider. |
| `TRUST_PROXY_HEADERS` | No | Default `false`. Set to `true` only behind a trusted proxy that replaces forwarding headers. |
| `DATABASE_POOL_MAX` | No | Maximum PostgreSQL pool connections; default `10`, range `1`–`50`. |
| `DATABASE_POOL_IDLE_TIMEOUT_MS` | No | Pool idle timeout; default `30000`, range `1000`–`300000`. |
| `DATABASE_CONNECTION_TIMEOUT_MS` | No | Connection timeout; default `10000`, range `1000`–`60000`. |

Authentication keeps credential mutations at 8 attempts per configured window.
The read-only `/api/auth/get-session` endpoint has a separate bounded allowance
of 300 requests per minute so normal client navigation does not consume the
credential/global quota and incorrectly appear to sign users out.

Generate a fresh scheduler secret in a secure terminal, save it in the
deployment secret store, and reuse the same value only for the scheduler's
authorization header. For example, Node.js can generate a candidate with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Scheduled work

Configure an external scheduler to call both endpoints at least hourly:

```text
POST /api/internal/expire-reservations
POST /api/internal/send-race-reminders
Authorization: Bearer <CRON_SECRET>
```

The reservation task releases abandoned inventory and removes stale rate-limit
records. The reminder task uses Malaysia time and only creates one in-app
delivery per eligible registration and reminder type. It can run more than once
without duplicating deliveries. Monitor any non-2xx response; `401` means the
header is wrong and `503` means the secret is absent.

## Deployment

Use [DEPLOYMENT.md](DEPLOYMENT.md) for the canonical production deployment
guide. It covers EasyPanel with web app and PostgreSQL on one VPS, the existing
`Dockerfile` and `docker-compose.prod.yaml`, managed-platform alternatives,
backup requirements, and the first-launch checklist.

Run database migration before serving application code that requires its new
schema. Keep the application behind HTTPS and enable `TRUST_PROXY_HEADERS` only
when a trusted reverse proxy replaces and protects forwarded-IP headers.

## Verification and smoke checks

Run `npm run verify` for the fast local quality gate. The scripts below exercise
an already running application and real local database. They create temporary
test records and restore configuration they change; run them only against a
disposable environment.

| Script | Coverage |
| --- | --- |
| `scripts/runtime-smoke.mjs` | Homepage, health, public API, security headers, and optional authenticated dashboard checks. |
| `scripts/phase3-commerce-smoke.mjs` | Event activation, fee snapshots, and simulated commerce. |
| `scripts/phase4-checkout-smoke.mjs` | Checkout recovery and reservations. |
| `scripts/phase5-race-day-smoke.mjs` | Check-in and race-day operations. |
| `scripts/phase6-template-foundation-smoke.mjs` | Templates and document workflow foundations. |
| `scripts/platform-control-smoke.mjs` | Platform fees, public experience controls, reminders, security controls, and announcements. |

Set `SMOKE_BASE_URL` when the app is not at `http://localhost:3000`. Runtime
smoke accepts optional `SMOKE_EMAIL`, `SMOKE_PASSWORD`, and
`SMOKE_EXPECTED_ROLE` for authenticated checks. Workflow smokes require the
seeded accounts and `DATABASE_URL`.

### Responsive browser testing

Install the supported browsers once, then run the responsive suite only against
a disposable database containing the normal seed accounts:

```powershell
npx playwright install chromium webkit
npm run test:e2e:responsive
```

When `E2E_BASE_URL` is absent, Playwright starts the development server at
`http://localhost:3000`. Set it to test an already running server. Seed login
values can be overridden with `E2E_DEVELOPER_EMAIL`, `E2E_ADMIN_EMAIL`,
`E2E_ORGANIZER_EMAIL`, `E2E_USER_EMAIL`, and `E2E_PASSWORD`. The suite checks
USER, ORGANIZER, ADMIN, and DEVELOPER navigation permissions; widths from 320px
through 1440px; mobile landscape; drawer dismissal by close button, backdrop,
Escape, navigation, and a real Chromium touch swipe; focus restoration; the
1024px desktop breakpoint; top-level dashboard routes; mobile-card/desktop-table
switching; and document-level horizontal overflow. WebKit covers shared layout
and drawer behaviour while Chromium owns browser-independent role checks and the
Chromium-only touch gesture.

### Service worker during development

NexRun registers `/sw.js` only in production. Development startup unregisters
only NexRun workers whose script ends in `/sw.js` and deletes only caches whose
names begin with `nexrun-`; this prevents stale Next.js chunks from controlling
localhost. Production registration bypasses the HTTP cache when checking for a
worker update, and `/sw.js` is served with `no-store` headers. The worker caches
only explicitly public routes and static assets; authenticated dashboard, auth,
order, verification, API/tRPC, and React Server Component requests bypass it.

If a worker from an older checkout controls the very first local reload, open
the browser DevTools Application panel, unregister `/sw.js`, delete the
`nexrun-*` caches, and reload once. Do not clear unrelated service workers or
origin storage.

## Pre-initial-commit local gate

Before considering an initial commit, run `npm ci`, `npm run db:generate`,
`npm run verify`, `npm run build`, `npm run test:e2e`, `npm audit`, and the
repository secret scan described in [AUDIT-REPORT.md](AUDIT-REPORT.md). Confirm
that `.env`, generated caches, Playwright auth state, reports, and editor/agent
state are absent from the candidate manifest. Docker runtime validation remains
a separate mandatory gate when Docker is available.

## Windows process hygiene

Run one `npm run dev` instance per workspace. If a development server is no
longer needed, stop it in its terminal with `Ctrl+C`; do not leave multiple
watchers open. If compilation becomes heavy, stop every NexRun server, run
`npm run clean:dev`, then restart a single server. Use `npm run build` and
`npm run start` to validate production output rather than keeping dev servers
open indefinitely.
