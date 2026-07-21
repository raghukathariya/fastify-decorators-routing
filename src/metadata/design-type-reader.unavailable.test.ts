import { describe, expect, it } from 'vitest';
import { MetadataError } from '../errors/metadata.error.js';
import { DesignTypeReader } from './design-type-reader.js';

/**
 * This file deliberately never imports `reflect-metadata`, so `Reflect.getMetadata` is absent —
 * exercising the guard that fails loudly instead of silently returning `undefined` for every
 * decorated class when a consumer forgets the required `import 'reflect-metadata'`.
 *
 * Relies on Vitest's default test-file isolation (a fresh global scope per file) so that
 * `reflect-metadata`, imported by sibling test files in this directory, does not leak here.
 */
describe('DesignTypeReader (reflect-metadata not loaded)', () => {
  it('throws a MetadataError instead of silently returning undefined', () => {
    expect(typeof Reflect.getMetadata).not.toBe('function');

    const reader = new DesignTypeReader();
    class Foo {}

    expect(() => reader.getConstructorParamTypes(Foo)).toThrow(MetadataError);
    expect(() => reader.getMethodParamTypes(Foo.prototype, 'x')).toThrow(MetadataError);
    expect(() => reader.getPropertyType(Foo.prototype, 'x')).toThrow(MetadataError);
    expect(() => reader.getMethodReturnType(Foo.prototype, 'x')).toThrow(MetadataError);
  });
});
