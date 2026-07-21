/** `T` with every property made optional and `undefined` excluded from its value type. */
type WithoutUndefinedValues<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

/**
 * Returns a shallow copy of `obj` with every key whose value is `undefined` removed.
 *
 * Exists because `tsconfig.json` enables `exactOptionalPropertyTypes`: an optional field typed
 * `foo?: string` rejects an explicit `foo: undefined` at the type level, so building an object
 * literal from a partially-populated options bag (a decorator's options object, for instance)
 * can't just spread every field — the undefined ones have to be dropped first. The return type
 * reflects that every field is now genuinely optional (not present-but-undefined), so spreading
 * the result into an `exactOptionalPropertyTypes`-checked object literal type-checks cleanly.
 */
export function withoutUndefinedValues<T extends Record<string, unknown>>(
  obj: T,
): WithoutUndefinedValues<T> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as WithoutUndefinedValues<T>;
}
