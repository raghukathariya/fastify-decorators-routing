import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getInjectableOptions, Injectable, isInjectable } from './injectable.decorator.js';

describe('@Injectable', () => {
  it('marks a class as injectable with the default scope', () => {
    @Injectable()
    class Service {}

    expect(isInjectable(Service)).toBe(true);
    expect(getInjectableOptions(Service)).toEqual({ scope: 'singleton' });
  });

  it('records an explicit scope', () => {
    @Injectable({ scope: 'transient' })
    class Service {}

    expect(getInjectableOptions(Service)).toEqual({ scope: 'transient' });
  });

  it('reports a plain, undecorated class as not injectable', () => {
    class PlainClass {}
    expect(isInjectable(PlainClass)).toBe(false);
    expect(getInjectableOptions(PlainClass)).toBeUndefined();
  });

  it('does not consider @Injectable inherited by a subclass', () => {
    @Injectable({ scope: 'scoped' })
    class Base {}
    class Sub extends Base {}

    expect(isInjectable(Sub)).toBe(false);
  });
});
