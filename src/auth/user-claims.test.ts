import { describe, expect, it } from 'vitest';
import { getUserPermissions, getUserRoles } from './user-claims.js';

describe('getUserRoles', () => {
  it('returns the roles array on a user object', () => {
    expect(getUserRoles({ roles: ['admin', 'editor'] })).toEqual(['admin', 'editor']);
  });

  it('returns an empty array when roles is missing', () => {
    expect(getUserRoles({ id: '1' })).toEqual([]);
  });

  it('returns an empty array when roles is not an array', () => {
    expect(getUserRoles({ roles: 'admin' })).toEqual([]);
  });

  it('drops non-string entries rather than throwing', () => {
    expect(getUserRoles({ roles: ['admin', 42, null] })).toEqual(['admin']);
  });

  it('returns an empty array for a nullish or primitive user', () => {
    expect(getUserRoles(undefined)).toEqual([]);
    expect(getUserRoles(null)).toEqual([]);
    expect(getUserRoles('not-an-object')).toEqual([]);
  });
});

describe('getUserPermissions', () => {
  it('returns the permissions array on a user object', () => {
    expect(getUserPermissions({ permissions: ['billing:read'] })).toEqual(['billing:read']);
  });

  it('returns an empty array when permissions is missing', () => {
    expect(getUserPermissions({ id: '1' })).toEqual([]);
  });
});
