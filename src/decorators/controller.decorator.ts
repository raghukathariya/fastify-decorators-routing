import { Injectable } from '../container/injectable.decorator.js';
import type { Scope } from '../container/provider.types.js';
import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor } from '../types/constructor.type.js';

export interface ControllerOptions {
  /** Base path for every route in this controller, relative to any `@Prefix`. Defaults to `'/'`. */
  path?: string;
  /** DI scope for the controller instance. Defaults to `'singleton'` (see `@Injectable`). */
  scope?: Scope;
}

interface ControllerMetadataValue {
  readonly path: string;
}

export const CONTROLLER_METADATA_KEY =
  createMetadataKey<ControllerMetadataValue>('decorators:controller');

/**
 * Marks a class as a Fastify route controller.
 *
 * Every route registered on this controller (via the HTTP method decorators in Phase 6) is
 * mounted under this controller's resolved base path — its own `path` here, preceded by any
 * `@Prefix` segments (see `getPrefixSegments`) — once the scanner (Phase 8) and Fastify plugin
 * (Phase 9) exist to act on it.
 *
 * `@Controller` also makes the class DI-managed: it applies `@Injectable` internally, so a
 * controller's constructor can request services the same way any other injectable class does,
 * without a separate `@Injectable()` decorator. This is also what makes TypeScript emit the
 * `design:paramtypes` metadata constructor injection depends on — see `DesignTypeReader`.
 *
 * Accepts either calling convention:
 * ```ts
 * @Controller('/users')
 * @Controller('/users', { scope: 'scoped' })
 * @Controller({ path: '/users', scope: 'scoped' })
 * @Controller() // path defaults to '/'
 * ```
 */
export function Controller(path?: string, options?: ControllerOptions): ClassDecorator;
export function Controller(options?: ControllerOptions): ClassDecorator;
export function Controller(
  pathOrOptions?: string | ControllerOptions,
  maybeOptions?: ControllerOptions,
): ClassDecorator {
  const { path, scope } = normalizeArgs(pathOrOptions, maybeOptions);

  return (target) => {
    const ctor = target as unknown as AnyConstructor;
    Injectable(scope !== undefined ? { scope } : {})(target);
    globalMetadataRegistry.writer.setClassMetadata(ctor, CONTROLLER_METADATA_KEY, { path });
  };
}

function normalizeArgs(
  pathOrOptions: string | ControllerOptions | undefined,
  maybeOptions: ControllerOptions | undefined,
): { path: string; scope: Scope | undefined } {
  if (typeof pathOrOptions === 'string') {
    return { path: pathOrOptions, scope: maybeOptions?.scope };
  }
  return { path: pathOrOptions?.path ?? '/', scope: pathOrOptions?.scope };
}

/** Whether `target` was decorated with `@Controller()` (does not check ancestor classes). */
export function isController(target: AnyConstructor): boolean {
  return getControllerOptions(target) !== undefined;
}

/** The `@Controller()` options declared directly on `target`, if any. */
export function getControllerOptions(target: AnyConstructor): ControllerMetadataValue | undefined {
  return globalMetadataRegistry.reader.getClassMetadata(target, CONTROLLER_METADATA_KEY, {
    inherit: false,
  });
}
