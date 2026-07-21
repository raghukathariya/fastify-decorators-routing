import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import type { Guard } from './guard.types.js';

/** Class-level: guards contributed by every `@UseGuard()` applied to the controller itself. */
export const CONTROLLER_GUARDS_METADATA_KEY = createMetadataKey<Guard[]>('guards:controller');

/** Member-level: guards contributed by every `@UseGuard()` applied to a specific route method. */
export const ROUTE_GUARDS_METADATA_KEY = createMetadataKey<Guard[]>('guards:route');

/**
 * Attaches one or more guards to a controller (every route in it) or to one specific route
 * method. A guard's `canActivate` runs before the route handler (after middleware — see
 * `runGuards`'s doc comment for the full pipeline); if *any* guard rejects the request (returns
 * `false`), the handler never runs and the response is `403 Forbidden`.
 *
 * Usable on both a controller class and a route method, the same way `@Use` is. Composes via
 * inheritance and across repeated applications (`'merge-array'`).
 */
export function UseGuard(...guards: readonly Guard[]): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: MemberKey) => {
    if (propertyKey === undefined) {
      const ctor = target as unknown as AnyConstructor;
      for (const guard of guards) {
        globalMetadataRegistry.writer.appendClassMetadata(
          ctor,
          CONTROLLER_GUARDS_METADATA_KEY,
          guard,
        );
      }
      return;
    }
    for (const guard of guards) {
      globalMetadataRegistry.writer.appendMemberMetadata(
        target,
        propertyKey,
        ROUTE_GUARDS_METADATA_KEY,
        guard,
      );
    }
  };
}

/** Every controller-level guard on `target`, including inherited, root-first. */
export function getControllerGuards(target: AnyConstructor): readonly Guard[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, CONTROLLER_GUARDS_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}

/** Every route-level guard on `(prototype, member)`, including inherited, root-first. */
export function getRouteGuards(prototype: object, member: MemberKey): readonly Guard[] {
  return (
    globalMetadataRegistry.reader.getMemberMetadata(prototype, member, ROUTE_GUARDS_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}
