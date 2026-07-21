import { describe, expect, it } from 'vitest';
import { joinPaths, normalizePathSegment } from './path.util.js';

describe('normalizePathSegment', () => {
  it('adds a leading slash when missing', () => {
    expect(normalizePathSegment('users')).toBe('/users');
  });

  it('strips a trailing slash', () => {
    expect(normalizePathSegment('/users/')).toBe('/users');
  });

  it('collapses repeated slashes', () => {
    expect(normalizePathSegment('//users///list')).toBe('/users/list');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizePathSegment('  /users  ')).toBe('/users');
  });

  it('maps an empty string to the empty (contributes-nothing) segment', () => {
    expect(normalizePathSegment('')).toBe('');
  });

  it('maps a root-only segment to the empty (contributes-nothing) segment', () => {
    expect(normalizePathSegment('/')).toBe('');
  });

  it('preserves route parameter and wildcard syntax', () => {
    expect(normalizePathSegment('/users/:id')).toBe('/users/:id');
    expect(normalizePathSegment('/files/*')).toBe('/files/*');
  });
});

describe('joinPaths', () => {
  it('joins multiple non-root segments', () => {
    expect(joinPaths('/api', '/users')).toBe('/api/users');
  });

  it('drops segments that normalize to nothing', () => {
    expect(joinPaths('/api', '/')).toBe('/api');
    expect(joinPaths('/', '/users')).toBe('/users');
  });

  it('returns the root path when every segment is empty/root', () => {
    expect(joinPaths()).toBe('/');
    expect(joinPaths('/')).toBe('/');
    expect(joinPaths('', '/')).toBe('/');
  });

  it('joins three or more segments in order', () => {
    expect(joinPaths('/api', '/v1', '/users', '/:id')).toBe('/api/v1/users/:id');
  });

  it('normalizes each segment before joining', () => {
    expect(joinPaths('/api/', '//users//')).toBe('/api/users');
  });
});
