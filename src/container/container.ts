import { DependencyError } from '../errors/dependency.error.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, Constructor, MemberKey } from '../types/constructor.type.js';
import { getInjectableOptions } from './injectable.decorator.js';
import {
  INJECT_PARAMS_METADATA_KEY,
  INJECTED_PROPERTIES_METADATA_KEY,
} from './inject.decorator.js';
import type { ProviderToken } from './injection-token.js';
import { hasOnDestroy, hasOnInit } from './lifecycle.interfaces.js';
import {
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
  type ClassProvider,
  type FactoryProvider,
  type Provider,
  type Scope,
} from './provider.types.js';

interface OwnedInstance {
  readonly token: ProviderToken<unknown>;
  readonly instance: unknown;
}

/**
 * A dependency injection container: register providers, then resolve instances by token.
 *
 * ### Scoping
 *
 * `Container` instances form a tree via {@link createScope}. A resolution always starts from the
 * container/scope `resolve()` was called on, so a scope can override an ancestor's provider for
 * itself and everything it constructs; but caching behaves differently per {@link Scope}:
 *  - `'singleton'` instances are always cached on the **root** container, so there is exactly one
 *    instance for the entire tree no matter which scope first resolved it.
 *  - `'scoped'` instances are cached on **whichever container `resolve()` was called on** — call
 *    it from a child scope and that scope gets its own instance, independent of siblings.
 *  - `'transient'` instances are never cached.
 *
 * ### Resolution is synchronous
 *
 * `resolve()` never returns a `Promise`, by design: this keeps route handler construction
 * (Phase 9) on Fastify's fast synchronous path rather than forcing an `await` into every request.
 * `FactoryProvider.useFactory` must therefore return `T` directly, not `Promise<T>`. If a
 * dependency needs asynchronous setup (opening a database connection, say), perform that setup
 * before registration and hand the container the already-built value via
 * `registerValue`/`useValue`.
 */
export class Container {
  private readonly providers = new Map<ProviderToken<unknown>, Provider<unknown>>();
  private readonly singletons = new Map<ProviderToken<unknown>, unknown>();
  private readonly scopedInstances = new Map<ProviderToken<unknown>, unknown>();
  private readonly ownedInstances: OwnedInstance[] = [];
  private disposed = false;

  public constructor(private readonly parent?: Container) {}

  // ---------------------------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------------------------

  /** Registers `provider` under its own `provide` token. Overwrites any existing registration. */
  public register<T>(provider: Provider<T>): this {
    if (!isClassProvider(provider) && !isValueProvider(provider) && !isFactoryProvider(provider)) {
      throw DependencyError.invalidProvider(provider);
    }
    this.providers.set(provider.provide, provider);
    return this;
  }

  /** Shorthand for `register({ provide: target, useClass: target, ... })`. */
  public registerClass<T>(
    target: Constructor<T>,
    options: { provide?: ProviderToken<T>; scope?: Scope } = {},
  ): this {
    return this.register({
      provide: options.provide ?? target,
      useClass: target,
      ...(options.scope !== undefined ? { scope: options.scope } : {}),
    });
  }

  /** Shorthand for `register({ provide: token, useValue: value })`. */
  public registerValue<T>(token: ProviderToken<T>, value: T): this {
    return this.register({ provide: token, useValue: value });
  }

  /** Shorthand for `register({ provide: token, useFactory: factory, ... })`. */
  public registerFactory<T>(
    token: ProviderToken<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    factory: (...args: any[]) => T,
    options: { inject?: readonly ProviderToken<unknown>[]; scope?: Scope } = {},
  ): this {
    return this.register({
      provide: token,
      useFactory: factory,
      ...(options.inject !== undefined ? { inject: options.inject } : {}),
      ...(options.scope !== undefined ? { scope: options.scope } : {}),
    });
  }

  /**
   * Registers `target` as a class provider only if no provider is already registered under it
   * (checking this container and every ancestor). Used by the Fastify plugin and its
   * guard/interceptor pipeline (Phases 9, 11, 12) to auto-register controller/guard/interceptor
   * classes the caller referenced by class reference but never registered themselves, without
   * ever clobbering a registration — including scope — the caller made explicitly.
   */
  public ensureRegistered<T>(
    target: Constructor<T>,
    options: { provide?: ProviderToken<T>; scope?: Scope } = {},
  ): this {
    if (!this.has(options.provide ?? target)) {
      this.registerClass(target, options);
    }
    return this;
  }

  /** Whether a provider for `token` is registered on this container or any ancestor. */
  public has(token: ProviderToken<unknown>): boolean {
    return this.findProvider(token) !== undefined;
  }

  // ---------------------------------------------------------------------------------------------
  // Resolution
  // ---------------------------------------------------------------------------------------------

  public resolve<T>(token: ProviderToken<T>): T {
    if (this.disposed) throw DependencyError.disposed();
    return this.resolveWithStack(token, []);
  }

  /** Creates a child scope: its own `'scoped'` cache, sharing this container's providers and
   *  root-level `'singleton'` cache. See the class-level scoping doc above. */
  public createScope(): Container {
    if (this.disposed) throw DependencyError.disposed();
    return new Container(this);
  }

  /**
   * Calls `onDestroy` (see `lifecycle.interfaces.ts`) on every singleton/scoped instance this
   * container created, then marks it unusable. Does not cascade to child scopes created via
   * `createScope` — each scope's creator is responsible for disposing it.
   */
  public dispose(): void {
    if (this.disposed) return;
    for (const { instance } of this.ownedInstances) {
      if (hasOnDestroy(instance)) instance.onDestroy();
    }
    this.ownedInstances.length = 0;
    this.singletons.clear();
    this.scopedInstances.clear();
    this.disposed = true;
  }

  // ---------------------------------------------------------------------------------------------
  // Internal resolution machinery
  // ---------------------------------------------------------------------------------------------

  private resolveWithStack<T>(
    token: ProviderToken<T>,
    stack: readonly ProviderToken<unknown>[],
  ): T {
    if (stack.includes(token)) {
      throw DependencyError.circularDependency([...stack, token]);
    }

    const provider = this.findProvider(token);
    if (!provider) {
      throw DependencyError.notRegistered(token);
    }

    if (isValueProvider(provider)) {
      return provider.useValue;
    }

    const scope = this.resolveEffectiveScope(provider);
    const nextStack = [...stack, token];

    if (scope === 'singleton') {
      const root = this.getRoot();
      if (root.singletons.has(token)) return root.singletons.get(token) as T;
      const instance = this.instantiate(provider, nextStack);
      root.singletons.set(token, instance);
      root.ownedInstances.push({ token, instance });
      return instance;
    }

    if (scope === 'scoped') {
      if (this.scopedInstances.has(token)) return this.scopedInstances.get(token) as T;
      const instance = this.instantiate(provider, nextStack);
      this.scopedInstances.set(token, instance);
      this.ownedInstances.push({ token, instance });
      return instance;
    }

    return this.instantiate(provider, nextStack);
  }

  private resolveEffectiveScope<T>(provider: ClassProvider<T> | FactoryProvider<T>): Scope {
    if (provider.scope) return provider.scope;
    if (isClassProvider(provider)) {
      return getInjectableOptions(provider.useClass)?.scope ?? 'singleton';
    }
    return 'singleton';
  }

  private instantiate<T>(
    provider: ClassProvider<T> | FactoryProvider<T>,
    stack: readonly ProviderToken<unknown>[],
  ): T {
    if (isFactoryProvider(provider)) {
      const args = (provider.inject ?? []).map((dep) => this.resolveWithStack(dep, stack));
      const instance = provider.useFactory(...args);
      if (hasOnInit(instance)) instance.onInit();
      return instance;
    }

    const args = this.resolveConstructorArgs(provider.useClass, stack);
    const instance = new provider.useClass(...args);
    // Class instances are always objects; the cast just states what `T` can't express generically.
    this.injectProperties(instance as object, provider.useClass, stack);
    if (hasOnInit(instance)) instance.onInit();
    return instance;
  }

  private resolveConstructorArgs(
    target: AnyConstructor,
    stack: readonly ProviderToken<unknown>[],
  ): unknown[] {
    const overrides =
      globalMetadataRegistry.reader.getClassMetadata(target, INJECT_PARAMS_METADATA_KEY, {
        inherit: false,
      }) ?? {};
    const paramTypes = globalMetadataRegistry.designTypes.getConstructorParamTypes(target) ?? [];

    const overrideIndices = Object.keys(overrides).map(Number);
    const paramCount = Math.max(paramTypes.length, ...overrideIndices.map((i) => i + 1), 0);

    const args: unknown[] = [];
    for (let index = 0; index < paramCount; index++) {
      const token: ProviderToken<unknown> | undefined = overrides[index] ?? paramTypes[index];
      if (token === undefined) {
        throw DependencyError.ambiguousParameter(target, index);
      }
      args.push(this.resolveWithStack(token, stack));
    }
    return args;
  }

  private injectProperties(
    instance: object,
    target: AnyConstructor,
    stack: readonly ProviderToken<unknown>[],
  ): void {
    const injections =
      globalMetadataRegistry.reader.getClassMetadata(target, INJECTED_PROPERTIES_METADATA_KEY, {
        strategy: 'merge-array',
      }) ?? [];

    for (const { property, token } of injections) {
      (instance as Record<MemberKey, unknown>)[property] = this.resolveWithStack(token, stack);
    }
  }

  /**
   * Looks up the provider registered for `token`, walking up to ancestor scopes if not found on
   * this container. The cast is safe by construction: `register`/`registerClass`/`registerValue`/
   * `registerFactory` are the only writers of `providers`, and every one of them stores a
   * `Provider<T>` under a `ProviderToken<T>` for the same `T`.
   */
  private findProvider<T>(token: ProviderToken<T>): Provider<T> | undefined {
    const provider = this.providers.get(token);
    if (provider) return provider as Provider<T>;
    return this.parent?.findProvider(token);
  }

  private getRoot(): Container {
    return this.parent ? this.parent.getRoot() : this;
  }
}
