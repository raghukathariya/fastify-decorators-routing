import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { clearGlobCache, resolveGlobFiles } from './glob-resolver.js';

const fixturesDir = fileURLToPath(new URL('./__fixtures__', import.meta.url));

afterEach(() => {
  clearGlobCache();
});

describe('resolveGlobFiles', () => {
  it('resolves a glob pattern to absolute file paths', async () => {
    const files = await resolveGlobFiles('*.controller.ts', fixturesDir);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/\.controller\.ts$/);
      expect(file.startsWith('/')).toBe(true);
    }
  });

  it('matches multiple files for a broad pattern', async () => {
    const files = await resolveGlobFiles('*.ts', fixturesDir);
    const basenames = files.map((f) => f.split('/').pop());
    expect(basenames).toEqual(
      expect.arrayContaining([
        'user.controller.ts',
        'order.controller.ts',
        'not-a-controller.ts',
        'broken-module.ts',
      ]),
    );
  });

  it('accepts an array of patterns', async () => {
    const files = await resolveGlobFiles(
      ['user.controller.ts', 'order.controller.ts'],
      fixturesDir,
    );
    expect(files).toHaveLength(2);
  });

  it('returns an empty array when nothing matches', async () => {
    const files = await resolveGlobFiles('*.nonexistent-extension', fixturesDir);
    expect(files).toEqual([]);
  });

  it('caches the result for identical (patterns, cwd) pairs', async () => {
    const first = await resolveGlobFiles('*.controller.ts', fixturesDir);
    const second = await resolveGlobFiles('*.controller.ts', fixturesDir);
    expect(second).toBe(first);
  });

  it('clearGlobCache forces the next call to re-resolve', async () => {
    const first = await resolveGlobFiles('*.controller.ts', fixturesDir);
    clearGlobCache();
    const second = await resolveGlobFiles('*.controller.ts', fixturesDir);
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });

  it('treats different cwd values as independent cache entries', async () => {
    const a = await resolveGlobFiles('*.controller.ts', fixturesDir);
    const b = await resolveGlobFiles(
      '*.controller.ts',
      fileURLToPath(new URL('.', import.meta.url)),
    );
    expect(a).not.toEqual(b);
  });
});
