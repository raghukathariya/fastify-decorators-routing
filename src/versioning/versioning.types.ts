/**
 * How `registerControllers` turns a route/controller's `@Version` declaration into actual
 * routing behavior:
 *  - `'uri'`: prepends `/v{version}` to the route's path (e.g. `/v1/users/:id`).
 *  - `'header'`: uses Fastify's own built-in `version` route constraint, matched against the
 *    `Accept-Version` request header (Fastify/find-my-way's default semver-aware behavior).
 *  - `'media-type'`: matches a version parameter embedded in the `Accept` header's media type
 *    (e.g. `Accept: application/json;version=2`), via a constraint strategy this package
 *    registers on `fastify` — there is no Fastify built-in for this, unlike `'header'`.
 *
 * A route/controller with no `@Version` at all is entirely unaffected by whichever `type` is
 * configured — versioning only applies to routes that opted in.
 */
export interface VersioningOptions {
  readonly type: 'uri' | 'header' | 'media-type';
  /** `'media-type'` only: the parameter name read from the `Accept` header (`;<mediaTypeParam>=`).
   *  Defaults to `'version'`. */
  readonly mediaTypeParam?: string;
}
