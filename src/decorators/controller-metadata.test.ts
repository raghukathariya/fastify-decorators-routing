import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Controller } from './controller.decorator.js';
import { resolveControllerMetadata } from './controller-metadata.js';
import { Group } from './group.decorator.js';
import { Prefix } from './prefix.decorator.js';
import { Tag } from './tag.decorator.js';
import { Version } from './version.decorator.js';

describe('resolveControllerMetadata', () => {
  it('returns undefined for a class with no @Controller', () => {
    class Plain {}
    expect(resolveControllerMetadata(Plain)).toBeUndefined();
  });

  it('resolves a minimal controller to its defaults', () => {
    @Controller('/users')
    class UserController {}

    expect(resolveControllerMetadata(UserController)).toEqual({
      path: '/users',
      version: undefined,
      tags: [],
      group: undefined,
      scope: 'singleton',
    });
  });

  it('joins @Prefix segments with the controller path', () => {
    @Prefix('/v1')
    @Prefix('/api')
    @Controller('/users')
    class UserController {}

    expect(resolveControllerMetadata(UserController)?.path).toBe('/api/v1/users');
  });

  it('combines every decorator into one resolved view', () => {
    @Prefix('/api')
    @Version('2')
    @Tag('users', 'public')
    @Group('core')
    @Controller('/users', { scope: 'scoped' })
    class UserController {}

    expect(resolveControllerMetadata(UserController)).toEqual({
      path: '/api/users',
      version: '2',
      tags: ['users', 'public'],
      group: 'core',
      scope: 'scoped',
    });
  });

  it('resolves inherited @Prefix, @Version, @Tag, and @Group for a subclass controller', () => {
    @Prefix('/api')
    @Version('1')
    @Tag('base')
    @Group('core')
    @Controller('/base')
    class BaseController {}

    @Tag('users')
    @Controller('/users')
    class UserController extends BaseController {}

    // @Controller's own path is never inherited (each concrete controller declares its own), but
    // @Prefix/@Tag combine with ancestors and @Version/@Group fall back to the ancestor's value.
    expect(resolveControllerMetadata(UserController)).toEqual({
      path: '/api/users',
      version: '1',
      tags: ['base', 'users'],
      group: 'core',
      scope: 'singleton',
    });
  });
});
