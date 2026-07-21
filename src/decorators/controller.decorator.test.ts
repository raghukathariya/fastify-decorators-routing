import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { isInjectable } from '../container/injectable.decorator.js';
import { Controller, getControllerOptions, isController } from './controller.decorator.js';

describe('@Controller', () => {
  it('defaults to path "/" when called with no arguments', () => {
    @Controller()
    class Service {}

    expect(getControllerOptions(Service)).toEqual({ path: '/' });
  });

  it('accepts a bare path string', () => {
    @Controller('/users')
    class Service {}

    expect(getControllerOptions(Service)).toEqual({ path: '/users' });
  });

  it('accepts an options object', () => {
    @Controller({ path: '/users', scope: 'scoped' })
    class Service {}

    expect(getControllerOptions(Service)).toEqual({ path: '/users' });
  });

  it('accepts a path string plus an options object', () => {
    @Controller('/users', { scope: 'transient' })
    class Service {}

    expect(getControllerOptions(Service)).toEqual({ path: '/users' });
  });

  it('marks the class as injectable, defaulting to singleton scope', () => {
    @Controller('/users')
    class Service {}

    expect(isInjectable(Service)).toBe(true);
  });

  it('passes the scope option through to @Injectable', () => {
    @Controller('/users', { scope: 'transient' })
    class Service {}

    const container = new Container();
    container.registerClass(Service);
    expect(container.resolve(Service)).not.toBe(container.resolve(Service));
  });

  it('reports isController(true) for a decorated class and false otherwise', () => {
    @Controller('/users')
    class Decorated {}
    class Plain {}

    expect(isController(Decorated)).toBe(true);
    expect(isController(Plain)).toBe(false);
  });

  it('does not consider @Controller inherited by a subclass', () => {
    @Controller('/base')
    class Base {}
    class Sub extends Base {}

    expect(isController(Sub)).toBe(false);
  });

  it('supports constructor injection into a controller, same as any injectable class', () => {
    @Controller('/users')
    class Dependency {}

    @Controller('/orders')
    class OrderController {
      public constructor(public dependency: Dependency) {}
    }

    const container = new Container();
    container.registerClass(Dependency);
    container.registerClass(OrderController);

    expect(container.resolve(OrderController).dependency).toBeInstanceOf(Dependency);
  });
});
