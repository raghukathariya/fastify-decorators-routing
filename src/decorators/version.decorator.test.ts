import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getVersion, Version } from './version.decorator.js';

describe('@Version', () => {
  it('records a single version string', () => {
    @Version('1')
    class Controller {}

    expect(getVersion(Controller)).toBe('1');
  });

  it('records multiple versions', () => {
    @Version(['1', '2'])
    class Controller {}

    expect(getVersion(Controller)).toEqual(['1', '2']);
  });

  it("a subclass's own @Version replaces (not combines with) its parent's", () => {
    @Version('1')
    class Base {}

    @Version('2')
    class Sub extends Base {}

    expect(getVersion(Sub)).toBe('2');
  });

  it("a subclass without its own @Version inherits its parent's", () => {
    @Version('1')
    class Base {}
    class Sub extends Base {}

    expect(getVersion(Sub)).toBe('1');
  });

  it('returns undefined for a class with no @Version', () => {
    class Plain {}
    expect(getVersion(Plain)).toBeUndefined();
  });
});
