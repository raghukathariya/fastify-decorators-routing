import 'reflect-metadata';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { Injectable } from '../container/injectable.decorator.js';
import { resolveControllerMetadata } from '../decorators/controller-metadata.js';
import { Controller } from '../decorators/controller.decorator.js';
import { Get, Post } from '../decorators/http-method.decorator.js';
import { Body, Param } from '../decorators/param.decorator.js';
import { PluginError } from '../errors/plugin.error.js';
import { After, Before, OnRequest, OnSend, PreValidation } from '../hooks/index.js';
import { Use } from '../middlewares/use.decorator.js';
import { RequestScopeManager } from './request-scope.js';
import { registerControllerRoutes } from './route-registration.js';

describe('registerControllerRoutes', () => {
  it('registers a GET route that responds correctly', async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id')
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(UserController);
    const metadata = resolveControllerMetadata(UserController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      UserController,
      metadata,
      new RequestScopeManager(container),
    );

    const response = await app.inject({ method: 'GET', url: '/users/42' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: '42' });
  });

  it('registers a POST route that reads the request body', async () => {
    @Controller('/users')
    class UserController {
      @Post('/')
      public createUser(@Body() body: unknown): object {
        return { created: body };
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(UserController);
    const metadata = resolveControllerMetadata(UserController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      UserController,
      metadata,
      new RequestScopeManager(container),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'Ada' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ created: { name: 'Ada' } });
  });

  it("registers every method for an 'ALL' route", async () => {
    const { All } = await import('../decorators/http-method.decorator.js');

    @Controller('/ping')
    class PingController {
      @All('/')
      public handle(): string {
        return 'pong';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(PingController);
    const metadata = resolveControllerMetadata(PingController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      PingController,
      metadata,
      new RequestScopeManager(container),
    );

    const get = await app.inject({ method: 'GET', url: '/ping' });
    const post = await app.inject({ method: 'POST', url: '/ping' });
    expect(get.statusCode).toBe(200);
    expect(post.statusCode).toBe(200);
  });

  it('applies route middleware as a preHandler', async () => {
    const calls: string[] = [];

    @Controller('/secure')
    class SecureController {
      @Get('/', {
        middleware: [
          (_req, _reply, done) => {
            calls.push('middleware');
            done();
          },
        ],
      })
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(SecureController);
    const metadata = resolveControllerMetadata(SecureController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      SecureController,
      metadata,
      new RequestScopeManager(container),
    );

    await app.inject({ method: 'GET', url: '/secure' });
    expect(calls).toEqual(['middleware', 'handler']);
  });

  it('accepts a single (non-array) preHandler hook, run ahead of route middleware', async () => {
    const calls: string[] = [];

    @Controller('/secure')
    class SecureController {
      @Get('/', {
        hooks: {
          preHandler: (_req, _reply, done) => {
            calls.push('hook');
            done();
          },
        },
        middleware: [
          (_req, _reply, done) => {
            calls.push('middleware');
            done();
          },
        ],
      })
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(SecureController);
    const metadata = resolveControllerMetadata(SecureController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      SecureController,
      metadata,
      new RequestScopeManager(container),
    );

    await app.inject({ method: 'GET', url: '/secure' });
    expect(calls).toEqual(['hook', 'middleware', 'handler']);
  });

  it('applies a JSON schema to the route for request validation', async () => {
    @Controller('/users')
    class UserController {
      @Get('/', {
        schema: {
          querystring: {
            type: 'object',
            properties: { page: { type: 'number' } },
            required: ['page'],
          },
        },
      })
      public list(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(UserController);
    const metadata = resolveControllerMetadata(UserController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      UserController,
      metadata,
      new RequestScopeManager(container),
    );

    const missingPage = await app.inject({ method: 'GET', url: '/users' });
    expect(missingPage.statusCode).toBe(400);

    const withPage = await app.inject({ method: 'GET', url: '/users?page=1' });
    expect(withPage.statusCode).toBe(200);
  });

  it('wraps a Fastify registration failure (duplicate route) in a PluginError', async () => {
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): string {
        return 'ok';
      }

      @Get('/')
      public listAgain(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(UserController);
    const metadata = resolveControllerMetadata(UserController);
    if (!metadata) throw new Error('not a controller');

    await expect(
      registerControllerRoutes(
        app,
        container,
        UserController,
        metadata,
        new RequestScopeManager(container),
      ),
    ).rejects.toThrow(PluginError);
  });

  it('reflects controller scope through to the running route (scoped example)', async () => {
    let instanceCount = 0;
    @Injectable({ scope: 'scoped' })
    class Counter {
      public readonly id = ++instanceCount;
    }

    @Controller('/scoped', { scope: 'scoped' })
    class ScopedController {
      public constructor(public counter: Counter) {}

      @Get('/')
      public handle(): { id: number } {
        return { id: this.counter.id };
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(Counter);
    container.registerClass(ScopedController);
    const metadata = resolveControllerMetadata(ScopedController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      ScopedController,
      metadata,
      new RequestScopeManager(container),
    );

    const first = await app.inject({ method: 'GET', url: '/scoped' });
    const second = await app.inject({ method: 'GET', url: '/scoped' });

    const firstBody = first.json<{ id: number }>();
    const secondBody = second.json<{ id: number }>();
    // Each injected request is a distinct HTTP request, so each gets its own scope.
    expect(firstBody.id).not.toBe(secondBody.id);
  });

  it('runs middleware in order: route hooks.preHandler → route @Use → route { middleware }', async () => {
    const calls: string[] = [];

    @Controller('/order')
    class OrderController {
      @Get('/', {
        hooks: {
          preHandler: (_req, _reply, done) => {
            calls.push('hooks.preHandler');
            done();
          },
        },
        middleware: [
          (_req, _reply, done) => {
            calls.push('options.middleware');
            done();
          },
        ],
      })
      @Use((_req, _reply, done) => {
        calls.push('@Use');
        done();
      })
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(OrderController);
    const metadata = resolveControllerMetadata(OrderController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      OrderController,
      metadata,
      new RequestScopeManager(container),
    );

    await app.inject({ method: 'GET', url: '/order' });
    expect(calls).toEqual(['hooks.preHandler', '@Use', 'options.middleware', 'handler']);
  });

  it('slots @PreHandler/@Before between route hooks.preHandler and route @Use', async () => {
    const calls: string[] = [];

    @Controller('/order')
    class OrderController {
      @Get('/', {
        hooks: {
          preHandler: (_req, _reply, done) => {
            calls.push('hooks.preHandler');
            done();
          },
        },
        middleware: [
          (_req, _reply, done) => {
            calls.push('options.middleware');
            done();
          },
        ],
      })
      @Use((_req, _reply, done) => {
        calls.push('@Use');
        done();
      })
      @Before((_req, _reply, done) => {
        calls.push('@Before');
        done();
      })
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(OrderController);
    const metadata = resolveControllerMetadata(OrderController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      OrderController,
      metadata,
      new RequestScopeManager(container),
    );

    await app.inject({ method: 'GET', url: '/order' });
    expect(calls).toEqual(['hooks.preHandler', '@Before', '@Use', 'options.middleware', 'handler']);
  });

  it('runs @OnRequest, @PreValidation, and @OnSend/@After at their native Fastify lifecycle points', async () => {
    const calls: string[] = [];

    @Controller('/widgets')
    class WidgetController {
      @Get('/')
      @OnRequest((_req, _reply, done) => {
        calls.push('onRequest');
        done();
      })
      @PreValidation((_req, _reply, done) => {
        calls.push('preValidation');
        done();
      })
      @OnSend((_req, _reply, payload, done) => {
        calls.push('onSend');
        done(null, payload);
      })
      @After((_req, _reply, payload, done) => {
        calls.push('after');
        done(null, payload);
      })
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(WidgetController);
    const metadata = resolveControllerMetadata(WidgetController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      WidgetController,
      metadata,
      new RequestScopeManager(container),
    );

    const response = await app.inject({ method: 'GET', url: '/widgets' });
    expect(response.statusCode).toBe(200);
    // Decorators apply bottom-up: @After (closer to the method) records before @OnSend, so
    // within the merged onSend array @After's hook runs first.
    expect(calls).toEqual(['onRequest', 'preValidation', 'handler', 'after', 'onSend']);
  });

  it('composes decorator hooks after the equivalent { hooks } route option, for the same lifecycle point', async () => {
    const calls: string[] = [];

    @Controller('/widgets')
    class WidgetController {
      @Get('/', {
        hooks: {
          onRequest: (_req, _reply, done) => {
            calls.push('hooks.onRequest');
            done();
          },
        },
      })
      @OnRequest((_req, _reply, done) => {
        calls.push('@OnRequest');
        done();
      })
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(WidgetController);
    const metadata = resolveControllerMetadata(WidgetController);
    if (!metadata) throw new Error('not a controller');

    await registerControllerRoutes(
      app,
      container,
      WidgetController,
      metadata,
      new RequestScopeManager(container),
    );

    await app.inject({ method: 'GET', url: '/widgets' });
    expect(calls).toEqual(['hooks.onRequest', '@OnRequest', 'handler']);
  });

  it("isolates a controller's @Use middleware from sibling controllers", async () => {
    const calls: string[] = [];

    @Use((_req, _reply, done) => {
      calls.push('controllerA-middleware');
      done();
    })
    @Controller('/a')
    class ControllerA {
      @Get('/')
      public handle(): string {
        calls.push('a-handler');
        return 'ok';
      }
    }

    @Controller('/b')
    class ControllerB {
      @Get('/')
      public handle(): string {
        calls.push('b-handler');
        return 'ok';
      }
    }

    const app = Fastify();
    const container = new Container();
    container.registerClass(ControllerA);
    container.registerClass(ControllerB);
    const metadataA = resolveControllerMetadata(ControllerA);
    const metadataB = resolveControllerMetadata(ControllerB);
    if (!metadataA || !metadataB) throw new Error('not a controller');

    const requestScopes = new RequestScopeManager(container);
    await registerControllerRoutes(app, container, ControllerA, metadataA, requestScopes);
    await registerControllerRoutes(app, container, ControllerB, metadataB, requestScopes);

    await app.inject({ method: 'GET', url: '/b' });
    expect(calls).toEqual(['b-handler']);

    calls.length = 0;
    await app.inject({ method: 'GET', url: '/a' });
    expect(calls).toEqual(['controllerA-middleware', 'a-handler']);
  });
});
