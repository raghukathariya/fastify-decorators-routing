import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { MemberKey } from '../types/constructor.type.js';

/** Member-level: route-specific Swagger tags contributed by every `@ApiTags()` applied to a
 *  route method — combined with the controller's own `@Tag()`s (which cover "every route in a
 *  controller"; there's no controller-level `@ApiTags` for the same reason there's no
 *  controller-level `@SerializeWith` — `@Tag` already does that job). */
export const ROUTE_API_TAGS_METADATA_KEY = createMetadataKey<string[]>('swagger:tags:route');

/**
 * Adds one or more Swagger tags to a specific route, in addition to whatever `@Tag()` the
 * controller carries. Composes across repeated applications and inheritance (`'merge-array'`),
 * the same way `@Tag` does at the controller level.
 */
export function ApiTags(...tags: readonly string[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    for (const tag of tags) {
      globalMetadataRegistry.writer.appendMemberMetadata(
        target,
        propertyKey,
        ROUTE_API_TAGS_METADATA_KEY,
        tag,
      );
    }
  };
}

/** Every `@ApiTags()` tag on `(prototype, member)`, including inherited, root-first. */
export function getRouteApiTags(prototype: object, member: MemberKey): readonly string[] {
  return (
    globalMetadataRegistry.reader.getMemberMetadata(
      prototype,
      member,
      ROUTE_API_TAGS_METADATA_KEY,
      {
        strategy: 'merge-array',
      },
    ) ?? []
  );
}
