import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor } from '../types/constructor.type.js';

/**
 * Class-level: accumulated path segments contributed by every `@Prefix()` application, own and
 * inherited. Stored as an array and read with the `'merge-array'` strategy specifically so a
 * base class's prefix composes with a subclass's — see `getPrefixSegments`.
 */
export const PREFIX_METADATA_KEY = createMetadataKey<string[]>('decorators:prefix');

/**
 * Adds a path segment that every route in this controller (and any subclass controller) is
 * mounted under, ahead of the controller's own `@Controller(path)`.
 *
 * Distinct from `@Controller`'s own `path` so that a shared prefix can be declared once — on a
 * base class, or on several sibling controllers — independently of each controller's own path.
 * Composes via inheritance: a subclass's `@Prefix` is appended after its ancestors', and
 * `@Prefix` may be applied more than once on the same class to build up multiple segments.
 *
 * @example
 * ```ts
 * @Prefix('/api')
 * abstract class ApiController {}
 *
 * @Prefix('/v1')
 * @Controller('/users')
 * class UserController extends ApiController {}
 * // Resolved base path: /api/v1/users
 * ```
 */
export function Prefix(path: string): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as AnyConstructor;
    globalMetadataRegistry.writer.appendClassMetadata(ctor, PREFIX_METADATA_KEY, path);
  };
}

/** Every `@Prefix` segment declared on `target`, including inherited ones, root ancestor first. */
export function getPrefixSegments(target: AnyConstructor): readonly string[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, PREFIX_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}
