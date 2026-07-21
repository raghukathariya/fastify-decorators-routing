import { describe, expect, it } from 'vitest';
import {
  createMediaTypeVersionConstraint,
  MEDIA_TYPE_VERSION_CONSTRAINT_NAME,
} from './media-type-constraint.js';

describe('createMediaTypeVersionConstraint', () => {
  it('is named "mediaTypeVersion", distinct from find-my-way\'s built-in "version"', () => {
    expect(createMediaTypeVersionConstraint().name).toBe(MEDIA_TYPE_VERSION_CONSTRAINT_NAME);
  });

  it('must-match-when-derived, mirroring the built-in header strategy', () => {
    expect(createMediaTypeVersionConstraint().mustMatchWhenDerived).toBe(true);
  });

  describe('deriveConstraint', () => {
    it('reads the default "version" parameter off the Accept header', () => {
      const constraint = createMediaTypeVersionConstraint();
      expect(
        constraint.deriveConstraint({ headers: { accept: 'application/json;version=2' } }),
      ).toBe('2');
    });

    it('reads a custom parameter name', () => {
      const constraint = createMediaTypeVersionConstraint('v');
      expect(constraint.deriveConstraint({ headers: { accept: 'application/json;v=3' } })).toBe(
        '3',
      );
    });

    it('returns undefined when the Accept header is missing', () => {
      const constraint = createMediaTypeVersionConstraint();
      expect(constraint.deriveConstraint({ headers: {} })).toBeUndefined();
    });

    it('returns undefined when the Accept header has no version parameter', () => {
      const constraint = createMediaTypeVersionConstraint();
      expect(
        constraint.deriveConstraint({ headers: { accept: 'application/json' } }),
      ).toBeUndefined();
    });

    it('handles a header value delivered as an array, using the first entry', () => {
      const constraint = createMediaTypeVersionConstraint();
      expect(
        constraint.deriveConstraint({
          headers: { accept: ['application/json;version=5', 'text/plain'] },
        }),
      ).toBe('5');
    });

    it('parses the version parameter regardless of other parameters around it', () => {
      const constraint = createMediaTypeVersionConstraint();
      expect(
        constraint.deriveConstraint({
          headers: { accept: 'application/vnd.api+json; version=7; charset=utf-8' },
        }),
      ).toBe('7');
    });
  });

  describe('validate', () => {
    it('accepts a string value', () => {
      expect(() => createMediaTypeVersionConstraint().validate('1')).not.toThrow();
    });

    it('rejects a non-string value', () => {
      expect(() => createMediaTypeVersionConstraint().validate(1)).toThrow(TypeError);
    });
  });

  describe('storage', () => {
    it('stores and retrieves a value by version', () => {
      const storage = createMediaTypeVersionConstraint().storage();
      storage.set('1', 'handler-for-v1');
      expect(storage.get('1')).toBe('handler-for-v1');
    });

    it('returns null for an unregistered version', () => {
      const storage = createMediaTypeVersionConstraint().storage();
      expect(storage.get('99')).toBeNull();
    });

    it('deletes a stored version', () => {
      const storage = createMediaTypeVersionConstraint().storage();
      storage.set('1', 'handler-for-v1');
      storage.del('1');
      expect(storage.get('1')).toBeNull();
    });

    it('empties every stored version', () => {
      const storage = createMediaTypeVersionConstraint().storage();
      storage.set('1', 'handler-for-v1');
      storage.set('2', 'handler-for-v2');
      storage.empty();
      expect(storage.get('1')).toBeNull();
      expect(storage.get('2')).toBeNull();
    });
  });
});
