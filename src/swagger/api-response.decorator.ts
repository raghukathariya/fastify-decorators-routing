import type { RouteResponseOption } from '../decorators/http-method.types.js';
import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { MemberKey } from '../types/constructor.type.js';

/** Member-level: documented responses contributed by every `@ApiResponse()` applied to a route,
 *  in addition to whatever `@Get(path, { response })` already declared inline. */
export const API_RESPONSES_METADATA_KEY =
  createMetadataKey<RouteResponseOption[]>('swagger:responses');

/**
 * Documents one additional response a route can return — same shape as the `response` option on
 * `@Get`/`@Post`/..., just as its own decorator for callers who'd rather not inline it. Reusing
 * `RouteResponseOption` (rather than a parallel type) keeps the two mechanisms interchangeable:
 * `buildSwaggerSchema` merges both into the same `schema.response` map. Composes across repeated
 * applications and inheritance (`'merge-array'`) — a route commonly documents more than one
 * possible response.
 */
export function ApiResponse(options: RouteResponseOption): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    globalMetadataRegistry.writer.appendMemberMetadata(
      target,
      propertyKey,
      API_RESPONSES_METADATA_KEY,
      options,
    );
  };
}

/** Every `@ApiResponse()` on `(prototype, member)`, including inherited, root-first. */
export function getApiResponses(
  prototype: object,
  member: MemberKey,
): readonly RouteResponseOption[] {
  return (
    globalMetadataRegistry.reader.getMemberMetadata(prototype, member, API_RESPONSES_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}
