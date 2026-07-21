import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { getRequestUser } from './get-request-user.js';

describe('getRequestUser', () => {
  it('returns request.user when an auth plugin has populated it', () => {
    const user = { id: '1', roles: ['admin'] };
    const request = { user } as unknown as FastifyRequest;

    expect(getRequestUser(request)).toBe(user);
  });

  it('returns undefined when no auth plugin has run', () => {
    const request = {} as unknown as FastifyRequest;
    expect(getRequestUser(request)).toBeUndefined();
  });
});
