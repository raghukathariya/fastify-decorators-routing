import type { ExecutionContext } from '../interfaces/execution-context.js';
import type { Interceptor, NextFn } from './interceptor.types.js';

export interface TimingInterceptorOptions {
  /** Response header to report the duration on. Defaults to `'x-response-time-ms'`. */
  header?: string;
}

/**
 * Measures how long the rest of the pipeline (any inner interceptors, then the handler) took,
 * and reports it as a response header. Safe to set the header this late: it runs before this
 * function's promise resolves, and Fastify only sends the response after that.
 */
export class TimingInterceptor implements Interceptor {
  private readonly header: string;

  public constructor(options: TimingInterceptorOptions = {}) {
    this.header = options.header ?? 'x-response-time-ms';
  }

  public async intercept(context: ExecutionContext, next: NextFn): Promise<unknown> {
    const start = performance.now();
    try {
      return await next();
    } finally {
      context.reply.header(this.header, (performance.now() - start).toFixed(2));
    }
  }
}
