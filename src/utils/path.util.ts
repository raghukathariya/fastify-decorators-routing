/**
 * Normalizes a single path segment: collapses repeated slashes, ensures a single leading slash,
 * strips a trailing slash, and maps an empty/root-only segment (`''`, `'/'`, `'  '`) to `''` —
 * meaning "contributes nothing" when joined. Route parameters (`:id`), wildcards, and regex
 * segments pass through untouched since normalization only touches slash boundaries.
 */
export function normalizePathSegment(segment: string): string {
  const collapsed = segment.trim().replace(/\/+/g, '/');
  if (collapsed === '' || collapsed === '/') return '';
  const withLeadingSlash = collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

/**
 * Joins path segments (controller prefixes, a controller's own path, a route's own path, ...)
 * into a single, normalized path. Segments that normalize to nothing (root/empty) are dropped;
 * joining zero contributing segments yields `'/'`.
 *
 * Used to compose `@Prefix` + `@Controller` (Phase 5) and, in later phases, controller path +
 * route path.
 */
export function joinPaths(...segments: readonly string[]): string {
  const joined = segments.map(normalizePathSegment).join('');
  return joined === '' ? '/' : joined;
}
