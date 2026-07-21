import type { FastifyInstance } from 'fastify';

/**
 * Stands in for a real authentication plugin (`@fastify/jwt`, a session cookie, ...) — see
 * `@Authenticated`'s doc comment in `fastify-decorators-routing` for the real thing. This just
 * reads `Authorization: Bearer <userId>` and sets `request.user` to `{ id: userId }`, so the rest
 * of the app (the `@Authenticated()`/`getRequestUser()` usage in `TodoController`) works exactly
 * the way it would against a real auth plugin.
 */
export function registerFakeAuth(app: FastifyInstance): void {
  app.addHook('onRequest', (request, _reply, done) => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (token !== undefined) {
      (request as unknown as { user?: unknown }).user = { id: token };
    }
    done();
  });
}
