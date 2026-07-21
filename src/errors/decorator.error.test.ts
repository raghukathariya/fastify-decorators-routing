import { describe, expect, it } from 'vitest';
import { DecoratorError } from './decorator.error.js';
import { FrameworkError } from './framework.error.js';

describe('DecoratorError', () => {
  it('is a FrameworkError with a stable error code', () => {
    const error = new DecoratorError('generic failure');
    expect(error).toBeInstanceOf(FrameworkError);
    expect(error.code).toBe('DECORATOR_ERROR');
  });

  it('invalidTarget formats the decorator name and reason', () => {
    const error = DecoratorError.invalidTarget('Body', 'cannot be used here.');
    expect(error.message).toBe('@Body() cannot be used here.');
  });
});
