import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getControllerGuards, getRouteGuards, UseGuard } from './use-guard.decorator.js';

const alwaysAllow = (): boolean => true;

describe('@UseGuard on a controller class', () => {
  it('records a single guard', () => {
    @UseGuard(alwaysAllow)
    class Controller {}

    expect(getControllerGuards(Controller)).toEqual([alwaysAllow]);
  });

  it('records multiple guards passed to one @UseGuard() call, in argument order', () => {
    const a = (): boolean => true;
    const b = (): boolean => true;

    @UseGuard(a, b)
    class Controller {}

    expect(getControllerGuards(Controller)).toEqual([a, b]);
  });

  it('accumulates guards across repeated applications', () => {
    const a = (): boolean => true;
    const b = (): boolean => true;

    @UseGuard(b)
    @UseGuard(a)
    class Controller {}

    expect(getControllerGuards(Controller)).toEqual([a, b]);
  });

  it("inherits a parent class's guards, ancestor first", () => {
    const parentGuard = (): boolean => true;
    const childGuard = (): boolean => true;

    @UseGuard(parentGuard)
    class Base {}

    @UseGuard(childGuard)
    class Sub extends Base {}

    expect(getControllerGuards(Sub)).toEqual([parentGuard, childGuard]);
  });

  it('returns an empty array for a controller with no @UseGuard', () => {
    class Plain {}
    expect(getControllerGuards(Plain)).toEqual([]);
  });
});

describe('@UseGuard on a route method', () => {
  it('records guards for that specific method only', () => {
    class Controller {
      @UseGuard(alwaysAllow)
      public handle(): void {
        // intentionally empty
      }

      public other(): void {
        // intentionally empty
      }
    }

    expect(getRouteGuards(Controller.prototype, 'handle')).toEqual([alwaysAllow]);
    expect(getRouteGuards(Controller.prototype, 'other')).toEqual([]);
  });

  it('inherits method guards for a method not overridden by a subclass', () => {
    class Base {
      @UseGuard(alwaysAllow)
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getRouteGuards(Sub.prototype, 'handle')).toEqual([alwaysAllow]);
  });
});
