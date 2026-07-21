import { pathToFileURL } from 'node:url';
import { isController } from '../decorators/controller.decorator.js';
import { ScanError } from '../errors/scan.error.js';
import type { AnyConstructor } from '../types/constructor.type.js';

/**
 * Per-file import cache, keyed by absolute path. A dynamic `import()` of the same URL already
 * resolves to Node's own module cache, so this isn't strictly caching the *import* — it's caching
 * the (comparatively expensive) work of filtering a module's exports down to just its
 * `@Controller()`-decorated classes, so repeated scans of the same file don't repeat that filter.
 */
const importCache = new Map<string, readonly AnyConstructor[]>();

function isControllerExport(value: unknown): value is AnyConstructor {
  return typeof value === 'function' && isController(value as AnyConstructor);
}

/**
 * Imports `absolutePath` and returns every exported class decorated with `@Controller()`.
 *
 * Uses dynamic `import()` throughout — not `require()` — because Node's ESM loader can import
 * both native ESM *and* CommonJS modules transparently, giving one code path that works
 * regardless of whether the target file (or this package's own build, ESM or CJS) is CommonJS or
 * ESM. `pathToFileURL` is used rather than a bare path so this also works correctly on Windows
 * and with paths containing characters that would otherwise need percent-encoding.
 */
export async function importControllersFromFile(
  absolutePath: string,
): Promise<readonly AnyConstructor[]> {
  const cached = importCache.get(absolutePath);
  if (cached) return cached;

  let moduleExports: Record<string, unknown>;
  try {
    moduleExports = (await import(pathToFileURL(absolutePath).href)) as Record<string, unknown>;
  } catch (cause) {
    throw ScanError.importFailed(absolutePath, cause);
  }

  const controllers = Object.values(moduleExports).filter(isControllerExport);
  importCache.set(absolutePath, controllers);
  return controllers;
}

/** Clears the per-file controller-export cache. Intended for tests and hot-reload scenarios. */
export function clearImportCache(): void {
  importCache.clear();
}
