import type { RouteOptions as FastifyRouteOptions } from 'fastify';
import { describe, expect, it } from 'vitest';
import { expandRouteForVersioning } from './expand-route-for-versioning.js';
import { MEDIA_TYPE_VERSION_CONSTRAINT_NAME } from './media-type-constraint.js';

function baseOptions(overrides: Partial<FastifyRouteOptions> = {}): FastifyRouteOptions {
  return {
    method: 'GET',
    url: '/users/:id',
    handler: () => 'ok',
    ...overrides,
  };
}

describe('expandRouteForVersioning: no versioning', () => {
  it('returns the base options unchanged when there are no versions', () => {
    const options = baseOptions();
    expect(expandRouteForVersioning(options, [], { type: 'uri' })).toEqual([options]);
  });

  it('returns the base options unchanged when versioning is undefined, even with versions', () => {
    const options = baseOptions();
    expect(expandRouteForVersioning(options, ['1'], undefined)).toEqual([options]);
  });
});

describe("expandRouteForVersioning: 'uri'", () => {
  it('prepends /v{version} to the url for a single version', () => {
    const [result] = expandRouteForVersioning(baseOptions(), ['1'], { type: 'uri' });
    expect(result?.url).toBe('/v1/users/:id');
  });

  it('registers one entry per version, each with its own prefixed url', () => {
    const results = expandRouteForVersioning(baseOptions(), ['1', '2'], { type: 'uri' });
    expect(results.map((r) => r.url)).toEqual(['/v1/users/:id', '/v2/users/:id']);
  });

  it('preserves every other field from the base options', () => {
    const options = baseOptions({ schema: { body: {} } });
    const [result] = expandRouteForVersioning(options, ['1'], { type: 'uri' });
    expect(result?.method).toBe('GET');
    expect(result?.handler).toBe(options.handler);
    expect(result?.schema).toBe(options.schema);
  });
});

describe("expandRouteForVersioning: 'header'", () => {
  it('sets constraints.version, leaving the url unchanged', () => {
    const options = baseOptions();
    const [result] = expandRouteForVersioning(options, ['1'], { type: 'header' });
    expect(result?.url).toBe('/users/:id');
    expect(result?.constraints).toEqual({ version: '1' });
  });

  it('registers one entry per version, all sharing the same url', () => {
    const results = expandRouteForVersioning(baseOptions(), ['1', '2'], { type: 'header' });
    expect(results.map((r) => r.url)).toEqual(['/users/:id', '/users/:id']);
    expect(results.map((r) => r.constraints)).toEqual([{ version: '1' }, { version: '2' }]);
  });

  it('merges with any pre-existing constraints on the base options', () => {
    const options = baseOptions({ constraints: { host: 'example.com' } });
    const [result] = expandRouteForVersioning(options, ['1'], { type: 'header' });
    expect(result?.constraints).toEqual({ host: 'example.com', version: '1' });
  });
});

describe("expandRouteForVersioning: 'media-type'", () => {
  it('sets the mediaTypeVersion constraint, leaving the url unchanged', () => {
    const [result] = expandRouteForVersioning(baseOptions(), ['2'], { type: 'media-type' });
    expect(result?.url).toBe('/users/:id');
    expect(result?.constraints).toEqual({ [MEDIA_TYPE_VERSION_CONSTRAINT_NAME]: '2' });
  });
});
