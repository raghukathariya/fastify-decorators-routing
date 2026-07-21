import 'reflect-metadata';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { ForbiddenException, UnauthorizedException } from '../exceptions/http-exceptions.js';
import { runGuards } from '../guards/guard-execution.js';
import { getRouteGuards } from '../guards/use-guard.decorator.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { Permissions } from './permissions.decorator.js';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    request: { user } as unknown as FastifyRequest,
    reply: {} as unknown as FastifyReply,
    controller: class {},
    handlerName: 'handle',
  };
}

describe('@Permissions', () => {
  it('allows the request when the user has one of the required permissions', async () => {
    class Controller {
      @Permissions('billing:read', 'billing:refund')
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    const allowed = await runGuards(
      guards,
      contextWithUser({ permissions: ['billing:refund'] }),
      new Container(),
    );
    expect(allowed).toBe(true);
  });

  it('throws ForbiddenException when the user has none of the required permissions', async () => {
    class Controller {
      @Permissions('billing:refund')
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    await expect(
      runGuards(guards, contextWithUser({ permissions: ['billing:read'] }), new Container()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws UnauthorizedException when there is no authenticated user', async () => {
    class Controller {
      @Permissions('billing:refund')
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
