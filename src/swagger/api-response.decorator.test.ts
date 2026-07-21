import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ApiResponse, getApiResponses } from './api-response.decorator.js';

describe('@ApiResponse', () => {
  it('records a single response entry for the decorated method', () => {
    class Controller {
      @ApiResponse({ status: 404, description: 'User not found' })
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getApiResponses(Controller.prototype, 'handle')).toEqual([
      { status: 404, description: 'User not found' },
    ]);
  });

  it('accumulates responses across repeated applications, in argument order', () => {
    class Controller {
      @ApiResponse({ status: 404, description: 'Not found' })
      @ApiResponse({ status: 200, description: 'OK' })
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getApiResponses(Controller.prototype, 'handle')).toEqual([
      { status: 200, description: 'OK' },
      { status: 404, description: 'Not found' },
    ]);
  });

  it('returns an empty array for a method with no @ApiResponse', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getApiResponses(Controller.prototype, 'handle')).toEqual([]);
  });

  it('inherits responses for a method not overridden by a subclass', () => {
    class Base {
      @ApiResponse({ status: 200 })
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getApiResponses(Sub.prototype, 'handle')).toEqual([{ status: 200 }]);
  });
});
