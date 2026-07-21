import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { ScanError } from '../errors/scan.error.js';
import { clearImportCache, importControllersFromFile } from './module-importer.js';

const fixturesDir = fileURLToPath(new URL('./__fixtures__', import.meta.url));
const fixture = (name: string): string => `${fixturesDir}/${name}`;

afterEach(() => {
  clearImportCache();
});

describe('importControllersFromFile', () => {
  it('returns every @Controller()-decorated export from a module', async () => {
    const controllers = await importControllersFromFile(fixture('order.controller.ts'));
    expect(controllers.map((c) => c.name)).toEqual(
      expect.arrayContaining(['OrderController', 'InvoiceController']),
    );
  });

  it('filters out non-controller exports from the same module', async () => {
    const controllers = await importControllersFromFile(fixture('order.controller.ts'));
    expect(controllers.map((c) => c.name)).not.toContain('OrderService');
  });

  it('returns a single controller for a module with one', async () => {
    const controllers = await importControllersFromFile(fixture('user.controller.ts'));
    expect(controllers).toHaveLength(1);
    expect(controllers[0]?.name).toBe('UserController');
  });

  it('returns an empty array for a module with no controllers', async () => {
    const controllers = await importControllersFromFile(fixture('not-a-controller.ts'));
    expect(controllers).toEqual([]);
  });

  it('wraps an import-time failure in a ScanError', async () => {
    await expect(importControllersFromFile(fixture('broken-module.ts'))).rejects.toThrow(ScanError);
  });

  it('caches the result for repeated imports of the same file', async () => {
    const first = await importControllersFromFile(fixture('user.controller.ts'));
    const second = await importControllersFromFile(fixture('user.controller.ts'));
    expect(second).toBe(first);
  });

  it('clearImportCache forces the next call to re-import and re-filter', async () => {
    const first = await importControllersFromFile(fixture('user.controller.ts'));
    clearImportCache();
    const second = await importControllersFromFile(fixture('user.controller.ts'));
    expect(second).not.toBe(first);
    expect(second[0]).toBe(first[0]); // same underlying class — Node's own module cache still hits
  });
});
