import type { Container } from '../container/container.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import type { Constructor } from '../types/constructor.type.js';
import { getCaughtExceptionTypes } from './catch.decorator.js';
import type {
  ExceptionFilter,
  ExceptionFilterClass,
  ExceptionFilterLike,
} from './exception-filter.types.js';
import { HttpException } from './http-exception.js';

function isFilterClass(filter: ExceptionFilterLike): filter is ExceptionFilterClass {
  return (
    typeof filter === 'function' &&
    typeof (filter.prototype as Partial<ExceptionFilter> | undefined)?.catch === 'function'
  );
}

function isFilterInstance(filter: ExceptionFilterLike): filter is ExceptionFilter {
  return (
    typeof filter === 'object' &&
    filter !== null &&
    typeof (filter as Partial<ExceptionFilter>).catch === 'function'
  );
}

/**
 * Whether `filter` should handle `exception`: a filter class with `@Catch(A, B)` handles
 * instances of `A` or `B`; one with no `@Catch()` types (or a plain function/pre-built instance,
 * which has no way to declare types at all) handles everything.
 */
function filterHandles(filter: ExceptionFilterLike, exception: unknown): boolean {
  if (!isFilterClass(filter)) return true;
  const types = getCaughtExceptionTypes(filter);
  if (types.length === 0) return true;
  return types.some((type: Constructor<unknown>) => exception instanceof type);
}

function executeFilter(
  filter: ExceptionFilterLike,
  exception: unknown,
  context: ExecutionContext,
  container: Container,
): unknown {
  if (isFilterClass(filter)) {
    container.ensureRegistered(filter);
    const instance = container.resolve(filter);
    return instance.catch(exception, context);
  }
  if (isFilterInstance(filter)) {
    return filter.catch(exception, context);
  }
  return filter(exception, context);
}

/** The `{ statusCode, body }` used when no filter handles an exception. */
function defaultExceptionResponse(exception: unknown): { statusCode: number; body: unknown } {
  if (exception instanceof HttpException) {
    return { statusCode: exception.statusCode, body: exception.getResponseBody() };
  }
  return {
    statusCode: 500,
    body: {
      statusCode: 500,
      error: 'Internal Server Error',
      message: exception instanceof Error ? exception.message : 'Internal Server Error',
    },
  };
}

/**
 * Finds the first filter (route-level, then controller-level, then global, in that order) whose
 * `@Catch()` types match `exception`, runs it, and sends its result as the response. Falls back
 * to `defaultExceptionResponse` — correct `HttpException` status/body, or a generic `500` for
 * anything else — when no filter handles it.
 *
 * A filter that calls `context.reply.send(...)` (or otherwise marks the reply as sent) itself is
 * left alone; its return value is only used to build the response when the reply wasn't already
 * sent.
 */
export async function handleException(
  exception: unknown,
  context: ExecutionContext,
  container: Container,
  filters: readonly ExceptionFilterLike[],
): Promise<void> {
  for (const filter of filters) {
    if (!filterHandles(filter, exception)) continue;

    const result = await executeFilter(filter, exception, context, container);
    if (!context.reply.sent) {
      const statusCode = exception instanceof HttpException ? exception.statusCode : 500;
      context.reply.code(statusCode).send(result);
    }
    return;
  }

  const { statusCode, body } = defaultExceptionResponse(exception);
  context.reply.code(statusCode).send(body);
}
