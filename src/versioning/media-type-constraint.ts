/**
 * The name this package registers its media-type version constraint under — deliberately not
 * `'version'`: that name is find-my-way's own built-in constraint (used for `'header'`
 * versioning, matched against `Accept-Version`), already registered on every Fastify instance,
 * and `addConstraintStrategy` throws if a name is registered twice.
 */
export const MEDIA_TYPE_VERSION_CONSTRAINT_NAME = 'mediaTypeVersion';

/**
 * find-my-way's `ConstraintStrategy.storage().get/set` deal in its own internal `Handler<V>`
 * type, which this package has no (and should have no) direct dependency on — `find-my-way` is a
 * transitive dependency via `fastify`, not one of ours. `any` in this declared signature is the
 * correct escape hatch for a passthrough store that only ever hands back exactly what find-my-way
 * itself put in, never inspecting or constructing a `Handler` itself; the implementation below
 * stays in terms of `unknown` throughout, so nothing here actually returns an unsafely-typed
 * value — only the signature needs to claim `any` for structural compatibility.
 */
function createStorage(): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see doc comment above
  get(version: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see doc comment above
  set(version: string, handler: any): void;
  del(version: string): void;
  empty(): void;
} {
  const store = new Map<string, unknown>();
  return {
    get: (version) => store.get(version) ?? null,
    set: (version, handler) => {
      store.set(version, handler);
    },
    del: (version) => {
      store.delete(version);
    },
    empty: () => {
      store.clear();
    },
  };
}

interface MediaTypeVersionConstraint {
  readonly name: string;
  readonly mustMatchWhenDerived: true;
  readonly storage: typeof createStorage;
  validate(value: unknown): void;
  deriveConstraint(req: { headers: Record<string, string | string[] | undefined> }): unknown;
}

/**
 * Builds a find-my-way constraint strategy that reads a version parameter off the `Accept`
 * header's media type (`Accept: application/json;version=2` by default, or any parameter name
 * via `paramName`) — the `'media-type'` counterpart to Fastify's built-in `Accept-Version`
 * header constraint. Register it once per Fastify instance via `fastify.addConstraintStrategy`
 * (done automatically by `registerControllers` when `options.versioning.type === 'media-type'`);
 * routes then opt in with `constraints: { [MEDIA_TYPE_VERSION_CONSTRAINT_NAME]: version }`.
 *
 * `mustMatchWhenDerived: true` mirrors find-my-way's own built-in `version` strategy: a request
 * that *does* send a media-type version parameter must match a route registered for that exact
 * version — it never silently falls through to an unversioned route.
 */
export function createMediaTypeVersionConstraint(
  paramName = 'version',
): MediaTypeVersionConstraint {
  const paramPattern = new RegExp(`(?:^|[;,\\s])${paramName}=([^;,\\s]+)`, 'i');

  return {
    name: MEDIA_TYPE_VERSION_CONSTRAINT_NAME,
    mustMatchWhenDerived: true,
    storage: createStorage,
    validate(value: unknown): void {
      if (typeof value !== 'string') {
        throw new TypeError('mediaTypeVersion constraint value must be a string');
      }
    },
    deriveConstraint(req: { headers: Record<string, string | string[] | undefined> }): unknown {
      const header = req.headers.accept;
      const headerValue = Array.isArray(header) ? header[0] : header;
      if (headerValue === undefined) return undefined;
      return paramPattern.exec(headerValue)?.[1];
    },
  };
}
