import 'reflect-metadata';
import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { Container } from '../container/container.js';
import { Injectable } from '../container/injectable.decorator.js';
import { Get } from '../decorators/http-method.decorator.js';
import { Body, Param } from '../decorators/param.decorator.js';
import { getRouteDefinition } from '../decorators/http-method.decorator.js';
import { UseGuard } from '../guards/use-guard.decorator.js';
import { UseInterceptor } from '../interceptors/use-interceptor.decorator.js';
import type { InterceptorLike } from '../interceptors/interceptor.types.js';
import { RequestScopeManager } from './request-scope.js';
import { buildRouteHandler } from './route-handler.js';

function fakeRequest(overrides: Record<string, unknown> = {}): FastifyRequest {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  } as unknown as FastifyRequest;
}
const fakeReply = {} as unknown as FastifyReply;

/**
 * `RouteHandlerMethod`'s type requires a `this: FastifyInstance` binding, since Fastify always
 * calls handlers bound to the instance they were registered on. These tests call the built
 * handler directly rather than through a real Fastify instance, so `this` is irrelevant to the
 * behavior under test — cast it away rather than constructing a throwaway `FastifyInstance`.
 */
function invoke(
  handler: RouteHandlerMethod,
  request: FastifyRequest,
  reply: FastifyReply,
): unknown {
  const plainCall: (req: FastifyRequest, res: FastifyReply) => unknown = handler;
  return plainCall(request, reply);
}

describe('buildRouteHandler', () => {
  it('resolves the controller instance and invokes the decorated method with no parameters', async () => {
    @Injectable()
    class Controller {
      @Get('/ping')
      public handle(): string {
        return 'pong';
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    const result = await invoke(handler, fakeRequest(), fakeReply);
    expect(result).toBe('pong');
  });

  it('extracts and passes decorated parameters to the handler in order', async () => {
    @Injectable()
    class Controller {
      @Get('/users/:id')
      public handle(@Param('id') id: string, @Body() body: unknown): { id: string; body: unknown } {
        return { id, body };
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    const request = fakeRequest({ params: { id: '42' }, body: { name: 'Ada' } });
    const result = await invoke(handler, request, fakeReply);

    expect(result).toEqual({ id: '42', body: { name: 'Ada' } });
  });

  it('resolves a new instance per request for a transient controller', async () => {
    let instanceCount = 0;
    @Injectable({ scope: 'transient' })
    class Controller {
      public readonly id = ++instanceCount;

      @Get('/ping')
      public handle(): number {
        return this.id;
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'transient',
      container,
      new RequestScopeManager(container),
    );

    const first = await invoke(handler, fakeRequest(), fakeReply);
    const second = await invoke(handler, fakeRequest(), fakeReply);
    expect(first).not.toBe(second);
  });

  it('resolves the same instance across requests for a singleton controller', async () => {
    let instanceCount = 0;
    @Injectable({ scope: 'singleton' })
    class Controller {
      public readonly id = ++instanceCount;

      @Get('/ping')
      public handle(): number {
        return this.id;
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    const first = await invoke(handler, fakeRequest(), fakeReply);
    const second = await invoke(handler, fakeRequest(), fakeReply);
    expect(first).toBe(second);
  });

  it('resolves one instance per request for a scoped controller, shared across calls within it', async () => {
    let instanceCount = 0;
    @Injectable({ scope: 'scoped' })
    class Controller {
      public readonly id = ++instanceCount;

      @Get('/ping')
      public handle(): number {
        return this.id;
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const requestScopes = new RequestScopeManager(container);
    const handler = buildRouteHandler(Controller, route, 'scoped', container, requestScopes);

    const requestA = fakeRequest();
    const requestB = fakeRequest();

    const a1 = await invoke(handler, requestA, fakeReply);
    const a2 = await invoke(handler, requestA, fakeReply);
    const b1 = await invoke(handler, requestB, fakeReply);

    expect(a1).toBe(a2);
    expect(a1).not.toBe(b1);
  });

  it('supports an async handler method, awaiting its result', async () => {
    @Injectable()
    class Controller {
      @Get('/ping')
      public async handle(): Promise<string> {
        return Promise.resolve('async-pong');
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    await expect(invoke(handler, fakeRequest(), fakeReply)).resolves.toBe('async-pong');
  });

  it('rejects with 403 and never resolves the controller when a guard denies the request', async () => {
    let resolved = false;

    @Injectable()
    class Controller {
      public constructor() {
        resolved = true;
      }

      @UseGuard(() => false)
      @Get('/ping')
      public handle(): string {
        return 'pong';
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    const send = vi.fn();
    const code = vi.fn(() => ({ send }));
    const reply = { code } as unknown as FastifyReply;

    await invoke(handler, fakeRequest(), reply);

    expect(code).toHaveBeenCalledWith(403);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, error: 'Forbidden' }),
    );
    expect(resolved).toBe(false);
  });

  it('invokes the handler normally when every guard allows the request', async () => {
    @Injectable()
    class Controller {
      @UseGuard(() => true)
      @Get('/ping')
      public handle(): string {
        return 'pong';
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    await expect(invoke(handler, fakeRequest(), fakeReply)).resolves.toBe('pong');
  });

  it('runs the interceptor chain around the handler invocation', async () => {
    const calls: string[] = [];
    const interceptor: InterceptorLike = async (_context, next) => {
      calls.push('before');
      const result = await next();
      calls.push('after');
      return `${String(result)}-transformed`;
    };

    @Injectable()
    class Controller {
      @UseInterceptor(interceptor)
      @Get('/ping')
      public handle(): string {
        calls.push('handler');
        return 'pong';
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    const result = await invoke(handler, fakeRequest(), fakeReply);
    expect(result).toBe('pong-transformed');
    expect(calls).toEqual(['before', 'handler', 'after']);
  });

  it('runs interceptors only after a passing guard, never for a rejected request', async () => {
    const calls: string[] = [];
    const interceptor: InterceptorLike = (_context, next) => {
      calls.push('interceptor');
      return next();
    };

    @Injectable()
    class Controller {
      @UseGuard(() => false)
      @UseInterceptor(interceptor)
      @Get('/ping')
      public handle(): string {
        calls.push('handler');
        return 'pong';
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    const send = vi.fn();
    const reply = { code: vi.fn(() => ({ send })) } as unknown as FastifyReply;
    await invoke(handler, fakeRequest(), reply);

    expect(calls).toEqual([]);
  });

  it('skips building an interceptor chain entirely when there are none', async () => {
    @Injectable()
    class Controller {
      @Get('/ping')
      public handle(): string {
        return 'pong';
      }
    }

    const container = new Container();
    container.registerClass(Controller);
    const route = getRouteDefinition(Controller.prototype, 'handle');
    if (!route) throw new Error('route not found');

    const handler = buildRouteHandler(
      Controller,
      route,
      'singleton',
      container,
      new RequestScopeManager(container),
    );

    await expect(invoke(handler, fakeRequest(), fakeReply)).resolves.toBe('pong');
  });
});
