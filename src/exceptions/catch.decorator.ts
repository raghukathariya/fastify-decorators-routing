import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, Constructor } from '../types/constructor.type.js';

/** Class-level: the exception types an `ExceptionFilter` class declared with `@Catch()` handles. */
export const CAUGHT_EXCEPTION_TYPES_METADATA_KEY =
  createMetadataKey<Constructor<unknown>[]>('exceptions:caught-types');

/**
 * Declares which exception type(s) a filter class handles. Applied to a class implementing
 * `ExceptionFilter`, not to a controller or route — attach the filter itself to a controller,
 * route, or globally with `@UseFilter()`/`registerControllers({ filters })`.
 *
 * `@Catch()` with no arguments handles every exception type (a catch-all filter). `@Catch(A, B)`
 * handles instances of `A` or `B` (checked via `instanceof`, so subclasses match too).
 */
export function Catch(...exceptionTypes: readonly Constructor<unknown>[]): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as AnyConstructor;
    globalMetadataRegistry.writer.setClassMetadata(ctor, CAUGHT_EXCEPTION_TYPES_METADATA_KEY, [
      ...exceptionTypes,
    ]);
  };
}

/** The exception types `target` declared with `@Catch()`. Empty means "catches everything." */
export function getCaughtExceptionTypes(target: AnyConstructor): readonly Constructor<unknown>[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, CAUGHT_EXCEPTION_TYPES_METADATA_KEY, {
      inherit: false,
    }) ?? []
  );
}
