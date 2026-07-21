import { describe, expect, it } from 'vitest';
import { createInjectionToken } from './injection-token.js';
import {
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
  type Provider,
} from './provider.types.js';

describe('provider type guards', () => {
  class Foo {}
  const token = createInjectionToken<Foo>('test:foo');

  it('identifies a ClassProvider', () => {
    const provider: Provider<Foo> = { provide: token, useClass: Foo };
    expect(isClassProvider(provider)).toBe(true);
    expect(isValueProvider(provider)).toBe(false);
    expect(isFactoryProvider(provider)).toBe(false);
  });

  it('identifies a ValueProvider', () => {
    const provider: Provider<Foo> = { provide: token, useValue: new Foo() };
    expect(isValueProvider(provider)).toBe(true);
    expect(isClassProvider(provider)).toBe(false);
    expect(isFactoryProvider(provider)).toBe(false);
  });

  it('identifies a FactoryProvider', () => {
    const provider: Provider<Foo> = { provide: token, useFactory: () => new Foo() };
    expect(isFactoryProvider(provider)).toBe(true);
    expect(isClassProvider(provider)).toBe(false);
    expect(isValueProvider(provider)).toBe(false);
  });
});
