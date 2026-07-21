import { describe, expect, it } from 'vitest';
import { FrameworkError } from './framework.error.js';
import { PluginError } from './plugin.error.js';

describe('PluginError', () => {
  it('is a FrameworkError with a stable error code', () => {
    const error = new PluginError('generic failure');
    expect(error).toBeInstanceOf(FrameworkError);
    expect(error.code).toBe('PLUGIN_ERROR');
  });

  it('routeRegistrationFailed names the controller, method, and path', () => {
    const cause = new Error('duplicate route');
    const error = PluginError.routeRegistrationFailed('UserController', 'GET', '/users', cause);
    expect(error.message).toContain('GET /users');
    expect(error.message).toContain('UserController');
    expect(error.message).toContain('duplicate route');
    expect(error.cause).toBe(cause);
  });

  it('controllerResolutionFailed names the controller and preserves the cause', () => {
    const cause = new Error('no provider registered');
    const error = PluginError.controllerResolutionFailed('OrderController', cause);
    expect(error.message).toContain('OrderController');
    expect(error.message).toContain('no provider registered');
    expect(error.cause).toBe(cause);
  });
});
