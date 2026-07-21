import { describe, expect, it } from 'vitest';
import { DependencyError } from './dependency.error.js';
import { FrameworkError } from './framework.error.js';

describe('DependencyError', () => {
  it('is a FrameworkError with a stable error code', () => {
    const error = new DependencyError('generic failure');
    expect(error).toBeInstanceOf(FrameworkError);
    expect(error.code).toBe('DEPENDENCY_ERROR');
  });

  it('notRegistered names the offending token', () => {
    class MyService {}
    expect(DependencyError.notRegistered(MyService).message).toContain('MyService');
  });

  it('circularDependency renders the full cycle path', () => {
    class A {}
    class B {}
    const error = DependencyError.circularDependency([A, B, A]);
    expect(error.message).toContain('A -> B -> A');
  });

  it('ambiguousParameter names the class and parameter index', () => {
    class MyService {}
    const error = DependencyError.ambiguousParameter(MyService, 2);
    expect(error.message).toContain('MyService');
    expect(error.message).toContain('parameter 2');
  });

  it('invalidProvider includes the malformed provider', () => {
    const error = DependencyError.invalidProvider({ provide: 'x' });
    expect(error.message).toContain('provide');
  });

  it('invalidInjectUsage includes the given reason', () => {
    const error = DependencyError.invalidInjectUsage('cannot use on method parameters');
    expect(error.message).toContain('cannot use on method parameters');
  });

  it('disposed produces a clear message', () => {
    expect(DependencyError.disposed().message).toMatch(/disposed/i);
  });
});
