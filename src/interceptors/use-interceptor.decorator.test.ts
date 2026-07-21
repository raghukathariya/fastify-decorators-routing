import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  getControllerInterceptors,
  getRouteInterceptors,
  UseInterceptor,
} from './use-interceptor.decorator.js';

const passthrough = (_context: unknown, next: () => unknown): unknown => next();

describe('@UseInterceptor on a controller class', () => {
  it('records a single interceptor', () => {
    @UseInterceptor(passthrough)
    class Controller {}

    expect(getControllerInterceptors(Controller)).toEqual([passthrough]);
  });

  it('records multiple interceptors passed to one call, in argument order', () => {
    const a = (_c: unknown, next: () => unknown): unknown => next();
    const b = (_c: unknown, next: () => unknown): unknown => next();

    @UseInterceptor(a, b)
    class Controller {}

    expect(getControllerInterceptors(Controller)).toEqual([a, b]);
  });

  it('accumulates interceptors across repeated applications', () => {
    const a = (_c: unknown, next: () => unknown): unknown => next();
    const b = (_c: unknown, next: () => unknown): unknown => next();

    @UseInterceptor(b)
    @UseInterceptor(a)
    class Controller {}

    expect(getControllerInterceptors(Controller)).toEqual([a, b]);
  });

  it("inherits a parent class's interceptors, ancestor first", () => {
    const parentI = (_c: unknown, next: () => unknown): unknown => next();
    const childI = (_c: unknown, next: () => unknown): unknown => next();

    @UseInterceptor(parentI)
    class Base {}

    @UseInterceptor(childI)
    class Sub extends Base {}

    expect(getControllerInterceptors(Sub)).toEqual([parentI, childI]);
  });

  it('returns an empty array for a controller with no @UseInterceptor', () => {
    class Plain {}
    expect(getControllerInterceptors(Plain)).toEqual([]);
  });
});

describe('@UseInterceptor on a route method', () => {
  it('records interceptors for that specific method only', () => {
    class Controller {
      @UseInterceptor(passthrough)
      public handle(): void {
        // intentionally empty
      }

      public other(): void {
        // intentionally empty
      }
    }

    expect(getRouteInterceptors(Controller.prototype, 'handle')).toEqual([passthrough]);
    expect(getRouteInterceptors(Controller.prototype, 'other')).toEqual([]);
  });

  it('inherits method interceptors for a method not overridden by a subclass', () => {
    class Base {
      @UseInterceptor(passthrough)
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getRouteInterceptors(Sub.prototype, 'handle')).toEqual([passthrough]);
  });
});
