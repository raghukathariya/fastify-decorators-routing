import type { ControllerMetadata } from '../decorators/controller-metadata.js';
import type { RouteDefinition } from '../decorators/http-method.types.js';
import type { VersionValue } from '../decorators/version.decorator.js';

function normalize(value: VersionValue | undefined): readonly string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value as readonly string[];
  return [value as string];
}

/**
 * The version(s) `route` answers to: its own `@Get(path, { version })` if set (overriding the
 * controller entirely — not merged with it, matching `RouteOptions.version`'s own doc comment),
 * else the controller's `@Version`, else none (an empty array — an unversioned route).
 */
export function resolveRouteVersions(
  route: RouteDefinition,
  controllerMetadata: ControllerMetadata,
): readonly string[] {
  return normalize(route.version ?? controllerMetadata.version);
}
