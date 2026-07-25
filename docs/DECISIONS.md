# Architectural Decisions

These decisions describe the intentional boundaries of the current system.
They are concise ADRs: revise them only when the underlying decision changes.

## ADR-001: Current TypeScript and Next.js toolchain

**Decision:** Use Next.js 16, React 19, and TypeScript 6 with the App Router.

**Why:** The application has already adopted their current APIs and build
behaviour. Dependency upgrades must be tested with `npm run verify` and
`npm run build`; this version of Next.js is not assumed to follow older
framework conventions.

## ADR-002: Prisma 7 with a PostgreSQL driver adapter

**Decision:** Use Prisma 7 with `@prisma/adapter-pg` and the `pg` pool against
PostgreSQL.

**Why:** This is the established data-access path and supports the project's
connection-pool configuration. Prisma schema plus committed migrations define
database truth; application code does not make ad-hoc schema changes.

## ADR-003: Money in integer sen with immutable financial snapshots

**Decision:** Store MYR currency as integer sen and snapshot charged fee values
on activation invoices and checkout orders.

**Why:** Integer arithmetic avoids floating-point rounding errors. Platform fees
may change for future activity without rewriting the historical amount due,
participant total, organizer net, or audit trail.

## ADR-004: Organization membership is the tenant boundary

**Decision:** Event ownership belongs to an organization, while people gain
organizer capabilities through a platform role plus organization membership.

**Why:** One organizer can serve multiple organizations with different duties.
The selected workspace improves navigation only; every event or organization
access is re-authorized on the server to prevent cross-tenant access.

## ADR-005: Payment provider stays behind a simulation boundary

**Decision:** Use an idempotent simulated provider for checkout and event
activation rather than a live payment gateway.

**Why:** The platform can exercise pricing, failure states, recovery, and audit
flows without storing gateway credentials or claiming live payment capability.
A real provider must be integrated behind this boundary with server-side
webhook verification and reconciliation before enabling it.

## ADR-006: Documents are browser-rendered

**Decision:** Bibs and certificates are prepared in the application and output
through the browser print dialog or Save as PDF, with a batch limit of 50.

**Why:** This avoids server-side PDF rendering infrastructure while retaining
revalidation and an audit record for each document batch. It is not an API for
server-generated PDF files.

## ADR-007: Platform controls use typed JSON settings

**Decision:** Store extensible control-center settings as `PlatformSetting`
records containing validated JSON, with typed Zod schemas and safe defaults.

**Why:** Carousel, reminders, rate limits, and announcements can evolve without
creating a new relational table for every small configuration. Unknown or
malformed stored values fall back safely; mutations are Admin/Developer-only
and audited.

## ADR-008: Scheduled work is externally triggered and idempotent

**Decision:** An external scheduler invokes protected internal HTTP routes with
`CRON_SECRET`; reminder delivery and job state are persisted.

**Why:** Web processes should not depend on an in-memory timer, especially when
containers restart or scale. Repeated scheduler calls safely release expired
reservations and do not duplicate an eligible reminder delivery.
