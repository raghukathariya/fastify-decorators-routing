import 'reflect-metadata';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { UnauthorizedException } from '../exceptions/http-exceptions.js';
import { runGuards } from '../guards/guard-execution.js';
import { getControllerGuards, getRouteGuards } from '../guards/use-guard.decorator.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { Authenticated } from './authenticated.decorator.js';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    request: { user } as unknown as FastifyRequest,
    reply: {} as unknown as FastifyReply,
    controller: class {},
    handlerName: 'handle',
  };
}

describe('@Authenticated on a controller class', () => {
  it('registers exactly one guard as a controller-level guard', () => {
    @Authenticated()
    class Controller {}

    expect(getControllerGuards(Controller)).toHaveLength(1);
  });
});

describe('@Authenticated on a route method', () => {
  it('registers exactly one guard as a route-level guard', () => {
    class Controller {
      @Authenticated()
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteGuards(Controller.prototype, 'handle')).toHaveLength(1);
  });

  it('allows the request through when request.user is set', async () => {
    class Controller {
      @Authenticated()
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    const allowed = await runGuards(guards, contextWithUser({ id: '1' }), new Container());
    expect(allowed).toBe(true);
  });

  it('throws UnauthorizedException when request.user is undefined', async () => {
    class Controller {
      @Authenticated()
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    await expect(
      runGuards(guards, contextWithUser(undefined), new Container()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when request.user is null', async () => {
    class Controller {
      @Authenticated()
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    await expect(runGuards(guards, contextWithUser(null), new Container())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
