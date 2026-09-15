import { userDocSchema } from '../user';

describe('userDocSchema', () => {
  it('parses a user with no roles yet', () => {
    const parsed = userDocSchema.parse({ id: 'tenant1', roles: [], phone: '+919876543210' });
    expect(parsed.roles).toEqual([]);
  });

  it('parses a user with both roles (owner who is also a tenant)', () => {
    const parsed = userDocSchema.parse({ id: 'u1', roles: ['owner', 'tenant'], phone: '+919876543210' });
    expect(parsed.roles).toEqual(['owner', 'tenant']);
  });

  it('rejects an unknown role', () => {
    expect(() => userDocSchema.parse({ id: 'u1', roles: ['admin'], phone: '+919876543210' })).toThrow();
  });

  it('rejects an empty phone', () => {
    expect(() => userDocSchema.parse({ id: 'u1', roles: [], phone: '' })).toThrow();
  });
});
