import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getControllerFilters, getRouteFilters, UseFilter } from './use-filter.decorator.js';

const passthrough = (): unknown => undefined;

describe('@UseFilter on a controller class', () => {
  it('records a single filter', () => {
    @UseFilter(passthrough)
    class Controller {}

    expect(getControllerFilters(Controller)).toEqual([passthrough]);
  });

  it('records multiple filters passed to one call, in argument order', () => {
    const a = (): unknown => undefined;
    const b = (): unknown => undefined;

    @UseFilter(a, b)
    class Controller {}

    expect(getControllerFilters(Controller)).toEqual([a, b]);
  });

  it('accumulates filters across repeated applications', () => {
    const a = (): unknown => undefined;
    const b = (): unknown => undefined;

    @UseFilter(b)
    @UseFilter(a)
    class Controller {}

    expect(getControllerFilters(Controller)).toEqual([a, b]);
  });

  it("inherits a parent class's filters, ancestor first", () => {
    const parentFilter = (): unknown => undefined;
    const childFilter = (): unknown => undefined;

    @UseFilter(parentFilter)
    class Base {}

    @UseFilter(childFilter)
    class Sub extends Base {}

    expect(getControllerFilters(Sub)).toEqual([parentFilter, childFilter]);
  });

  it('returns an empty array for a controller with no @UseFilter', () => {
    class Plain {}
    expect(getControllerFilters(Plain)).toEqual([]);
  });
});

describe('@UseFilter on a route method', () => {
  it('records filters for that specific method only', () => {
    class Controller {
      @UseFilter(passthrough)
      public handle(): void {
        // intentionally empty
      }

      public other(): void {
        // intentionally empty
      }
    }

    expect(getRouteFilters(Controller.prototype, 'handle')).toEqual([passthrough]);
    expect(getRouteFilters(Controller.prototype, 'other')).toEqual([]);
  });

  it('inherits method filters for a method not overridden by a subclass', () => {
    class Base {
      @UseFilter(passthrough)
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getRouteFilters(Sub.prototype, 'handle')).toEqual([passthrough]);
  });
});
