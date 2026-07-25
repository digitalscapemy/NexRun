# Product and Workflows

NexRun is a Malaysia-focused, multi-tenant platform where approved organizers
publish running events and participants discover, register, pay, collect race
packs, and verify their documents.

## Roles and workspace boundaries

| Role | Platform responsibility |
| --- | --- |
| `USER` | Own registrations, checkout recovery, receipts, e-tickets, and public verification links. |
| `ORGANIZER` | Organization-scoped event, participant, document, finance, and race-day work. |
| `ADMIN` | Platform operations: organizer/event review, settlements, audit, and Platform Control Center. |
| `DEVELOPER` | All Admin capabilities plus technical platform administration. |

Organizer access is also constrained by active organization membership:

| Membership | Main permissions |
| --- | --- |
| `OWNER`, `MANAGER` | Event management, templates, documents, members; Owner controls member removal. |
| `OPERATIONS` | Participants, race-day operations, check-in. |
| `FINANCE` | Activation invoice and organizer finance access. |
| `CHECKIN_STAFF` | Check-in and collection desk only. |

An organizer user can belong to several organizations. The persisted selected
workspace scopes dashboard event lists; every server procedure still checks the
requested event or organization independently.

Public discovery is available at `/events`; the homepage also embeds a discovery
section. Organizer event management is intentionally separate at
`/dashboard/events`. A participant never receives an organizer creation CTA,
and organizer staff only see the operations assigned to their active membership.

## Event lifecycle

```text
DRAFT -> PENDING_APPROVAL
NEEDS_CHANGES -> PENDING_APPROVAL
PENDING_APPROVAL -> AWAITING_EVENT_FEE | NEEDS_CHANGES | CANCELLED
AWAITING_EVENT_FEE -> PUBLISHED | CANCELLED
PUBLISHED -> REGISTRATION_CLOSED | CANCELLED
REGISTRATION_CLOSED -> COMPLETED | CANCELLED
```

Every transition creates status history and an audit record. A public event
must be both `PUBLISHED` and owned by an `APPROVED` organization.

## Commercial rules

- Currency is MYR. All stored money uses integer sen: RM1.00 = `100` sen.
- Admin and Developer configure the activation fee, platform-profit percentage,
  and payment-service percentage in Platform Control Center.
- When an event is approved, the current activation fee is copied into one
  immutable `OrganizerFee` invoice. Approval never publishes an unpaid event.
- A successful simulated activation payment or an audited Admin/Developer
  waiver publishes the event.
- At participant checkout, fee percentages are snapshotted to `FeeSnapshot`.
  Existing paid orders and issued activation invoices are never recalculated.

For a discounted ticket subtotal:

```text
payment service fee = subtotal × configured processing percentage
platform profit     = subtotal × configured platform percentage
participant total   = subtotal + payment service fee
organizer net       = subtotal - platform profit
```

Payment remains simulated. Supported scenarios are `SUCCESS`, `DECLINED`,
`PENDING`, `TIMEOUT`, and `CANCELLED`; each payment attempt requires an
idempotency key.

## Participant journey

1. Discover published events and review categories.
2. Create a protected order with consent and inventory reservation.
3. Select a simulated payment method and complete, resume, or cancel checkout.
4. Receive registrations, QR-backed e-tickets, receipt, and in-app notices.
5. Present the registration code at race-pack collection.
6. After an event is completed and finisher status is confirmed, verify or
   print the certificate. Public verification masks participant identity.

## Organizer operations

- Participant roster, filters, CSV export, shirt corrections, and finisher
  confirmation.
- Shared check-in desk with station, bib, shirt, and race-pack collection
  states. Repeat scans are idempotent; corrections are audited.
- Event-scoped bib and certificate template settings with validated content and
  image URLs.
- Document Studio renders browser-printable bib/certificate batches of up to
  50 eligible registrations. Every batch is revalidated and audited before the
  print dialog opens.
- Activation invoices, payment history, waivers, settlements, reports, and
  vouchers remain server-authorized by organization permission.

## Platform Control Center

Admin and Developer use `/dashboard/developer-settings` to manage:

- platform fees for future invoices and checkouts;
- homepage carousel visibility and eligible-event limit;
- in-app race-day reminder schedule in Malaysia time;
- non-secret integration health;
- anonymous verification and voucher request limits; and
- a safe public announcement banner.

Race-day reminders are idempotent per registration. A deployment scheduler
calls the protected endpoint described in [OPERATIONS.md](OPERATIONS.md).

## Communication and outreach

- Transactional email is sent through Resend for registration confirmation,
  event published, event cancelled (organizer and participant), settlement
  completed, and race-day reminder. Email sending is best-effort: a missing
  `RESEND_API_KEY` logs a warning and skips delivery rather than failing the
  triggering action.
- Admin/Developer can broadcast an in-app notification to every platform user
  or to every active participant of one event (`admin.broadcastMessage`).
  Organizers can broadcast to the active participants of their own event
  (`admin.broadcastEventMessage`). Both are notification-only; they do not
  send email.
- `/dashboard/broadcast` hosts both broadcast forms, gated by role.

## Admin analytics and global search

- `/dashboard` for Admin/Developer opens directly into platform analytics:
  time-ranged totals for events, organizers, and registrations, a revenue
  trend line chart, and a top-events-by-registration table
  (`admin.getAnalytics`).
- Admin/Developer get a global search (`Ctrl/Cmd+K`) across events, users,
  and organizations from the dashboard header (`admin.globalSearch`).

## Event discovery and organizer productivity

- Public event discovery supports distance range, price range, and event-date
  range filters in addition to free-text search and state, on top of the
  cursor-paginated upcoming/past tabs.
- Organizers can duplicate an existing event (`event.duplicateEvent`): all
  categories and timeline items are copied into a new `DRAFT` with a
  regenerated slug, so a past event becomes a fast starting template.
- Organizer settlements include a per-event payout timeline
  (`settings.getSettlementTimeline`) showing first sale, event completion,
  settlement readiness, processing, and settlement milestones with
  timestamps, not only the current status.
- Both the event-creation form and the participant registration wizard
  autosave to `localStorage` and can resume a draft: the event form restores
  on next visit to the create page, and the registration wizard shows a
  "Resume draft" banner scoped per event slug, cleared on successful payment.

## Offline-capable web app

- The app ships a web manifest, service worker, and install prompt
  (`src/components/pwa-register.tsx`). Static assets are cached
  cache-first; navigations are network-first with a cached offline fallback.
  API and tRPC routes are never cached by the service worker.

## Current boundaries

- No live payment provider is connected; payment remains simulated.
- No SMS provider is connected.
- No native mobile app, GPS tracking, timing-chip integration, or live race
  telemetry is implemented.
- PDF files are not generated server-side. Documents use browser print or
  Save as PDF to avoid a separate rendering dependency.
- The offline service worker caches for browsing continuity; it does not
  provide offline check-in or offline data entry.
