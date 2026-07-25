# Comprehensive Seed Data Plan for NexRun

**Date:** 2026-07-24  
**Purpose:** Complete test data covering all user journeys, edge cases, and platform states

---

## Current Seed Data Analysis

**What we have now:**
- ✅ 4 user accounts (Developer, Admin, Organizer, Participant)
- ✅ 1 approved organization (Run Malaysia Events)
- ✅ 3 events in different states (2 PUBLISHED, 1 PENDING_APPROVAL)
- ✅ Basic ticket categories per event
- ✅ Platform settings configured

**What's missing:**
- ❌ No actual registrations/orders (can't test participant roster)
- ❌ No check-in data (can't test race-day operations)
- ❌ No vouchers (can't test discount flows)
- ❌ No organizer fee payment records (can't test activation flow)
- ❌ No settlements (can't test payout flows)
- ❌ No participant profiles with diverse data
- ❌ No audit logs or notifications
- ❌ No multiple organizations (can't test workspace switching)
- ❌ No REJECTED/SUSPENDED states
- ❌ No edge cases (expired orders, cancelled registrations, refunds)

---

## Proposed Comprehensive Seed Strategy

### Design Principles

1. **Realistic Data**: Names, dates, and scenarios reflect real Malaysian context
2. **Coverage**: Every status, every workflow, every permission level
3. **Edge Cases**: Failed payments, expired orders, cancellations, corrections
4. **Demo-Ready**: Can showcase full platform flow in presentations
5. **Testable**: QA can verify each feature without manual setup
6. **Maintainable**: Clearly commented sections, easy to extend

---

## Detailed Seed Data Plan

### 1. Users & Profiles (12 total)

#### Platform Users (2)
- ✅ `developer@nexrun.my` — Aznan (Technical Developer)
- ✅ `admin@nexrun.my` — Nurul Aimi (Operations Admin)

#### Organizer Users (4)
- ✅ `organizer@runmalaysia.my` — Faizal Tahir (OWNER, Run Malaysia)
- 🆕 `manager@runmalaysia.my` — Siti Aminah (MANAGER, Run Malaysia)
- 🆕 `finance@runmalaysia.my` — Rahman Ali (FINANCE, Run Malaysia)
- 🆕 `checkin@runmalaysia.my` — Hafiz Ismail (CHECKIN_STAFF, Run Malaysia)

**Purpose:** Test all organization roles and permission boundaries

#### Participant Users (6)
- ✅ `participant@gmail.com` — Ahmad Hafizuddin (active registrations)
- 🆕 `participant2@gmail.com` — Nurul Aisyah (multiple events, checked in)
- 🆕 `participant3@gmail.com` — Lee Wei Ming (cancelled registration)
- 🆕 `participant4@gmail.com` — Kumar Selvam (expired order, never paid)
- 🆕 `participant5@gmail.com` — Tan Mei Ling (used voucher, finisher)
- 🆕 `participant6@gmail.com` — Sarah Abdullah (foreign participant, Singapore IC)

**Purpose:** Test registration states, check-in, finisher confirmation, diverse demographics

---

### 2. Organizations (3 total)

#### Organization 1: Run Malaysia Events (APPROVED) ✅
- Status: APPROVED
- Members: Faizal (OWNER), Siti (MANAGER), Rahman (FINANCE), Hafiz (CHECKIN_STAFF)
- Events: 3 events (2 published, 1 pending approval)
- Bank: Maybank

#### Organization 2: 🆕 Johor Running Club (PENDING)
- Status: PENDING
- Owner: `organizer2@johorrun.my` (new user, pending approval)
- Events: 1 DRAFT event (can't publish until approved)
- Application: Under review by admin
- Bank: CIMB Bank

**Purpose:** Test organizer application workflow, PENDING organization constraints

#### Organization 3: 🆕 KL Runners Association (SUSPENDED)
- Status: SUSPENDED
- Owner: `suspended@klrunners.my` (suspended due to policy violation)
- Events: 1 CANCELLED event
- Reason: Previous event had participant complaints

**Purpose:** Test suspended organization behavior, event cancellation flow

---

### 3. Events (7 total)

#### Event 1: Cyberjaya Tech Dash 2026 (PUBLISHED) ✅
- Status: PUBLISHED
- Organization: Run Malaysia
- Registration: OPEN
- **Enhancement:** Add seed registrations (15 participants, various states)
- **Add:** 5 checked-in participants, 3 finishers confirmed
- **Add:** 1 voucher (EARLY_BIRD_2026, 10% off, active)

#### Event 2: Penang Bridge Half Marathon 2026 (PUBLISHED) ✅
- Status: PUBLISHED
- Organization: Run Malaysia
- Registration: OPEN
- **Enhancement:** Add seed registrations (20 participants)
- **Add:** Check-in not started yet
- **Add:** 1 expired voucher (to test "voucher not valid" error)

#### Event 3: Putrajaya Night Run 2026 (PENDING_APPROVAL) ✅
- Status: PENDING_APPROVAL
- Organization: Run Malaysia
- **Enhancement:** Add OrganizerFee invoice (PENDING payment)
- **Purpose:** Test event activation payment flow

#### Event 4: 🆕 KLCC City Run 2026 (AWAITING_EVENT_FEE)
- Status: AWAITING_EVENT_FEE
- Organization: Run Malaysia
- Admin approved, but organizer hasn't paid activation fee yet
- **Add:** OrganizerFee invoice (PENDING), 2 payment attempts (1 FAILED, 1 PENDING)
- **Purpose:** Test activation payment retry, failed payment handling

#### Event 5: 🆕 Malacca Heritage Run 2025 (COMPLETED)
- Status: COMPLETED
- Organization: Run Malaysia
- Event Date: 2025-11-20 (past)
- **Add:** 25 registrations (all ACTIVE), 23 checked-in, 20 finishers confirmed
- **Add:** Settlement (SETTLED, organizer已收款)
- **Add:** Certificates generated for 20 finishers
- **Purpose:** Test completed event flow, settlement, certificate verification

#### Event 6: 🆕 Langkawi Sunrise Marathon 2026 (CANCELLED)
- Status: CANCELLED
- Organization: KL Runners (SUSPENDED)
- Cancelled due to organization suspension
- **Add:** 10 registrations (all auto-cancelled, refunded)
- **Purpose:** Test event cancellation, mass refund, participant notifications

#### Event 7: 🆕 Johor Bahru Trail Run 2026 (DRAFT)
- Status: DRAFT
- Organization: Johor Running Club (PENDING)
- Can't submit for approval until org is approved
- **Purpose:** Test PENDING org constraints

---

### 4. Registrations & Orders (70 total)

#### Distribution by Event:
- Cyberjaya Tech Dash: 15 registrations
- Penang Bridge: 20 registrations
- Malacca Heritage (completed): 25 registrations
- Langkawi (cancelled): 10 registrations

#### Order States to Cover:
- ✅ **PAID orders** (50): Successful checkout, active registrations
- ⚠️ **PENDING orders** (5): Payment initiated but not completed (test checkout recovery)
- ❌ **EXPIRED orders** (8): Reservation expired after 15 minutes
- ❌ **FAILED orders** (4): Payment declined/failed
- ❌ **CANCELLED orders** (3): User cancelled before payment

#### Registration States:
- ✅ **ACTIVE** (60): Normal registrations
- ❌ **CANCELLED** (10): From cancelled event (Langkawi)

#### Check-In States (for Cyberjaya Tech Dash):
- ✅ 5 fully checked-in (bib collected, shirt collected, race pack collected)
- ⏳ 3 partially checked-in (bib only)
- ⏳ 2 checked-in but shirt size corrected by staff
- ❌ 5 not checked-in yet

#### Finisher Status (for Malacca Heritage - completed event):
- ✅ 20 confirmed finishers (certificate available)
- ❌ 3 DNF (Did Not Finish)
- ❓ 2 DNS (Did Not Start - registered but didn't show up)

---

### 5. Participant Profiles (Complete Demographics)

**Age Distribution:**
- 5-12 years: 2 participants (kids categories)
- 13-17 years: 3 participants (teen categories)
- 18-35 years: 30 participants (majority)
- 36-50 years: 20 participants
- 51-70 years: 10 participants
- 71+ years: 1 participant (senior category)

**Gender:**
- Male: 35
- Female: 31

**Nationality:**
- Malaysian: 60
- Singaporean: 3
- Indonesian: 2
- Thai: 1

**IC Types:**
- Malaysian IC: 60
- Passport: 6

**Shirt Sizes:**
- XS: 3, S: 12, M: 25, L: 18, XL: 8, 2XL: 0

**Emergency Contact:** All have realistic Malaysian phone numbers

---

### 6. Vouchers (5 total)

#### Voucher 1: EARLY_BIRD_2026 (ACTIVE)
- Event: Cyberjaya Tech Dash
- Type: PERCENTAGE, 10% off
- Policy: PER_ORDER
- Redemption limit: 100
- Redeemed: 8 times
- Expiry: 2026-08-31

#### Voucher 2: REPEAT_RUNNER (ACTIVE)
- Event: Penang Bridge
- Type: FIXED, RM15 off
- Policy: PER_PARTICIPANT
- Redemption limit: 50
- Redeemed: 3 times
- Expiry: 2026-10-15

#### Voucher 3: EXPIRED_PROMO (EXPIRED)
- Event: Penang Bridge
- Type: PERCENTAGE, 20% off
- Redemption limit: 200
- Redeemed: 45 times
- Expiry: 2026-05-01 (past)
- **Purpose:** Test "voucher expired" error

#### Voucher 4: MAXED_OUT (FULLY_REDEEMED)
- Event: Cyberjaya Tech Dash
- Type: FIXED, RM20 off
- Redemption limit: 5
- Redeemed: 5 times (limit reached)
- **Purpose:** Test "voucher fully redeemed" error

#### Voucher 5: VIP_INVITE (ACTIVE, LOW USAGE)
- Event: Malacca Heritage (completed)
- Type: PERCENTAGE, 50% off
- Redemption limit: 10
- Redeemed: 2 times
- Expiry: 2025-11-01 (past, but event completed)

---

### 7. Organizer Fees & Activation (4 invoices)

#### Invoice 1: Cyberjaya Tech Dash (PAID)
- Amount: RM500 (activation fee)
- Status: PAID
- Payment method: ONLINE_BANKING
- Paid date: 2026-07-15
- Event is now PUBLISHED

#### Invoice 2: Penang Bridge (WAIVED)
- Amount: RM500
- Status: WAIVED
- Waived by: Admin (Nurul Aimi)
- Waiver reason: "Long-time partner organization"
- Event is now PUBLISHED

#### Invoice 3: Putrajaya Night Run (PENDING)
- Amount: RM500
- Status: PENDING
- Invoice issued: 2026-07-20
- No payment attempts yet
- Event stuck in PENDING_APPROVAL

#### Invoice 4: KLCC City Run (PROCESSING)
- Amount: RM500
- Status: PROCESSING
- Payment attempts: 2
  - Attempt 1 (2026-07-21): FAILED (simulated DECLINED)
  - Attempt 2 (2026-07-22): PENDING (simulated PENDING, waiting)
- Event in AWAITING_EVENT_FEE

---

### 8. Payment Transactions (75 records)

#### Breakdown:
- ✅ **SUCCESS** (50): Normal paid orders
- ❌ **FAILED** (15): Declined cards, insufficient balance, timeout
- ⏳ **PENDING** (6): Payment initiated, waiting for bank confirmation
- ❌ **CANCELLED** (4): User cancelled payment mid-flow

#### Payment Methods Distribution:
- ONLINE_BANKING: 40 transactions
- EWALLET: 25 transactions
- CARD: 10 transactions

#### Idempotency Keys:
- All unique
- 2 duplicate attempts (same idempotency key) to test duplicate protection

---

### 9. Settlements (2 records)

#### Settlement 1: Malacca Heritage Run (SETTLED)
- Event: Malacca Heritage (completed)
- Organization: Run Malaysia
- Total participant payments: RM 24,500
- Platform profit cut: RM 980 (4%)
- Organizer net payout: RM 23,520
- Status: SETTLED
- Settlement date: 2025-12-05
- Reference: STTL-2025-001

#### Settlement 2: Cyberjaya Tech Dash (READY)
- Event: Cyberjaya Tech Dash (will complete after event)
- Status: READY (event not completed yet, but calculated)
- Total so far: RM 67,500 (from 15 registrations)
- **Purpose:** Show pre-calculated settlement before event completion

---

### 10. Check-Ins (28 records)

#### For Cyberjaya Tech Dash (15 registrations):
- 5 fully checked-in (all 3 stages)
- 3 partially checked-in (bib only)
- 2 with corrections (shirt size changed by staff)
- 5 not checked-in

#### For Malacca Heritage (completed):
- 23 out of 25 checked-in
- 2 no-shows (registered but never came)

#### Check-In Timestamps:
- Realistic: 2 hours before flag-off to 30 minutes before
- Checked-in by: Mix of Hafiz (CHECKIN_STAFF) and Faizal (OWNER)

---

### 11. Audit Logs (100+ records)

Cover all major actions:
- ✅ Event status changes (DRAFT → PENDING_APPROVAL → PUBLISHED)
- ✅ Registration creations
- ✅ Payment attempts
- ✅ Check-in actions
- ✅ Shirt size corrections
- ✅ Finisher confirmations
- ✅ Voucher redemptions
- ✅ Organization member invites/removals
- ✅ Platform setting changes (by Admin/Developer)
- ✅ Organizer fee waivers

**Actor distribution:**
- Developer: 5 actions
- Admin: 15 actions
- Organizer (Faizal): 40 actions
- Manager (Siti): 10 actions
- Participant actions: 30+ (registrations, checkouts)

---

### 12. Notifications (50+ records)

#### Types to seed:
- ✅ Registration confirmation (after payment success)
- ✅ Payment failure alerts
- ✅ Race reminder (1 day before event)
- ✅ Check-in confirmation
- ✅ Certificate ready (after finisher confirmation)
- ✅ Event cancellation notice
- ✅ Refund processed
- ⚠️ Order expiring soon (for PENDING orders)

#### Read/Unread:
- 30 read notifications
- 20 unread notifications

---

### 13. Templates & Race Documents

#### Certificate Templates (2):
- Malacca Heritage: Custom template with sponsor logos
- Cyberjaya Tech Dash: Standard template

#### Race Bib Templates (2):
- Cyberjaya: QR code + bib number + name + category
- Penang Bridge: Minimalist design

---

### 14. Platform Settings (Already seeded ✅)

No changes needed — current settings are good:
- Admin fee: 4%
- Processing fee: 2%
- Event activation fee: RM5.00 (500 sen)
- Rate limits configured
- Race reminder enabled (1 day before, 9 AM)

---

## Implementation Strategy

### Phase 1: Foundation (Users, Orgs, Events)
1. Add 8 new users (organizers + participants)
2. Create 2 new organizations (PENDING, SUSPENDED)
3. Add 4 new events in various states
4. Update existing 3 events with richer data

### Phase 2: Transactions (Orders, Payments, Registrations)
1. Seed 70 orders with diverse states
2. Create 75 payment transactions (success/failed/pending)
3. Link registrations to orders
4. Add participant profile data (demographics, emergency contact)

### Phase 3: Operations (Check-ins, Vouchers, Settlements)
1. Seed 5 vouchers (active, expired, maxed-out)
2. Create 28 check-in records for 2 events
3. Add 2 settlement records (SETTLED, READY)
4. Seed organizer fee invoices (4 invoices, various states)

### Phase 4: Observability (Audit, Notifications, Templates)
1. Generate 100+ audit log entries
2. Create 50+ notifications for participants
3. Add certificate templates (2 events)
4. Add race bib templates (2 events)

### Phase 5: Edge Cases & Error Scenarios
1. Expired orders (8 records)
2. Failed payments with retry attempts
3. Cancelled registrations from cancelled event
4. Duplicate idempotency key attempts
5. Voucher validation errors (expired, maxed-out)

---

## Data Volume Summary

| Entity | Current | Proposed | Growth |
|--------|---------|----------|--------|
| **Users** | 4 | 12 | +8 |
| **Organizations** | 1 | 3 | +2 |
| **Events** | 3 | 7 | +4 |
| **Ticket Categories** | 9 | ~25 | +16 |
| **Orders** | 0 | 70 | +70 |
| **Registrations** | 0 | 66 | +66 |
| **Payment Transactions** | 0 | 75 | +75 |
| **Participant Profiles** | 4 | 12 | +8 |
| **Vouchers** | 0 | 5 | +5 |
| **Voucher Redemptions** | 0 | 18 | +18 |
| **Organizer Fees** | 0 | 4 | +4 |
| **Settlements** | 0 | 2 | +2 |
| **Check-Ins** | 0 | 28 | +28 |
| **Audit Logs** | 0 | ~100 | +100 |
| **Notifications** | 0 | ~50 | +50 |
| **Certificate Templates** | 0 | 2 | +2 |
| **Race Bib Templates** | 0 | 2 | +2 |

**Total Records:** ~150 → ~600+ records

---

## Testing Coverage Matrix

| Feature | Can Test? | Seed Data Required |
|---------|-----------|-------------------|
| **Participant Registration** | ✅ | Orders + Registrations |
| **Checkout Flow** | ✅ | PENDING orders for recovery |
| **Payment Success/Failure** | ✅ | Various payment states |
| **Voucher Application** | ✅ | Active + expired + maxed vouchers |
| **Check-In Desk** | ✅ | Check-in records for Cyberjaya |
| **Finisher Confirmation** | ✅ | Malacca event with finishers |
| **Certificate Verification** | ✅ | Certificates for finishers |
| **Organizer Activation Payment** | ✅ | PENDING/PROCESSING invoices |
| **Event Approval Flow** | ✅ | PENDING_APPROVAL events |
| **Event Cancellation** | ✅ | Langkawi cancelled event |
| **Settlement Calculation** | ✅ | SETTLED + READY settlements |
| **Multi-Org Workspace** | ✅ | 3 orgs with different statuses |
| **RBAC Permissions** | ✅ | 4 org roles with members |
| **Audit Trail** | ✅ | 100+ audit logs |
| **Notifications** | ✅ | 50+ notifications |
| **Race Documents** | ✅ | Templates + finisher data |
| **Rate Limiting** | ✅ | Platform settings configured |
| **Expired Order Cleanup** | ✅ | EXPIRED orders |
| **Refund Flow** | ✅ | Cancelled event refunds |
| **Organization Suspension** | ✅ | KL Runners (SUSPENDED) |

**Coverage:** 20/20 features ✅

---

## Benefits of Comprehensive Seed

### For Development:
- ✅ No manual data entry for feature testing
- ✅ Instant state reproduction (e.g., "show me a PENDING order")
- ✅ Edge cases pre-seeded (expired, failed, cancelled)

### For QA:
- ✅ Complete end-to-end testing without setup
- ✅ All user roles and permissions testable
- ✅ Error scenarios pre-configured

### For Demo/Pitch:
- ✅ Professional, realistic data (not "Test Event 1")
- ✅ Show full participant journey in one flow
- ✅ Demonstrate all platform capabilities

### For Onboarding:
- ✅ New developers see realistic data patterns
- ✅ Examples of proper status transitions
- ✅ Reference implementations for each flow

---

## Next Steps

1. ✅ **Review this plan** — User confirms scope and priorities
2. **Implementation** — Update `prisma/seed.ts` with comprehensive data
3. **Execution** — Run `npm run db:seed`
4. **Verification** — Spot-check each scenario via UI/API
5. **Documentation** — Update docs to reference seed accounts/data

---

**Ready to proceed?** This seed will make NexRun fully demo-ready and QA-friendly!
