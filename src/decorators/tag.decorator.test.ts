import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getTags, Tag } from './tag.decorator.js';

describe('@Tag', () => {
  it('records a single tag', () => {
    @Tag('users')
    class Controller {}

    expect(getTags(Controller)).toEqual(['users']);
  });

  it('records multiple tags passed to one @Tag() call', () => {
    @Tag('users', 'admin')
    class Controller {}

    expect(getTags(Controller)).toEqual(['users', 'admin']);
  });

  it('accumulates tags across repeated applications', () => {
    @Tag('admin')
    @Tag('users')
    class Controller {}

    expect(getTags(Controller)).toEqual(expect.arrayContaining(['users', 'admin']));
    expect(getTags(Controller)).toHaveLength(2);
  });

  it("inherits and combines with a parent class's tags", () => {
    @Tag('api')
    class Base {}

    @Tag('users')
    class Sub extends Base {}

    expect(getTags(Sub)).toEqual(['api', 'users']);
  });

  it('returns an empty array for a class with no @Tag', () => {
    class Plain {}
    expect(getTags(Plain)).toEqual([]);
  });
});
