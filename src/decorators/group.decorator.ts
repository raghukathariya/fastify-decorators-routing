import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor } from '../types/constructor.type.js';

/**
 * Class-level: the logical group name declared via `@Group`. A controller belongs to exactly one
 * group, so — unlike `@Tag` — this is read with the `'override'` strategy: a subclass's own
 * `@Group` replaces an inherited one rather than combining with it.
 */
export const GROUP_METADATA_KEY = createMetadataKey<string>('decorators:group');

/**
 * Assigns a controller to a named logical group, for organizing route output (the route printer
 * in Phase 22) or applying shared behavior keyed by group name in later phases.
 */
export function Group(name: string): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as AnyConstructor;
    globalMetadataRegistry.writer.setClassMetadata(ctor, GROUP_METADATA_KEY, name);
  };
}

/** The group declared on `target` via `@Group`, own or inherited. */
export function getGroup(target: AnyConstructor): string | undefined {
  return globalMetadataRegistry.reader.getClassMetadata(target, GROUP_METADATA_KEY, {
    strategy: 'override',
  });
}
