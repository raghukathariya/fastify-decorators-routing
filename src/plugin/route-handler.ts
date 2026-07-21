import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify';
import type { Container } from '../container/container.js';
import type { Scope } from '../container/provider.types.js';
import { extractParamValue } from '../decorators/param-extraction.js';
import { getParamDefinitions } from '../decorators/param.decorator.js';
import type { RouteDefinition } from '../decorators/http-method.types.js';
import { handleException } from '../exceptions/exception-execution.js';
import { ForbiddenException } from '../exceptions/http-exceptions.js';
import type { ExceptionFilterLike } from '../exceptions/exception-filter.types.js';
import { getControllerFilters, getRouteFilters } from '../exceptions/use-filter.decorator.js';
import { runGuards } from '../guards/guard-execution.js';
import { getControllerGuards, getRouteGuards } from '../guards/use-guard.decorator.js';
import type { Guard } from '../guards/guard.types.js';
import { composeInterceptors } from '../interceptors/interceptor-execution.js';
import {
  getControllerInterceptors,
  getRouteInterceptors,
} from '../interceptors/use-interceptor.decorator.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import { serializeResponse } from '../serialization/serialize-response.js';
import { getSerializationConfig } from '../serialization/serialize-with.decorator.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import type { RequestScopeManager } from './request-scope.js';

function resolveControllerInstance(
  container: Container,
  controller: AnyConstructor,
  scope: Scope,
  request: FastifyRequest,
  requestScopes: RequestScopeManager,
): unknown {
  if (scope === 'scoped') {
    return requestScopes.getOrCreate(request).resolve(controller);
  }
  // 'singleton' and 'transient' both delegate entirely to Container.resolve's own caching (or
  // lack thereof) — see Container's class-level scoping doc for why that's correct and cheap.
  return container.resolve(controller);
}

/**
 * Builds the Fastify route handler for one `@Get`/`@Post`/... decorated method:
 *  1. Runs every `@UseGuard` guard (controller-level, then route-level); a rejection throws
 *     `ForbiddenException`, which — like any other exception — is handled by step 5 below rather
 *     than short-circuiting separately, so a `@UseFilter`/`@Catch(ForbiddenException)` filter can
 *     customize the rejection response too.
 *  2. Resolves the controller instance, respecting its DI scope.
 *  3. Extracts and coerces every `@Body`/`@Query`/... parameter.
 *  4. Runs the `@UseInterceptor` chain (controller-level wrapping route-level) around the actual
 *     method invocation, returning whatever the chain resolves to.
 *  5. If anything above throws, `handleException` finds the first matching `@UseFilter`/global
 *     filter (route-level, then controller-level, then global) and sends its response, falling
 *     back to correct `HttpException` handling — or a generic `500` — when none matches.
 *
 * Guard/interceptor/filter/parameter/design-type metadata is all read once here, at
 * route-registration time, not on every request — the returned handler's per-request work is
 * just running guards, resolving the instance, running the already-resolved extractors, and
 * running the interceptor chain. Skips building the interceptor chain entirely when a route has
 * none, so a plain route pays nothing for a feature it doesn't use.
 */
export function buildRouteHandler(
  controller: AnyConstructor,
  route: RouteDefinition,
  controllerScope: Scope,
  container: Container,
  requestScopes: RequestScopeManager,
  globalFilters: readonly ExceptionFilterLike[] = [],
): RouteHandlerMethod {
  const prototype = controller.prototype as object;
  const paramDefinitions = getParamDefinitions(prototype, route.handlerName);
  const paramTypes =
    paramDefinitions.length > 0
      ? globalMetadataRegistry.designTypes.getMethodParamTypes(prototype, route.handlerName)
      : undefined;

  const guards: readonly Guard[] = [
    ...getControllerGuards(controller),
    ...getRouteGuards(prototype, route.handlerName),
  ];
  const hasInterceptors =
    getControllerInterceptors(controller).length > 0 ||
    getRouteInterceptors(prototype, route.handlerName).length > 0;
  const filters: readonly ExceptionFilterLike[] = [
    ...getRouteFilters(prototype, route.handlerName),
    ...getControllerFilters(controller),
    ...globalFilters,
  ];
  const serializationConfig = getSerializationConfig(prototype, route.handlerName);

  return async function routeHandler(request: FastifyRequest, reply: FastifyReply) {
    const context: ExecutionContext = {
      request,
      reply,
      controller,
      handlerName: route.handlerName,
    };

    try {
      if (guards.length > 0) {
        const allowed = await runGuards(guards, context, container);
        if (!allowed) {
          throw new ForbiddenException();
        }
      }

      const instance = resolveControllerInstance(
        container,
        controller,
        controllerScope,
        request,
        requestScopes,
      );

      const args = await Promise.all(
        paramDefinitions.map((definition) =>
          extractParamValue(definition, request, reply, paramTypes?.[definition.index]),
        ),
      );

      const handlerMethod = (instance as Record<MemberKey, unknown>)[route.handlerName];
      const invokeHandler = (): unknown =>
        (handlerMethod as (...args: unknown[]) => unknown).apply(instance, args);

      const result = hasInterceptors
        ? await composeInterceptors(
            controller,
            prototype,
            route.handlerName,
            context,
            container,
            invokeHandler,
          )()
        : await invokeHandler();

      return serializationConfig ? serializeResponse(result, serializationConfig) : result;
    } catch (exception) {
      await handleException(exception, context, container, filters);
      return undefined;
    }
  };
}
