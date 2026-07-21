import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor } from '../types/constructor.type.js';
import type { Scope } from './provider.types.js';

export interface InjectableOptions {
  /** The provider scope to use when this class is registered without an explicit `scope`. */
  scope?: Scope;
}

/**
 * Class-level metadata key backing `@Injectable()`. Exported (rather than kept module-private)
 * so other subsystems — the Fastify plugin's controller auto-registration in Phase 9, for
 * instance — can check `isInjectable`/`getInjectableOptions` without re-deriving the key.
 */
export const INJECTABLE_METADATA_KEY = createMetadataKey<InjectableOptions>('container:injectable');

/**
 * Marks a class as available for constructor/property injection by the `Container`.
 *
 * This decorator's runtime effect on the class itself is minimal (it records `options`), but its
 * presence is what makes TypeScript's `emitDecoratorMetadata` output exist at all:
 * `design:paramtypes` is only emitted for a class that carries at least one decorator (see
 * `design-type-reader.ts`). Without `@Injectable()` (or some other decorator), the container has
 * no way to infer constructor parameter types and every parameter would need an explicit
 * `@Inject(token)`.
 */
export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as AnyConstructor;
    globalMetadataRegistry.writer.setClassMetadata(ctor, INJECTABLE_METADATA_KEY, {
      scope: options.scope ?? 'singleton',
    });
  };
}

/** Whether `target` was decorated with `@Injectable()` (does not check ancestor classes). */
export function isInjectable(target: AnyConstructor): boolean {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, INJECTABLE_METADATA_KEY, {
      inherit: false,
    }) !== undefined
  );
}

/** The `@Injectable()` options declared directly on `target`, if any. */
export function getInjectableOptions(target: AnyConstructor): InjectableOptions | undefined {
  return globalMetadataRegistry.reader.getClassMetadata(target, INJECTABLE_METADATA_KEY, {
    inherit: false,
  });
}
