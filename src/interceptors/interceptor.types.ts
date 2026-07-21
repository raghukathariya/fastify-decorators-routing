import type { Constructor } from '../types/constructor.type.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';

/**
 * Invokes the rest of the interceptor chain (the next interceptor, or — for the last one — the
 * route handler itself) and resolves to whatever it returns.
 */
export type NextFn = () => unknown;

/**
 * Implemented by a class-based interceptor. Instances are resolved through the DI container, so
 * an interceptor can have its own injected dependencies the same way a controller or guard can.
 *
 * `intercept` wraps the rest of the pipeline: call `next()` to run it, and everything before
 * that call is "before execution" logic, everything after is "after execution" logic. Returning
 * something other than whatever `next()` resolved to is "transform response"; wrapping the
 * `next()` call in `try`/`catch` is "error interception" — these are not separate mechanisms,
 * just different things a single `intercept` implementation can choose to do.
 */
export interface Interceptor {
  intercept(context: ExecutionContext, next: NextFn): unknown;
}

/** An interceptor expressed as a plain function, run directly with no DI involved. */
export type InterceptorFn = (context: ExecutionContext, next: NextFn) => unknown;

/** An interceptor class — resolved via the DI container at request time (auto-registered if needed). */
export type InterceptorClass = Constructor<Interceptor>;

/**
 * Anything `@UseInterceptor()` accepts: a plain function, an already-constructed `Interceptor`
 * instance, or an `Interceptor` class to be DI-resolved.
 */
export type InterceptorLike = InterceptorFn | Interceptor | InterceptorClass;
