import type {
  FastifyContextConfig,
  FastifyInstance,
  RouteOptions as FastifyRouteOptions,
} from 'fastify';
import type { Container } from '../container/container.js';
import type { ControllerMetadata } from '../decorators/controller-metadata.js';
import { getRouteDefinitions } from '../decorators/http-method.decorator.js';
import type { RouteDefinition } from '../decorators/http-method.types.js';
import type { ExceptionFilterLike } from '../exceptions/exception-filter.types.js';
import { PluginError } from '../errors/plugin.error.js';
import {
  getRouteOnRequestHooks,
  getRouteOnSendHooks,
  getRoutePreHandlerHooks,
  getRoutePreParsingHooks,
  getRoutePreValidationHooks,
} from '../hooks/route-hooks.decorator.js';
import { getControllerMiddleware, getRouteUseMiddleware } from '../middlewares/use.decorator.js';
import type { RouteRegistry } from '../router/route-registry.js';
import { buildSwaggerSchema } from '../swagger/build-swagger-schema.js';
import type { AnyConstructor } from '../types/constructor.type.js';
import { expandRouteForVersioning } from '../versioning/expand-route-for-versioning.js';
import { resolveRouteVersions } from '../versioning/resolve-route-versions.js';
import type { VersioningOptions } from '../versioning/versioning.types.js';
import { withoutUndefinedValues } from '../utils/object.util.js';
import { joinPaths } from '../utils/path.util.js';
import { mapHttpMethod } from './http-method-mapping.js';
import type { RequestScopeManager } from './request-scope.js';
import { buildRouteHandler } from './route-handler.js';

/** Fastify's per-route hook options each accept either a single hook function or an array of them. */
function toArray<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value as readonly T[];
  return [value as T];
}

/**
 * Translates one `RouteDefinition` (plus its controller's resolved metadata) into the Fastify
 * `RouteOptions` `fastify.route()` expects — the "metadata parsing" step that turns everything
 * `@Controller`/`@Prefix`/`@Get`/`@Use`/`@Body`/... recorded into what Fastify actually
 * understands.
 *
 * The route's own `preHandler` array is built in the order documented on `@Use`: this route's
 * `hooks.preHandler` (the rawest, most "infrastructure" escape hatch), then its `@PreHandler`/
 * `@Before` hooks (Phase 17 sugar for the exact same lifecycle point), then its `@Use` middleware
 * (cross-cutting, decorator-driven), then its `{ middleware }` option (route-specific business
 * logic, closest to the handler). Global and controller middleware are *not* part of this array
 * — they're added as hooks on ancestor encapsulation contexts instead; see
 * `registerControllers` and `registerControllerRoutes`. The other four lifecycle points
 * `@OnRequest`/`@PreParsing`/`@PreValidation`/`@OnSend`(`@After`) have a decorator each; each one
 * composes with its `{ hooks: {...} }` route-option counterpart the same way — option first,
 * decorator second — since `route.hooks` is the rawer, more "infrastructure" form of the same
 * thing.
 *
 * `schema` is built by `buildSwaggerSchema` rather than taken from `route.schema` verbatim: it
 * merges in the controller's `@Tag`s, `@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiSecurity`,
 * and the inline `summary`/`description`/`deprecated`/`response` route options, all on top of
 * whatever `route.schema` already declared for request validation — see its own doc comment for
 * the exact merge rules.
 *
 * `route.version`/`controllerMetadata.version` are not applied to `url`/`constraints` here — a
 * versioned route needs *multiple* `fastify.route()` calls (one per version, for `'header'`/
 * `'media-type'` versioning) or a per-version `url` (`'uri'` versioning), which this function,
 * returning exactly one `RouteOptions`, structurally can't express. That expansion is
 * `expandRouteForVersioning`'s job, applied by `registerControllerRoutes` to this function's
 * result; `url` here is always the plain, unversioned path.
 */
function buildFastifyRouteOptions(
  controller: AnyConstructor,
  controllerMetadata: ControllerMetadata,
  route: RouteDefinition,
  container: Container,
  requestScopes: RequestScopeManager,
  globalFilters: readonly ExceptionFilterLike[],
): FastifyRouteOptions {
  const prototype = controller.prototype as object;
  const url = joinPaths(controllerMetadata.path, route.path);

  const onRequestHooks = [
    ...toArray(route.hooks?.onRequest),
    ...getRouteOnRequestHooks(prototype, route.handlerName),
  ];
  const preParsingHooks = [
    ...toArray(route.hooks?.preParsing),
    ...getRoutePreParsingHooks(prototype, route.handlerName),
  ];
  const preValidationHooks = [
    ...toArray(route.hooks?.preValidation),
    ...getRoutePreValidationHooks(prototype, route.handlerName),
  ];
  const preHandlers = [
    ...toArray(route.hooks?.preHandler),
    ...getRoutePreHandlerHooks(prototype, route.handlerName),
    ...getRouteUseMiddleware(prototype, route.handlerName),
    ...route.middleware,
  ];
  const onSendHooks = [
    ...toArray(route.hooks?.onSend),
    ...getRouteOnSendHooks(prototype, route.handlerName),
  ];

  const routeOptions: FastifyRouteOptions = {
    method: mapHttpMethod(route.method),
    url,
    handler: buildRouteHandler(
      controller,
      route,
      controllerMetadata.scope,
      container,
      requestScopes,
      globalFilters,
    ),
    ...withoutUndefinedValues({
      schema: buildSwaggerSchema(controller, controllerMetadata, route, prototype),
      onRequest: onRequestHooks.length > 0 ? onRequestHooks : undefined,
      preParsing: preParsingHooks.length > 0 ? preParsingHooks : undefined,
      preValidation: preValidationHooks.length > 0 ? preValidationHooks : undefined,
      preHandler: preHandlers.length > 0 ? preHandlers : undefined,
      preSerialization: route.hooks?.preSerialization,
      onSend: onSendHooks.length > 0 ? onSendHooks : undefined,
      onResponse: route.hooks?.onResponse,
      onError: route.hooks?.onError,
      onRequestAbort: route.hooks?.onRequestAbort,
      onTimeout: route.hooks?.onTimeout,
      // Cast rather than let this flow through plain structural assignment: a consumer with
      // `@fastify/swagger`'s types loaded augments `FastifyContextConfig` (empty by default) with
      // real optional properties, which makes plain `{ name: route.name }` fail TypeScript's
      // "weak type" check (an object sharing no properties with an all-optional-properties type)
      // even though this route config has nothing to do with Swagger.
      config: route.name !== undefined ? ({ name: route.name } as FastifyContextConfig) : undefined,
    }),
  };

  return routeOptions;
}

/**
 * Registers every route defined on `controller` onto `fastify`, inside `controller`'s own nested
 * encapsulation context (`fastify.register(...)`) — so its `@Use` controller middleware, added
 * as a hook on that context, applies only to this controller's routes, not to sibling
 * controllers registered elsewhere in the same `registerControllers` call.
 */
export async function registerControllerRoutes(
  fastify: FastifyInstance,
  container: Container,
  controller: AnyConstructor,
  controllerMetadata: ControllerMetadata,
  requestScopes: RequestScopeManager,
  globalFilters: readonly ExceptionFilterLike[] = [],
  routeRegistry?: RouteRegistry,
  versioning?: VersioningOptions,
): Promise<void> {
  const controllerMiddleware = getControllerMiddleware(controller);
  const routes = getRouteDefinitions(controller);

  // This callback has no `await` in its body, but must stay `async`: avvio (Fastify's plugin
  // loader) only turns a plugin's failure into a rejection of the outer `fastify.register()`
  // promise when the plugin function itself returns a rejected promise. A *synchronous* throw
  // from a non-async plugin function instead surfaces later as an unhandled exception, bypassing
  // the try/catch in `registerControllers` entirely — verified by
  // route-registration.test.ts's duplicate-route test.
  // eslint-disable-next-line @typescript-eslint/require-await
  await fastify.register(async (instance) => {
    for (const mw of controllerMiddleware) {
      instance.addHook('preHandler', mw);
    }

    for (const route of routes) {
      try {
        const baseOptions = buildFastifyRouteOptions(
          controller,
          controllerMetadata,
          route,
          container,
          requestScopes,
          globalFilters,
        );
        const versions = resolveRouteVersions(route, controllerMetadata);
        const expanded = expandRouteForVersioning(baseOptions, versions, versioning);

        // A named route registers under its *first* version's URL: `'header'`/`'media-type'`
        // versioning shares one URL across every expansion anyway (re-registering it is a
        // no-op — see `RouteRegistry.register`), and `'uri'` versioning genuinely produces a
        // distinct URL per version, for which there is no single unambiguous "the" URL to name
        // — picking the first, declared-order version is simplest and deterministic.
        const [firstRouteOptions] = expanded;
        if (route.name !== undefined && firstRouteOptions !== undefined) {
          routeRegistry?.register(route.name, firstRouteOptions.url);
        }

        for (const options of expanded) {
          instance.route(options);
        }
      } catch (cause) {
        throw PluginError.routeRegistrationFailed(controller.name, route.method, route.path, cause);
      }
    }
  });
}
