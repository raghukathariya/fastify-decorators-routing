import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { AnyConstructor } from '../types/constructor.type.js';
import { ValidationException } from './validation.error.js';

/** Design-time types that are never DTOs — validating/transforming them would be pointless. */
const NON_DTO_TYPES: ReadonlySet<unknown> = new Set([String, Number, Boolean, Array, Object]);

export interface ValidationPipeOptions {
  /** Strip properties with no class-validator decorator from the resulting instance. Defaults to `true`. */
  whitelist?: boolean;
  /** Reject the request if it contains properties with no class-validator decorator at all. Defaults to `false`. */
  forbidNonWhitelisted?: boolean;
}

/** Whether `designType` is a plausible DTO class — anything except the primitive wrapper types. */
export function isDtoType(designType: AnyConstructor | undefined): designType is AnyConstructor {
  return designType !== undefined && !NON_DTO_TYPES.has(designType);
}

/**
 * Transforms `value` into an instance of `designType` (via `class-transformer`'s
 * `plainToInstance`, so `@Type(() => Nested)`-annotated nested DTOs are constructed too) and
 * validates it (via `class-validator`'s `validate`, so `@ValidateNested()` recurses into them).
 * Throws `ValidationException` — a `400 Bad Request` — on any constraint violation.
 *
 * A no-op for anything that isn't a plausible DTO (`designType` missing or a primitive wrapper
 * type) or whose extracted value isn't a plain object — there is nothing to transform or
 * validate in either case, so the raw value passes through unchanged.
 */
export async function validateAndTransform(
  designType: AnyConstructor | undefined,
  value: unknown,
  options: ValidationPipeOptions = {},
): Promise<unknown> {
  if (!isDtoType(designType) || typeof value !== 'object' || value === null) {
    return value;
  }

  const instance = plainToInstance(designType as new () => object, value);
  const errors = await validate(instance, {
    whitelist: options.whitelist ?? true,
    forbidNonWhitelisted: options.forbidNonWhitelisted ?? false,
  });

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }

  return instance;
}
