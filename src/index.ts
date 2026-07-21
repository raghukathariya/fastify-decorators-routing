/**
 * fastify-decorators-routing
 *
 * A decorator-based routing framework for Fastify v5+.
 *
 * The public API surface is built up incrementally: this entry point re-exports each subsystem
 * as it is implemented. See the project roadmap in README.md for what has landed so far.
 */

export * from './errors/index.js';
export * from './types/index.js';
export * from './utils/index.js';
export * from './metadata/index.js';
export * from './container/index.js';
export * from './decorators/index.js';
export * from './scanner/index.js';
export * from './plugin/index.js';
export * from './middlewares/index.js';
export * from './interfaces/index.js';
export * from './guards/index.js';
export * from './interceptors/index.js';
export * from './exceptions/index.js';
export * from './validation/index.js';
export * from './serialization/index.js';
export * from './auth/index.js';
export * from './hooks/index.js';
export * from './router/index.js';
export * from './swagger/index.js';
export * from './versioning/index.js';

/**
 * The semantic version of the `fastify-decorators-routing` package, kept in sync with
 * `package.json` by the release process.
 */
export const VERSION = '0.1.0';
