# Tenant access — claimed, never created

There is no "sign up as tenant" in UnitHub. Owner signup is self-serve; tenant
access is **claimed** against a tenancy the owner already created.

If a tenant could self-register, something would have to match them to a unit —
a code, a search, a request-to-join. Every one of those is an attack surface
where guessing gets you someone else's rent ledger and phone number.

```
1. Owner adds tenant   ──▶ tenancy { tenantPhone, tenantUserId: null }
2. Owner taps "Invite" ──▶ SMS / share link (token, 7-day expiry)
3. Tenant signs in with phone OTP
      Firebase Auth proves this uid controls that phone number
4. claimTenantInvite() ──▶ tenantUserId = uid; 'tenant' added to users.roles
5. Rules now grant read on that tenancy — and nothing else
```

The binding is: **the owner asserts the number, and Firebase proves possession
of it.** No shared password, no owner-generated credentials.

## Why both a rule and a callable

`firestore.rules` already enforces the core match, because Firebase puts the
verified phone number in the auth token:

```
request.auth.token.phone_number == resource.data.tenantPhone
```

That is real enforcement, not a formality — but the callable is still the entry
point, because the claim must also add the role to the user doc, handle a phone
matching two tenancies, write an audit event, enforce invite-token expiry, and
return a useful error on mismatch. None of that fits in a rules expression.

The one thing that must never happen: letting a client write `tenantUserId`
freely. That is a "read any tenancy you like" bug.

## Edge cases

| Situation | Behaviour |
|---|---|
| Tenant's real number ≠ what owner typed | Claim fails cleanly; owner gets "edit phone & resend". Expect this often. |
| Tenant never joins | Owner mode works fully. **The tenant portal must never be load-bearing.** |
| One phone, two units | Both tenancies claim; tenant home gets a unit switcher. |
| Tenant moves out | Read-only access retained ~12 months — they need old receipts for HRA claims. |
| Owner is also a tenant | `roles: ['owner','tenant']` + switcher. Never infer. |
| **Recycled phone number** | Common in India. Only `status == 'active'` tenancies are claimable; invites expire in 7 days; a claim on a tenancy older than 30 days requires the invite token, not just a phone match. |
| Tenant changes number | Owner updates `tenantPhone`; `tenantUserId` is cleared and re-claim required. |

A tenant who signs in with an unrecognised number lands on an empty state —
"No rental linked yet. Ask your owner to invite you from UnitHub." — not an
error, and not a signup form.
