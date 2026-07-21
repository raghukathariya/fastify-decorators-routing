import { describe, expect, it } from 'vitest';
import { createInjectionToken } from './injection-token.js';

describe('createInjectionToken', () => {
  it('creates a symbol', () => {
    const token = createInjectionToken<string>('test:token');
    expect(typeof token).toBe('symbol');
  });

  it('creates a distinct token on every call, even with the same description', () => {
    const tokenA = createInjectionToken<string>('test:duplicate');
    const tokenB = createInjectionToken<string>('test:duplicate');
    expect(tokenA).not.toBe(tokenB);
  });

  it('preserves the description for debugging', () => {
    const token = createInjectionToken<string>('test:described');
    expect(token.toString()).toContain('test:described');
  });
});
