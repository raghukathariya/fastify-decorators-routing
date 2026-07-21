import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { TimingInterceptor } from './timing.interceptor.js';

function fakeContext(header: (name: string, value: string) => void): ExecutionContext {
  return {
    request: {} as unknown as FastifyRequest,
    reply: { header } as unknown as FastifyReply,
    controller: class {},
    handlerName: 'handle',
  };
}

describe('TimingInterceptor', () => {
  it('sets a response header with the elapsed time, using the default header name', async () => {
    const header = vi.fn();
    const interceptor = new TimingInterceptor();

    await interceptor.intercept(fakeContext(header), () => 'ok');

    expect(header).toHaveBeenCalledWith(
      'x-response-time-ms',
      expect.stringMatching(/^\d+\.\d{2}$/),
    );
  });

  it('supports a custom header name', async () => {
    const header = vi.fn();
    const interceptor = new TimingInterceptor({ header: 'x-custom-timing' });

    await interceptor.intercept(fakeContext(header), () => 'ok');

    expect(header).toHaveBeenCalledWith('x-custom-timing', expect.any(String));
  });

  it('returns whatever next() resolved to, unmodified', async () => {
    const interceptor = new TimingInterceptor();
    const result = await interceptor.intercept(fakeContext(vi.fn()), () => ({ data: 'value' }));
    expect(result).toEqual({ data: 'value' });
  });

  it('still records timing and rethrows when next() throws', async () => {
    const header = vi.fn();
    const interceptor = new TimingInterceptor();

    await expect(
      interceptor.intercept(fakeContext(header), () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(header).toHaveBeenCalled();
  });
});
