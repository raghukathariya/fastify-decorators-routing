import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { LoggingInterceptor } from './logging.interceptor.js';

function fakeContext(log: Partial<FastifyBaseLogger>): ExecutionContext {
  return {
    request: { log } as unknown as FastifyRequest,
    reply: {} as unknown as FastifyReply,
    controller: class UserController {},
    handlerName: 'list',
  };
}

describe('LoggingInterceptor', () => {
  it('logs entry and exit around a successful call, naming the controller and handler', async () => {
    const info = vi.fn();
    const interceptor = new LoggingInterceptor();

    const result = await interceptor.intercept(fakeContext({ info }), () => 'ok');

    expect(result).toBe('ok');
    expect(info).toHaveBeenCalledWith(expect.stringContaining('UserController.list'));
    expect(info.mock.calls[0]?.[0]).toContain('→');
    expect(info.mock.calls[1]?.[0]).toContain('ok');
  });

  it('logs an error and rethrows it without swallowing the failure', async () => {
    const info = vi.fn();
    const error = vi.fn();
    const interceptor = new LoggingInterceptor();

    await expect(
      interceptor.intercept(fakeContext({ info, error }), () => {
        throw new Error('handler failed');
      }),
    ).rejects.toThrow('handler failed');

    expect(error).toHaveBeenCalledWith(expect.stringContaining('handler failed'));
  });

  it('awaits an async handler before logging the exit', async () => {
    const info = vi.fn();
    const interceptor = new LoggingInterceptor();

    const result = await interceptor.intercept(fakeContext({ info }), async () =>
      Promise.resolve('async-ok'),
    );

    expect(result).toBe('async-ok');
    expect(info).toHaveBeenCalledTimes(2);
  });
});
