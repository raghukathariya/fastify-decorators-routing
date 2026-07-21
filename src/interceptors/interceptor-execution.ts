import type { Container } from '../container/container.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';

import type {
  Interceptor,
  InterceptorClass,
  InterceptorLike,
  NextFn,
} from './interceptor.types.js';

function isInterceptorClass(interceptor: InterceptorLike): interceptor is InterceptorClass {
  return (
    typeof interceptor === 'function' &&
    typeof (interceptor.prototype as Partial<Interceptor> | undefined)?.intercept === 'function'
  );
}

function isInterceptorInstance(interceptor: InterceptorLike): interceptor is Interceptor {
  return (
    typeof interceptor === 'object' &&
    interceptor !== null &&
    typeof (interceptor as Partial<Interceptor>).intercept === 'function'
  );
}

/**
 * Runs one interceptor, resolving a class through `container` first (auto-registering it if the
 * caller never did) — exactly like guard classes, so a `'singleton'`-scoped interceptor is
 * reused across requests and a `'transient'`/`'scoped'` one gets correct per-request instances.
 */
function executeInterceptor(
  interceptor: InterceptorLike,
  context: ExecutionContext,
  container: Container,
  next: NextFn,
): unknown {
  if (isInterceptorClass(interceptor)) {
    container.ensureRegistered(interceptor);
    const instance = container.resolve(interceptor);
    return instance.intercept(context, next);
  }
  if (isInterceptorInstance(interceptor)) {
    return interceptor.intercept(context, next);
  }
  return interceptor(context, next);
}

/**
 * Builds the full interceptor chain from an already-resolved `interceptors` list — every
 * controller-level interceptor (outermost, so it sees the raw call and the final result)
 * wrapping every route-level interceptor (innermost, closest to the handler) — and returns a
 * single `NextFn` that runs it. Calling the returned function runs interceptor 1, which calls
 * `next` (interceptor 2, ... ), until the last interceptor calls `finalNext` — the actual route
 * handler invocation.
 *
 * Takes the resolved list rather than `controller`/`prototype`/`handlerName` (and reading
 * `getControllerInterceptors`/`getRouteInterceptors` itself) deliberately: this runs once per
 * *request*, while the interceptor list itself only ever changes at route-registration time —
 * `buildRouteHandler` resolves it exactly once and this just re-threads it through a fresh
 * `context`/`finalNext` each call, rather than re-reading the metadata registry on every request.
 */
export function composeInterceptors(
  interceptors: readonly InterceptorLike[],
  context: ExecutionContext,
  container: Container,
  finalNext: NextFn,
): NextFn {
  return interceptors.reduceRight<NextFn>(
    (next, interceptor) => () => executeInterceptor(interceptor, context, container, next),
    finalNext,
  );
}
