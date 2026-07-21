import { describe, expect, it } from 'vitest';
import { hasOnDestroy, hasOnInit } from './lifecycle.interfaces.js';

describe('hasOnInit', () => {
  it('returns true for an object with an onInit method', () => {
    expect(hasOnInit({ onInit: () => undefined })).toBe(true);
  });

  it('returns false for an object without onInit', () => {
    expect(hasOnInit({})).toBe(false);
  });

  it('returns false for onInit not being a function', () => {
    expect(hasOnInit({ onInit: 'not-a-function' })).toBe(false);
  });

  it('returns false for null and primitives', () => {
    expect(hasOnInit(null)).toBe(false);
    expect(hasOnInit(undefined)).toBe(false);
    expect(hasOnInit('string')).toBe(false);
    expect(hasOnInit(42)).toBe(false);
  });
});

describe('hasOnDestroy', () => {
  it('returns true for an object with an onDestroy method', () => {
    expect(hasOnDestroy({ onDestroy: () => undefined })).toBe(true);
  });

  it('returns false for an object without onDestroy', () => {
    expect(hasOnDestroy({})).toBe(false);
  });

  it('returns false for null and primitives', () => {
    expect(hasOnDestroy(null)).toBe(false);
    expect(hasOnDestroy(123)).toBe(false);
  });
});
