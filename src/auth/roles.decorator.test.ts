import 'reflect-metadata';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { ForbiddenException, UnauthorizedException } from '../exceptions/http-exceptions.js';
import { runGuards } from '../guards/guard-execution.js';
import { getControllerGuards, getRouteGuards } from '../guards/use-guard.decorator.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { Roles } from './roles.decorator.js';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    request: { user } as unknown as FastifyRequest,
    reply: {} as unknown as FastifyReply,
    controller: class {},
    handlerName: 'handle',
  };
}

describe('@Roles', () => {
  it('allows the request when the user has one of the required roles', async () => {
    class Controller {
      @Roles('admin', 'moderator')
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    const allowed = await runGuards(
      guards,
      contextWithUser({ roles: ['moderator'] }),
      new Container(),
    );
    expect(allowed).toBe(true);
  });

  it('throws ForbiddenException when the user has none of the required roles', async () => {
    class Controller {
      @Roles('admin')
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    await expect(
      runGuards(guards, contextWithUser({ roles: ['viewer'] }), new Container()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws UnauthorizedException when there is no authenticated user', async () => {
    class Controller {
      @Roles('admin')
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    await expect(
      runGuards(guards, contextWithUser(undefined), new Container()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('works as a controller-level decorator applying to every route', async () => {
    @Roles('admin')
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getControllerGuards(Controller);
    await expect(
      runGuards(guards, contextWithUser({ roles: [] }), new Container()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
