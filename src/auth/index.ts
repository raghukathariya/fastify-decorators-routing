/**
 * Authentication/authorization sugar built entirely on top of `@UseGuard` (Phase 11) and the
 * exception-filter pipeline (Phase 13) — there is no bespoke auth pipeline here, just guard
 * functions that throw `UnauthorizedException`/`ForbiddenException` instead of returning
 * `false`, registered the same way any other guard is.
 *
 * This package deliberately does not depend on any specific authentication mechanism (JWT,
 * session cookies, API keys, ...). It only reads `request.user`, however it got there. Pairing
 * with `@fastify/jwt` looks like:
 *
 * ```ts
 * import Fastify from 'fastify';
 * import jwt from '@fastify/jwt';
 * import { registerControllers, Authenticated, Roles, getRequestUser } from 'fastify-decorators-routing';
 *
 * const app = Fastify();
 * await app.register(jwt, { secret: process.env.JWT_SECRET! });
 *
 * // Populate `request.user` from the bearer token before any guard runs. A route/controller
 * // with no `@Authenticated`/`@Roles`/`@Permissions`/`@UsePolicy` is unaffected either way —
 * // `request.user` is simply unused, not required.
 * app.addHook('onRequest', async (request, reply) => {
 *   try {
 *     await request.jwtVerify(); // @fastify/jwt sets `request.user` to the verified payload
 *   } catch {
 *     // leave request.user unset; @Authenticated (etc.) will 401 for routes that need it
 *   }
 * });
 *
 * await app.register(registerControllers, { controllers: [...] });
 *
 * class AdminController {
 *   @Delete('/users/:id')
 *   @Roles('admin')
 *   deleteUser(@Param('id') id: string) { ... }
 * }
 * ```
 *
 * `@fastify/jwt` types `request.user` as the verified JWT payload — a plain object — so
 * `getUserRoles`/`getUserPermissions` read a `roles`/`permissions` array claim directly off it.
 * A different auth plugin (session-based, API-key, custom) works the same way as long as it
 * populates `request.user` with an object shaped the same way.
 */
export { getRequestUser } from './get-request-user.js';
export { getUserRoles, getUserPermissions } from './user-claims.js';
export { Authenticated } from './authenticated.decorator.js';
export { Roles } from './roles.decorator.js';
export { Permissions } from './permissions.decorator.js';
export { UsePolicy } from './use-policy.decorator.js';
export type { PolicyFn } from './use-policy.decorator.js';
