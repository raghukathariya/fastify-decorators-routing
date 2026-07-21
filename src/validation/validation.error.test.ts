import type { ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { BadRequestException } from '../exceptions/http-exceptions.js';
import { ValidationException } from './validation.error.js';

function error(
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  return { property, constraints, children, target: {}, value: undefined };
}

describe('ValidationException', () => {
  it('is a BadRequestException (400)', () => {
    const exception = new ValidationException([
      error('name', { isNotEmpty: 'name should not be empty' }),
    ]);
    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.statusCode).toBe(400);
  });

  it('flattens a single top-level error into errors and message', () => {
    const exception = new ValidationException([
      error('name', { isNotEmpty: 'name should not be empty' }),
    ]);

    expect(exception.errors).toEqual([
      { property: 'name', constraints: ['name should not be empty'] },
    ]);
    expect(exception.getResponseBody()).toMatchObject({
      statusCode: 400,
      message: ['name should not be empty'],
    });
  });

  it('flattens multiple constraints on the same property', () => {
    const exception = new ValidationException([
      error('email', {
        isEmail: 'email must be an email',
        isNotEmpty: 'email should not be empty',
      }),
    ]);

    expect(exception.errors[0]?.constraints).toEqual([
      'email must be an email',
      'email should not be empty',
    ]);
  });

  it('flattens nested DTO errors with a dot-path property name', () => {
    const exception = new ValidationException([
      error('address', {}, [error('zipCode', { isNotEmpty: 'zipCode should not be empty' })]),
    ]);

    expect(exception.errors).toEqual([
      { property: 'address.zipCode', constraints: ['zipCode should not be empty'] },
    ]);
  });

  it('flattens deeply nested (grandchild) DTO errors', () => {
    const exception = new ValidationException([
      error('address', {}, [
        error('city', {}, [error('name', { isNotEmpty: 'name should not be empty' })]),
      ]),
    ]);

    expect(exception.errors).toEqual([
      { property: 'address.city.name', constraints: ['name should not be empty'] },
    ]);
  });

  it('handles multiple top-level errors', () => {
    const exception = new ValidationException([
      error('name', { isNotEmpty: 'name should not be empty' }),
      error('age', { isInt: 'age must be an integer' }),
    ]);

    expect(exception.errors).toHaveLength(2);
    expect(exception.getResponseBody()).toMatchObject({
      message: ['name should not be empty', 'age must be an integer'],
    });
  });
});
