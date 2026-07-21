import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  ApiSecurity,
  getControllerApiSecurity,
  getRouteApiSecurity,
} from './api-security.decorator.js';

describe('@ApiSecurity on a controller class', () => {
  it('records a requirement with an empty scopes array by default', () => {
    @ApiSecurity('bearerAuth')
    class Controller {}

    expect(getControllerApiSecurity(Controller)).toEqual([{ name: 'bearerAuth', scopes: [] }]);
  });

  it('records the given scopes', () => {
    @ApiSecurity('oauth2', ['read:users', 'write:users'])
    class Controller {}

    expect(getControllerApiSecurity(Controller)).toEqual([
      { name: 'oauth2', scopes: ['read:users', 'write:users'] },
    ]);
  });

  it('accumulates requirements across repeated applications', () => {
    @ApiSecurity('apiKey')
    @ApiSecurity('bearerAuth')
    class Controller {}

    expect(getControllerApiSecurity(Controller)).toEqual([
      { name: 'bearerAuth', scopes: [] },
      { name: 'apiKey', scopes: [] },
    ]);
  });

  it("inherits a parent class's requirements, ancestor first", () => {
    @ApiSecurity('bearerAuth')
    class Base {}

    @ApiSecurity('apiKey')
    class Sub extends Base {}

    expect(getControllerApiSecurity(Sub)).toEqual([
      { name: 'bearerAuth', scopes: [] },
      { name: 'apiKey', scopes: [] },
    ]);
  });

  it('returns an empty array for a controller with no @ApiSecurity', () => {
    class Plain {}
    expect(getControllerApiSecurity(Plain)).toEqual([]);
  });
});

describe('@ApiSecurity on a route method', () => {
  it('records a requirement for that specific method only', () => {
    class Controller {
      @ApiSecurity('bearerAuth')
      public handle(): void {
        // intentionally empty
      }

      public other(): void {
        // intentionally empty
      }
    }

    expect(getRouteApiSecurity(Controller.prototype, 'handle')).toEqual([
      { name: 'bearerAuth', scopes: [] },
    ]);
    expect(getRouteApiSecurity(Controller.prototype, 'other')).toEqual([]);
  });

  it('inherits a method requirement not overridden by a subclass', () => {
    class Base {
      @ApiSecurity('bearerAuth')
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getRouteApiSecurity(Sub.prototype, 'handle')).toEqual([
      { name: 'bearerAuth', scopes: [] },
    ]);
  });
});
