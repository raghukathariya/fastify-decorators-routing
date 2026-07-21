import type { Constructor } from '../types/constructor.type.js';
import type { ProviderToken } from './injection-token.js';

/**
 * How many instances a provider produces over its lifetime:
 *  - `'singleton'` — exactly one instance for the entire container hierarchy, created on first
 *    resolution and cached on the root container forever after.
 *  - `'transient'` — a new instance on every `resolve()` call; never cached.
 *  - `'scoped'` — one instance per {@link import('./container.js').Container} scope (see
 *    `Container.createScope`), typically one per incoming HTTP request once wired up in Phase 9.
 */
export type Scope = 'singleton' | 'transient' | 'scoped';

export interface ClassProvider<T> {
  provide: ProviderToken<T>;
  useClass: Constructor<T>;
  /** Defaults to the class's `@Injectable()` scope, or `'singleton'` if not decorated. */
  scope?: Scope;
}

export interface ValueProvider<T> {
  provide: ProviderToken<T>;
  useValue: T;
}

/**
 * The `any[]` parameter type (rather than `unknown[]`) mirrors `Constructor<T>` in
 * `src/types/constructor.type.ts`: it is the only signature that a factory with concrete typed
 * parameters — e.g. `(config: Config) => Service` — remains structurally assignable to.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FactoryFn<T> = (...args: any[]) => T;

export interface FactoryProvider<T> {
  provide: ProviderToken<T>;
  useFactory: FactoryFn<T>;
  /**
   * Tokens resolved and passed positionally as `useFactory`'s arguments.
   *
   * Declare every dependency here rather than calling `container.resolve()` from inside the
   * factory body: resolutions reached through `inject` are threaded through the container's
   * internal circular-dependency tracking, so a cycle produces a clear `DependencyError`.
   * Reaching back out through the public `resolve()` API from inside a factory bypasses that
   * tracking entirely — a cycle introduced that way surfaces as an unhelpful
   * `RangeError: Maximum call stack size exceeded` instead.
   */
  inject?: readonly ProviderToken<unknown>[];
  /** Defaults to `'singleton'`. */
  scope?: Scope;
}

export type Provider<T = unknown> = ClassProvider<T> | ValueProvider<T> | FactoryProvider<T>;

export function isClassProvider<T>(provider: Provider<T>): provider is ClassProvider<T> {
  return 'useClass' in provider;
}

export function isValueProvider<T>(provider: Provider<T>): provider is ValueProvider<T> {
  return 'useValue' in provider;
}

export function isFactoryProvider<T>(provider: Provider<T>): provider is FactoryProvider<T> {
  return 'useFactory' in provider;
}
