import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Controller } from '../decorators/controller.decorator.js';
import { Prefix } from '../decorators/prefix.decorator.js';
import { ScanError } from '../errors/scan.error.js';
import { ControllerRegistry } from './controller-registry.js';

describe('ControllerRegistry', () => {
  it('registers a controller and resolves its metadata', () => {
    @Prefix('/api')
    @Controller('/users')
    class UserController {}

    const registry = new ControllerRegistry();
    registry.register(UserController);

    expect(registry.has(UserController)).toBe(true);
    expect(registry.get(UserController)?.path).toBe('/api/users');
  });

  it('throws when registering a class with no @Controller() decorator', () => {
    class PlainService {}
    const registry = new ControllerRegistry();

    expect(() => registry.register(PlainService)).toThrow(ScanError);
  });

  it('is idempotent: registering the same controller twice is a no-op, not an error', () => {
    @Controller('/users')
    class UserController {}

    const registry = new ControllerRegistry();
    registry.register(UserController);
    registry.register(UserController);

    expect(registry.size).toBe(1);
  });

  it('registerAll registers every controller in an iterable', () => {
    @Controller('/users')
    class UserController {}
    @Controller('/orders')
    class OrderController {}

    const registry = new ControllerRegistry();
    registry.registerAll([UserController, OrderController]);

    expect(registry.size).toBe(2);
    expect([...registry.getAll().keys()]).toEqual([UserController, OrderController]);
  });

  it('get returns undefined for an unregistered controller', () => {
    @Controller('/users')
    class UserController {}
    const registry = new ControllerRegistry();
    expect(registry.get(UserController)).toBeUndefined();
  });

  it('clear removes every registered controller', () => {
    @Controller('/users')
    class UserController {}
    const registry = new ControllerRegistry();
    registry.register(UserController);

    registry.clear();

    expect(registry.size).toBe(0);
    expect(registry.has(UserController)).toBe(false);
  });
});
