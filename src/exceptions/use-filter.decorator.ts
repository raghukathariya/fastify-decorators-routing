import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import type { ExceptionFilterLike } from './exception-filter.types.js';

/** Class-level: filters contributed by every `@UseFilter()` applied to the controller itself. */
export const CONTROLLER_FILTERS_METADATA_KEY = createMetadataKey<ExceptionFilterLike[]>(
  'exceptions:controller-filters',
);

/** Member-level: filters contributed by every `@UseFilter()` applied to a specific route method. */
export const ROUTE_FILTERS_METADATA_KEY = createMetadataKey<ExceptionFilterLike[]>(
  'exceptions:route-filters',
);

/**
 * Attaches one or more exception filters to a controller (every route in it) or to one specific
 * route method. See `handleException` for resolution order: route-level filters are tried first,
 * then controller-level, then global (`registerControllers({ filters })`) — the first filter
 * whose `@Catch()` types match (or which has none, meaning catch-all) handles the exception.
 *
 * Usable on both a controller class and a route method, the same way `@Use`/`@UseGuard`/
 * `@UseInterceptor` are. Composes via inheritance and across repeated applications (`'merge-array'`).
 */
export function UseFilter(
  ...filters: readonly ExceptionFilterLike[]
): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: MemberKey) => {
    if (propertyKey === undefined) {
      const ctor = target as unknown as AnyConstructor;
      for (const filter of filters) {
        globalMetadataRegistry.writer.appendClassMetadata(
          ctor,
          CONTROLLER_FILTERS_METADATA_KEY,
          filter,
        );
      }
      return;
    }
    for (const filter of filters) {
      globalMetadataRegistry.writer.appendMemberMetadata(
        target,
        propertyKey,
        ROUTE_FILTERS_METADATA_KEY,
        filter,
      );
    }
  };
}

/** Every controller-level filter on `target`, including inherited, root-first. */
export function getControllerFilters(target: AnyConstructor): readonly ExceptionFilterLike[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, CONTROLLER_FILTERS_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}

/** Every route-level filter on `(prototype, member)`, including inherited, root-first. */
export function getRouteFilters(
  prototype: object,
  member: MemberKey,
): readonly ExceptionFilterLike[] {
  return (
    globalMetadataRegistry.reader.getMemberMetadata(prototype, member, ROUTE_FILTERS_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}
