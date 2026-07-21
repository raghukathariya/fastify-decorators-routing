import type { RouteMiddleware } from '../decorators/http-method.types.js';
import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';

/** Class-level: middleware contributed by every `@Use()` applied to the controller itself. */
export const CONTROLLER_MIDDLEWARE_METADATA_KEY =
  createMetadataKey<RouteMiddleware[]>('middlewares:controller');

/** Member-level: middleware contributed by every `@Use()` applied to a specific route method. */
export const ROUTE_USE_MIDDLEWARE_METADATA_KEY =
  createMetadataKey<RouteMiddleware[]>('middlewares:route');

/**
 * Attaches middleware — functions with the same signature as a Fastify `preHandler` hook — to a
 * controller (every route in it) or to one specific route method.
 *
 * Usable on both: `@Use(mw)` above a controller class contributes *controller middleware*,
 * run for every route in it; `@Use(mw)` above a route method contributes *route middleware*, run
 * only for that route. Composes via inheritance and across repeated applications, the same way
 * `@Tag`/`@Prefix` do (`'merge-array'`).
 *
 * See `registerControllerRoutes` (Phase 9/10) for the full, authoritative execution order this
 * composes into: global middleware (`registerControllers({ middleware })`) → controller `@Use` →
 * route `hooks.preHandler` → route `@Use` → route `{ middleware }` option → guards (Phase 11) →
 * interceptors (Phase 12) → the handler itself.
 */
export function Use(...middleware: readonly RouteMiddleware[]): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: MemberKey) => {
    if (propertyKey === undefined) {
      const ctor = target as unknown as AnyConstructor;
      for (const mw of middleware) {
        globalMetadataRegistry.writer.appendClassMetadata(
          ctor,
          CONTROLLER_MIDDLEWARE_METADATA_KEY,
          mw,
        );
      }
      return;
    }
    for (const mw of middleware) {
      globalMetadataRegistry.writer.appendMemberMetadata(
        target,
        propertyKey,
        ROUTE_USE_MIDDLEWARE_METADATA_KEY,
        mw,
      );
    }
  };
}

/** Every controller-level `@Use()` middleware on `target`, including inherited, root-first. */
export function getControllerMiddleware(target: AnyConstructor): readonly RouteMiddleware[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, CONTROLLER_MIDDLEWARE_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}

/** Every route-level `@Use()` middleware on `(prototype, member)`, including inherited, root-first. */
export function getRouteUseMiddleware(
  prototype: object,
  member: MemberKey,
): readonly RouteMiddleware[] {
  return (
    globalMetadataRegistry.reader.getMemberMetadata(
      prototype,
      member,
      ROUTE_USE_MIDDLEWARE_METADATA_KEY,
      {
        strategy: 'merge-array',
      },
    ) ?? []
  );
}
