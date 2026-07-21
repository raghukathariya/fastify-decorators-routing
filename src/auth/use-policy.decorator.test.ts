import 'reflect-metadata';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { ForbiddenException, UnauthorizedException } from '../exceptions/http-exceptions.js';
import { runGuards } from '../guards/guard-execution.js';
import { getRouteGuards } from '../guards/use-guard.decorator.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { UsePolicy } from './use-policy.decorator.js';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    request: { user } as unknown as FastifyRequest,
    reply: {} as unknown as FastifyReply,
    controller: class {},
    handlerName: 'handle',
  };
}

describe('@UsePolicy', () => {
  it('allows the request when the policy resolves to true', async () => {
    class Controller {
      @UsePolicy((user) => (user as { id: string }).id === 'owner-1')
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    const allowed = await runGuards(guards, contextWithUser({ id: 'owner-1' }), new Container());
    expect(allowed).toBe(true);
  });

  it('throws ForbiddenException when the policy resolves to false', async () => {
    class Controller {
      @UsePolicy((user) => (user as { id: string }).id === 'owner-1')
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    await expect(
      runGuards(guards, contextWithUser({ id: 'someone-else' }), new Container()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('awaits an async policy', async () => {
    class Controller {
      @UsePolicy(async (user) => Promise.resolve((user as { id: string }).id === 'owner-1'))
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    const allowed = await runGuards(guards, contextWithUser({ id: 'owner-1' }), new Container());
    expect(allowed).toBe(true);
  });

  it('throws UnauthorizedException when there is no authenticated user, without calling the policy', async () => {
    class Controller {
      @UsePolicy(() => {
        throw new Error('policy should not run without a user');
      })
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    await expect(
      runGuards(guards, contextWithUser(undefined), new Container()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('passes the execution context through to the policy alongside the user', async () => {
    class Controller {
      @UsePolicy((user, ctx) => ctx.handlerName === 'handle' && user !== undefined)
      public handle(): void {
        // intentionally empty
      }
    }

    const guards = getRouteGuards(Controller.prototype, 'handle');
    const allowed = await runGuards(guards, contextWithUser({ id: '1' }), new Container());
    expect(allowed).toBe(true);
  });
});
