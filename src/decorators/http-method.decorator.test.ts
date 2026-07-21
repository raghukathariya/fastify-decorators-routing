import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  All,
  Delete,
  Get,
  getRouteDefinition,
  getRouteDefinitions,
  getRouteHandlerNames,
  Head,
  Options,
  Patch,
  Post,
  Put,
} from './http-method.decorator.js';

describe('HTTP method decorators: basic registration', () => {
  const cases: [string, typeof Get, string][] = [
    ['@Get', Get, 'GET'],
    ['@Post', Post, 'POST'],
    ['@Put', Put, 'PUT'],
    ['@Patch', Patch, 'PATCH'],
    ['@Delete', Delete, 'DELETE'],
    ['@Options', Options, 'OPTIONS'],
    ['@Head', Head, 'HEAD'],
    ['@All', All, 'ALL'],
  ];

  it.each(cases)('%s records a %s route with the given path', (_label, decorator, method) => {
    class Controller {
      @decorator('/users')
      public handle(): void {
        // intentionally empty
      }
    }

    const definition = getRouteDefinition(Controller.prototype, 'handle');
    expect(definition?.method).toBe(method);
    expect(definition?.path).toBe('/users');
    expect(definition?.handlerName).toBe('handle');
    expect(definition?.middleware).toEqual([]);
  });
});

describe('@Get: calling conventions', () => {
  it('defaults to path "/" when called with no arguments', () => {
    class Controller {
      @Get()
      public handle(): void {
        // intentionally empty
      }
    }
    expect(getRouteDefinition(Controller.prototype, 'handle')?.path).toBe('/');
  });

  it('accepts an options object as the only argument', () => {
    class Controller {
      @Get({ path: '/users', name: 'list-users' })
      public handle(): void {
        // intentionally empty
      }
    }
    const definition = getRouteDefinition(Controller.prototype, 'handle');
    expect(definition?.path).toBe('/users');
    expect(definition?.name).toBe('list-users');
  });

  it('accepts a path string plus an options object', () => {
    class Controller {
      @Get('/users', { name: 'list-users', deprecated: true })
      public handle(): void {
        // intentionally empty
      }
    }
    const definition = getRouteDefinition(Controller.prototype, 'handle');
    expect(definition?.path).toBe('/users');
    expect(definition?.name).toBe('list-users');
    expect(definition?.deprecated).toBe(true);
  });
});

describe('@Get: option fields', () => {
  it('records schema, summary, description, deprecated, response, and version', () => {
    const schema = { querystring: { type: 'object' } };
    const response = { status: 200, description: 'A list of users' };

    class Controller {
      @Get('/users', {
        schema,
        summary: 'List users',
        description: 'Returns every user',
        deprecated: true,
        response,
        version: '2',
      })
      public handle(): void {
        // intentionally empty
      }
    }

    const definition = getRouteDefinition(Controller.prototype, 'handle');
    expect(definition?.schema).toBe(schema);
    expect(definition?.summary).toBe('List users');
    expect(definition?.description).toBe('Returns every user');
    expect(definition?.deprecated).toBe(true);
    expect(definition?.response).toBe(response);
    expect(definition?.version).toBe('2');
  });

  it('records middleware and hooks', () => {
    const middleware = [() => undefined];
    const onRequest = [() => undefined];

    class Controller {
      @Get('/users', { middleware, hooks: { onRequest } })
      public handle(): void {
        // intentionally empty
      }
    }

    const definition = getRouteDefinition(Controller.prototype, 'handle');
    expect(definition?.middleware).toBe(middleware);
    expect(definition?.hooks?.onRequest).toBe(onRequest);
  });

  it('omits unset optional fields entirely rather than storing them as undefined', () => {
    class Controller {
      @Get('/users')
      public handle(): void {
        // intentionally empty
      }
    }

    const definition = getRouteDefinition(Controller.prototype, 'handle');
    expect(definition && 'schema' in definition).toBe(false);
    expect(definition && 'name' in definition).toBe(false);
  });
});

describe('getRouteDefinition / getRouteHandlerNames / getRouteDefinitions', () => {
  it('returns undefined for an undecorated method', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }
    expect(getRouteDefinition(Controller.prototype, 'handle')).toBeUndefined();
  });

  it('enumerates every decorated method on a controller', () => {
    class Controller {
      @Get('/users')
      public list(): void {
        // intentionally empty
      }

      @Post('/users')
      public create(): void {
        // intentionally empty
      }

      public helper(): void {
        // not a route
      }
    }

    expect(getRouteHandlerNames(Controller)).toEqual(['list', 'create']);
    const definitions = getRouteDefinitions(Controller);
    expect(definitions).toHaveLength(2);
    expect(definitions.map((d) => d.method)).toEqual(['GET', 'POST']);
  });

  it('returns an empty list for a controller with no HTTP method decorators', () => {
    class Controller {}
    expect(getRouteHandlerNames(Controller)).toEqual([]);
    expect(getRouteDefinitions(Controller)).toEqual([]);
  });

  it('inherits route handlers and their definitions from a base controller', () => {
    class BaseController {
      @Get('/base')
      public baseHandler(): void {
        // intentionally empty
      }
    }

    class SubController extends BaseController {
      @Post('/sub')
      public subHandler(): void {
        // intentionally empty
      }
    }

    expect(getRouteHandlerNames(SubController)).toEqual(['baseHandler', 'subHandler']);
    const definitions = getRouteDefinitions(SubController);
    expect(definitions.map((d) => d.path)).toEqual(['/base', '/sub']);
  });
});
