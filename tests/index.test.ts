import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index.js';

describe('package entry point', () => {
  it('exports a semantic version string', () => {
    expect(VERSION).toBe('1.0.0');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
