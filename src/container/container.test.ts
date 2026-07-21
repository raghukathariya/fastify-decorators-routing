import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { DependencyError } from '../errors/dependency.error.js';
import { Container } from './container.js';
import { Inject } from './inject.decorator.js';
import { Injectable } from './injectable.decorator.js';
import { createInjectionToken } from './injection-token.js';
import type { OnDestroy, OnInit } from './lifecycle.interfaces.js';

describe('Container: class providers', () => {
  it('constructs a class with no dependencies', () => {
    @Injectable()
    class Service {
      public readonly name = 'service';
    }

    const container = new Container();
    container.registerClass(Service);

    expect(container.resolve(Service)).toBeInstanceOf(Service);
    expect(container.resolve(Service).name).toBe('service');
  });

  it('performs constructor injection using inferred design-time types', () => {
    @Injectable()
    class Dependency {
      public readonly label = 'dep';
    }

    @Injectable()
    class Service {
      public constructor(public dependency: Dependency) {}
    }

    const container = new Container();
    container.registerClass(Dependency);
    container.registerClass(Service);

    const service = container.resolve(Service);
    expect(service.dependency).toBeInstanceOf(Dependency);
    expect(service.dependency.label).toBe('dep');
  });

  it('resolves multi-level constructor injection chains', () => {
    @Injectable()
    class Level1 {}

    @Injectable()
    class Level2 {
      public constructor(public level1: Level1) {}
    }

    @Injectable()
    class Level3 {
      public constructor(public level2: Level2) {}
    }

    const container = new Container();
    container.registerClass(Level1);
    container.registerClass(Level2);
    container.registerClass(Level3);

    const level3 = container.resolve(Level3);
    expect(level3.level2).toBeInstanceOf(Level2);
    expect(level3.level2.level1).toBeInstanceOf(Level1);
  });

  it('resolves a constructor parameter via an explicit @Inject token override', () => {
    const CONFIG_TOKEN = createInjectionToken<string>('test:db-url');

    @Injectable()
    class Service {
      public constructor(@Inject(CONFIG_TOKEN) public dbUrl: string) {}
    }

    const container = new Container();
    container.registerValue(CONFIG_TOKEN, 'postgres://localhost');
    container.registerClass(Service);

    expect(container.resolve(Service).dbUrl).toBe('postgres://localhost');
  });

  it('performs property injection after construction', () => {
    const TOKEN = createInjectionToken<string>('test:prop-value');

    @Injectable()
    class Service {
      @Inject(TOKEN)
      public value!: string;
    }

    const container = new Container();
    container.registerValue(TOKEN, 'injected');
    container.registerClass(Service);

    expect(container.resolve(Service).value).toBe('injected');
  });

  it('throws an actionable error when a constructor parameter has no resolvable type', () => {
    // `unknown`-typed (and otherwise fully erased) parameters emit no usable design-time type at
    // all, so this is simulated directly rather than relying on a specific compiler's erasure
    // behavior for an undecorated class, which — as documented on DesignTypeReader — may not
    // emit any `design:paramtypes` in that case, making the parameter count itself ambiguous
    // rather than a single slot within it.
    class Ambiguous {
      public constructor(public dep: unknown) {}
    }
    Reflect.defineMetadata('design:paramtypes', [undefined], Ambiguous);

    const container = new Container();
    container.registerClass(Ambiguous);

    expect(() => container.resolve(Ambiguous)).toThrow(DependencyError);
    expect(() => container.resolve(Ambiguous)).toThrow(/@Injectable/);
  });
});

describe('Container: value providers', () => {
  it('returns the exact registered value without instantiation', () => {
    const TOKEN = createInjectionToken<{ apiKey: string }>('test:api-config');
    const value = { apiKey: 'secret' };

    const container = new Container();
    container.registerValue(TOKEN, value);

    expect(container.resolve(TOKEN)).toBe(value);
  });

  it('returns the same value on every resolve', () => {
    const TOKEN = createInjectionToken<number>('test:number');
    const container = new Container();
    container.registerValue(TOKEN, 42);

    expect(container.resolve(TOKEN)).toBe(42);
    expect(container.resolve(TOKEN)).toBe(42);
  });
});

describe('Container: factory providers', () => {
  it('invokes the factory and returns its result', () => {
    const TOKEN = createInjectionToken<{ createdAt: string }>('test:factory');
    const container = new Container();
    container.registerFactory(TOKEN, () => ({ createdAt: 'now' }));

    expect(container.resolve(TOKEN)).toEqual({ createdAt: 'now' });
  });

  it('resolves and injects declared dependencies into the factory', () => {
    const CONFIG_TOKEN = createInjectionToken<string>('test:factory-config');
    const SERVICE_TOKEN = createInjectionToken<{ url: string }>('test:factory-service');

    const container = new Container();
    container.registerValue(CONFIG_TOKEN, 'https://api.example.com');
    container.registerFactory(SERVICE_TOKEN, (url: string) => ({ url }), {
      inject: [CONFIG_TOKEN],
    });

    expect(container.resolve(SERVICE_TOKEN)).toEqual({ url: 'https://api.example.com' });
  });

  it('defaults factory providers to singleton scope', () => {
    const TOKEN = createInjectionToken<object>('test:factory-singleton');
    const container = new Container();
    container.registerFactory(TOKEN, () => ({}));

    expect(container.resolve(TOKEN)).toBe(container.resolve(TOKEN));
  });
});

describe('Container: scopes', () => {
  it('singleton: returns the same instance on every resolve', () => {
    @Injectable({ scope: 'singleton' })
    class Service {}

    const container = new Container();
    container.registerClass(Service);

    expect(container.resolve(Service)).toBe(container.resolve(Service));
  });

  it('transient: returns a new instance on every resolve', () => {
    @Injectable({ scope: 'transient' })
    class Service {}

    const container = new Container();
    container.registerClass(Service);

    expect(container.resolve(Service)).not.toBe(container.resolve(Service));
  });

  it('scoped: shares one instance within a scope, distinct across sibling scopes', () => {
    @Injectable({ scope: 'scoped' })
    class Service {}

    const root = new Container();
    root.registerClass(Service);

    const scopeA = root.createScope();
    const scopeB = root.createScope();

    const a1 = scopeA.resolve(Service);
    const a2 = scopeA.resolve(Service);
    const b1 = scopeB.resolve(Service);

    expect(a1).toBe(a2);
    expect(a1).not.toBe(b1);
  });

  it('singleton instances are shared across all scopes regardless of where first resolved', () => {
    @Injectable({ scope: 'singleton' })
    class Service {}

    const root = new Container();
    root.registerClass(Service);
    const scope = root.createScope();

    const fromScope = scope.resolve(Service);
    const fromRoot = root.resolve(Service);

    expect(fromScope).toBe(fromRoot);
  });

  it('a registration-time scope override takes precedence over @Injectable options', () => {
    @Injectable({ scope: 'singleton' })
    class Service {}

    const container = new Container();
    container.registerClass(Service, { scope: 'transient' });

    expect(container.resolve(Service)).not.toBe(container.resolve(Service));
  });

  it('defaults an @Injectable-less class provider to singleton scope', () => {
    class PlainService {}

    const container = new Container();
    // Registered by hand rather than @Injectable(), so it has no constructor dependencies to
    // resolve and no design-time metadata requirement.
    container.register({ provide: PlainService, useClass: PlainService });

    expect(container.resolve(PlainService)).toBe(container.resolve(PlainService));
  });

  it('a scope inherits provider registrations from its parent', () => {
    @Injectable()
    class Service {}

    const root = new Container();
    root.registerClass(Service);
    const scope = root.createScope();

    expect(scope.resolve(Service)).toBeInstanceOf(Service);
  });

  it('a scope can override a provider registered on its parent, for itself only', () => {
    const TOKEN = createInjectionToken<string>('test:overridable');

    const root = new Container();
    root.registerValue(TOKEN, 'root-value');
    const scope = root.createScope();
    scope.registerValue(TOKEN, 'scope-value');

    expect(root.resolve(TOKEN)).toBe('root-value');
    expect(scope.resolve(TOKEN)).toBe('scope-value');
  });
});

describe('Container: circular dependency detection', () => {
  it('throws a DependencyError describing the cycle', () => {
    const TOKEN_A = createInjectionToken<unknown>('test:cycle-a');
    const TOKEN_B = createInjectionToken<unknown>('test:cycle-b');

    // Dependencies must be declared via `inject` (not by calling `container.resolve()` from
    // inside a factory body) for cycle detection to see them — see the container.ts class doc:
    // resolution tracks a stack threaded through its own internal recursive calls, which a
    // factory reaching back out through the public `resolve()` API bypasses entirely.
    const container = new Container();
    container.registerFactory(TOKEN_A, (b: unknown) => b, { inject: [TOKEN_B] });
    container.registerFactory(TOKEN_B, (a: unknown) => a, { inject: [TOKEN_A] });

    expect(() => container.resolve(TOKEN_A)).toThrow(DependencyError);
    expect(() => container.resolve(TOKEN_A)).toThrow(/Circular dependency/);
  });

  it('detects a class-provider cycle through constructor injection', () => {
    @Injectable()
    class A {
      public constructor(public b: unknown) {}
    }
    @Injectable()
    class B {
      public constructor(public a: unknown) {}
    }
    // Wire the cycle via explicit tokens so TypeScript doesn't need forward-referenced classes.
    const TOKEN_A = createInjectionToken<A>('test:class-cycle-a');
    const TOKEN_B = createInjectionToken<B>('test:class-cycle-b');

    Reflect.defineMetadata('design:paramtypes', [TOKEN_B], A);
    Reflect.defineMetadata('design:paramtypes', [TOKEN_A], B);

    const container = new Container();
    container.registerClass(A, { provide: TOKEN_A });
    container.registerClass(B, { provide: TOKEN_B });

    expect(() => container.resolve(TOKEN_A)).toThrow(DependencyError);
  });
});

describe('Container: error handling', () => {
  it('throws when resolving an unregistered token', () => {
    const TOKEN = createInjectionToken<unknown>('test:unregistered');
    const container = new Container();

    expect(() => container.resolve(TOKEN)).toThrow(DependencyError);
    expect(() => container.resolve(TOKEN)).toThrow(/No provider is registered/);
  });

  it('rejects a provider object with no use* field', () => {
    const container = new Container();
    const TOKEN = createInjectionToken<unknown>('test:invalid');

    // @ts-expect-error deliberately malformed provider to exercise the runtime guard.
    expect(() => container.register({ provide: TOKEN })).toThrow(DependencyError);
  });

  it('has() reports whether a token is resolvable without resolving it', () => {
    const TOKEN = createInjectionToken<string>('test:has-check');
    const container = new Container();

    expect(container.has(TOKEN)).toBe(false);
    container.registerValue(TOKEN, 'value');
    expect(container.has(TOKEN)).toBe(true);
  });

  it('throws when resolving from a disposed container', () => {
    const container = new Container();
    container.dispose();

    const TOKEN = createInjectionToken<unknown>('test:disposed');
    expect(() => container.resolve(TOKEN)).toThrow(DependencyError);
  });

  it('throws when creating a scope from a disposed container', () => {
    const container = new Container();
    container.dispose();

    expect(() => container.createScope()).toThrow(DependencyError);
  });
});

describe('Container: lifecycle hooks', () => {
  it('calls onInit after a class provider is constructed and property-injected', () => {
    const onInit = vi.fn();
    const TOKEN = createInjectionToken<string>('test:lifecycle-dep');

    @Injectable()
    class Service implements OnInit {
      @Inject(TOKEN)
      public dep!: string;

      public onInit(): void {
        onInit(this.dep);
      }
    }

    const container = new Container();
    container.registerValue(TOKEN, 'ready');
    container.registerClass(Service);
    container.resolve(Service);

    expect(onInit).toHaveBeenCalledWith('ready');
  });

  it('calls onInit for factory-provided instances', () => {
    const onInit = vi.fn();
    const TOKEN = createInjectionToken<OnInit>('test:factory-lifecycle');

    const container = new Container();
    container.registerFactory(TOKEN, () => ({ onInit }));
    container.resolve(TOKEN);

    expect(onInit).toHaveBeenCalledOnce();
  });

  it('does not call onInit for value providers', () => {
    const onInit = vi.fn();
    const TOKEN = createInjectionToken<OnInit>('test:value-lifecycle');

    const container = new Container();
    container.registerValue(TOKEN, { onInit });
    container.resolve(TOKEN);

    expect(onInit).not.toHaveBeenCalled();
  });

  it('calls onDestroy on singleton instances when the container is disposed', () => {
    const onDestroy = vi.fn();

    @Injectable()
    class Service implements OnDestroy {
      public onDestroy(): void {
        onDestroy();
      }
    }

    const container = new Container();
    container.registerClass(Service);
    container.resolve(Service);
    container.dispose();

    expect(onDestroy).toHaveBeenCalledOnce();
  });

  it('calls onDestroy on scoped instances only when their own scope is disposed', () => {
    const onDestroy = vi.fn();

    @Injectable({ scope: 'scoped' })
    class Service implements OnDestroy {
      public onDestroy(): void {
        onDestroy();
      }
    }

    const root = new Container();
    root.registerClass(Service);
    const scope = root.createScope();
    scope.resolve(Service);

    root.dispose();
    expect(onDestroy).not.toHaveBeenCalled();

    scope.dispose();
    expect(onDestroy).toHaveBeenCalledOnce();
  });

  it('does not call onDestroy for transient instances (never cached, never tracked)', () => {
    const onDestroy = vi.fn();

    @Injectable({ scope: 'transient' })
    class Service implements OnDestroy {
      public onDestroy(): void {
        onDestroy();
      }
    }

    const container = new Container();
    container.registerClass(Service);
    container.resolve(Service);
    container.dispose();

    expect(onDestroy).not.toHaveBeenCalled();
  });

  it('is idempotent: disposing twice does not call onDestroy twice', () => {
    const onDestroy = vi.fn();

    @Injectable()
    class Service implements OnDestroy {
      public onDestroy(): void {
        onDestroy();
      }
    }

    const container = new Container();
    container.registerClass(Service);
    container.resolve(Service);

    container.dispose();
    container.dispose();

    expect(onDestroy).toHaveBeenCalledOnce();
  });
});
