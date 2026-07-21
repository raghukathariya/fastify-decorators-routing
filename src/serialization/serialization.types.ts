import type { Constructor } from '../types/constructor.type.js';

export interface SerializationOptions {
  /** Only include properties `@Expose`d (or `@Exclude`d) for one of these groups. */
  groups?: readonly string[];
  /**
   * Only include properties explicitly `@Expose()`d, dropping everything else. Defaults to
   * `true` — the common case for a response DTO, where every field you want returned is
   * `@Expose()`d and everything else (internal fields, a password hash, ...) is dropped by
   * default rather than needing an explicit `@Exclude()` on each one.
   */
  excludeExtraneousValues?: boolean;
}

/** The fully resolved serialization config recorded for one route via `@SerializeWith`. */
export interface SerializationConfig {
  readonly dtoClass: Constructor<unknown>;
  readonly options: SerializationOptions;
}
