import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Container } from '../container/container.js';
import { PluginError } from '../errors/plugin.error.js';
import { RouteRegistry } from '../router/route-registry.js';
import { ControllerRegistry } from '../scanner/controller-registry.js';
import { scanControllers } from '../scanner/controller-scanner.js';
import type { Constructor } from '../types/constructor.type.js';
import { withoutUndefinedValues } from '../utils/object.util.js';
import { joinPaths } from '../utils/path.util.js';
import { createMediaTypeVersionConstraint } from '../versioning/media-type-constraint.js';
import type { RegisterControllersOptions } from './plugin.types.js';
import { RequestScopeManager } from './request-scope.js';
import { registerControllerRoutes } from './route-registration.js';

async function registerEverything(
  fastify: FastifyInstance,
  options: RegisterControllersOptions,
  routeRegistry: RouteRegistry,
): Promise<void> {
  const container = options.container ?? new Container();
  const requestScopes = new RequestScopeManager(container);

  fastify.addHook('onResponse', (request: FastifyRequest) => {
    requestScopes.dispose(request);
  });

  // Global middleware: added on this (outer) context so it runs before every controller's own
  // `@Use` middleware, which is added on each controller's nested encapsulation context — see
  // registerControllerRoutes. Fastify runs ancestor-context hooks before descendant ones within
  // the same phase, which is exactly the "global → controller → route" ordering this needs.
  for (const mw of options.middleware ?? []) {
    fastify.addHook('preHandler', mw);
  }

  const discovered = await scanControllers(
    withoutUndefinedValues({
      controllers: options.controllers,
      patterns: options.patterns,
      cwd: options.cwd,
    }),
  );

  const registry = new ControllerRegistry();
  registry.registerAll(discovered);

  for (const [controller, metadata] of registry.getAll()) {
    // Every controller the scanner/registry accepts is necessarily a concrete, instantiable
    // class (an abstract class could never be constructed as a controller instance), even though
    // `ControllerRegistry` stores the broader `AnyConstructor` for generality.
    container.ensureRegistered(controller as Constructor<unknown>);

    const resolvedMetadata = options.globalPrefix
      ? { ...metadata, path: joinPaths(options.globalPrefix, metadata.path) }
      : metadata;

    try {
      // Eagerly resolve now (result discarded — for 'singleton' this is exactly the instance
      // requests will reuse; for 'transient' it's a one-time throwaway) so a broken DI graph
      // (a missing provider, a circular dependency) fails at startup, not on a controller's
      // first incoming request. 'scoped' controllers have no request to scope to yet, so their
      // dependencies can only be validated once real traffic arrives.
      if (resolvedMetadata.scope !== 'scoped') {
        container.resolve(controller);
      }
      await registerControllerRoutes(
        fastify,
        container,
        controller,
        resolvedMetadata,
        requestScopes,
        options.filters,
        routeRegistry,
        options.versioning,
      );
    } catch (cause) {
      if (cause instanceof PluginError) throw cause;
      throw PluginError.controllerResolutionFailed(controller.name, cause);
    }
  }
}

/**
 * Discovers controllers (`options.controllers` and/or `options.patterns`, via `scanControllers`
 * — Phase 8), resolves each one's metadata, and registers every one of its `@Get`/`@Post`/...
 * routes on `fastify`.
 *
 * A standard Fastify plugin — register it the usual way:
 * ```ts
 * import 'reflect-metadata';
 * import Fastify from 'fastify';
 * import { registerControllers, getRouteRegistry } from 'fastify-decorators-routing';
 *
 * const app = Fastify();
 * await app.register(registerControllers, { controllers: [UserController] });
 * getRouteRegistry(app).url('user.detail', { id: '42' }); // '/users/42'
 * ```
 *
 * Controllers are auto-registered on the DI container (`options.container`, or a fresh one if
 * omitted) if not already present — but only the controller classes themselves. Register their
 * dependencies on that same container yourself, before or via `options.container`, the same way
 * you would for any other DI-managed class.
 *
 * Marked with Fastify's `skip-override` symbol (the same mechanism the `fastify-plugin` package
 * wraps) so the `routeRegistry` decoration lands on `fastify` itself — the instance the caller
 * holds a reference to — rather than on a private encapsulated child only this function could
 * see; Fastify decorations flow from parent to child, never the reverse, so without this a
 * caller's `getRouteRegistry(app)` right after `await app.register(registerControllers, ...)`
 * would never find it. Everything *else* (the `onResponse` hook, global middleware, each
 * controller's own registration) still runs inside a nested, ordinarily-encapsulated
 * `fastify.register()` call, so two separate `registerControllers` calls under the same parent
 * remain isolated from each other exactly as before — only the decoration escapes encapsulation.
 */
export async function registerControllers(
  fastify: FastifyInstance,
  options: RegisterControllersOptions = {},
): Promise<void> {
  const routeRegistry = new RouteRegistry();
  fastify.decorate('routeRegistry', routeRegistry);

  // The underlying router (find-my-way) is shared across every encapsulation context on this
  // Fastify instance regardless of where `addConstraintStrategy` is called from, so this can
  // safely run here rather than inside the isolated inner registration — but it must still be
  // guarded: a second `registerControllers` call configured for `'media-type'` versioning on the
  // same instance would otherwise throw ("already exists a custom constraint...").
  if (
    options.versioning?.type === 'media-type' &&
    !fastify.hasConstraintStrategy('mediaTypeVersion')
  ) {
    fastify.addConstraintStrategy(
      createMediaTypeVersionConstraint(options.versioning.mediaTypeParam),
    );
  }

  await fastify.register(async (instance) => {
    await registerEverything(instance, options, routeRegistry);
  });
}
// `Symbol.for('skip-override')` is Fastify's own (undocumented but stable, `fastify-plugin`
// package's underlying) mechanism for opting a plugin function out of its own encapsulation
// boundary — see the doc comment above for why this function needs it.
(registerControllers as unknown as Record<symbol, boolean>)[Symbol.for('skip-override')] = true;
