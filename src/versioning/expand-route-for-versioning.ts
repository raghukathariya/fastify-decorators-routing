import type { RouteOptions as FastifyRouteOptions } from 'fastify';
import { joinPaths } from '../utils/path.util.js';
import { MEDIA_TYPE_VERSION_CONSTRAINT_NAME } from './media-type-constraint.js';
import type { VersioningOptions } from './versioning.types.js';

/**
 * Expands one base route (already fully built, `url` and all — see `buildFastifyRouteOptions`)
 * into the one or more `fastify.route()` calls actually needed to serve every version in
 * `versions`:
 *  - No versions declared, or no `versioning` configured at all: `baseOptions` unchanged, as a
 *    single-element array — the common, unversioned case pays nothing extra.
 *  - `'uri'`: one registration per version, each with `/v{version}` prepended to the path.
 *  - `'header'`/`'media-type'`: one registration per version, same path, each constrained to
 *    that exact version via find-my-way's built-in `version` constraint (`'header'`) or this
 *    package's own `mediaTypeVersion` constraint (`'media-type'`) — see
 *    `createMediaTypeVersionConstraint`.
 */
export function expandRouteForVersioning(
  baseOptions: FastifyRouteOptions,
  versions: readonly string[],
  versioning: VersioningOptions | undefined,
): readonly FastifyRouteOptions[] {
  if (versions.length === 0 || versioning === undefined) {
    return [baseOptions];
  }

  if (versioning.type === 'uri') {
    return versions.map((version) => ({
      ...baseOptions,
      url: joinPaths(`/v${version}`, baseOptions.url),
    }));
  }

  const constraintKey =
    versioning.type === 'header' ? 'version' : MEDIA_TYPE_VERSION_CONSTRAINT_NAME;
  return versions.map((version) => ({
    ...baseOptions,
    constraints: { ...baseOptions.constraints, [constraintKey]: version },
  }));
}
