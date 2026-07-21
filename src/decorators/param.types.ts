import type { AnyConstructor } from '../types/constructor.type.js';

/**
 * Which part of the request (or response) a `@Body`/`@Query`/.../`@Session` parameter pulls its
 * value from.
 */
export type ParamExtractorType =
  | 'body'
  | 'query'
  | 'param'
  | 'headers'
  | 'req'
  | 'res'
  | 'cookies'
  | 'ip'
  | 'hostname'
  | 'session';

/** Context handed to a parameter's `transform` function alongside the raw extracted value. */
export interface ParamExtractionContext {
  readonly type: ParamExtractorType;
  readonly key?: string;
  /** The parameter's declared TypeScript type, if TypeScript emitted design-time metadata for it. */
  readonly designType?: AnyConstructor;
}

/**
 * Applied to an extracted parameter value before it is passed to the handler. The seam Phase 14's
 * validation pipe builds on: nothing stops using it today for ad-hoc per-parameter validation or
 * coercion (throwing to reject a request, or returning a converted value).
 */
export type ParamTransform<T = unknown> = (value: unknown, context: ParamExtractionContext) => T;

export interface ParamOptions {
  /** Custom transform/validation applied to the extracted value before injection. */
  transform?: ParamTransform;
}

/** Options for a parameter decorator that can extract either a whole object or a single key from it. */
export interface KeyedParamOptions extends ParamOptions {
  /** Extracts this single key from the source object rather than the whole object. */
  key?: string;
  /**
   * Opts out of automatic DTO validation/transformation (Phase 14) for this parameter. Defaults
   * to `true` (validation runs) whenever the parameter's declared type is a plausible DTO class;
   * has no effect otherwise, since there's nothing to validate.
   */
  validate?: boolean;
}

/** The fully resolved definition recorded for one `@Body`/`@Query`/.../`@Session` parameter. */
export interface ParamDefinition {
  readonly index: number;
  readonly type: ParamExtractorType;
  readonly key?: string;
  readonly transform?: ParamTransform;
  readonly validate?: boolean;
}
