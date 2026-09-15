import { randomBytes } from 'node:crypto';

/** Unguessable and short enough to sit in a share-link query param. */
export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}
