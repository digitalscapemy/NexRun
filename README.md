# NexRun

NexRun is a multi-tenant running-event platform for Malaysia. Approved
organizers manage events, registrations, race-day operations, and documents;
participants discover events, complete a simulated checkout, and manage their
race records.

## Stack

Next.js 16, React 19, TypeScript 6, Prisma 7, PostgreSQL, tRPC 11, Zod 4,
Better Auth, Tailwind CSS 4, and UploadThing.

## Quick start

Prerequisites: Node.js 22+, npm 10+, PostgreSQL 14+, and an available port 3000.

### Option 1: Docker for local PostgreSQL

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

### Option 2: Native PostgreSQL

```powershell
npm install
Copy-Item .env.example .env
# Edit DATABASE_URL in .env for the local PostgreSQL instance.
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000` after the server reports that it is ready.

## Seed accounts

These accounts exist only after `npm run db:seed` in a local development
database. Their shared development-only password is `NexRun2026!`.

| Email | Role | Intended use |
| --- | --- | --- |
| `developer@nexrun.my` | Developer | Technical platform administration. |
| `admin@nexrun.my` | Admin | Platform operations and moderation. |
| `organizer@runmalaysia.my` | Organizer | Approved organization event operations. |
| `participant@gmail.com` | User | Participant registration and document flow. |

## Essential commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run dev:fresh` | Clean the Next.js development cache, then start the server. |
| `npm run verify` | Run linting, type checking, and unit tests. |
| `npm run test:e2e` | Run the Chromium and WebKit browser suite. |
| `npm run test:e2e:responsive` | Run the responsive dashboard browser suite. |
| `npm run build` | Build production standalone output. |
| `npm run start` | Run the built standalone server. |
| `npm run db:migrate:deploy` | Apply committed database migrations. |
| `npm run db:seed` | Seed local development data. |

## Documentation

The maintained project reference lives in [docs/README.md](docs/README.md):

- [Local Audit Summary (2026-07-25)](docs/AUDIT-SUMMARY.md)
- [Platform Audit Report (2026-07-25)](docs/AUDIT-REPORT.md)
- [Product and workflows](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Technical reference](docs/REFERENCE.md)
- [Operations guide](docs/OPERATIONS.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Architectural decisions](docs/DECISIONS.md)

Treat the Prisma schema, migrations, server policies, validation, and tests as
the source of truth when they differ from prose.

## Current local audit status

The 2026-07-25 local audit aligns Next.js and its ESLint configuration at
16.2.11, and Prisma packages at 7.9.0. Lint, TypeScript, 57 unit tests, and the
production build pass locally. The browser suite covers Chromium and WebKit,
nine viewport shapes from 320px to 1440px, all top-level dashboard routes, and
role navigation for USER, ORGANIZER, ADMIN, and DEVELOPER.

`npm audit` still reports 21 vulnerable dependency nodes (14 high and 7
moderate), including upstream Next.js/sharp, Prisma tooling, ESLint tooling, and
React Email chains for which the suggested changes are unsafe downgrades or
out-of-scope major upgrades. There are no critical findings. See the audit
report for classification and mitigations; do not interpret a passing build as
an unconditional production-readiness claim.

Docker was not installed on the audit machine. Static Docker and Compose review
is complete, but Compose rendering, image build, migration-container execution,
and container `/api/health` checks remain mandatory before the first push or
deployment.
