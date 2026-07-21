import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getPrefixSegments, Prefix } from './prefix.decorator.js';

describe('@Prefix', () => {
  it('records a single prefix segment', () => {
    @Prefix('/api')
    class Controller {}

    expect(getPrefixSegments(Controller)).toEqual(['/api']);
  });

  it('accumulates multiple applications on the same class, in application order', () => {
    @Prefix('/v1')
    @Prefix('/api')
    class Controller {}

    // Decorators apply bottom-up, so '/api' (closer to the class) is recorded before '/v1'.
    expect(getPrefixSegments(Controller)).toEqual(['/api', '/v1']);
  });

  it('inherits a parent class prefix, ancestor first', () => {
    @Prefix('/api')
    class Base {}

    @Prefix('/v1')
    class Sub extends Base {}

    expect(getPrefixSegments(Sub)).toEqual(['/api', '/v1']);
  });

  it('returns an empty array for a class with no @Prefix', () => {
    class Plain {}
    expect(getPrefixSegments(Plain)).toEqual([]);
  });
});
