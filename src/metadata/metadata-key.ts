/**
 * A type-safe, unique metadata key.
 *
 * `MetadataKey<T>` is a branded `symbol` — at runtime it is a plain `symbol` (cheap to use as a
 * `Map`/`WeakMap` key), but at the type level it carries the type `T` of the value stored under
 * it. This lets `MetadataStorage`/`MetadataReader`/`MetadataWriter` infer the correct value type
 * for every `get`/`set` call without callers ever writing an explicit type argument.
 */
export type MetadataKey<T> = symbol & { readonly __metadataValueType?: T };

/**
 * Creates a new, globally unique `MetadataKey<T>`.
 *
 * Each call produces a distinct symbol, so keys never collide even if two subsystems choose the
 * same human-readable description (e.g. two independent `createMetadataKey('routes')` calls in
 * different modules are never confused with each other).
 *
 * @param description - A human-readable label, surfaced in debugging tools (`symbol.toString()`)
 *   and error messages. Convention: `'<namespace>:<name>'`, e.g. `'route:path'`.
 */
export function createMetadataKey<T>(description: string): MetadataKey<T> {
  return Symbol(description);
}
