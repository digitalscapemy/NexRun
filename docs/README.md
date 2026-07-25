# NexRun Documentation

> Status: current implementation reference. Last reviewed: 2026-07-25.

This folder is NexRun's documentation memory bank. It records implemented
behaviour and operational decisions, not historical delivery notes. For exact
runtime truth, the code, Prisma schema, migrations, Zod validation, and tests
take precedence over prose.

## Reading order

| Document | Use it for |
| --- | --- |
| [AUDIT-SUMMARY.md](AUDIT-SUMMARY.md) | Executive status and gates before the initial commit. |
| [AUDIT-REPORT.md](AUDIT-REPORT.md) | **Latest local platform audit** (2026-07-25): security, dependencies, repository hygiene, Docker, tests, and residual risk. |
| [COMPATIBILITY-ANALYSIS.md](COMPATIBILITY-ANALYSIS.md) | Major dependency upgrade compatibility analysis (TypeScript 7, ESLint 10, resend 6, @types/node 26). |
| [PRODUCT.md](PRODUCT.md) | Product capabilities, roles, financial rules, and user workflows. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, directory boundaries, data ownership, and request flows. |
| [REFERENCE.md](REFERENCE.md) | RBAC, router catalogue, platform settings, migrations, and API endpoints. |
| [OPERATIONS.md](OPERATIONS.md) | Local development, quality gates, environment variables, and scheduled jobs. |
| [DEPLOYMENT.md](DEPLOYMENT.md) | EasyPanel single-VPS setup, Docker Compose, managed-platform options, backups, and launch checks. |
| [DECISIONS.md](DECISIONS.md) | Durable architectural decisions and their trade-offs. |

## Documentation rules

- Update the relevant canonical document in the same change as any behaviour,
  schema, permission, operational, or environment-variable change.
- Do not create phase handoff notes, duplicate API lists, or temporary status
  documents in `docs/`. Put durable information in one of the documents above.
- Document facts, defaults, constraints, and operational steps. Do not copy
  implementation line-by-line.
- Never place credentials, tokens, personal data, or real production URLs in
  documentation.
- When documentation and code disagree, fix the documentation after verifying
  the code and tests.
