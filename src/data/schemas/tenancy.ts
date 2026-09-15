import { z } from 'zod';
import { zCalendarDate, zPaise, zTenancyId, zTimestamp, zUnitId, zUserId } from './primitives';

/**
 * The Firestore shape of a tenancy: every field `@domain/types`'s `Tenancy`
 * declares, plus the fields docs/tenant-claim.md's claim flow needs, none of
 * which bear on rent math (so none live on the domain type):
 *
 *   - `createdAt`   — when the recycled-number safety window (functions/src/
 *                     logic/claimTenantInvite.ts) starts counting from.
 *   - `inviteToken` / `inviteSentAt` — set by the `createTenantInvite`
 *                     callable; `inviteToken` is opaque and only ever
 *                     compared server-side, never parsed client-side.
 *   - `claimedAt`   — set by `claimTenantInvite` when the tenant claims.
 *
 * `TenancyDoc` is still a structural superset of `Tenancy`, so it can be
 * passed anywhere a domain `Tenancy` is expected (generateRentPeriods,
 * rentOn, ...).
 */
export const tenancyDocSchema = z.object({
  id: zTenancyId,
  ownerId: zUserId,
  unitId: zUnitId,

  tenantUserId: zUserId.nullable(),
  tenantName: z.string().min(1),
  tenantPhone: z.string().min(1),

  moveInDate: zCalendarDate,
  moveOutDate: zCalendarDate.nullable(),
  status: z.enum(['active', 'ended']),

  rentRevisions: z.array(
    z.object({
      effectiveFrom: zCalendarDate,
      rentPaise: zPaise,
    }),
  ),

  dueDay: z.number().int().min(1).max(31),
  depositPaise: zPaise,

  cycle: z.enum(['calendar-month', 'anniversary']),
  proration: z.enum(['full-month', 'prorated']),

  createdAt: zTimestamp,
  inviteToken: z.string().nullable(),
  inviteSentAt: zTimestamp.nullable(),
  claimedAt: zTimestamp.nullable(),
});

export type TenancyDoc = z.infer<typeof tenancyDocSchema>;
