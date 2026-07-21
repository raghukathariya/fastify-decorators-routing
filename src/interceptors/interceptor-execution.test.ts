import 'reflect-metadata';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { Injectable } from '../container/injectable.decorator.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { composeInterceptors } from './interceptor-execution.js';
import type { Interceptor, InterceptorLike, NextFn } from './interceptor.types.js';
import { UseInterceptor } from './use-interceptor.decorator.js';

function fakeContext(): ExecutionContext {
  return {
    request: {} as unknown as FastifyRequest,
    reply: {} as unknown as FastifyReply,
    controller: class {},
    handlerName: 'handle',
  };
}

describe('composeInterceptors: no interceptors', () => {
  it('calls straight through to the final handler when neither controller nor route has any', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    const finalNext = () => 'handler-result';
    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      finalNext,
    );

    expect(chain()).toBe('handler-result');
  });
});

describe('composeInterceptors: single interceptor', () => {
  it('lets an interceptor run logic before and after calling next()', async () => {
    const calls: string[] = [];
    const interceptor: InterceptorLike = async (_context, next) => {
      calls.push('before');
      const result = await next();
      calls.push('after');
      return result;
    };

    @UseInterceptor(interceptor)
    class Controller {
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const finalNext = () => {
      return new Controller().handle();
    };
    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      finalNext,
    );

    const result = await chain();
    expect(result).toBe('ok');
    expect(calls).toEqual(['before', 'handler', 'after']);
  });

  it('lets an interceptor transform the response', async () => {
    const interceptor: InterceptorLike = async (_context, next) => {
      const result = await next();
      return { wrapped: result };
    };

    @UseInterceptor(interceptor)
    class Controller {
      public handle(): string {
        return 'raw';
      }
    }

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      () => 'raw',
    );

    expect(await chain()).toEqual({ wrapped: 'raw' });
  });

  it('lets an interceptor short-circuit and never call next() (caching-style)', async () => {
    const nextSpy = { called: false };
    const interceptor: InterceptorLike = () => 'cached-value';

    @UseInterceptor(interceptor)
    class Controller {}

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      () => {
        nextSpy.called = true;
        return 'fresh-value';
      },
    );

    expect(await chain()).toBe('cached-value');
    expect(nextSpy.called).toBe(false);
  });

  it('lets an interceptor catch an error from next() and recover (error interception)', async () => {
    const interceptor: InterceptorLike = async (_context, next) => {
      try {
        return await next();
      } catch {
        return 'recovered';
      }
    };

    @UseInterceptor(interceptor)
    class Controller {}

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      () => {
        throw new Error('boom');
      },
    );

    expect(await chain()).toBe('recovered');
  });

  it('propagates an error from next() when the interceptor does not catch it', () => {
    // A fully synchronous chain (a plain function interceptor calling a synchronously-throwing
    // finalNext) throws synchronously rather than returning a rejected promise — by design, so a
    // route with no async interceptors pays nothing for promise wrapping it doesn't need.
    const interceptor: InterceptorLike = (_context, next) => next();

    @UseInterceptor(interceptor)
    class Controller {}

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      () => {
        throw new Error('boom');
      },
    );

    expect(() => chain()).toThrow('boom');
  });

  it('propagates an error as a rejected promise when any part of the chain is async', async () => {
    // Deliberately async with no internal await: this is exactly what makes chain() return a
    // promise instead of throwing synchronously, which is the behavior under test.
    // eslint-disable-next-line @typescript-eslint/require-await
    const interceptor: InterceptorLike = async (_context, next) => next();

    @UseInterceptor(interceptor)
    class Controller {}

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      () => {
        throw new Error('boom');
      },
    );

    await expect(chain()).rejects.toThrow('boom');
  });
});

describe('composeInterceptors: multiple interceptors', () => {
  it('runs controller-level interceptors outside route-level ones', async () => {
    const calls: string[] = [];
    const controllerInterceptor: InterceptorLike = async (_c, next) => {
      calls.push('controller-before');
      const result = await next();
      calls.push('controller-after');
      return result;
    };
    const routeInterceptor: InterceptorLike = async (_c, next) => {
      calls.push('route-before');
      const result = await next();
      calls.push('route-after');
      return result;
    };

    @UseInterceptor(controllerInterceptor)
    class Controller {
      @UseInterceptor(routeInterceptor)
      public handle(): void {
        calls.push('handler');
      }
    }

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      () => calls.push('handler'),
    );

    await chain();
    expect(calls).toEqual([
      'controller-before',
      'route-before',
      'handler',
      'route-after',
      'controller-after',
    ]);
  });
});

describe('composeInterceptors: class and instance interceptors', () => {
  it('resolves an interceptor class through the DI container, auto-registering it', async () => {
    @Injectable()
    class MyInterceptor implements Interceptor {
      public intercept(_context: ExecutionContext, next: NextFn): unknown {
        return next();
      }
    }

    @UseInterceptor(MyInterceptor)
    class Controller {}

    const container = new Container();
    expect(container.has(MyInterceptor)).toBe(false);

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      container,
      () => 'ok',
    );

    expect(await chain()).toBe('ok');
    expect(container.has(MyInterceptor)).toBe(true);
  });

  it('supports an interceptor class with its own injected dependencies', async () => {
    @Injectable()
    class MetricsService {
      public recorded = false;
      public record(): void {
        this.recorded = true;
      }
    }

    @Injectable()
    class MetricsInterceptor implements Interceptor {
      public constructor(private readonly metrics: MetricsService) {}
      public intercept(_context: ExecutionContext, next: NextFn): unknown {
        this.metrics.record();
        return next();
      }
    }

    @UseInterceptor(MetricsInterceptor)
    class Controller {}

    const container = new Container();
    container.registerClass(MetricsService);

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      container,
      () => 'ok',
    );
    await chain();

    expect(container.resolve(MetricsService).recorded).toBe(true);
  });

  it('accepts a pre-built Interceptor instance', async () => {
    const instance: Interceptor = {
      intercept: (_context, next) => next(),
    };

    @UseInterceptor(instance)
    class Controller {}

    const chain = composeInterceptors(
      Controller,
      Controller.prototype,
      'handle',
      fakeContext(),
      new Container(),
      () => 'ok',
    );

    expect(await chain()).toBe('ok');
  });
});
