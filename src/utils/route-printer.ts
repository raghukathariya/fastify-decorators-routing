import { resolveControllerMetadata } from '../decorators/controller-metadata.js';
import { getRouteDefinitions } from '../decorators/http-method.decorator.js';
import type { HttpMethod } from '../decorators/http-method.types.js';
import type { VersionValue } from '../decorators/version.decorator.js';
import type { AnyConstructor } from '../types/constructor.type.js';
import { withoutUndefinedValues } from './object.util.js';
import { joinPaths } from './path.util.js';

/**
 * One route's worth of purely descriptive information, resolved straight from decorator
 * metadata — no Fastify instance, no `registerControllers` call, involved. Useful for a startup
 * log line, a CLI introspection command, or any other "what routes does this app expose" need
 * that isn't already served by Fastify's own `fastify.printRoutes()` (which only knows about
 * routes actually registered, not decorator-level metadata like `name`/`group`/`tags`).
 */
export interface RouteInfo {
  readonly method: HttpMethod;
  readonly path: string;
  readonly controller: string;
  readonly handler: string;
  readonly name?: string;
  readonly group?: string;
  readonly tags: readonly string[];
  readonly version?: VersionValue;
}

/**
 * Resolves every route declared across `controllers` into a flat, structured `RouteInfo` list —
 * the data `printRoutes` formats into text. A class with no `@Controller()` is silently skipped
 * rather than rejected: unlike `registerControllers` (where an explicitly-listed non-controller
 * is very likely a mistake worth failing loudly for), this is a read-only introspection tool,
 * where being lenient about what's handed to it is more useful than being strict.
 */
export function listRoutes(controllers: readonly AnyConstructor[]): readonly RouteInfo[] {
  const infos: RouteInfo[] = [];

  for (const controller of controllers) {
    const metadata = resolveControllerMetadata(controller);
    if (!metadata) continue;

    for (const route of getRouteDefinitions(controller)) {
      infos.push({
        method: route.method,
        path: joinPaths(metadata.path, route.path),
        controller: controller.name,
        handler: String(route.handlerName),
        tags: metadata.tags,
        ...withoutUndefinedValues({
          name: route.name,
          group: metadata.group,
          version: route.version ?? metadata.version,
        }),
      });
    }
  }

  return infos;
}

function formatRow(info: RouteInfo, methodWidth: number, pathWidth: number): string {
  const method = info.method.padEnd(methodWidth);
  const path = info.path.padEnd(pathWidth);
  const handler = `${info.controller}.${info.handler}`;
  const suffix = info.name !== undefined ? ` (${info.name})` : '';
  return `${method} ${path} ${handler}${suffix}`;
}

/**
 * Formats every route declared across `controllers` into an aligned, human-readable table,
 * organized into sections by `@Group` — the "route printer" `@Group`'s own doc comment
 * foreshadows. Ungrouped routes get their own trailing section. Returns `''` for an empty or
 * entirely controller-less input, so a caller can safely `console.log` the result unconditionally
 * without an extra blank line.
 *
 * ```ts
 * console.log(printRoutes([UserController, OrderController]));
 * // users:
 * //   GET  /users/:id  UserController.getUser (user.detail)
 * //
 * // Ungrouped:
 * //   GET  /health     HealthController.check
 * ```
 */
export function printRoutes(controllers: readonly AnyConstructor[]): string {
  const infos = listRoutes(controllers);
  if (infos.length === 0) return '';

  const methodWidth = Math.max(...infos.map((info) => info.method.length));
  const pathWidth = Math.max(...infos.map((info) => info.path.length));

  const byGroup = new Map<string, RouteInfo[]>();
  for (const info of infos) {
    const key = info.group ?? '';
    const bucket = byGroup.get(key);
    if (bucket) {
      bucket.push(info);
    } else {
      byGroup.set(key, [info]);
    }
  }

  const groupEntries = [...byGroup.entries()].sort(([a], [b]) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b);
  });

  return groupEntries
    .map(([key, infosInGroup]) => {
      const header = key === '' ? 'Ungrouped' : key;
      const rows = infosInGroup
        .map((info) => `  ${formatRow(info, methodWidth, pathWidth)}`)
        .join('\n');
      return `${header}:\n${rows}`;
    })
    .join('\n\n');
}
