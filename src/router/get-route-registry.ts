import type { FastifyInstance } from 'fastify';
import { RouteError } from '../errors/route.error.js';
import { RouteRegistry } from './route-registry.js';

/**
 * Reads the `RouteRegistry` `registerControllers` decorated `fastify` with, avoiding an ambient
 * `FastifyInstance` augmentation that would collide with a consuming app's own — the same
 * approach `getRequestUser` takes for `request.user`.
 *
 * Throws if called before `registerControllers` has run on `fastify` (or an ancestor of it —
 * Fastify decorations are visible to every descendant encapsulation context).
 */
export function getRouteRegistry(fastify: FastifyInstance): RouteRegistry {
  const registry = fastify.hasDecorator('routeRegistry')
    ? fastify.getDecorator<RouteRegistry>('routeRegistry')
    : undefined;
  if (!(registry instanceof RouteRegistry)) {
    throw RouteError.registryNotAvailable();
  }
  return registry;
}
