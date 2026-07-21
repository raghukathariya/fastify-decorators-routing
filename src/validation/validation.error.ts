import type { ValidationError } from 'class-validator';
import { BadRequestException } from '../exceptions/http-exceptions.js';

/** One property's validation failures, flattened out of class-validator's (possibly nested) tree. */
export interface ValidationErrorDetail {
  /** Dot-path to the property, e.g. `'address.zipCode'` for a nested DTO. */
  readonly property: string;
  readonly constraints: readonly string[];
}

function flattenErrors(
  errors: readonly ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  const result: ValidationErrorDetail[] = [];
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const constraints = error.constraints ? Object.values(error.constraints) : [];
    if (constraints.length > 0) {
      result.push({ property: path, constraints });
    }
    if (error.children && error.children.length > 0) {
      result.push(...flattenErrors(error.children, path));
    }
  }
  return result;
}

/**
 * `400 Bad Request`, thrown by the validation pipe when class-validator finds one or more
 * constraint violations. `errors` gives the flattened, dot-pathed detail (nested DTO errors —
 * `@ValidateNested()` — included); the response body's `message` is the flat list of every
 * individual constraint message, for a quick human-readable summary.
 */
export class ValidationException extends BadRequestException {
  public readonly errors: readonly ValidationErrorDetail[];

  public constructor(validationErrors: readonly ValidationError[]) {
    const errors = flattenErrors(validationErrors);
    super('Validation failed', {
      statusCode: 400,
      error: 'Bad Request',
      message: errors.flatMap((error) => error.constraints),
      details: errors,
    });
    this.errors = errors;
  }
}
