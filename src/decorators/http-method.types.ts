import type { FastifySchema, RouteShorthandOptions, preHandlerHookHandler } from 'fastify';
import type { MemberKey } from '../types/constructor.type.js';
import type { VersionValue } from './version.decorator.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'ALL';

/**
 * A single documented response for a route. Purely descriptive metadata for tooling (the
 * Swagger integration in Phase 19) — it does not itself validate or serialize anything. Runtime
 * response validation/serialization is `schema.response`'s job, via Fastify's own JSON Schema
 * machinery.
 */
export interface RouteResponseOption {
  /** The HTTP status code this response describes. Documentation tools should assume 200 if omitted. */
  readonly status?: number;
  readonly description?: string;
  /** JSON-schema-shaped description of the response body, for documentation only. */
  readonly schema?: unknown;
}

/**
 * Per-route lifecycle hooks, in exactly the shape Fastify's own route options accept — reusing
 * Fastify's types directly rather than re-declaring a parallel hook system.
 */
export type RouteHooksOption = Pick<
  RouteShorthandOptions,
  | 'onRequest'
  | 'preParsing'
  | 'preValidation'
  | 'preHandler'
  | 'preSerialization'
  | 'onSend'
  | 'onResponse'
  | 'onError'
  | 'onRequestAbort'
  | 'onTimeout'
>;

/**
 * Route-scoped middleware: a function with the same signature as a Fastify `preHandler` hook —
 * runs after validation, before the route handler, with the ability to short-circuit by sending
 * a reply. Phase 10 builds the execution pipeline (ordering with controller-level and global
 * middleware) on top of this option; this is where an individual route declares its own.
 */
export type RouteMiddleware = preHandlerHookHandler;

export interface RouteOptions {
  /** Route path, relative to the controller's resolved base path. Defaults to `'/'`. */
  path?: string;
  /** Fastify JSON Schema for request/response validation and serialization. */
  schema?: FastifySchema;
  /** A unique name for this route, resolvable via `router.url(name)` once Phase 18 lands. */
  name?: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  /** Documented response(s) for this route. See `RouteResponseOption` for how this differs from
   *  `schema.response`. */
  response?: RouteResponseOption | readonly RouteResponseOption[];
  /** Overrides the controller's `@Version` for this route only. */
  version?: VersionValue;
  middleware?: readonly RouteMiddleware[];
  hooks?: RouteHooksOption;
}

/** The fully resolved metadata recorded for one `@Get`/`@Post`/... decorated method. */
export interface RouteDefinition {
  readonly method: HttpMethod;
  readonly handlerName: MemberKey;
  readonly path: string;
  readonly middleware: readonly RouteMiddleware[];
  readonly schema?: FastifySchema;
  readonly name?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly deprecated?: boolean;
  readonly response?: RouteResponseOption | readonly RouteResponseOption[];
  readonly version?: VersionValue;
  readonly hooks?: RouteHooksOption;
}
