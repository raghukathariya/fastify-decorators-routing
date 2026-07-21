import type { FastifyRequest } from 'fastify';

/**
 * Reads whatever an authentication plugin (e.g. `@fastify/jwt`'s `request.jwtVerify()`, or a
 * custom `onRequest` hook) has populated `request.user` with, without requiring this package to
 * declare an ambient `FastifyRequest.user` augmentation that would collide with the consuming
 * app's own — the same "read an optional plugin-populated property" approach used for
 * `request.cookies`/`request.session` in `@Cookies`/`@Session` (see `param-extraction.ts`).
 *
 * Returns `undefined` when no authentication plugin has run (or the request is unauthenticated).
 */
export function getRequestUser(request: FastifyRequest): unknown {
  return (request as unknown as Record<string, unknown>).user;
}
