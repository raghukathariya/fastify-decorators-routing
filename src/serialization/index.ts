// Re-exported from `class-transformer` for convenience — `@Expose`/`@Exclude` (with `groups`
// support built in) and `@Transform` are the decorators a response DTO class uses; `@Type` is
// what makes nested DTOs transform correctly (also used by the validation pipe, Phase 14).
export { Exclude, Expose, Transform, Type } from 'class-transformer';

export {
  SerializeWith,
  getSerializationConfig,
  SERIALIZATION_CONFIG_METADATA_KEY,
} from './serialize-with.decorator.js';
export { serializeResponse } from './serialize-response.js';
export type { SerializationConfig, SerializationOptions } from './serialization.types.js';
