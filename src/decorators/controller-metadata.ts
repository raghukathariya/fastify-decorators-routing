import { getInjectableOptions } from '../container/injectable.decorator.js';
import type { Scope } from '../container/provider.types.js';
import type { AnyConstructor } from '../types/constructor.type.js';
import { joinPaths } from '../utils/path.util.js';
import { getControllerOptions } from './controller.decorator.js';
import { getGroup } from './group.decorator.js';
import { getPrefixSegments } from './prefix.decorator.js';
import { getTags } from './tag.decorator.js';
import { getVersion, type VersionValue } from './version.decorator.js';

/**
 * The fully resolved view of everything `@Controller`, `@Prefix`, `@Version`, `@Tag`, and
 * `@Group` declared on a controller class — the shape the route scanner (Phase 8) and Fastify
 * plugin (Phase 9) consume, so they don't each need to know how to combine five decorators'
 * metadata themselves.
 */
export interface ControllerMetadata {
  /** The controller's full base path: every `@Prefix` segment, then its own `@Controller` path. */
  readonly path: string;
  readonly version: VersionValue | undefined;
  readonly tags: readonly string[];
  readonly group: string | undefined;
  readonly scope: Scope;
}

/**
 * Resolves `target`'s full controller metadata, or `undefined` if it was never decorated with
 * `@Controller()`.
 */
export function resolveControllerMetadata(target: AnyConstructor): ControllerMetadata | undefined {
  const options = getControllerOptions(target);
  if (!options) return undefined;

  return {
    path: joinPaths(...getPrefixSegments(target), options.path),
    version: getVersion(target),
    tags: getTags(target),
    group: getGroup(target),
    scope: getInjectableOptions(target)?.scope ?? 'singleton',
  };
}
