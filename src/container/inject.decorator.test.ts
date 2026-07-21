import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { DependencyError } from '../errors/dependency.error.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import { Injectable } from './injectable.decorator.js';
import {
  Inject,
  INJECT_PARAMS_METADATA_KEY,
  INJECTED_PROPERTIES_METADATA_KEY,
} from './inject.decorator.js';
import { createInjectionToken } from './injection-token.js';

describe('@Inject on constructor parameters', () => {
  it('records the token override under the parameter index', () => {
    const TOKEN = createInjectionToken<string>('test:config');

    @Injectable()
    class Service {
      public constructor(@Inject(TOKEN) public config: string) {}
    }

    const overrides = globalMetadataRegistry.reader.getClassMetadata(
      Service,
      INJECT_PARAMS_METADATA_KEY,
      { inherit: false },
    );
    expect(overrides).toEqual({ 0: TOKEN });
  });

  it('records multiple parameter overrides independently by index', () => {
    const TOKEN_A = createInjectionToken<string>('test:a');
    const TOKEN_B = createInjectionToken<number>('test:b');

    @Injectable()
    class Service {
      public constructor(
        public untouched: object,
        @Inject(TOKEN_A) public a: string,
        @Inject(TOKEN_B) public b: number,
      ) {}
    }

    const overrides = globalMetadataRegistry.reader.getClassMetadata(
      Service,
      INJECT_PARAMS_METADATA_KEY,
      { inherit: false },
    );
    expect(overrides).toEqual({ 1: TOKEN_A, 2: TOKEN_B });
  });
});

describe('@Inject on properties', () => {
  it('appends a property injection entry under the class', () => {
    const TOKEN = createInjectionToken<string>('test:prop');

    @Injectable()
    class Service {
      @Inject(TOKEN)
      public dependency!: string;
    }

    const injections = globalMetadataRegistry.reader.getClassMetadata(
      Service,
      INJECTED_PROPERTIES_METADATA_KEY,
      { strategy: 'merge-array' },
    );
    expect(injections).toEqual([{ property: 'dependency', token: TOKEN }]);
  });

  it('accumulates one entry per decorated property', () => {
    const TOKEN_A = createInjectionToken<string>('test:prop-a');
    const TOKEN_B = createInjectionToken<string>('test:prop-b');

    @Injectable()
    class Service {
      @Inject(TOKEN_A)
      public a!: string;

      @Inject(TOKEN_B)
      public b!: string;
    }

    const injections = globalMetadataRegistry.reader.getClassMetadata(
      Service,
      INJECTED_PROPERTIES_METADATA_KEY,
      { strategy: 'merge-array' },
    );
    expect(injections).toEqual(
      expect.arrayContaining([
        { property: 'a', token: TOKEN_A },
        { property: 'b', token: TOKEN_B },
      ]),
    );
  });

  it('inherits property injections declared on a parent class', () => {
    const PARENT_TOKEN = createInjectionToken<string>('test:parent-prop');

    @Injectable()
    class Parent {
      @Inject(PARENT_TOKEN)
      public parentDep!: string;
    }

    @Injectable()
    class Child extends Parent {}

    const injections = globalMetadataRegistry.reader.getClassMetadata(
      Child,
      INJECTED_PROPERTIES_METADATA_KEY,
      { strategy: 'merge-array' },
    );
    expect(injections).toEqual([{ property: 'parentDep', token: PARENT_TOKEN }]);
  });
});

describe('@Inject misuse', () => {
  it('throws when applied to a method parameter', () => {
    const TOKEN = createInjectionToken<string>('test:method-param');

    expect(() => {
      class Service {
        public handle(@Inject(TOKEN) _value: string): void {
          // intentionally empty
        }
      }
      return Service;
    }).toThrow(DependencyError);
  });

  it('throws when the decorator is invoked with neither a property key nor a parameter index', () => {
    // Not reachable through normal decorator syntax — every legal call site TypeScript emits
    // provides one or the other. Exercises the defensive guard directly.
    const decorator = Inject(createInjectionToken<string>('test:misuse'));
    expect(() => decorator({}, undefined as unknown as string)).toThrow(DependencyError);
  });
});
