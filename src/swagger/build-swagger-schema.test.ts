import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { ControllerMetadata } from '../decorators/controller-metadata.js';
import type { RouteDefinition } from '../decorators/http-method.types.js';
import { ApiOperation } from './api-operation.decorator.js';
import { ApiResponse } from './api-response.decorator.js';
import { ApiSecurity } from './api-security.decorator.js';
import { ApiTags } from './api-tags.decorator.js';
import { buildSwaggerSchema } from './build-swagger-schema.js';

function controllerMetadata(overrides: Partial<ControllerMetadata> = {}): ControllerMetadata {
  return {
    path: '/users',
    version: undefined,
    tags: [],
    group: undefined,
    scope: 'singleton',
    ...overrides,
  };
}

function routeDefinition(overrides: Partial<RouteDefinition> = {}): RouteDefinition {
  return {
    method: 'GET',
    handlerName: 'handle',
    path: '/',
    middleware: [],
    ...overrides,
  };
}

describe('buildSwaggerSchema: nothing to add', () => {
  it('returns undefined when there is no route.schema and no Swagger metadata at all', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition(),
      Controller.prototype,
    );
    expect(result).toBeUndefined();
  });

  it("returns route.schema unchanged when it's set but nothing else contributes", () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    const schema = { body: { type: 'object' } };
    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition({ schema }),
      Controller.prototype,
    );
    expect(result).toBe(schema);
  });
});

describe('buildSwaggerSchema: tags', () => {
  it("merges the controller's @Tag tags with the route's @ApiTags", () => {
    class Controller {
      @ApiTags('detail')
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata({ tags: ['users'] }),
      routeDefinition(),
      Controller.prototype,
    );
    expect(result?.tags).toEqual(['users', 'detail']);
  });

  it('dedupes a tag that appears both at the controller and route level', () => {
    class Controller {
      @ApiTags('users')
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata({ tags: ['users'] }),
      routeDefinition(),
      Controller.prototype,
    );
    expect(result?.tags).toEqual(['users']);
  });
});

describe('buildSwaggerSchema: operation fields', () => {
  it('uses the inline route options when there is no @ApiOperation', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition({ summary: 'List users', deprecated: true }),
      Controller.prototype,
    );
    expect(result?.summary).toBe('List users');
    expect(result?.deprecated).toBe(true);
  });

  it('@ApiOperation overrides the inline route option field-by-field', () => {
    class Controller {
      @ApiOperation({ summary: 'From decorator', operationId: 'listUsers' })
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition({ summary: 'From route option', description: 'From route option' }),
      Controller.prototype,
    );
    expect(result?.summary).toBe('From decorator');
    expect(result?.operationId).toBe('listUsers');
    // @ApiOperation didn't set `description`, so the route option's value still shows through.
    expect(result?.description).toBe('From route option');
  });
});

describe('buildSwaggerSchema: responses', () => {
  it('merges the route.response option into schema.response', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition({ response: { status: 404, description: 'Not found' } }),
      Controller.prototype,
    );
    expect(result?.response).toEqual({ '404': { description: 'Not found' } });
  });

  it('merges @ApiResponse entries alongside the route.response option', () => {
    class Controller {
      @ApiResponse({ status: 400, description: 'Bad request' })
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition({ response: { status: 200, description: 'OK' } }),
      Controller.prototype,
    );
    expect(result?.response).toEqual({
      '200': { description: 'OK' },
      '400': { description: 'Bad request' },
    });
  });

  it('accepts route.response as an array of entries', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition({
        response: [
          { status: 200, description: 'OK' },
          { status: 404, description: 'Not found' },
        ],
      }),
      Controller.prototype,
    );
    expect(result?.response).toEqual({
      '200': { description: 'OK' },
      '404': { description: 'Not found' },
    });
  });

  it('defaults a response with no status to 200', () => {
    class Controller {
      @ApiResponse({ description: 'OK' })
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition(),
      Controller.prototype,
    );
    expect(result?.response).toEqual({ '200': { description: 'OK' } });
  });

  it('never overrides a status code already present in route.schema.response', () => {
    class Controller {
      @ApiResponse({ status: 200, description: 'Documentation-only description' })
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition({
        schema: { response: { 200: { type: 'object', properties: {} } } },
      }),
      Controller.prototype,
    );
    expect(result?.response).toEqual({ '200': { type: 'object', properties: {} } });
  });

  it('spreads a schema alongside the description on a documentation-only response', () => {
    class Controller {
      @ApiResponse({ status: 201, description: 'Created', schema: { type: 'object' } })
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition(),
      Controller.prototype,
    );
    expect(result?.response).toEqual({
      '201': { description: 'Created', type: 'object' },
    });
  });
});

describe('buildSwaggerSchema: security', () => {
  it("merges the controller's @ApiSecurity with the route's own", () => {
    @ApiSecurity('apiKey')
    class Controller {
      @ApiSecurity('bearerAuth', ['read:users'])
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition(),
      Controller.prototype,
    );
    expect(result?.security).toEqual([{ apiKey: [] }, { bearerAuth: ['read:users'] }]);
  });

  it('omits the security field entirely when nothing declared it', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    const result = buildSwaggerSchema(
      Controller,
      controllerMetadata(),
      routeDefinition({ schema: { body: {} } }),
      Controller.prototype,
    );
    expect(result?.security).toBeUndefined();
  });
});
