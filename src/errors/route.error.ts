import { FrameworkError } from './framework.error.js';

/**
 * Thrown by `RouteRegistry` (`src/router`) — the named-route URL builder populated from each
 * route's `name` option. Distinct from `PluginError` because these failures aren't limited to
 * boot time: `RouteRegistry.url()` misuse (an unknown name, a missing `:param`) is just as
 * likely once an application is already serving traffic, e.g. building a redirect URL inside a
 * handler.
 */
export class RouteError extends FrameworkError {
  public readonly code = 'ROUTE_ERROR';

  public static duplicateRouteName(
    name: string,
    existingPath: string,
    conflictingPath: string,
  ): RouteError {
    return new RouteError(
      `Route name '${name}' is already registered for path '${existingPath}'; it cannot also ` +
        `be used for '${conflictingPath}'. Route names must be unique across every controller.`,
    );
  }

  public static unknownRouteName(name: string): RouteError {
    return new RouteError(
      `No route is registered under the name '${name}'. Check the 'name' option on the ` +
        "@Get/@Post/... decorator it's meant to refer to.",
    );
  }

  public static missingRouteParam(name: string, param: string, path: string): RouteError {
    return new RouteError(
      `Cannot build a URL for route '${name}' (${path}): missing required parameter '${param}'.`,
    );
  }

  public static registryNotAvailable(): RouteError {
    return new RouteError(
      'getRouteRegistry() was called before registerControllers registered one on this ' +
        'Fastify instance. Call it only after `await fastify.register(registerControllers, ...)`.',
    );
  }
}
