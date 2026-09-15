import { z } from 'zod';
import { zUserId } from './primitives';

/**
 * `roles` is server-controlled (see firestore.rules: a client update that
 * touches `roles` is rejected outright). It only ever changes through a
 * callable, never through this schema being used to build a client write.
 */
export const roleSchema = z.enum(['owner', 'tenant']);
export type Role = z.infer<typeof roleSchema>;

export const userDocSchema = z.object({
  id: zUserId,
  roles: z.array(roleSchema),
  phone: z.string().min(1),
});

export type UserDoc = z.infer<typeof userDocSchema>;
