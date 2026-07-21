import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { RouteError } from '../errors/route.error.js';
import { getRouteRegistry } from './get-route-registry.js';
import { RouteRegistry } from './route-registry.js';

describe('getRouteRegistry', () => {
  it('returns the RouteRegistry decorated onto the Fastify instance', () => {
    const app = Fastify();
    const registry = new RouteRegistry();
    app.decorate('routeRegistry', registry);

    expect(getRouteRegistry(app)).toBe(registry);
  });

  it('throws RouteError when nothing decorated routeRegistry yet', () => {
    const app = Fastify();
    expect(() => getRouteRegistry(app)).toThrow(RouteError);
  });
});
