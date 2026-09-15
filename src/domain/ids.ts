/**
 * Branded IDs. The core operation in this app is joining five entity types;
 * passing a unitId where a tenancyId belongs is the easiest bug to write and
 * the hardest to spot in a ledger. Branding makes it a compile error.
 */
declare const Brand: unique symbol;
type Id<T extends string> = string & { readonly [Brand]: T };

export type UserId = Id<'User'>;
export type PropertyId = Id<'Property'>;
export type FloorId = Id<'Floor'>;
export type UnitId = Id<'Unit'>;
export type TenancyId = Id<'Tenancy'>;
export type RentPeriodId = Id<'RentPeriod'>;
export type PaymentId = Id<'Payment'>;
export type RepairId = Id<'Repair'>;
export type ListingId = Id<'Listing'>;

export const asUserId = (s: string) => s as UserId;
export const asPropertyId = (s: string) => s as PropertyId;
export const asFloorId = (s: string) => s as FloorId;
export const asUnitId = (s: string) => s as UnitId;
export const asTenancyId = (s: string) => s as TenancyId;
export const asRentPeriodId = (s: string) => s as RentPeriodId;
export const asPaymentId = (s: string) => s as PaymentId;
export const asRepairId = (s: string) => s as RepairId;
export const asListingId = (s: string) => s as ListingId;
