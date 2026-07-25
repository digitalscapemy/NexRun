# NexRun Local Audit Report

Audit date: 2026-07-25  
Scope: local workspace before a possible initial commit  
Result: local gates pass; Docker runtime gate remains pending

## Scope and method

This review covered repository hygiene, credential exposure, dependency health,
server-side authorization and tenant isolation, authentication, internal cron
routes, uploads, rate limiting, input/environment validation, security headers,
error leakage, service-worker privacy, financial transaction controls,
responsive dashboard behaviour, Docker configuration, and maintained project
documentation. It was a source review plus automated local verification, not an
external penetration test or production infrastructure assessment.

No Prisma schema, migration, public HTTP/tRPC contract, RBAC rule, or financial
domain rule was intentionally changed. No Git initialization, commit, remote, or
push was performed.

## Verification results

| Check | Result |
| --- | --- |
| `npm ci` | Pass |
| `npm run db:generate` | Pass; Prisma 7.9.0 client generated |
| `npm run verify` | Pass; lint, TypeScript, 12 Vitest files and 57 tests |
| `npm run build` | Pass; Next.js 16.2.11 production standalone output |
| `npm run test:e2e` | Pass; 15 passed and 6 intentional browser-specific skips |
| Production standalone smoke | Pass; health, security headers, and `/sw.js` policy |
| Authenticated workflow smokes | Pass; four roles, commerce, checkout, race-day, documents, and Platform Control |
| Compose YAML lint | Pass for local and production files |
| Secret-pattern scan excluding `.env` and generated/vendor output | Pass after review of placeholders |
| `npm audit` | 21 vulnerable nodes: 14 high, 7 moderate, 0 critical |
| `npm audit --omit=dev` | 9 vulnerable nodes: 5 high, 4 moderate, 0 critical |
| Docker runtime | Not run; Docker unavailable |

The browser suite covers 320x568, 360x800, 390x844, 412x915, 844x390,
768x1024, 1023x768, 1024x768, and 1440x900. It checks drawer keyboard/touch
behaviour, focus return, breakpoint rotation, role-specific navigation, all
top-level dashboard routes, local responsive data representations, and absence
of document-level horizontal overflow. Chromium owns the real touch gesture,
route inventory, and role matrix; WebKit repeats the shared layout behaviours.

## Repository and credential hygiene

`.env` remains local and ignored while `.env.example` is explicitly eligible
for version control. The ignore rules exclude dependencies, Next.js output,
coverage, Playwright authentication and reports, TypeScript build metadata,
generated Prisma client output, editor/agent state, and local experiments.
Docker context exclusions cover the same secret, dependency, cache, test, and
local-state classes.

The unused root `test.css` had no references and was moved to
`%LOCALAPPDATA%\\Temp\\NexRun-test-css-unused-20260725.css`, so it can be
recovered locally but is not a commit candidate.

The credential scan found only reviewed examples: the local Compose development
password, seed-account password, build-only Docker placeholders, placeholder
URLs, and dummy Resend value. `.env` was excluded from scan output and must never
be committed, copied into documentation, or added to the Docker context.

## Dependency advisory classification

`npm audit fix --dry-run` was reviewed before the safe non-force fix was applied.
No safe in-scope fix remains. Counts refer to vulnerable dependency nodes, so a
single upstream advisory can appear through multiple packages.

| Package chain | Severity/class | Decision and mitigation |
| --- | --- | --- |
| `next` -> `sharp` | High; application dependency/optional image runtime | Project source does not import `next/image`. npm proposes a Next.js 14 downgrade, which is incompatible with the approved Next.js 16 baseline. Keep 16.2.11, avoid adding sharp-backed image paths without review, and monitor upstream. |
| `prisma` -> `@prisma/dev`, `find-my-way`, `valibot` | High/moderate; schema generation and migration tooling | Prisma packages are aligned at current 7.9.0. The web request path uses generated client/adapter, not the CLI server. Keep Prisma generation out of the runtime image and monitor upstream. |
| `eslint` / `eslint-config-next` -> minimatch-related chains | High; development lint tooling | Not shipped in the standalone runner. Suggested fixes cross approved major/version boundaries. Keep lint on trusted project files and update when compatible releases exist. |
| `shadcn` -> MCP/Hono chain | Moderate; development CLI tooling | `shadcn` is in `devDependencies`; it is not needed by the application runner. Run only against trusted sources and update when a compatible fix exists. |
| `@react-email/components` -> `@react-email/code-block` -> `prismjs` | Moderate; server email rendering | Fix requires an out-of-scope major React Email upgrade. Do not render untrusted arbitrary code blocks; plan and test the major upgrade separately. |

There are no critical npm findings. The audit does not claim zero
vulnerabilities or unconditional production readiness.

## Application security review

| Area | Review result |
| --- | --- |
| RBAC and tenant isolation | Server policies require authenticated users, role gates, active organization membership, approved workspaces where required, and event-to-organization access before protected actions. Unit tests cover representative cross-tenant and role failures. |
| Authentication | Better Auth uses a minimum 10-character password, database rate limits, trusted origins, HttpOnly SameSite cookies, secure cookies for HTTPS/production, and seven-day sessions. Credential endpoints remain limited to 8 attempts while read-only session checks have a separate bounded 300/minute allowance, preventing normal route navigation from causing false logout through a shared 20/minute quota. |
| Internal cron routes | Bearer secrets are parsed strictly and compared through SHA-256 digests with timing-safe comparison. Missing config returns 503, unauthorized calls return 401, and responses are no-store. |
| UploadThing | SSM documents are private, require a session, store the upload key, and are exposed to administrators through short-lived signed URLs. Event banners require organizer/admin/developer role. |
| Rate limiting | Authentication has Better Auth limits. Application limits use a database transaction and PostgreSQL advisory lock to avoid concurrent counter races. Forwarded IP headers are ignored unless explicitly trusted. |
| Validation | Zod schemas constrain environment values and tRPC inputs; environment error messages list field names rather than secret values. |
| Browser headers | CSP, frame denial, MIME sniff prevention, referrer, permissions and opener policies are set. `unsafe-eval` is development-only; HSTS is production-only; `/sw.js` has JavaScript content type, no-store, and worker CSP. |
| Error leakage | Reviewed cron and service paths return generic failures rather than stack traces or secrets. tRPC authorization errors are explicit but do not expose credentials. |
| PWA/service worker | Development unregisters only NexRun `/sw.js` workers and `nexrun-*` caches. Production cache v3 covers public routes/static assets only and bypasses auth, dashboard, orders, verification, API/tRPC, RSC, and non-GET requests. |
| Financial integrity | Order totals and fee percentages are snapshotted at creation, sensitive state changes use database transactions and advisory locks, payment attempts are idempotent, and settled payouts are not silently overwritten. Audit records accompany reviewed financial transitions. |

No confirmed critical application-controlled vulnerability was found in these
reviewed paths. This conclusion is bounded by the source and local test scope.

## Docker and environment review

The Dockerfile remains multi-stage, produces Next.js standalone output, and runs
as an unprivileged `nextjs` user. Only `NEXT_PUBLIC_APP_URL` is accepted as a
build argument; database, authentication, upload, and cron values used at build
time are non-secret placeholders. Production secrets are runtime inputs.

Production Compose keeps PostgreSQL private, gates the web service on database
health and successful migrations, requires Resend and canonical app settings,
requires explicit payment/proxy choices, passes pool settings, and probes
`/api/health`. Local Compose binds PostgreSQL to `127.0.0.1` and includes a
database health check.

Docker was unavailable. The following remain blocking gates before the first
push: Compose rendering, image build, migration target execution against a
disposable database, non-root runtime confirmation, web health check, and
container inspection for accidental secret/build-layer leakage.

The host standalone smoke returned 200 from `/api/health` with `no-store`, set
HSTS and frame denial, omitted `unsafe-eval` from the production CSP, and served
`/sw.js` with the expected JavaScript content type, no-store policy, and worker
CSP. This validates the standalone output but not the unavailable container
runtime.

Authenticated smoke checks signed in as USER, ORGANIZER, ADMIN, and DEVELOPER.
They verified workspace scoping, role-specific APIs, audit access, event
activation and fee snapshots, payment retry/idempotency, checkout recovery,
check-in operations, document-template foundations, and Platform Control state.
The workflow scripts use uniquely named temporary records and cleanup blocks;
they were run only against the local development database.

The checkout smoke initially exposed a 500 response caused by treating the
organizer-authored REPC date label as a JavaScript Date. Registration and
race-reminder email paths now preserve that text label and append the configured
time through a tested shared formatter. The complete workflow smoke set passed
after rebuilding the standalone server.

## Initial-commit manifest

Eligible after all blocking gates pass:

- Root policy/configuration: `.gitignore`, `.dockerignore`, `.env.example`,
  `AGENTS.md`, `CLAUDE.md`, `README.md`, `components.json`, `Dockerfile`,
  `docker-compose.yaml`, `docker-compose.prod.yaml`, `eslint.config.mjs`,
  `next.config.ts`, `package.json`, `package-lock.json`, `playwright.config.ts`,
  `postcss.config.mjs`, `prisma.config.ts`, `tsconfig.json`, and
  `vitest.config.ts`.
- Maintained source and assets: `src/`, `public/`, `prisma/`, `scripts/`,
  `tests/`, and `docs/`, subject to the exclusions below.

Must not enter the initial commit:

- `.env` or any environment-specific secret file.
- `.git/`, `.next/`, `node_modules/`, `out/`, `build/`, coverage, logs, or
  TypeScript build info.
- `playwright/.auth/`, `playwright-report/`, `test-results/`, screenshots,
  videos, traces, or other generated test output.
- `.agents/`, `.codex/`, `.vscode/`, local OS/editor files, `test.css`,
  `next-env.d.ts`, or `src/generated/prisma/`.
- Any future database dump, production URL containing credentials, private key,
  API token, customer export, or personal-data fixture.

## Residual risks and final decision

Accepted/documented risks are the upstream dependency chains above, simulated
payment mode (not a live gateway), and lack of Docker runtime evidence. The
Docker item is blocking for an initial push under this audit plan. Dependency
risks must be re-evaluated when safe compatible releases appear.

The workspace passes the available local quality gates, but initial-commit
approval is deferred. Re-run the complete gate set on the final candidate and
obtain explicit user approval before any Git or GitHub action.
