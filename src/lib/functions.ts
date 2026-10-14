import { getFunctions, httpsCallable, type Functions } from '@react-native-firebase/functions';

let instance: Functions | undefined;

/** The default-app Functions instance, created once and reused. */
export function functionsInstance(): Functions {
  instance ??= getFunctions();
  return instance;
}

/**
 * Typed client-side wrappers for functions/src/*.ts's callables. Kept in
 * sync by hand — functions/ is a separate npm package (see docs/SETUP.md),
 * so it can't export its request/response types for this package to import.
 */

export interface ClaimTenantInviteRequest {
  tenancyId: string;
  inviteToken?: string;
}
export interface ClaimTenantInviteResponse {
  tenancyId: string;
  unitId: string;
}

export function claimTenantInvite(data: ClaimTenantInviteRequest) {
  return httpsCallable<ClaimTenantInviteRequest, ClaimTenantInviteResponse>(
    functionsInstance(),
    'claimTenantInvite',
  )(data);
}

export interface CreateTenantInviteRequest {
  tenancyId: string;
}
export interface CreateTenantInviteResponse {
  tenancyId: string;
  inviteToken: string;
}

export function createTenantInvite(data: CreateTenantInviteRequest) {
  return httpsCallable<CreateTenantInviteRequest, CreateTenantInviteResponse>(
    functionsInstance(),
    'createTenantInvite',
  )(data);
}
