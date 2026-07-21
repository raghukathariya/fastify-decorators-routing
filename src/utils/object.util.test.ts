import { describe, expect, it } from 'vitest';
import { withoutUndefinedValues } from './object.util.js';

describe('withoutUndefinedValues', () => {
  it('removes keys whose value is undefined', () => {
    expect(withoutUndefinedValues({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('keeps keys whose value is null, zero, false, or an empty string', () => {
    expect(withoutUndefinedValues({ a: null, b: 0, c: false, d: '' })).toEqual({
      a: null,
      b: 0,
      c: false,
      d: '',
    });
  });

  it('returns an empty object when every value is undefined', () => {
    expect(withoutUndefinedValues({ a: undefined, b: undefined })).toEqual({});
  });

  it('does not mutate the input object', () => {
    const input = { a: 1, b: undefined };
    const result = withoutUndefinedValues(input);
    expect(input).toEqual({ a: 1, b: undefined });
    expect(result).not.toBe(input);
  });
});
