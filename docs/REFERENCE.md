# Technical Reference

This is a compact lookup for stable interfaces. It intentionally does not
duplicate implementation details; use the linked source when changing a
procedure or configuration contract.

## Access semantics

| Procedure | Meaning |
| --- | --- |
| `publicProcedure` | No session is required. Public data is still filtered and rate limited where applicable. |
| `protectedProcedure` | Requires an authenticated Better Auth session. It does not by itself grant access to an event or organization. |
| `organizerProcedure` | Requires the platform role `ORGANIZER`, `ADMIN`, or `DEVELOPER`. Event and organization membership checks still apply. |
| `adminProcedure` | Requires `ADMIN` or `DEVELOPER`. |
| `developerProcedure` | Requires `DEVELOPER` only. It is available for future platform-only work; the current control center uses `adminProcedure`. |

The authoritative definitions are in
[`src/server/trpc/trpc.ts`](../src/server/trpc/trpc.ts), with resource and
membership checks in [`src/server/policies/rbac.ts`](../src/server/policies/rbac.ts).

## tRPC router catalogue

All application procedures are exposed under `/api/trpc/<router>.<procedure>`.
Inputs and outputs are typed by tRPC and validated server-side.

| Router | Responsibilities | Main access levels |
| --- | --- | --- |
| `event` | Public discovery and featured events; event detail, dashboard lists, creation, editing, lifecycle, submission, cancellation, and moderation. | Public, authenticated, organizer, admin |
| `registration` | Payment-fee disclosure, voucher validation, protected checkout/order recovery, simulated payment processing, participant registrations, and public registration verification. | Public and authenticated owner |
| `activation` | Organizer activation-invoice lookup and simulated payment; Admin/Developer fee waivers. | Organizer, admin |
| `operational` | Event roster, CSV export, check-in, collection updates, finisher status, document batches, finance summaries, and vouchers. | Authenticated, followed by event/organization policy checks |
| `settings` | Organizer profile and workspace membership, platform fees and controls, organization review, settlements, templates, notifications, and audit logs. | Public, authenticated, organizer, admin |
| `admin` | Platform analytics, global search, and broadcast notifications (platform-wide and per-event). | Admin, developer, organizer (event-scoped broadcast only) |

### Notable procedures added since the initial catalogue

| Procedure | Purpose |
| --- | --- |
| `event.duplicateEvent` | Copies an existing event's content, categories, and timeline items into a new `DRAFT` with a regenerated slug. |
| `event.getEventPicklist` | Lightweight `{ id, title, status }` list for dropdowns (e.g. the organizer broadcast form); scoped to the caller's organization unless platform admin. |
| `settings.getSettlementTimeline` | Per-event settlement milestone history (first sale, event completed, ready, processing, settled) with timestamps. |
| `admin.getAnalytics` | Time-ranged (`7d`/`30d`/`90d`/`1y`/`all`) totals, revenue trend, and top-events table for the admin dashboard. |
| `admin.globalSearch` | Cross-entity search over events, users, and organizations for the dashboard `Ctrl/Cmd+K` search. |
| `admin.broadcastMessage` | Admin/Developer only. Notifies all platform users or all active participants of one event. |
| `admin.broadcastEventMessage` | Organizer-scoped. Notifies active participants of one of the caller's own events. |

Important ownership rule: `registration.getOrderDetails`, checkout status, and
recovery procedures are authenticated—not public—even when a receipt or
verification page is public. Inspect the router source before changing a
client query or link.

## Canonical web routes

| Route | Audience and purpose |
| --- | --- |
| `/` | Public homepage with featured events and an embedded discovery section. |
| `/events` | Canonical public event discovery page: search, state filter, and upcoming/past event tabs. |
| `/events/[slug]` | Public event detail. The current filesystem segment is named `[id]`, but its value is an event slug. |
| `/events/[slug]/register` | Participant registration flow. |
| `/dashboard/events` | Organizer/Admin event management for `OWNER`, `MANAGER`, Admin, and Developer. |
| `/dashboard/events/[id]/operations/*` | Event operations; the allowed tab is determined by organization membership and server policy. |
| `/dashboard/broadcast` | Compose and send platform-wide (Admin/Developer) or event-scoped (Organizer) broadcast notifications. |
| `/dashboard/settlements` | Organizer settlement list with a per-event payout timeline modal (`getSettlementTimeline`). |
| `/verify/certificate/[code]` | Public certificate verification. The certificate document embeds a QR code that resolves to this route. |
| `/verify/registration/[code]` | Public registration/e-ticket verification. |

The dashboard shell redirects direct organizer URLs that do not match the
current user's role or active-membership permission. This improves navigation
and prevents misleading UI; server policies remain the authorization boundary.

## HTTP endpoints

| Endpoint | Purpose | Access and response expectation |
| --- | --- | --- |
| `GET /api/health` | Liveness/readiness check including a `SELECT 1` database probe. | Public; returns `200` with `status: "ok"`, or `503` when unavailable. No-store. |
| `POST /api/internal/expire-reservations` | Releases expired checkout reservations and prunes expired rate-limit records. | `Authorization: Bearer <CRON_SECRET>`; `401` when invalid, `503` when not configured. |
| `POST /api/internal/send-race-reminders` | Dispatches due in-app race-day reminders. | `Authorization: Bearer <CRON_SECRET>`; uses idempotent delivery records. |
| `/api/auth/[...all]` | Better Auth handler. | Managed by Better Auth. |
| `/api/trpc/[trpc]` | tRPC HTTP transport. | Procedure-specific. |
| `/api/uploadthing` | UploadThing handler. | Managed by UploadThing and app policy. |
| `GET /manifest.webmanifest` | PWA web app manifest (name, icons, display mode, theme). | Public; cached by service worker. |
| `GET /sw.js` | Service worker script for offline caching and install prompts. | Public; never cached. |
| `GET /offline` | Offline fallback page shown when navigations fail and service worker is active. | Public; cached by service worker. |

The two scheduler routes use the Node.js runtime and are dynamically evaluated;
do not cache or invoke them from a browser.

## Platform settings

`PlatformSetting` stores platform-wide scalar values and validated JSON
configuration. Admin and Developer share control through
`/dashboard/developer-settings`; every update is audited.

| Key | Value and scope |
| --- | --- |
| `adminFeePercentage` | Integer platform-profit percentage, from `0` to `50`, used for new participant checkouts. |
| `processingFeePercentage` | Integer participant payment-service percentage, from `0` to `50`, used for new participant checkouts. |
| `eventActivationFeeSen` | Integer activation fee in sen, from `100` to `100,000,000`, used when an event is approved. |
| `homepageCarouselConfig` | JSON: enabled state, whether upcoming events are eligible, and a `1`–`50` event limit. |
| `raceReminderConfig` | JSON: enabled state, `0`–`7` days before event, and earliest Malaysia-time hour (`0`–`23`). |
| `securityControlsConfig` | JSON public rate limits: verification and voucher requests per minute, each `5`–`100`. |
| `platformAnnouncementConfig` | JSON public banner: state, tone, message, optional safe link, and label. |

Fee values are snapshots, not retroactive edits. `OrganizerFee` preserves the
activation amount at approval and `FeeSnapshot` preserves checkout percentages
on the order.

## Database migrations

Migrations are reviewed SQL history and must be applied in lexical order with
`npm run db:migrate:deploy`. Never edit an applied migration.

| Migration | Purpose |
| --- | --- |
| `20260724001158_v1_0_stable` | Complete v1.0 baseline schema — all tables, enums, indexes, and constraints. Squashed from 9 development migrations on 2026-07-24. |
