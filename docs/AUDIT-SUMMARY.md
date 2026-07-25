# NexRun Local Audit Summary

Audit date: 2026-07-25

## Decision

The local code, unit-test, build, repository-hygiene, and static Docker reviews
are complete. No Git initialization, commit, remote, or push was performed.
NexRun is not yet cleared for an initial push because Docker runtime validation
cannot be completed on this machine and residual upstream dependency advisories
remain accepted and documented.

## Current gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Fresh dependencies | Pass | `npm ci` completed. |
| Prisma generation | Pass | Prisma Client generated with Prisma 7.9.0. |
| Fast quality gate | Pass | ESLint, TypeScript, and 57 Vitest tests pass. |
| Production build | Pass | Next.js 16.2.11 standalone build completed. |
| Responsive/browser tests | Pass | 15 passed; 6 intentional browser-specific skips. |
| Host runtime/workflow smoke | Pass | Four roles plus commerce, checkout, race-day, document-template, and Platform Control flows. |
| Secret scan | Pass with reviewed placeholders | No credential-like value was found outside `.env`; documented demo/build placeholders were reviewed. |
| Dependency audit | Residual risk | 21 vulnerable nodes: 14 high, 7 moderate, 0 critical. No safe in-scope automatic fix remains. |
| Docker static review | Pass | Multi-stage, non-root, private PostgreSQL, health checks, and explicit build/runtime inputs reviewed. |
| Docker runtime | Pending/blocking | Docker is not installed on the audit PC. |

## Changes made during the audit

- Hardened `.gitignore` and `.dockerignore`, including generated Prisma output,
  local environment files, Playwright auth/results, caches, and editor/agent state.
- Removed unused `test.css` from the workspace by moving it to the local temp
  directory for recovery.
- Aligned Prisma packages at 7.9.0 and `eslint-config-next` at 16.2.11.
- Applied only the safe non-force npm audit update path.
- Restricted service-worker caching to public content and static assets.
- Kept organizer SSM documents private and resolved them through signed URLs.
- Hardened production Compose inputs, health checks, database exposure, and
  build-time handling of `NEXT_PUBLIC_APP_URL`.
- Expanded responsive tests across roles, routes, touch, landscape, and the
  mobile-card/desktop-table breakpoint.
- Split safe session reads from credential endpoint throttles so route-heavy
  navigation cannot exhaust the global auth quota; sign-in/sign-up remain strict.
- Fixed registration-confirmation and race-reminder email handling for the
  organizer-authored REPC date label, which is text rather than a Date value.

## Required before an initial push

1. Install Docker and complete every Docker runtime gate in
   [DEPLOYMENT.md](DEPLOYMENT.md).
2. Re-run all local commands and the secret scan on the final candidate tree.
3. Review any newly published safe fixes for Next.js/sharp, Prisma, ESLint, and
   React Email advisories.
4. Obtain explicit approval before creating or changing any Git repository,
   commit, remote, or GitHub repository.

See [AUDIT-REPORT.md](AUDIT-REPORT.md) for scope, security findings, advisory
classification, and the initial-commit manifest.
