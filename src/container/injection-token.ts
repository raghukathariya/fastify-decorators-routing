import type { AbstractConstructor, Constructor } from '../types/constructor.type.js';

/**
 * A type-safe, unique token for a dependency that isn't naturally identified by a class — a
 * configuration value, a primitive, or an interface with no runtime representation.
 *
 * Like `MetadataKey<T>` (see `src/metadata/metadata-key.ts`), this is a branded `symbol`: cheap
 * at runtime, and carries `T` at the type level so `Container.resolve` returns the correct type
 * without an explicit type argument at every call site.
 */
export type InjectionToken<T> = symbol & { readonly __injectionValueType?: T };

/**
 * Creates a new, globally unique `InjectionToken<T>`.
 *
 * @param description - A human-readable label, surfaced in `Container` error messages and
 *   debugging tools. Convention: `'<namespace>:<name>'`, e.g. `'config:database-url'`.
 */
export function createInjectionToken<T>(description: string): InjectionToken<T> {
  return Symbol(description);
}

/**
 * Anything that can identify a provider in the container: an explicit `InjectionToken<T>`, or a
 * class used directly as its own token (the common case — `container.resolve(UserService)`).
 */
export type ProviderToken<T> = InjectionToken<T> | Constructor<T> | AbstractConstructor<T>;
