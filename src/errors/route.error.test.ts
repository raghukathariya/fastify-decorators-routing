import { describe, expect, it } from 'vitest';
import { FrameworkError } from './framework.error.js';
import { RouteError } from './route.error.js';

describe('RouteError', () => {
  it('is a FrameworkError with a stable error code', () => {
    const error = new RouteError('generic failure');
    expect(error).toBeInstanceOf(FrameworkError);
    expect(error.code).toBe('ROUTE_ERROR');
  });

  it('duplicateRouteName names the conflicting name and both paths', () => {
    const error = RouteError.duplicateRouteName('user.detail', '/users/:id', '/orders/:id');
    expect(error.message).toContain('user.detail');
    expect(error.message).toContain('/users/:id');
    expect(error.message).toContain('/orders/:id');
  });

  it('unknownRouteName names the offending route name', () => {
    expect(RouteError.unknownRouteName('does.not.exist').message).toContain('does.not.exist');
  });

  it('missingRouteParam names the route, the missing param, and the path', () => {
    const error = RouteError.missingRouteParam('user.detail', 'id', '/users/:id');
    expect(error.message).toContain('user.detail');
    expect(error.message).toContain('id');
    expect(error.message).toContain('/users/:id');
  });

  it('registryNotAvailable produces a message pointing at registerControllers', () => {
    expect(RouteError.registryNotAvailable().message).toContain('registerControllers');
  });
});
