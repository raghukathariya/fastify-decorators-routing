import { FrameworkError } from './framework.error.js';

/**
 * Thrown when a decorator is applied somewhere it doesn't support — a parameter decorator meant
 * for a controller method parameter applied to a constructor parameter instead, for instance.
 * Raised at class-definition time (inside the decorator itself), not at request time.
 */
export class DecoratorError extends FrameworkError {
  public readonly code = 'DECORATOR_ERROR';

  public static invalidTarget(decoratorName: string, reason: string): DecoratorError {
    return new DecoratorError(`@${decoratorName}() ${reason}`);
  }
}
