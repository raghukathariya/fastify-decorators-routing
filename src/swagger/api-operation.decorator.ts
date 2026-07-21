import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { MemberKey } from '../types/constructor.type.js';
import type { ApiOperationOptions } from './swagger.types.js';

/** Member-level: the `@ApiOperation()` config declared on one route. A subclass's own
 *  `@ApiOperation` replaces an inherited one (`'override'`) rather than merging with it — it's a
 *  single description of "this operation," not an accumulating list. */
export const API_OPERATION_METADATA_KEY =
  createMetadataKey<ApiOperationOptions>('swagger:operation');

/**
 * Documents a route's Swagger operation: `summary`, `description`, `deprecated`, `operationId`.
 * The same information (minus `operationId`, which has no equivalent) can also be set inline via
 * `@Get(path, { summary, description, deprecated })`; when both are present for the same route,
 * `@ApiOperation`'s value wins field-by-field — the route option is the base default,
 * `@ApiOperation` refines it further.
 */
export function ApiOperation(options: ApiOperationOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    globalMetadataRegistry.writer.setMemberMetadata(
      target,
      propertyKey,
      API_OPERATION_METADATA_KEY,
      options,
    );
  };
}

/** The `@ApiOperation` config declared on `(prototype, member)`, own or inherited. */
export function getApiOperation(
  prototype: object,
  member: MemberKey,
): ApiOperationOptions | undefined {
  return globalMetadataRegistry.reader.getMemberMetadata(
    prototype,
    member,
    API_OPERATION_METADATA_KEY,
  );
}
