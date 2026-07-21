import type { ExecutionContext } from '../interfaces/execution-context.js';
import type { Interceptor, NextFn } from './interceptor.types.js';

export interface CachingInterceptorOptions {
  /** How long a cached result stays valid. Defaults to 60000ms (one minute). */
  ttlMs?: number;
  /** Derives the cache key from the request. Defaults to the request method and URL. */
  keyFn?: (context: ExecutionContext) => string;
}

function defaultKeyFn(context: ExecutionContext): string {
  return `${context.request.method}:${context.request.url}`;
}

/**
 * Caches the result of the rest of the pipeline (any inner interceptors, then the handler) in
 * memory, keyed by `options.keyFn` (defaulting to `METHOD:url`), for `options.ttlMs`. A cache hit
 * skips `next()` entirely — the handler never runs for that request.
 *
 * Construct with options and pass the *instance* to `@UseInterceptor` (`@UseInterceptor(new
 * CachingInterceptor({ ttlMs: 30_000 }))`) rather than the bare class, since the class itself
 * takes no DI-resolvable constructor dependencies to configure it from.
 */
export class CachingInterceptor implements Interceptor {
  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly keyFn: (context: ExecutionContext) => string;

  public constructor(options: CachingInterceptorOptions = {}) {
    this.ttlMs = options.ttlMs ?? 60_000;
    this.keyFn = options.keyFn ?? defaultKeyFn;
  }

  public async intercept(context: ExecutionContext, next: NextFn): Promise<unknown> {
    const key = this.keyFn(context);
    const now = Date.now();

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const value = await next();
    this.cache.set(key, { value, expiresAt: now + this.ttlMs });
    return value;
  }

  /** Removes every cached entry. Intended for tests. */
  public clear(): void {
    this.cache.clear();
  }
}
