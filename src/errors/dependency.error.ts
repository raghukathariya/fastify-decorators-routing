import type { AnyConstructor } from '../types/constructor.type.js';
import { FrameworkError } from './framework.error.js';

function describeToken(token: unknown): string {
  if (typeof token === 'function') return token.name || '<anonymous class>';
  if (typeof token === 'symbol') return token.toString();
  return String(token);
}

/**
 * Thrown by the dependency injection container (`src/container`) for configuration or
 * resolution errors: an unregistered token, a circular dependency, an ambiguous constructor
 * parameter, or a malformed provider.
 */
export class DependencyError extends FrameworkError {
  public readonly code = 'DEPENDENCY_ERROR';

  public static notRegistered(token: unknown): DependencyError {
    return new DependencyError(
      `No provider is registered for token '${describeToken(token)}'. Register one with ` +
        'container.register(...), container.registerClass(...), container.registerValue(...), ' +
        'or container.registerFactory(...) before resolving it.',
    );
  }

  public static circularDependency(chain: readonly unknown[]): DependencyError {
    const path = chain.map(describeToken).join(' -> ');
    return new DependencyError(`Circular dependency detected: ${path}`);
  }

  public static ambiguousParameter(target: AnyConstructor, index: number): DependencyError {
    return new DependencyError(
      `Cannot resolve parameter ${index} of ${target.name}'s constructor: no design-time type ` +
        'metadata was found and no @Inject() override was provided for that parameter. Add ' +
        `@Injectable() to ${target.name} (TypeScript only emits constructor parameter type ` +
        'metadata for decorated classes), or add an explicit @Inject(token) for that parameter.',
    );
  }

  public static invalidProvider(provider: unknown): DependencyError {
    return new DependencyError(
      "Invalid provider: it must declare exactly one of 'useClass', 'useValue', or " +
        `'useFactory'. Received: ${JSON.stringify(provider)}`,
    );
  }

  public static invalidInjectUsage(reason: string): DependencyError {
    return new DependencyError(`Invalid @Inject() usage: ${reason}`);
  }

  public static disposed(): DependencyError {
    return new DependencyError('Cannot resolve from a Container that has already been disposed.');
  }
}
