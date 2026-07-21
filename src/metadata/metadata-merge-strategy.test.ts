import { describe, expect, it } from 'vitest';
import { mergeMetadataValues } from './metadata-merge-strategy.js';

describe('mergeMetadataValues', () => {
  describe("strategy: 'override'", () => {
    it("prefers the child's value when present", () => {
      expect(mergeMetadataValues('override', 'parent', 'child')).toBe('child');
    });

    it("falls back to the parent's value when the child has none", () => {
      expect(mergeMetadataValues('override', 'parent', undefined)).toBe('parent');
    });

    it('returns undefined when neither has a value', () => {
      expect(mergeMetadataValues('override', undefined, undefined)).toBeUndefined();
    });
  });

  describe("strategy: 'merge-array'", () => {
    it('concatenates parent entries before child entries', () => {
      expect(mergeMetadataValues('merge-array', ['a', 'b'], ['c'])).toEqual(['a', 'b', 'c']);
    });

    it('returns the child array when the parent has none', () => {
      expect(mergeMetadataValues('merge-array', undefined, ['c'])).toEqual(['c']);
    });

    it('returns the parent array when the child has none', () => {
      expect(mergeMetadataValues('merge-array', ['a'], undefined)).toEqual(['a']);
    });

    it('throws when either value is not an array', () => {
      // Deliberately-wrong runtime values, cast past the compile-time contract, to exercise the
      // defensive runtime check a decorator misusing this API could trigger.
      const notAnArray = 'not-an-array' as unknown as string[];
      expect(() => mergeMetadataValues('merge-array', notAnArray, ['c'])).toThrow(TypeError);
      expect(() => mergeMetadataValues('merge-array', ['a'], notAnArray)).toThrow(TypeError);
    });
  });

  describe("strategy: 'merge-object'", () => {
    it("shallow-merges, with the child's keys winning on conflict", () => {
      expect(mergeMetadataValues('merge-object', { a: 1, b: 1 }, { b: 2, c: 2 })).toEqual({
        a: 1,
        b: 2,
        c: 2,
      });
    });

    it('returns the child object when the parent has none', () => {
      expect(mergeMetadataValues('merge-object', undefined, { a: 1 })).toEqual({ a: 1 });
    });

    it('returns the parent object when the child has none', () => {
      expect(mergeMetadataValues('merge-object', { a: 1 }, undefined)).toEqual({ a: 1 });
    });

    it('throws when either value is not a plain object', () => {
      interface Obj {
        a: number;
      }
      const notAnObject = 'string' as unknown as Obj;
      const anArray = ['array'] as unknown as Obj;
      const aNull = null as unknown as Obj;

      expect(() => mergeMetadataValues('merge-object', anArray, { a: 1 })).toThrow(TypeError);
      expect(() => mergeMetadataValues('merge-object', { a: 1 }, notAnObject)).toThrow(TypeError);
      expect(() => mergeMetadataValues('merge-object', { a: 1 }, aNull)).toThrow(TypeError);
    });
  });
});
