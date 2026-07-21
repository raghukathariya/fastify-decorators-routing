import 'reflect-metadata';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { Injectable } from '../container/injectable.decorator.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { Catch } from './catch.decorator.js';
import { handleException } from './exception-execution.js';
import type { ExceptionFilter, ExceptionFilterLike } from './exception-filter.types.js';
import { BadRequestException, NotFoundException } from './http-exceptions.js';

function fakeContext(): {
  context: ExecutionContext;
  getSent: () => { statusCode?: number; body?: unknown };
} {
  const sent: { statusCode?: number; body?: unknown } = {};
  const reply = {
    sent: false,
    code(statusCode: number) {
      sent.statusCode = statusCode;
      return this;
    },
    send(body: unknown) {
      sent.body = body;
      (reply as unknown as { sent: boolean }).sent = true;
    },
  } as unknown as FastifyReply;

  return {
    context: {
      request: {} as unknown as FastifyRequest,
      reply,
      controller: class {},
      handlerName: 'handle',
    },
    getSent: () => sent,
  };
}

describe('handleException: no filters', () => {
  it('sends the correct status and body for an HttpException', async () => {
    const { context, getSent } = fakeContext();
    await handleException(new NotFoundException('User not found'), context, new Container(), []);

    expect(getSent()).toEqual({
      statusCode: 404,
      body: { statusCode: 404, error: 'Not Found', message: 'User not found' },
    });
  });

  it('sends a generic 500 for a plain Error', async () => {
    const { context, getSent } = fakeContext();
    await handleException(new Error('boom'), context, new Container(), []);

    expect(getSent()).toEqual({
      statusCode: 500,
      body: { statusCode: 500, error: 'Internal Server Error', message: 'boom' },
    });
  });

  it('sends a generic 500 for a non-Error thrown value', async () => {
    const { context, getSent } = fakeContext();
    await handleException('a string was thrown', context, new Container(), []);

    expect(getSent().statusCode).toBe(500);
    expect((getSent().body as { message: string }).message).toBe('Internal Server Error');
  });
});

describe('handleException: filter matching', () => {
  it('uses a catch-all filter (no @Catch types) for any exception', async () => {
    const filter: ExceptionFilterLike = (exception) => ({ handled: (exception as Error).message });
    const { context, getSent } = fakeContext();

    await handleException(new Error('boom'), context, new Container(), [filter]);

    expect(getSent().body).toEqual({ handled: 'boom' });
  });

  it('skips a class filter whose @Catch types do not match, falling through to default handling', async () => {
    @Catch(BadRequestException)
    class WrongFilter implements ExceptionFilter {
      public catch(): unknown {
        return { shouldNotBeCalled: true };
      }
    }

    const { context, getSent } = fakeContext();
    await handleException(new NotFoundException(), context, new Container(), [WrongFilter]);

    expect(getSent().body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  });

  it('uses the first filter whose @Catch types match', async () => {
    @Catch(NotFoundException)
    class NotFoundFilter implements ExceptionFilter {
      public catch(): unknown {
        return { matched: 'NotFoundFilter' };
      }
    }

    const { context, getSent } = fakeContext();
    await handleException(new NotFoundException(), context, new Container(), [NotFoundFilter]);

    expect(getSent().body).toEqual({ matched: 'NotFoundFilter' });
    expect(getSent().statusCode).toBe(404);
  });

  it('tries filters in order and uses the first one that matches', async () => {
    @Catch(BadRequestException)
    class BadRequestFilter implements ExceptionFilter {
      public catch(): unknown {
        return { matched: 'BadRequestFilter' };
      }
    }
    @Catch(NotFoundException)
    class NotFoundFilter implements ExceptionFilter {
      public catch(): unknown {
        return { matched: 'NotFoundFilter' };
      }
    }

    const { context, getSent } = fakeContext();
    await handleException(new NotFoundException(), context, new Container(), [
      BadRequestFilter,
      NotFoundFilter,
    ]);

    expect(getSent().body).toEqual({ matched: 'NotFoundFilter' });
  });

  it('matches a subclass of a @Catch-declared type via instanceof', async () => {
    class SpecificNotFound extends NotFoundException {}

    @Catch(NotFoundException)
    class NotFoundFilter implements ExceptionFilter {
      public catch(): unknown {
        return { matched: true };
      }
    }

    const { context, getSent } = fakeContext();
    await handleException(new SpecificNotFound(), context, new Container(), [NotFoundFilter]);

    expect(getSent().body).toEqual({ matched: true });
  });
});

describe('handleException: filter forms', () => {
  it('resolves a filter class through the DI container, auto-registering it', async () => {
    @Injectable()
    class MyFilter implements ExceptionFilter {
      public catch(exception: unknown): unknown {
        return { message: (exception as Error).message };
      }
    }

    const container = new Container();
    expect(container.has(MyFilter)).toBe(false);

    const { context, getSent } = fakeContext();
    await handleException(new Error('boom'), context, container, [MyFilter]);

    expect(getSent().body).toEqual({ message: 'boom' });
    expect(container.has(MyFilter)).toBe(true);
  });

  it('supports a filter class with its own injected dependencies', async () => {
    @Injectable()
    class LoggerService {
      public logged: string[] = [];
      public log(message: string): void {
        this.logged.push(message);
      }
    }

    @Injectable()
    class LoggingFilter implements ExceptionFilter {
      public constructor(private readonly logger: LoggerService) {}
      public catch(exception: unknown): unknown {
        this.logger.log((exception as Error).message);
        return { logged: true };
      }
    }

    const container = new Container();
    container.registerClass(LoggerService);

    const { context, getSent } = fakeContext();
    await handleException(new Error('boom'), context, container, [LoggingFilter]);

    expect(getSent().body).toEqual({ logged: true });
    expect(container.resolve(LoggerService).logged).toEqual(['boom']);
  });

  it('accepts a pre-built ExceptionFilter instance', async () => {
    const instance: ExceptionFilter = { catch: () => ({ fromInstance: true }) };
    const { context, getSent } = fakeContext();

    await handleException(new Error('boom'), context, new Container(), [instance]);

    expect(getSent().body).toEqual({ fromInstance: true });
  });

  it("leaves the reply alone when a filter sends it manually, ignoring the filter's return value", async () => {
    const filter: ExceptionFilterLike = (_exception, context) => {
      context.reply.code(418).send({ manuallySent: true });
      return { thisShouldBeIgnored: true };
    };

    const { context, getSent } = fakeContext();
    await handleException(new Error('boom'), context, new Container(), [filter]);

    expect(getSent()).toEqual({ statusCode: 418, body: { manuallySent: true } });
  });
});
