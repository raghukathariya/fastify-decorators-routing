import { describe, expect, it } from 'vitest';
import { RouteError } from '../errors/route.error.js';
import { RouteRegistry } from './route-registry.js';

describe('RouteRegistry.register / has / getPath', () => {
  it('records a name and makes it resolvable', () => {
    const registry = new RouteRegistry();
    registry.register('user.detail', '/users/:id');

    expect(registry.has('user.detail')).toBe(true);
    expect(registry.getPath('user.detail')).toBe('/users/:id');
  });

  it('reports false/undefined for an unregistered name', () => {
    const registry = new RouteRegistry();
    expect(registry.has('nope')).toBe(false);
    expect(registry.getPath('nope')).toBeUndefined();
  });

  it('re-registering the same name for the same path is a no-op', () => {
    const registry = new RouteRegistry();
    registry.register('user.detail', '/users/:id');
    expect(() => registry.register('user.detail', '/users/:id')).not.toThrow();
  });

  it('throws RouteError when the same name is registered for a different path', () => {
    const registry = new RouteRegistry();
    registry.register('user.detail', '/users/:id');

    expect(() => registry.register('user.detail', '/orders/:id')).toThrow(RouteError);
  });
});

describe('RouteRegistry.url', () => {
  it('returns the path unchanged when it has no placeholders', () => {
    const registry = new RouteRegistry();
    registry.register('user.list', '/users');

    expect(registry.url('user.list')).toBe('/users');
  });

  it('substitutes a single :param placeholder', () => {
    const registry = new RouteRegistry();
    registry.register('user.detail', '/users/:id');

    expect(registry.url('user.detail', { id: '42' })).toBe('/users/42');
  });

  it('substitutes multiple :param placeholders', () => {
    const registry = new RouteRegistry();
    registry.register('org.member', '/orgs/:orgId/members/:userId');

    expect(registry.url('org.member', { orgId: 'acme', userId: '7' })).toBe('/orgs/acme/members/7');
  });

  it('URL-encodes a param value that needs it', () => {
    const registry = new RouteRegistry();
    registry.register('search', '/search/:term');

    expect(registry.url('search', { term: 'a b/c' })).toBe('/search/a%20b%2Fc');
  });

  it('accepts a number or boolean param value, stringifying it', () => {
    const registry = new RouteRegistry();
    registry.register('user.detail', '/users/:id');
    registry.register('flag', '/flags/:enabled');

    expect(registry.url('user.detail', { id: 42 })).toBe('/users/42');
    expect(registry.url('flag', { enabled: true })).toBe('/flags/true');
  });

  it('appends a query string built from the query argument', () => {
    const registry = new RouteRegistry();
    registry.register('user.list', '/users');

    expect(registry.url('user.list', undefined, { page: 2, active: true })).toBe(
      '/users?page=2&active=true',
    );
  });

  it('repeats a query key for an array value', () => {
    const registry = new RouteRegistry();
    registry.register('user.list', '/users');

    expect(registry.url('user.list', undefined, { tag: ['a', 'b'] })).toBe('/users?tag=a&tag=b');
  });

  it('drops an undefined query value rather than stringifying it', () => {
    const registry = new RouteRegistry();
    registry.register('user.list', '/users');

    expect(registry.url('user.list', undefined, { page: 2, filter: undefined })).toBe(
      '/users?page=2',
    );
  });

  it('combines param substitution and a query string', () => {
    const registry = new RouteRegistry();
    registry.register('user.detail', '/users/:id');

    expect(registry.url('user.detail', { id: '42' }, { expand: 'profile' })).toBe(
      '/users/42?expand=profile',
    );
  });

  it('omits the "?" entirely when query is an empty object', () => {
    const registry = new RouteRegistry();
    registry.register('user.list', '/users');

    expect(registry.url('user.list', undefined, {})).toBe('/users');
  });

  it('throws RouteError.unknownRouteName for an unregistered name', () => {
    const registry = new RouteRegistry();
    expect(() => registry.url('nope')).toThrow(RouteError);
  });

  it('throws RouteError.missingRouteParam when a required :param is not provided', () => {
    const registry = new RouteRegistry();
    registry.register('user.detail', '/users/:id');

    expect(() => registry.url('user.detail')).toThrow(RouteError);
    expect(() => registry.url('user.detail', {})).toThrow(RouteError);
  });
});
