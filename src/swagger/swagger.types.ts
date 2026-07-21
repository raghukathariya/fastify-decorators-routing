import type { FastifySchema } from 'fastify';

/**
 * `FastifySchema` (Fastify's own type) only declares `body`/`querystring`/`params`/`headers`/
 * `response` — the fields Fastify's own validation/serialization care about. `@fastify/swagger`
 * reads several more directly off the same schema object (`tags`, `summary`, `description`,
 * `deprecated`, `operationId`, `security`) via its own global module augmentation, which this
 * package can't rely on being present (it's a devDependency here, not a runtime one — see
 * `src/swagger/index.ts`). This is the widened shape `buildSwaggerSchema` actually produces;
 * a plain `FastifySchema` is always structurally assignable from it.
 */
export interface SwaggerSchema extends FastifySchema {
  tags?: readonly string[];
  summary?: string;
  description?: string;
  deprecated?: boolean;
  operationId?: string;
  security?: readonly Record<string, readonly string[]>[];
}

/** The fields `@ApiOperation` can set — the same information `@Get(path, { summary,
 *  description, deprecated })` already accepts inline, plus `operationId`, which has no route
 *  option equivalent. When both are set for the same route, `@ApiOperation`'s value wins. */
export interface ApiOperationOptions {
  readonly summary?: string;
  readonly description?: string;
  readonly deprecated?: boolean;
  readonly operationId?: string;
}

/** One security requirement, as `@ApiSecurity(name, scopes?)` records it. Serializes to OpenAPI's
 *  `security: [{ [name]: scopes }]` array-of-single-key-object form. */
export interface ApiSecurityRequirement {
  readonly name: string;
  readonly scopes: readonly string[];
}
