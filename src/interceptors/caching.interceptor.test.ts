import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { CachingInterceptor } from './caching.interceptor.js';

function fakeContext(method: string, url: string): ExecutionContext {
  return {
    request: { method, url } as unknown as FastifyRequest,
    reply: {} as unknown as FastifyReply,
    controller: class {},
    handlerName: 'handle',
  };
}

describe('CachingInterceptor', () => {
  it('calls next() and caches the result on the first call for a key', async () => {
    const next = vi.fn(() => 'fresh-value');
    const interceptor = new CachingInterceptor();

    const result = await interceptor.intercept(fakeContext('GET', '/users'), next);

    expect(result).toBe('fresh-value');
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns the cached value on a second call for the same key, without calling next() again', async () => {
    const next = vi.fn(() => 'fresh-value');
    const interceptor = new CachingInterceptor();

    await interceptor.intercept(fakeContext('GET', '/users'), next);
    const second = await interceptor.intercept(fakeContext('GET', '/users'), next);

    expect(second).toBe('fresh-value');
    expect(next).toHaveBeenCalledOnce();
  });

  it('uses independent cache entries for different default keys (method + url)', async () => {
    const interceptor = new CachingInterceptor();

    await interceptor.intercept(fakeContext('GET', '/users'), () => 'users-result');
    const ordersResult = await interceptor.intercept(
      fakeContext('GET', '/orders'),
      () => 'orders-result',
    );

    expect(ordersResult).toBe('orders-result');
  });

  it('expires a cached entry after the configured ttlMs', async () => {
    vi.useFakeTimers();
    try {
      const next = vi.fn(() => 'fresh-value');
      const interceptor = new CachingInterceptor({ ttlMs: 1000 });

      await interceptor.intercept(fakeContext('GET', '/users'), next);
      vi.advanceTimersByTime(1001);
      await interceptor.intercept(fakeContext('GET', '/users'), next);

      expect(next).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports a custom keyFn', async () => {
    const interceptor = new CachingInterceptor({
      keyFn: () => 'always-the-same-key',
    });
    const next = vi.fn(() => 'value');

    await interceptor.intercept(fakeContext('GET', '/a'), next);
    await interceptor.intercept(fakeContext('POST', '/b'), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('clear() removes every cached entry', async () => {
    const next = vi.fn(() => 'fresh-value');
    const interceptor = new CachingInterceptor();

    await interceptor.intercept(fakeContext('GET', '/users'), next);
    interceptor.clear();
    await interceptor.intercept(fakeContext('GET', '/users'), next);

    expect(next).toHaveBeenCalledTimes(2);
  });
});
