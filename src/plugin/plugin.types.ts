import type { Container } from '../container/container.js';
import type { RouteMiddleware } from '../decorators/http-method.types.js';
import type { ExceptionFilterLike } from '../exceptions/exception-filter.types.js';
import type { AnyConstructor } from '../types/constructor.type.js';
import type { VersioningOptions } from '../versioning/versioning.types.js';

export interface RegisterControllersOptions {
  /** Already-imported controller classes to register directly — no file I/O involved. */
  controllers?: readonly AnyConstructor[];
  /** Glob pattern(s) resolved to controller module files. See `ScanOptions.patterns`. */
  patterns?: string | readonly string[];
  /** Base directory `patterns` are resolved relative to. Defaults to `process.cwd()`. */
  cwd?: string;
  /**
   * The DI container to resolve controllers (and their dependencies) from. If omitted, a fresh
   * `Container` is created. Register your services on this container — directly, or on the one
   * you pass in — before `registerControllers` runs; it registers each discovered *controller*
   * class for you (if not already registered), but has no way to know what a controller's own
   * dependencies are ahead of time.
   */
  container?: Container;
  /** An additional path segment prepended to every controller's resolved base path. */
  globalPrefix?: string;
  /**
   * Middleware run before every route registered by this call — ahead of any controller-level
   * `@Use`, route-level `@Use`, and route `{ middleware }`. See `@Use`'s doc comment for the full
   * execution order.
   */
  middleware?: readonly RouteMiddleware[];
  /**
   * Exception filters consulted for every route registered by this call, after any route-level
   * or controller-level `@UseFilter()`. See `@UseFilter`'s doc comment for the full resolution
   * order.
   */
  filters?: readonly ExceptionFilterLike[];
  /**
   * How every `@Version`-declaring controller/route is actually routed. Omitted entirely, a
   * route's `@Version` is recorded metadata only — it has no effect on which requests reach it.
   * See `VersioningOptions` for the three supported strategies.
   */
  versioning?: VersioningOptions;
}
