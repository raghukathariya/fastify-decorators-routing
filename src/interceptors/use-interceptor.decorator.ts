import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import type { InterceptorLike } from './interceptor.types.js';

/** Class-level: interceptors contributed by every `@UseInterceptor()` on the controller itself. */
export const CONTROLLER_INTERCEPTORS_METADATA_KEY =
  createMetadataKey<InterceptorLike[]>('interceptors:controller');

/** Member-level: interceptors contributed by every `@UseInterceptor()` on a specific route method. */
export const ROUTE_INTERCEPTORS_METADATA_KEY =
  createMetadataKey<InterceptorLike[]>('interceptors:route');

/**
 * Attaches one or more interceptors to a controller (every route in it) or to one specific route
 * method. Interceptors wrap the guarded, DI-resolved call to the route handler — see
 * `composeInterceptors` for how the chain is built and `Interceptor`'s doc comment for what an
 * interceptor can do with it.
 *
 * Usable on both a controller class and a route method, the same way `@Use`/`@UseGuard` are.
 * Composes via inheritance and across repeated applications (`'merge-array'`). Controller-level
 * interceptors wrap route-level ones — see `getInterceptorChain`.
 */
export function UseInterceptor(
  ...interceptors: readonly InterceptorLike[]
): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: MemberKey) => {
    if (propertyKey === undefined) {
      const ctor = target as unknown as AnyConstructor;
      for (const interceptor of interceptors) {
        globalMetadataRegistry.writer.appendClassMetadata(
          ctor,
          CONTROLLER_INTERCEPTORS_METADATA_KEY,
          interceptor,
        );
      }
      return;
    }
    for (const interceptor of interceptors) {
      globalMetadataRegistry.writer.appendMemberMetadata(
        target,
        propertyKey,
        ROUTE_INTERCEPTORS_METADATA_KEY,
        interceptor,
      );
    }
  };
}

/** Every controller-level interceptor on `target`, including inherited, root-first. */
export function getControllerInterceptors(target: AnyConstructor): readonly InterceptorLike[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, CONTROLLER_INTERCEPTORS_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}

/** Every route-level interceptor on `(prototype, member)`, including inherited, root-first. */
export function getRouteInterceptors(
  prototype: object,
  member: MemberKey,
): readonly InterceptorLike[] {
  return (
    globalMetadataRegistry.reader.getMemberMetadata(
      prototype,
      member,
      ROUTE_INTERCEPTORS_METADATA_KEY,
      {
        strategy: 'merge-array',
      },
    ) ?? []
  );
}
