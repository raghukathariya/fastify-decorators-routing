import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getControllerMiddleware, getRouteUseMiddleware, Use } from './use.decorator.js';

const noop = (): void => undefined;

describe('@Use on a controller class', () => {
  it('records middleware passed to a single @Use() call', () => {
    @Use(noop)
    class Controller {}

    expect(getControllerMiddleware(Controller)).toEqual([noop]);
  });

  it('records multiple middleware passed to one @Use() call, in argument order', () => {
    const a = (): void => undefined;
    const b = (): void => undefined;

    @Use(a, b)
    class Controller {}

    expect(getControllerMiddleware(Controller)).toEqual([a, b]);
  });

  it('accumulates middleware across repeated applications', () => {
    const a = (): void => undefined;
    const b = (): void => undefined;

    @Use(b)
    @Use(a)
    class Controller {}

    // Decorators apply bottom-up, so `a` (closer to the class) is recorded before `b`.
    expect(getControllerMiddleware(Controller)).toEqual([a, b]);
  });

  it("inherits a parent class's middleware, ancestor first", () => {
    const parentMw = (): void => undefined;
    const childMw = (): void => undefined;

    @Use(parentMw)
    class Base {}

    @Use(childMw)
    class Sub extends Base {}

    expect(getControllerMiddleware(Sub)).toEqual([parentMw, childMw]);
  });

  it('returns an empty array for a controller with no @Use', () => {
    class Plain {}
    expect(getControllerMiddleware(Plain)).toEqual([]);
  });
});

describe('@Use on a route method', () => {
  it('records middleware for that specific method only', () => {
    class Controller {
      @Use(noop)
      public handle(): void {
        // intentionally empty
      }

      public other(): void {
        // intentionally empty
      }
    }

    expect(getRouteUseMiddleware(Controller.prototype, 'handle')).toEqual([noop]);
    expect(getRouteUseMiddleware(Controller.prototype, 'other')).toEqual([]);
  });

  it('accumulates middleware across repeated applications on the same method', () => {
    const a = (): void => undefined;
    const b = (): void => undefined;

    class Controller {
      @Use(b)
      @Use(a)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteUseMiddleware(Controller.prototype, 'handle')).toEqual([a, b]);
  });

  it('inherits method middleware for a method not overridden by a subclass', () => {
    class Base {
      @Use(noop)
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getRouteUseMiddleware(Sub.prototype, 'handle')).toEqual([noop]);
  });
});
