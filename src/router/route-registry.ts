import { RouteError } from '../errors/route.error.js';

/** A single value usable for a `:param` substitution or a query-string entry. */
export type RouteParamValue = string | number | boolean;

/** `RouteRegistry.url()`'s `query` argument: a value, or a list of them for a repeated key
 *  (`?tag=a&tag=b`). `undefined` entries are dropped rather than stringified. */
export type RouteQuery = Record<string, RouteParamValue | readonly RouteParamValue[] | undefined>;

function substituteParams(
  name: string,
  path: string,
  params: Record<string, RouteParamValue> | undefined,
): string {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, param: string) => {
    const value = params?.[param];
    if (value === undefined) {
      throw RouteError.missingRouteParam(name, param, path);
    }
    return encodeURIComponent(String(value));
  });
}

function buildQueryString(query: RouteQuery): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      searchParams.append(key, String(item));
    }
  }
  return searchParams.toString();
}

/**
 * Resolves a route's `name` (the `name` option on `@Get`/`@Post`/...) to its full path template
 * and builds a real URL from it, substituting `:param` placeholders and appending a query
 * string — so a redirect, a link in a response body, or an email doesn't have to hardcode a
 * route's path and silently drift out of sync with the decorator that defines it.
 *
 * Populated automatically by `registerControllers` — every route with a `name` is registered
 * here at boot time — and exposed on the Fastify instance via `getRouteRegistry(fastify)`; there
 * is normally no reason to construct one directly.
 */
export class RouteRegistry {
  private readonly pathsByName = new Map<string, string>();

  /**
   * Records `name` as resolving to `path` (its full, joined path template, `:param`
   * placeholders included). Throws if `name` is already registered for a *different* path —
   * re-registering the same name for the same path (e.g. a duplicate `registerControllers` call
   * during a test) is a no-op, not an error.
   */
  public register(name: string, path: string): void {
    const existing = this.pathsByName.get(name);
    if (existing !== undefined && existing !== path) {
      throw RouteError.duplicateRouteName(name, existing, path);
    }
    this.pathsByName.set(name, path);
  }

  /** Whether `name` is registered. */
  public has(name: string): boolean {
    return this.pathsByName.has(name);
  }

  /** The raw path template registered for `name` (`:param` placeholders included), or
   *  `undefined` if no route was registered under that name. */
  public getPath(name: string): string | undefined {
    return this.pathsByName.get(name);
  }

  /**
   * Builds a URL for the route named `name`: substitutes every `:param` placeholder in its path
   * template from `params`, then appends `query` as a query string.
   *
   * Throws `RouteError` if `name` is unregistered, or if `params` is missing a value a
   * placeholder in the path requires.
   *
   * ```ts
   * registry.url('user.detail', { id: '42' }); // '/users/42'
   * registry.url('user.list', undefined, { page: 2 }); // '/users?page=2'
   * ```
   */
  public url(name: string, params?: Record<string, RouteParamValue>, query?: RouteQuery): string {
    const path = this.pathsByName.get(name);
    if (path === undefined) {
      throw RouteError.unknownRouteName(name);
    }

    const resolvedPath = substituteParams(name, path, params);
    if (query === undefined) return resolvedPath;

    const search = buildQueryString(query);
    return search === '' ? resolvedPath : `${resolvedPath}?${search}`;
  }
}
