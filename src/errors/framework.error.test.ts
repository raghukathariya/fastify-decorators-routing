import { describe, expect, it } from 'vitest';
import { FrameworkError } from './framework.error.js';

class ConcreteError extends FrameworkError {
  public readonly code = 'CONCRETE_ERROR';
}

describe('FrameworkError', () => {
  it('is a real Error subclass with the correct name and message', () => {
    const error = new ConcreteError('something went wrong');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FrameworkError);
    expect(error.name).toBe('ConcreteError');
    expect(error.message).toBe('something went wrong');
    expect(error.code).toBe('CONCRETE_ERROR');
  });

  it('preserves an underlying cause when provided', () => {
    const cause = new Error('root cause');
    const error = new ConcreteError('wrapped', { cause });

    expect(error.cause).toBe(cause);
  });
});
