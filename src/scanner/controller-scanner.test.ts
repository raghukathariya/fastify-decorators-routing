import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { Controller } from '../decorators/controller.decorator.js';
import { clearGlobCache } from './glob-resolver.js';
import { clearImportCache } from './module-importer.js';
import { scanControllers } from './controller-scanner.js';

const fixturesDir = fileURLToPath(new URL('./__fixtures__', import.meta.url));

afterEach(() => {
  clearGlobCache();
  clearImportCache();
});

describe('scanControllers', () => {
  it('returns explicitly listed controllers with no patterns given', async () => {
    @Controller('/widgets')
    class WidgetController {}

    const controllers = await scanControllers({ controllers: [WidgetController] });
    expect(controllers).toEqual([WidgetController]);
  });

  it('discovers controllers from a glob pattern', async () => {
    const controllers = await scanControllers({
      patterns: '*.controller.ts',
      cwd: fixturesDir,
    });

    expect(controllers.map((c) => c.name)).toEqual(
      expect.arrayContaining(['UserController', 'OrderController', 'InvoiceController']),
    );
  });

  it('combines explicit controllers with glob-discovered ones', async () => {
    @Controller('/widgets')
    class WidgetController {}

    const controllers = await scanControllers({
      controllers: [WidgetController],
      patterns: 'user.controller.ts',
      cwd: fixturesDir,
    });

    expect(controllers.map((c) => c.name)).toEqual(
      expect.arrayContaining(['WidgetController', 'UserController']),
    );
  });

  it('de-duplicates a controller listed explicitly and also matched by a glob', async () => {
    const { UserController } = (await import('./__fixtures__/user.controller.js')) as {
      UserController: new () => unknown;
    };

    const controllers = await scanControllers({
      controllers: [UserController],
      patterns: 'user.controller.ts',
      cwd: fixturesDir,
    });

    expect(controllers).toHaveLength(1);
  });

  it('de-duplicates controllers matched by two overlapping glob patterns', async () => {
    const controllers = await scanControllers({
      patterns: ['user.controller.ts', '*.controller.ts'],
      cwd: fixturesDir,
    });

    const userControllerCount = controllers.filter((c) => c.name === 'UserController').length;
    expect(userControllerCount).toBe(1);
  });

  it('returns an empty array when neither controllers nor patterns are given', async () => {
    expect(await scanControllers({})).toEqual([]);
  });
});
