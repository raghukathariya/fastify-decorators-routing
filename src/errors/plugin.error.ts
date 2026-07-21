import { FrameworkError } from './framework.error.js';

/**
 * Thrown by `registerControllers` (`src/plugin`) for registration-time failures: a route that
 * Fastify itself rejected (a duplicate path, an invalid schema), or a controller that failed to
 * resolve from the DI container. Always thrown while an application is starting up, at
 * `fastify.register(registerControllers, ...)` — never for errors raised by a handler while
 * serving a request; those are surfaced through Fastify's own error handling (and, from Phase 13
 * onward, exception filters), not wrapped here.
 */
export class PluginError extends FrameworkError {
  public readonly code = 'PLUGIN_ERROR';

  public static routeRegistrationFailed(
    controllerName: string,
    method: string,
    path: string,
    cause: unknown,
  ): PluginError {
    return new PluginError(
      `Failed to register ${method} ${path} from ${controllerName}: ${String(
        cause instanceof Error ? cause.message : cause,
      )}`,
      { cause },
    );
  }

  public static controllerResolutionFailed(controllerName: string, cause: unknown): PluginError {
    return new PluginError(
      `Failed to resolve controller '${controllerName}' from the DI container: ${String(
        cause instanceof Error ? cause.message : cause,
      )}. Make sure every dependency it requires is registered on the container passed to ` +
        'registerControllers (or on the default one, if none was passed).',
      { cause },
    );
  }
}
