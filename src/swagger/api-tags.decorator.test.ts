import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ApiTags, getRouteApiTags } from './api-tags.decorator.js';

describe('@ApiTags', () => {
  it('records a single tag for the decorated method', () => {
    class Controller {
      @ApiTags('users')
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteApiTags(Controller.prototype, 'handle')).toEqual(['users']);
  });

  it('records multiple tags passed to one call, in argument order', () => {
    class Controller {
      @ApiTags('users', 'admin')
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteApiTags(Controller.prototype, 'handle')).toEqual(['users', 'admin']);
  });

  it('accumulates tags across repeated applications', () => {
    class Controller {
      @ApiTags('admin')
      @ApiTags('users')
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteApiTags(Controller.prototype, 'handle')).toEqual(['users', 'admin']);
  });

  it('keeps tags for different methods independent', () => {
    class Controller {
      @ApiTags('users')
      public handle(): void {
        // intentionally empty
      }

      public other(): void {
        // intentionally empty
      }
    }

    expect(getRouteApiTags(Controller.prototype, 'handle')).toEqual(['users']);
    expect(getRouteApiTags(Controller.prototype, 'other')).toEqual([]);
  });

  it('inherits a tag for a method not overridden by a subclass', () => {
    class Base {
      @ApiTags('users')
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getRouteApiTags(Sub.prototype, 'handle')).toEqual(['users']);
  });

  it('returns an empty array for a method with no @ApiTags', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteApiTags(Controller.prototype, 'handle')).toEqual([]);
  });
});
