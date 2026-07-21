import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { Constructor, MemberKey } from '../types/constructor.type.js';
import type { SerializationConfig, SerializationOptions } from './serialization.types.js';

/** Member-level: the response serialization config declared on one route via `@SerializeWith`. */
export const SERIALIZATION_CONFIG_METADATA_KEY =
  createMetadataKey<SerializationConfig>('serialization:config');

/**
 * Serializes a route's return value through `dtoClass` before Fastify sends it:
 * `plainToInstance(dtoClass, result)` followed by `instanceToPlain(...)`, respecting whatever
 * `@Expose`/`@Exclude`/`@Transform` decorators (from `class-transformer`, re-exported by this
 * package) `dtoClass` carries.
 *
 * ```ts
 * class UserResponseDto {
 *   @Expose() id!: string;
 *   @Expose() name!: string;
 *   // passwordHash is not @Expose()d, so it never reaches the response.
 * }
 *
 * class UserController {
 *   @Get('/:id')
 *   @SerializeWith(UserResponseDto)
 *   getUser(@Param('id') id: string) {
 *     return this.userService.findById(id); // a full User entity, passwordHash and all
 *   }
 * }
 * ```
 */
export function SerializeWith(
  dtoClass: Constructor<unknown>,
  options: SerializationOptions = {},
): MethodDecorator {
  return (target, propertyKey) => {
    globalMetadataRegistry.writer.setMemberMetadata(
      target,
      propertyKey,
      SERIALIZATION_CONFIG_METADATA_KEY,
      {
        dtoClass,
        options,
      },
    );
  };
}

/** The `@SerializeWith` config declared on `(prototype, member)`, own or inherited. */
export function getSerializationConfig(
  prototype: object,
  member: MemberKey,
): SerializationConfig | undefined {
  return globalMetadataRegistry.reader.getMemberMetadata(
    prototype,
    member,
    SERIALIZATION_CONFIG_METADATA_KEY,
  );
}
