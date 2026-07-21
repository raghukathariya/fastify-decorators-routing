import type { Constructor } from '../types/constructor.type.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';

/**
 * Implemented by a class-based exception filter. Instances are resolved through the DI
 * container, so a filter can have its own injected dependencies (a logger, an error-reporting
 * client) the same way a controller, guard, or interceptor can.
 *
 * `catch` receives the thrown value and the execution context; its return value becomes the
 * response body (status code taken from `reply.statusCode` if the filter set one, otherwise the
 * exception's own `statusCode` if it's an `HttpException`, otherwise `500`) unless the filter
 * calls `context.reply.send(...)` itself, in which case its return value is ignored.
 */
export interface ExceptionFilter<T = unknown> {
  catch(exception: T, context: ExecutionContext): unknown;
}

/** An exception filter expressed as a plain function, run directly with no DI involved. */
export type ExceptionFilterFn<T = unknown> = (exception: T, context: ExecutionContext) => unknown;

/** An exception filter class — resolved via the DI container (auto-registered if needed). */
export type ExceptionFilterClass = Constructor<ExceptionFilter>;

/**
 * Anything `@UseFilter()`/`registerControllers({ filters })` accepts: a plain function, an
 * already-constructed `ExceptionFilter` instance, or an `ExceptionFilter` class to be DI-resolved.
 */
export type ExceptionFilterLike = ExceptionFilterFn | ExceptionFilter | ExceptionFilterClass;
