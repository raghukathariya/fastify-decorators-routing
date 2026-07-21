import type { HTTPMethods } from 'fastify';
import type { HttpMethod } from '../decorators/http-method.types.js';

/**
 * The methods an `@All()` route answers to — Fastify's own default supported-method set
 * (`DELETE`, `GET`, `HEAD`, `PATCH`, `POST`, `PUT`, `OPTIONS`), matching what `fastify.all()`
 * itself registers for.
 */
export const ALL_HTTP_METHODS: readonly HTTPMethods[] = [
  'DELETE',
  'GET',
  'HEAD',
  'PATCH',
  'POST',
  'PUT',
  'OPTIONS',
];

/**
 * Maps a `RouteDefinition`'s method to what Fastify's `route()` expects, expanding `'ALL'`.
 * Returns a fresh array for `'ALL'` (rather than `ALL_HTTP_METHODS` itself) because Fastify's own
 * `RouteOptions.method` type is a mutable `HTTPMethods[]`, not `readonly HTTPMethods[]`.
 */
export function mapHttpMethod(method: HttpMethod): HTTPMethods | HTTPMethods[] {
  return method === 'ALL' ? [...ALL_HTTP_METHODS] : method;
}
