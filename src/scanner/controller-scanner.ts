import type { AnyConstructor } from '../types/constructor.type.js';
import { resolveGlobFiles } from './glob-resolver.js';
import { importControllersFromFile } from './module-importer.js';
import type { ScanOptions } from './scan.types.js';

/**
 * Discovers controllers from `options.controllers` (already-imported classes) and/or
 * `options.patterns` (glob patterns resolved to files, each dynamically imported), returning the
 * de-duplicated union of both — the same class appearing in both lists, or matched by two
 * overlapping glob patterns, is kept only once.
 *
 * Deliberately async and does no filesystem or import work until called: nothing runs at module
 * load time, so an application that never calls this (or calls it once, well after startup) pays
 * no cost for glob resolution or dynamic imports it doesn't need yet.
 */
export async function scanControllers(options: ScanOptions): Promise<readonly AnyConstructor[]> {
  const explicit = options.controllers ?? [];
  const discovered = options.patterns
    ? await discoverFromPatterns(options.patterns, options.cwd)
    : [];
  return dedupeByIdentity([...explicit, ...discovered]);
}

async function discoverFromPatterns(
  patterns: string | readonly string[],
  cwd: string | undefined,
): Promise<readonly AnyConstructor[]> {
  const files = await resolveGlobFiles(patterns, cwd);
  const perFile = await Promise.all(files.map((file) => importControllersFromFile(file)));
  return perFile.flat();
}

function dedupeByIdentity(controllers: readonly AnyConstructor[]): readonly AnyConstructor[] {
  return [...new Set(controllers)];
}
