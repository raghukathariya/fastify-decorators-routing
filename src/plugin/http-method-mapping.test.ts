import { describe, expect, it } from 'vitest';
import { ALL_HTTP_METHODS, mapHttpMethod } from './http-method-mapping.js';

describe('mapHttpMethod', () => {
  it('passes standard HTTP methods through unchanged', () => {
    expect(mapHttpMethod('GET')).toBe('GET');
    expect(mapHttpMethod('POST')).toBe('POST');
    expect(mapHttpMethod('DELETE')).toBe('DELETE');
  });

  it("expands 'ALL' to Fastify's default supported method set", () => {
    expect(mapHttpMethod('ALL')).toEqual(ALL_HTTP_METHODS);
  });

  it("returns a fresh, mutable array for 'ALL' rather than the shared constant", () => {
    const result = mapHttpMethod('ALL');
    expect(result).not.toBe(ALL_HTTP_METHODS);
    expect(Array.isArray(result)).toBe(true);
  });
});
