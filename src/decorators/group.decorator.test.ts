import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getGroup, Group } from './group.decorator.js';

describe('@Group', () => {
  it('records the group name', () => {
    @Group('admin')
    class Controller {}

    expect(getGroup(Controller)).toBe('admin');
  });

  it("a subclass's own @Group replaces (not combines with) its parent's", () => {
    @Group('admin')
    class Base {}

    @Group('public')
    class Sub extends Base {}

    expect(getGroup(Sub)).toBe('public');
  });

  it("a subclass without its own @Group inherits its parent's", () => {
    @Group('admin')
    class Base {}
    class Sub extends Base {}

    expect(getGroup(Sub)).toBe('admin');
  });

  it('returns undefined for a class with no @Group', () => {
    class Plain {}
    expect(getGroup(Plain)).toBeUndefined();
  });
});
