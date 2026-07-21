/**
 * Strategies for combining a parent class's metadata value with a child class's own value for
 * the same {@link MetadataKey}, when resolving inherited metadata (see
 * `metadata-inheritance.ts`).
 *
 * - `'override'` — the child's value wins outright if present, otherwise the parent's value is
 *   used. This is the correct default for scalar configuration such as `@Version('2')`.
 * - `'merge-array'` — parent and child arrays are concatenated (parent entries first), so a
 *   subclass accumulates onto its parent's list rather than replacing it. Used for things like
 *   `@Use(...)` middleware lists, where a subclass controller should run its parent's middleware
 *   plus its own.
 * - `'merge-object'` — a shallow merge of parent and child objects, with the child's keys taking
 *   precedence on conflict. Used for structured configuration such as merged route schemas.
 */
export type MetadataMergeStrategy = 'override' | 'merge-array' | 'merge-object';

/**
 * Combines a parent value and a child value according to `strategy`.
 *
 * @param strategy - How to combine the two values.
 * @param parentValue - The value inherited from an ancestor class, if any.
 * @param childValue - The value declared directly on the class being resolved, if any.
 */
export function mergeMetadataValues<T>(
  strategy: MetadataMergeStrategy,
  parentValue: T | undefined,
  childValue: T | undefined,
): T | undefined {
  switch (strategy) {
    case 'override':
      return childValue ?? parentValue;

    case 'merge-array': {
      if (parentValue === undefined) return childValue;
      if (childValue === undefined) return parentValue;
      if (!Array.isArray(parentValue) || !Array.isArray(childValue)) {
        throw new TypeError(
          "mergeMetadataValues: strategy 'merge-array' requires both values to be arrays.",
        );
      }
      return [...parentValue, ...childValue] as T;
    }

    case 'merge-object': {
      if (parentValue === undefined) return childValue;
      if (childValue === undefined) return parentValue;
      if (
        typeof parentValue !== 'object' ||
        typeof childValue !== 'object' ||
        parentValue === null ||
        childValue === null ||
        Array.isArray(parentValue) ||
        Array.isArray(childValue)
      ) {
        throw new TypeError(
          "mergeMetadataValues: strategy 'merge-object' requires both values to be plain objects.",
        );
      }
      return { ...parentValue, ...childValue };
    }
  }
}
