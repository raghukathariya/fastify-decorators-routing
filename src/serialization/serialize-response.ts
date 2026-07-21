import { instanceToPlain, plainToInstance } from 'class-transformer';
import type { SerializationConfig } from './serialization.types.js';

/**
 * Applies `config` (from `@SerializeWith`) to `value`: transforms it into an instance of
 * `config.dtoClass` and back out to a plain object, respecting `@Expose`/`@Exclude`/`@Transform`.
 * Works for a single object or an array of them — `class-transformer` handles both natively, so
 * a list-returning route serializes every element the same way a single-object route does.
 *
 * A no-op when there's no config, or the value is nullish (nothing meaningful to serialize).
 */
export function serializeResponse(
  value: unknown,
  config: SerializationConfig | undefined,
): unknown {
  if (!config || value === null || value === undefined) return value;

  const transformOptions = {
    excludeExtraneousValues: config.options.excludeExtraneousValues ?? true,
    ...(config.options.groups ? { groups: [...config.options.groups] } : {}),
  };

  const instance = plainToInstance(config.dtoClass as new () => object, value, transformOptions);
  return instanceToPlain(instance, transformOptions);
}
