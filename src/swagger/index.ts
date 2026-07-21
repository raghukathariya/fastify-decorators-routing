/**
 * Swagger/OpenAPI documentation decorators. This module deliberately does not depend on
 * `@fastify/swagger` (or generate an OpenAPI document itself) — `@fastify/swagger` reads its
 * documentation straight from each route's Fastify `schema` object (`tags`, `summary`,
 * `description`, `deprecated`, `operationId`, `security`, `response`), so this module's entire
 * job is populating that same `schema` object correctly; see `buildSwaggerSchema`, wired into
 * `buildFastifyRouteOptions` (`src/plugin/route-registration.ts`).
 *
 * Register `@fastify/swagger` (and optionally `@fastify/swagger-ui`) the normal way — this
 * package has nothing more to configure:
 *
 * ```ts
 * import swagger from '@fastify/swagger';
 * import swaggerUi from '@fastify/swagger-ui';
 * import { registerControllers, ApiTags, ApiOperation } from 'fastify-decorators-routing';
 *
 * const app = Fastify();
 * await app.register(swagger, { openapi: { info: { title: 'My API', version: '1.0.0' } } });
 * await app.register(swaggerUi, { routePrefix: '/docs' });
 * await app.register(registerControllers, { controllers: [UserController] });
 * ```
 */
export { ApiTags, getRouteApiTags } from './api-tags.decorator.js';
export { ApiOperation, getApiOperation } from './api-operation.decorator.js';
export { ApiResponse, getApiResponses } from './api-response.decorator.js';
export {
  ApiSecurity,
  getControllerApiSecurity,
  getRouteApiSecurity,
} from './api-security.decorator.js';
export { buildSwaggerSchema } from './build-swagger-schema.js';
export type {
  ApiOperationOptions,
  ApiSecurityRequirement,
  SwaggerSchema,
} from './swagger.types.js';
