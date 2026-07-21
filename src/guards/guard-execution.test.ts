import 'reflect-metadata';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { Container } from '../container/container.js';
import { Injectable } from '../container/injectable.decorator.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { executeGuard, runGuards } from './guard-execution.js';
import type { CanActivate } from './guard.types.js';

function fakeContext(): ExecutionContext {
  return {
    request: {} as unknown as FastifyRequest,
    reply: {} as unknown as FastifyReply,
    controller: class {},
    handlerName: 'handle',
  };
}

describe('executeGuard', () => {
  it('runs a sync GuardFn and returns its result', async () => {
    const guard = (): boolean => true;
    expect(await executeGuard(guard, fakeContext(), new Container())).toBe(true);
  });

  it('runs an async GuardFn and awaits its result', async () => {
    const guard = async (): Promise<boolean> => Promise.resolve(false);
    expect(await executeGuard(guard, fakeContext(), new Container())).toBe(false);
  });

  it('runs a pre-built CanActivate instance', async () => {
    const guard: CanActivate = { canActivate: () => true };
    expect(await executeGuard(guard, fakeContext(), new Container())).toBe(true);
  });

  it('resolves a guard class through the DI container', async () => {
    @Injectable()
    class MyGuard implements CanActivate {
      public canActivate(): boolean {
        return true;
      }
    }

    const container = new Container();
    container.registerClass(MyGuard);

    expect(await executeGuard(MyGuard, fakeContext(), container)).toBe(true);
  });

  it('auto-registers a guard class the caller never registered themselves', async () => {
    @Injectable()
    class MyGuard implements CanActivate {
      public canActivate(): boolean {
        return true;
      }
    }

    const container = new Container();
    expect(container.has(MyGuard)).toBe(false);

    await executeGuard(MyGuard, fakeContext(), container);
    expect(container.has(MyGuard)).toBe(true);
  });

  it('supports a guard class with its own injected dependencies', async () => {
    @Injectable()
    class AuthService {
      public isValid(): boolean {
        return true;
      }
    }

    @Injectable()
    class AuthGuard implements CanActivate {
      public constructor(private readonly authService: AuthService) {}
      public canActivate(): boolean {
        return this.authService.isValid();
      }
    }

    const container = new Container();
    container.registerClass(AuthService);
    container.registerClass(AuthGuard);

    expect(await executeGuard(AuthGuard, fakeContext(), container)).toBe(true);
  });

  it('passes the execution context through to the guard', async () => {
    const guard = vi.fn(() => true);
    const context = fakeContext();

    await executeGuard(guard, context, new Container());

    expect(guard).toHaveBeenCalledWith(context);
  });
});

describe('runGuards', () => {
  it('returns true when every guard allows the request', async () => {
    const guards = [() => true, () => true, () => true];
    expect(await runGuards(guards, fakeContext(), new Container())).toBe(true);
  });

  it('returns false as soon as one guard rejects', async () => {
    const calls: number[] = [];
    const guards = [
      () => {
        calls.push(1);
        return true;
      },
      () => {
        calls.push(2);
        return false;
      },
      () => {
        calls.push(3);
        return true;
      },
    ];

    expect(await runGuards(guards, fakeContext(), new Container())).toBe(false);
    expect(calls).toEqual([1, 2]);
  });

  it('returns true for an empty guard list', async () => {
    expect(await runGuards([], fakeContext(), new Container())).toBe(true);
  });

  it('propagates an error thrown by a guard rather than treating it as a rejection', async () => {
    const guards = [
      () => {
        throw new Error('guard exploded');
      },
    ];

    await expect(runGuards(guards, fakeContext(), new Container())).rejects.toThrow(
      'guard exploded',
    );
  });
});
