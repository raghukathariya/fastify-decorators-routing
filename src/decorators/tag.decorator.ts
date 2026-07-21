import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor } from '../types/constructor.type.js';

/**
 * Class-level: accumulated tags contributed by every `@Tag()` application, own and inherited.
 * Primarily documentation metadata, consumed by the Swagger integration in Phase 19
 * (`@ApiTags`-style grouping), but recorded generically here so it's available to any consumer.
 */
export const TAG_METADATA_KEY = createMetadataKey<string[]>('decorators:tag');

/**
 * Attaches one or more free-form tags to a controller, for documentation/grouping purposes.
 * Composes via inheritance and across repeated applications — every tag from every `@Tag()` call
 * on this class and its ancestors is kept, via the `'merge-array'` strategy.
 */
export function Tag(...tags: readonly string[]): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as AnyConstructor;
    for (const tag of tags) {
      globalMetadataRegistry.writer.appendClassMetadata(ctor, TAG_METADATA_KEY, tag);
    }
  };
}

/** Every tag declared on `target`, including inherited ones, root ancestor first. */
export function getTags(target: AnyConstructor): readonly string[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, TAG_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}
