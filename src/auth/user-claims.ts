/** Reads a `string[]`-shaped claim off an authenticated user object, tolerating anything else
 *  (missing property, non-array, mixed-type array) by dropping non-string entries rather than
 *  throwing — an auth plugin's user shape is outside this package's control. */
function readStringArrayClaim(user: unknown, key: string): readonly string[] {
  if (typeof user !== 'object' || user === null) return [];
  const value = (user as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** The roles claim (`user.roles`) on an authenticated user, as populated by the app's own
 *  authentication plugin (e.g. a JWT payload's `roles` claim mapped onto `request.user`). */
export function getUserRoles(user: unknown): readonly string[] {
  return readStringArrayClaim(user, 'roles');
}

/** The permissions claim (`user.permissions`) on an authenticated user. */
export function getUserPermissions(user: unknown): readonly string[] {
  return readStringArrayClaim(user, 'permissions');
}
