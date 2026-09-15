# Decisions the PRD left open

The PRD describes the rent ledger as screens, not rules. These are the choices
the code now makes explicit. Each is a field on the tenancy, so it can be
changed per tenant rather than being baked into the schema.

## 1. Rent cycle — `Tenancy.cycle`

PRD §11 says "must not assume everyone joined on the 1st", but its own ledger
table is keyed by calendar month (Mar, Apr, May) while §10 collects a separate
due-day. Those are different models, so both are implemented:

- **`calendar-month`** (default) — periods are Jan 1–31, Feb 1–28, … regardless
  of move-in. `dueDay` is a day within the month, clamped for short months
  (a due day of 31 becomes 28 in February). Matches the PRD's ledger table.
- **`anniversary`** — periods run move-in-day to move-in-day (12 Mar – 11 Apr).
  Rent falls due at the start of its own period; a separate `dueDay` would
  contradict the cycle, so it is ignored.

## 2. Proration — `Tenancy.proration`

- **`full-month`** (default) — a partial first or last month is billed in full.
  This is what §10's worked example implies: moved in 12 March, expected
  ₹18,000, paid ₹10,000, outstanding ₹8,000.
- **`prorated`** — `rent × occupiedDays / daysInPeriod`.

The PRD never states which it intends; §10 only implies it. **Confirm with real
owners before defaulting.** In practice Indian landlords split roughly evenly,
and getting it wrong is the kind of thing that loses trust in month one.

## 3. Rent changes over time — `Tenancy.rentRevisions[]`

There is no single `rentPaise` on a tenancy. A 10% annual hike is standard, and
a scalar field would silently rewrite history. Each `RentPeriod` snapshots the
rent in force when it was generated; revisions never recompute closed periods.

## 4. Payments allocate, they do not name a month

PRD §40's payment record carries a single `rentMonth`, which cannot express
§12's own cases. A payment instead carries `allocations: [{rentPeriodId,
amountPaise}]`, and the unallocated remainder is tenancy credit. That one change
makes all four cases fall out of the same code path:

| §12 case | representation |
|---|---|
| partial payment | one allocation smaller than the period's pending |
| multiple payments | separate payments, each allocating to the same period |
| lump sum | one payment, allocations across several periods |
| overpayment | allocations plus a non-zero unallocated remainder |

Carrying credit into the next month is `applyCredit()` — a deliberate, auditable
owner action, never an invisible side effect of recording a payment.

## 5. Periods are generated lazily and deterministically

`generateRentPeriods(tenancy, asOf)` is pure, and a period's ID is derived from
the tenancy and its start date. Regenerating is therefore an idempotent upsert
rather than a source of duplicates — which is why periods can be materialised on
read instead of by a scheduled function that can silently stop firing.

## 6. Money is integer paise

₹18,000 is `1_800_000`. A ledger that accumulates float error produces balances
that never reconcile. `Paise` is a branded type, so a raw number cannot be
passed where money is expected.

## 7. Dates are calendar values, not instants

A due date of "5 October" is the 5th of October regardless of device timezone.
All rent logic runs on `CalendarDate` ("YYYY-MM-DD") strings; conversion from a
real instant happens once, at the boundary, in IST. India observes no DST, so
Asia/Kolkata is a fixed UTC+05:30 and the conversion needs no timezone database.

## 8. Tenant invite tokens live on the tenancy document

docs/tenant-claim.md specifies a token with a 7-day expiry and a 30-day
recycled-number safety window, but not where the token lives or how a client
gets it. `functions/`'s two callables make that concrete:

- **`createTenantInvite`** (owner-only) mints the token (`crypto.randomBytes`,
  base64url) and writes it straight onto the tenancy doc as `inviteToken` +
  `inviteSentAt`, rather than a separate `invites` collection — one document,
  no join, matching the "every root document is self-contained" principle
  `firestore.rules`'s own comment states. It returns the token to the owner's
  client, which shares it however it likes (OS share sheet); there is no SMS
  provider in this app, deliberately — sending the text is the phone's job,
  not the backend's.
- **`claimTenantInvite`** is the only thing that ever reads that token. A
  tenancy younger than 30 days can be claimed by phone match alone — no link
  needed; older than that, the token is mandatory (see
  `functions/src/logic/claimTenantInvite.ts`, which is the one place this
  whole decision tree is testable without an emulator).
- Three more `Tenancy`-doc-only fields fell out of this: `createdAt` (what the
  30-day window counts from) and `inviteToken` / `inviteSentAt`, alongside the
  pre-existing `claimedAt`. None affect rent math, so — like `claimedAt` —
  none live on the domain `Tenancy` type; see `src/data/schemas/tenancy.ts`.

## 9. Still open — decide before the schema hardens

- **PG / multiple occupants.** PRD Rule 1 says one active tenancy per unit; §54
  says support PG-style rooms. Those conflict. Either PG is out of scope, or
  `Tenancy` needs `occupants[]` with per-occupant rent shares.
- **Non-rent charges.** `RentPeriod.lineItems[]` exists and is wired into
  `expectedPaise`, but nothing writes to it yet. Sub-metered electricity is the
  messiest line in the notebook UnitHub is replacing — worth pulling into V1.
- **Deposit deductions at move-out.** §60 allows only a full return; partial
  deduction for damages or unpaid rent is the common case.
- **Receipt numbering scope.** `UH-YYYYMMDD-NNN` — per owner, per property, or
  global? Needs a transactional counter and a decision before the first receipt
  is issued, because issued receipts cannot be renumbered.
- **Resetting a claim when the tenant's number changes.** docs/tenant-claim.md's
  edge-case table calls for the owner to update `tenantPhone` and clear
  `tenantUserId` for re-claim, but `firestore.rules`' tenancy update rule
  requires `tenantUserId` to stay `unchanged()` — an owner cannot actually do
  this yet. It needs a third callable (parallel to `claimTenantInvite`, not a
  direct client write) rather than a rules change, to keep every
  `tenantUserId` mutation server-controlled.
