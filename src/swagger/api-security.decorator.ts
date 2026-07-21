import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import type { ApiSecurityRequirement } from './swagger.types.js';

/** Class-level: security requirements contributed by every `@ApiSecurity()` applied to the
 *  controller itself — documents every route in it as requiring this security scheme. */
export const CONTROLLER_API_SECURITY_METADATA_KEY = createMetadataKey<ApiSecurityRequirement[]>(
  'swagger:security:controller',
);

/** Member-level: security requirements contributed by every `@ApiSecurity()` applied to a
 *  specific route method. */
export const ROUTE_API_SECURITY_METADATA_KEY =
  createMetadataKey<ApiSecurityRequirement[]>('swagger:security:route');

/**
 * Documents a security requirement (an OpenAPI security scheme name, e.g. `'bearerAuth'`, plus
 * the OAuth2/OIDC scopes it needs, if any) for a controller (every route in it) or a specific
 * route method — the same dual class/method dispatch `@UseGuard`/`@Use` use. Purely
 * documentation: pair it with the actual enforcement mechanism (`@Authenticated`/`@Roles`/...)
 * separately; `@ApiSecurity` on its own does not guard anything.
 *
 * Composes via inheritance and across repeated applications (`'merge-array'`) — a route can
 * require more than one security scheme.
 */
export function ApiSecurity(
  name: string,
  scopes: readonly string[] = [],
): ClassDecorator & MethodDecorator {
  const requirement: ApiSecurityRequirement = { name, scopes };
  return (target: object, propertyKey?: MemberKey) => {
    if (propertyKey === undefined) {
      const ctor = target as unknown as AnyConstructor;
      globalMetadataRegistry.writer.appendClassMetadata(
        ctor,
        CONTROLLER_API_SECURITY_METADATA_KEY,
        requirement,
      );
      return;
    }
    globalMetadataRegistry.writer.appendMemberMetadata(
      target,
      propertyKey,
      ROUTE_API_SECURITY_METADATA_KEY,
      requirement,
    );
  };
}

/** Every controller-level `@ApiSecurity()` requirement on `target`, including inherited,
 *  root-first. */
export function getControllerApiSecurity(
  target: AnyConstructor,
): readonly ApiSecurityRequirement[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, CONTROLLER_API_SECURITY_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}

/** Every route-level `@ApiSecurity()` requirement on `(prototype, member)`, including inherited,
 *  root-first. */
export function getRouteApiSecurity(
  prototype: object,
  member: MemberKey,
): readonly ApiSecurityRequirement[] {
  return (
    globalMetadataRegistry.reader.getMemberMetadata(
      prototype,
      member,
      ROUTE_API_SECURITY_METADATA_KEY,
      { strategy: 'merge-array' },
    ) ?? []
  );
}
