import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor } from '../types/constructor.type.js';

/** One version string, or several if the controller answers to more than one API version. */
export type VersionValue = string | readonly string[];

export const VERSION_METADATA_KEY = createMetadataKey<VersionValue>('decorators:version');

/**
 * Declares which API version(s) this controller belongs to.
 *
 * Full URI/header/media-type version routing lands in Phase 20; this decorator only records the
 * declaration for now, using the `'override'` merge strategy — a subclass's own `@Version`
 * replaces (rather than combines with) an inherited one, since a controller answers to one
 * version declaration, not an accumulation of its ancestors'.
 */
export function Version(version: VersionValue): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as AnyConstructor;
    globalMetadataRegistry.writer.setClassMetadata(ctor, VERSION_METADATA_KEY, version);
  };
}

/** The version declared on `target` via `@Version`, own or inherited. */
export function getVersion(target: AnyConstructor): VersionValue | undefined {
  return globalMetadataRegistry.reader.getClassMetadata(target, VERSION_METADATA_KEY, {
    strategy: 'override',
  });
}
