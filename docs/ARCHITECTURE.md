# Architecture

## Stack

| Layer | Current technology |
| --- | --- |
| Web | Next.js 16 App Router, React 19, TypeScript 6 |
| UI | Tailwind CSS 4, Base UI/shadcn components, Lucide icons |
| API | tRPC 11 with SuperJSON |
| Validation | Zod 4 |
| Authentication | Better Auth with Prisma adapter |
| Data | PostgreSQL, Prisma 7, `@prisma/adapter-pg`, `pg` pool |
| Tests | Vitest plus disposable authenticated smoke scripts |

## Repository map

```text
src/app/(public)       Public discovery, registration, receipt, verification
src/app/(dashboard)    Authenticated participant, organizer, admin, developer UI
src/app/api             Auth, tRPC, health, UploadThing, protected scheduler routes
src/components          Reusable UI, public, layout, document, and form components
src/lib                 Shared validation, constants, client tRPC, template/config types
src/server              Auth, database, tRPC routers, policies, engines, services
prisma                  Schema, reviewed SQL migrations, seed data
scripts                 Cache cleanup, standalone start, runtime and workflow smoke tests
```

## Server boundaries

- `src/server/trpc/trpc.ts` creates request context with session, role, database
  and trusted request IP.
- `src/server/policies/rbac.ts` is the authority for platform-role,
  organization-membership, selected-workspace, and event access checks.
- `src/server/engines/` contains deterministic business calculations and
  eligibility logic.
- `src/server/services/` contains transactional workflows: pricing, checkout,
  activation, notifications, reservation expiry, rate limits, templates,
  platform controls, and race reminders.
- The dashboard shell applies route-aware role and membership guards to prevent
  misleading workspace UI. Client filtering or hidden navigation is never the
  authorization boundary; server policies still decide every data operation.

## Data domains

| Domain | Primary records |
| --- | --- |
| Identity | `User`, Better Auth session/account/verification records, `UserProfile` |
| Tenancy | `Organization`, `OrganizationMember`, `OrganizerApplication`, documents |
| Events | `Event`, categories, timeline, images, vouchers, status history |
| Commerce | `Order`, `OrderItem`, payment transactions, fee snapshots, reservations, redemptions |
| Activation | `OrganizerFee`, immutable payment attempts, waiver metadata |
| Operations | registrations, participant profiles, `CheckIn`, settlements |
| Documents | bib/certificate templates and audited document-batch preparation |
| Platform | `PlatformSetting`, `PlatformJobRun`, `RaceReminderDelivery`, audit and notifications |

Relations enforce event ownership through `organizationId`; all event-specific
queries use a server policy check before reading or mutating tenant data.

## Request and data flows

### Participant checkout

```text
browser -> registration.createOrder -> validation + inventory reservation
        -> pricing service + FeeSnapshot -> pending Order
browser -> registration.processMockPayment -> idempotent payment attempt
        -> paid Order + registrations + QR data + notification
```

### Event approval and activation

```text
Admin/Developer -> event.moderateEvent(APPROVE)
                -> current activation fee snapshot -> OrganizerFee
                -> AWAITING_EVENT_FEE
Organizer/Admin -> activation payment or audited waiver -> PUBLISHED
```

### Platform controls and public experience

```text
Admin/Developer -> settings update procedure -> PlatformSetting + AuditLog
Public homepage -> public experience setting + featured-event query
Scheduler -> protected reminder route -> PlatformJobRun + unique deliveries
```

## Data integrity patterns

- Integer sen and immutable snapshots protect financial history.
- Database constraints and unique keys guard terminal payment state,
  activation-invoice uniqueness, reservations, and reminder idempotency.
- PostgreSQL advisory locks serialize race-day correction and rate-limit paths
  where concurrent requests can otherwise duplicate state.
- tRPC and route handlers validate every untrusted input with Zod or a
  dedicated parser before persisting it.
- `AuditLog` records sensitive changes and operational decisions. It stores
  compact metadata, never secrets.

## Source-of-truth order

1. Prisma schema and reviewed migrations define persisted structure.
2. Server policies, engines, services, and router procedures define behaviour.
3. Zod schemas define accepted request/configuration data.
4. Tests and smoke scripts prove the critical paths.
5. Documentation describes the verified state above.
