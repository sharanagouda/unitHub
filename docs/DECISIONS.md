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

## 9. A bare sign-in always becomes an owner

docs/tenant-claim.md establishes that there's no tenant signup, only owner
self-serve and invite claiming — but not what happens when someone opens the
app and signs in with no invite link in hand. Decided: they become an owner.
`useAuthBootstrap` (`src/lib/useAuthBootstrap.ts`) creates `users/{uid}` with
`roles: ['owner']` right after phone OTP verifies, *unless* a deep link
captured an invite first (`usePendingInviteStore`), in which case the invite
always wins and `claimTenantInvite` runs instead — regardless of whether the
caller already has a user doc, which is what makes "owner who is also a
tenant" just work without special-casing it.

One consequence: tenant-claim.md's "No rental linked yet" empty state is
reachable only when a captured invite's `claimTenantInvite` call itself
fails (expired/invalid token, phone mismatch) — a bare sign-in can no longer
land there, since it now always gets the owner role. `AppNavigator` still
renders that copy for the (now closer to unreachable) zero-roles case.

Not yet wired: the native side of deep linking. `src/lib/inviteLink.ts`
parses a `unithub://invite?tenancyId=...&token=...` URL and is unit-tested,
but nothing registers that scheme with iOS (`Info.plist`
`CFBundleURLTypes`) or Android (`AndroidManifest.xml` intent-filter) yet, so
the OS doesn't actually hand such a link to the app. Left for when
docs/SETUP.md's Firebase native wiring happens, since there's no buildable
config to verify either change against before then.

## 10. A moved-out tenant's read access actually expires now

docs/tenant-claim.md already described the intent — "Tenant moves out →
Read-only access retained ~12 months — they need old receipts for HRA
claims" — but `firestore.rules` never enforced it: `isTenantOf` was a bare
`tenantUserId == uid()` match with no time bound, so an ended tenancy's
access was in practice indefinite, not 12 months. Confirmed with the user
when building the ledger screen: keep the 12-month retention, but make it
real.

`accessExpiresAt: Timestamp | null` is now denormalized onto `TenancyDoc`,
`RentPeriodDoc` and `PaymentDoc` (null while active), the same way
`ownerId`/`tenantUserId` already are — so `isTenantOf()` can check it with a
plain field comparison, never a `get()` on the parent tenancy:

```
function isTenantOf(data) {
  return signedIn() && data.tenantUserId == uid()
    && (data.get('accessExpiresAt', null) == null
        || request.time < data.get('accessExpiresAt', null));
}
```

**Nothing sets this field to a non-null value yet.** There is no "end a
tenancy" action anywhere in the app — that's deferred CRUD, same as "add
tenant" and "record payment". Whatever eventually implements it must, in one
write: set the tenancy's `status` to `'ended'` and `accessExpiresAt` to
`moveOutDate + 365 days`, *and* backfill the same `accessExpiresAt` onto
every one of that tenancy's existing `rentPeriods`/`rentPayments` docs — a
tenancy-level change that doesn't also touch its children would leave them
readable (or unreadable) out of sync with the parent. `tests/rules/
firestore.test.ts`'s "tenant access expiry" block is the executable spec for
this — active / ended-within-window / ended-past-window / owner-is-never-
limited — any future implementation should keep passing it unmodified.

## 11. Export and receipts go through the OS share sheet, not a real file

"Export history as Excel" and "receipt for the month" both resolve to a
string (`src/domain/export/csv.ts`, `src/domain/export/statement.ts`) handed
to React Native's built-in `Share.share()` — not a written `.xlsx`/PDF file.
Confirmed with the user rather than assumed: this checkout has never run
`pod install` (no `Podfile.lock`), so a new native dependency
(`react-native-share`, a PDF generator) can't be linking-verified here, and
that's exactly the kind of failure that only surfaces later, on a real
device. `Share.share` is a core RN API — zero new dependencies, fully
testable now (`LedgerScreen.test.tsx` spies on it directly).

The CSV is plain decimal rupees, not `formatINR`'s grouped `₹` string — a
spreadsheet needs to parse that column as a number once the recipient saves
the shared text as a `.csv`. The per-period statement deliberately never
includes anything receipt-number-shaped (`UH-YYYYMMDD-NNN` from PRD §40);
#13's receipt-numbering question is still open, and a statement that looked
officially numbered would misrepresent that as settled (see #12's receipt-
numbering bullet, below).

Revisit this once real `.xlsx`/PDF output actually matters — on a device,
where `pod install`/a Gradle build can confirm a new library links at all.

## 12. Still open — decide before the schema hardens

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
