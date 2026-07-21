import fastGlob from 'fast-glob';

/**
 * Resolved-file-list cache, keyed by `(patterns, cwd)`. Re-scanning the filesystem for every
 * `scanControllers()` call (tests routinely call it many times against the same fixtures) would
 * be wasted work once the pattern set has already been resolved once; `clearGlobCache` exists so
 * tests — and hot-reload scenarios where files genuinely change on disk — can force a fresh scan.
 */
const globCache = new Map<string, readonly string[]>();

function cacheKey(patterns: readonly string[], cwd: string): string {
  return JSON.stringify({ patterns, cwd });
}

/** Resolves `patterns` (relative to `cwd`) to absolute file paths, matching files only. */
export async function resolveGlobFiles(
  patterns: string | readonly string[],
  cwd: string = process.cwd(),
): Promise<readonly string[]> {
  const patternList = Array.isArray(patterns) ? patterns : [patterns];
  const key = cacheKey(patternList, cwd);

  const cached = globCache.get(key);
  if (cached) return cached;

  const files = await fastGlob(patternList as string[], { cwd, absolute: true, onlyFiles: true });
  const sorted = [...files].sort();
  globCache.set(key, sorted);
  return sorted;
}

/** Clears the resolved-file-list cache. Intended for tests and hot-reload scenarios. */
export function clearGlobCache(): void {
  globCache.clear();
}
