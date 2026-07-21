import type { ControllerMetadata } from '../decorators/controller-metadata.js';
import type { RouteDefinition, RouteResponseOption } from '../decorators/http-method.types.js';
import type { AnyConstructor } from '../types/constructor.type.js';
import { withoutUndefinedValues } from '../utils/object.util.js';
import { getApiOperation } from './api-operation.decorator.js';
import { getApiResponses } from './api-response.decorator.js';
import { getControllerApiSecurity, getRouteApiSecurity } from './api-security.decorator.js';
import { getRouteApiTags } from './api-tags.decorator.js';
import type { SwaggerSchema } from './swagger.types.js';

function toArray<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value as readonly T[];
  return [value as T];
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

/**
 * Merges `entries` (from the `response` route option and `@ApiResponse()`) into `existing`
 * (`route.schema.response`, if the caller already set one directly for request
 * validation/response serialization). An entry never overrides a status code `existing` already
 * covers — that field is Fastify's own validation/serialization schema, authoritative by
 * definition; `RouteResponseOption` only fills in *documentation* for status codes nothing else
 * already describes.
 */
function mergeResponseSchemas(
  existing: Record<string, unknown> | undefined,
  entries: readonly RouteResponseOption[],
): Record<string, unknown> | undefined {
  if (entries.length === 0) return existing;

  const merged: Record<string, unknown> = { ...existing };
  for (const entry of entries) {
    const status = String(entry.status ?? 200);
    if (merged[status] !== undefined) continue;
    const schema = typeof entry.schema === 'object' && entry.schema !== null ? entry.schema : {};
    merged[status] = withoutUndefinedValues({ description: entry.description, ...schema });
  }
  return merged;
}

/**
 * Merges every Swagger-facing decorator (`@ApiTags`, `@ApiOperation`, `@ApiResponse`,
 * `@ApiSecurity`) plus the inline `summary`/`description`/`deprecated`/`response` route options
 * and the controller's `@Tag`s into the `schema` object `fastify.route()` receives —
 * `@fastify/swagger` auto-discovers its documentation straight from each route's `schema`, so
 * this is the entire integration; there is no independent OpenAPI document builder here.
 *
 * Returns `undefined` (rather than an empty object) when there is truly nothing to add and the
 * route declared no `schema` of its own either, so `buildFastifyRouteOptions` can omit the
 * `schema` key entirely — exactly as it did before this merge step existed.
 */
export function buildSwaggerSchema(
  controller: AnyConstructor,
  controllerMetadata: ControllerMetadata,
  route: RouteDefinition,
  prototype: object,
): SwaggerSchema | undefined {
  const tags = dedupe([
    ...controllerMetadata.tags,
    ...getRouteApiTags(prototype, route.handlerName),
  ]);
  const operation = getApiOperation(prototype, route.handlerName);
  const responseEntries = [
    ...toArray(route.response),
    ...getApiResponses(prototype, route.handlerName),
  ];
  const security = [
    ...getControllerApiSecurity(controller),
    ...getRouteApiSecurity(prototype, route.handlerName),
  ];

  const summary = operation?.summary ?? route.summary;
  const description = operation?.description ?? route.description;
  const deprecated = operation?.deprecated ?? route.deprecated;
  const response = mergeResponseSchemas(
    route.schema?.response as Record<string, unknown> | undefined,
    responseEntries,
  );

  const additions = withoutUndefinedValues({
    tags: tags.length > 0 ? tags : undefined,
    summary,
    description,
    deprecated,
    operationId: operation?.operationId,
    response,
    security: security.length > 0 ? security.map((s) => ({ [s.name]: s.scopes })) : undefined,
  });

  if (Object.keys(additions).length === 0) return route.schema;

  return { ...route.schema, ...additions };
}
