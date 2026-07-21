import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import { withoutUndefinedValues } from '../utils/object.util.js';
import type { HttpMethod, RouteDefinition, RouteOptions } from './http-method.types.js';

/** Member-level: the single route definition for one decorated method. */
export const ROUTE_METADATA_KEY = createMetadataKey<RouteDefinition>('decorators:route');

/**
 * Class-level: the list of method names decorated with an HTTP method decorator, own and
 * inherited (via `'merge-array'`) — lets `getRouteDefinitions` enumerate a controller's routes
 * without scanning every property of the prototype.
 */
export const ROUTE_HANDLERS_METADATA_KEY = createMetadataKey<MemberKey[]>(
  'decorators:route-handlers',
);

function normalizeRouteArgs(
  pathOrOptions: string | RouteOptions | undefined,
  maybeOptions: RouteOptions | undefined,
): RouteOptions {
  if (typeof pathOrOptions === 'string') {
    return { ...maybeOptions, path: pathOrOptions };
  }
  return pathOrOptions ?? {};
}

function createRouteDecorator(method: HttpMethod) {
  return function httpMethodDecorator(
    pathOrOptions?: string | RouteOptions,
    maybeOptions?: RouteOptions,
  ): MethodDecorator {
    const options = normalizeRouteArgs(pathOrOptions, maybeOptions);

    return (target, propertyKey) => {
      const definition: RouteDefinition = {
        method,
        handlerName: propertyKey,
        path: options.path ?? '/',
        middleware: options.middleware ?? [],
        ...withoutUndefinedValues({
          schema: options.schema,
          name: options.name,
          summary: options.summary,
          description: options.description,
          deprecated: options.deprecated,
          response: options.response,
          version: options.version,
          hooks: options.hooks,
        }),
      };

      globalMetadataRegistry.writer.setMemberMetadata(
        target,
        propertyKey,
        ROUTE_METADATA_KEY,
        definition,
      );
      globalMetadataRegistry.writer.appendClassMetadata(
        (target as { constructor: AnyConstructor }).constructor,
        ROUTE_HANDLERS_METADATA_KEY,
        propertyKey,
      );
    };
  };
}

/** Registers the decorated method as a `GET` route handler. */
export const Get = createRouteDecorator('GET');
/** Registers the decorated method as a `POST` route handler. */
export const Post = createRouteDecorator('POST');
/** Registers the decorated method as a `PUT` route handler. */
export const Put = createRouteDecorator('PUT');
/** Registers the decorated method as a `PATCH` route handler. */
export const Patch = createRouteDecorator('PATCH');
/** Registers the decorated method as a `DELETE` route handler. */
export const Delete = createRouteDecorator('DELETE');
/** Registers the decorated method as an `OPTIONS` route handler. */
export const Options = createRouteDecorator('OPTIONS');
/** Registers the decorated method as a `HEAD` route handler. */
export const Head = createRouteDecorator('HEAD');
/** Registers the decorated method as a route handler answering every HTTP method. */
export const All = createRouteDecorator('ALL');

/** The route definition declared directly on `(prototype, member)`, own or inherited. */
export function getRouteDefinition(
  prototype: object,
  member: MemberKey,
): RouteDefinition | undefined {
  return globalMetadataRegistry.reader.getMemberMetadata(prototype, member, ROUTE_METADATA_KEY);
}

/** Every method name decorated with an HTTP method decorator on `target`, own and inherited. */
export function getRouteHandlerNames(target: AnyConstructor): readonly MemberKey[] {
  return (
    globalMetadataRegistry.reader.getClassMetadata(target, ROUTE_HANDLERS_METADATA_KEY, {
      strategy: 'merge-array',
    }) ?? []
  );
}

/** Every route defined on `target`: one entry per HTTP-method-decorated method, own and inherited. */
export function getRouteDefinitions(target: AnyConstructor): readonly RouteDefinition[] {
  const prototype = target.prototype as object;
  return getRouteHandlerNames(target)
    .map((handlerName) => getRouteDefinition(prototype, handlerName))
    .filter((definition): definition is RouteDefinition => definition !== undefined);
}
