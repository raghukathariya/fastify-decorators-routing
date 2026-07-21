import { describe, expect, it } from 'vitest';
import type { ControllerMetadata } from '../decorators/controller-metadata.js';
import type { RouteDefinition } from '../decorators/http-method.types.js';
import { resolveRouteVersions } from './resolve-route-versions.js';

function controllerMetadata(overrides: Partial<ControllerMetadata> = {}): ControllerMetadata {
  return {
    path: '/users',
    version: undefined,
    tags: [],
    group: undefined,
    scope: 'singleton',
    ...overrides,
  };
}

function routeDefinition(overrides: Partial<RouteDefinition> = {}): RouteDefinition {
  return {
    method: 'GET',
    handlerName: 'handle',
    path: '/',
    middleware: [],
    ...overrides,
  };
}

describe('resolveRouteVersions', () => {
  it('returns an empty array when neither the route nor the controller declares a version', () => {
    expect(resolveRouteVersions(routeDefinition(), controllerMetadata())).toEqual([]);
  });

  it("falls back to the controller's @Version when the route declares none", () => {
    expect(resolveRouteVersions(routeDefinition(), controllerMetadata({ version: '1' }))).toEqual([
      '1',
    ]);
  });

  it("uses the route's own version, overriding the controller's entirely", () => {
    expect(
      resolveRouteVersions(routeDefinition({ version: '2' }), controllerMetadata({ version: '1' })),
    ).toEqual(['2']);
  });

  it('normalizes a single string version into a one-element array', () => {
    expect(resolveRouteVersions(routeDefinition({ version: '1' }), controllerMetadata())).toEqual([
      '1',
    ]);
  });

  it('passes through an array version unchanged', () => {
    expect(
      resolveRouteVersions(routeDefinition({ version: ['1', '2'] }), controllerMetadata()),
    ).toEqual(['1', '2']);
  });
});
