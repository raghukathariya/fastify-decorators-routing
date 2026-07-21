import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Controller } from '../decorators/controller.decorator.js';
import { Get, Post } from '../decorators/http-method.decorator.js';
import { Group } from '../decorators/group.decorator.js';
import { Prefix } from '../decorators/prefix.decorator.js';
import { Tag } from '../decorators/tag.decorator.js';
import { Version } from '../decorators/version.decorator.js';
import { listRoutes, printRoutes } from './route-printer.js';

describe('listRoutes', () => {
  it('resolves method, path, controller, and handler for a plain route', () => {
    @Controller('/users')
    class UserController {
      @Get('/:id')
      public getUser(): void {
        // intentionally empty
      }
    }

    expect(listRoutes([UserController])).toEqual([
      {
        method: 'GET',
        path: '/users/:id',
        controller: 'UserController',
        handler: 'getUser',
        tags: [],
      },
    ]);
  });

  it('joins @Prefix and @Controller into the resolved path', () => {
    @Prefix('/v1')
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }

    expect(listRoutes([UserController])[0]?.path).toBe('/v1/users');
  });

  it('includes a route name when the route declares one', () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { name: 'user.detail' })
      public getUser(): void {
        // intentionally empty
      }
    }

    expect(listRoutes([UserController])[0]?.name).toBe('user.detail');
  });

  it('omits name when the route declares none', () => {
    @Controller('/users')
    class UserController {
      @Get('/:id')
      public getUser(): void {
        // intentionally empty
      }
    }

    expect(listRoutes([UserController])[0]).not.toHaveProperty('name');
  });

  it("includes the controller's @Group", () => {
    @Group('admin')
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }

    expect(listRoutes([UserController])[0]?.group).toBe('admin');
  });

  it("includes the controller's @Tag list", () => {
    @Tag('users', 'public')
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }

    expect(listRoutes([UserController])[0]?.tags).toEqual(['users', 'public']);
  });

  it("falls back to the controller's @Version when the route declares none", () => {
    @Version('1')
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }

    expect(listRoutes([UserController])[0]?.version).toBe('1');
  });

  it("uses the route's own version, overriding the controller's", () => {
    @Version('1')
    @Controller('/users')
    class UserController {
      @Get('/', { version: '2' })
      public list(): void {
        // intentionally empty
      }
    }

    expect(listRoutes([UserController])[0]?.version).toBe('2');
  });

  it('lists every route across multiple controllers, in order', () => {
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }
    @Controller('/orders')
    class OrderController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }

    const infos = listRoutes([UserController, OrderController]);
    expect(infos.map((info) => info.controller)).toEqual(['UserController', 'OrderController']);
  });

  it('lists every route method on one controller', () => {
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }

      @Post('/')
      public create(): void {
        // intentionally empty
      }
    }

    const infos = listRoutes([UserController]);
    expect(infos.map((info) => info.method)).toEqual(['GET', 'POST']);
  });

  it('skips a class with no @Controller() decorator', () => {
    class NotAController {}
    expect(listRoutes([NotAController])).toEqual([]);
  });

  it('returns an empty array for no controllers', () => {
    expect(listRoutes([])).toEqual([]);
  });
});

describe('printRoutes', () => {
  it('returns an empty string when there are no routes', () => {
    expect(printRoutes([])).toBe('');
  });

  it('formats a single route under an "Ungrouped" section', () => {
    @Controller('/health')
    class HealthController {
      @Get('/')
      public check(): void {
        // intentionally empty
      }
    }

    const output = printRoutes([HealthController]);
    expect(output).toBe('Ungrouped:\n  GET /health HealthController.check');
  });

  it('appends the route name in parentheses when present', () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { name: 'user.detail' })
      public getUser(): void {
        // intentionally empty
      }
    }

    const output = printRoutes([UserController]);
    expect(output).toContain('(user.detail)');
  });

  it('sorts a grouped section before an ungrouped one regardless of declaration order', () => {
    @Controller('/health')
    class HealthController {
      @Get('/')
      public check(): void {
        // intentionally empty
      }
    }
    @Group('admin')
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }

    const output = printRoutes([HealthController, UserController]);
    const sections = output.split('\n\n').map((section) => section.split('\n')[0]);
    expect(sections).toEqual(['admin:', 'Ungrouped:']);
  });

  it('organizes routes into sections by @Group, sorted alphabetically with ungrouped last', () => {
    @Group('billing')
    @Controller('/invoices')
    class InvoiceController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }
    @Group('admin')
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }
    }
    @Controller('/health')
    class HealthController {
      @Get('/')
      public check(): void {
        // intentionally empty
      }
    }

    const output = printRoutes([InvoiceController, UserController, HealthController]);
    const sections = output.split('\n\n').map((section) => section.split('\n')[0]);
    expect(sections).toEqual(['admin:', 'billing:', 'Ungrouped:']);
  });

  it('pads method and path columns to align across rows', () => {
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): void {
        // intentionally empty
      }

      @Post('/:id/activate')
      public activate(): void {
        // intentionally empty
      }
    }

    const lines = printRoutes([UserController]).split('\n').slice(1);
    expect(lines[0]?.indexOf('UserController')).toBe(lines[1]?.indexOf('UserController'));
  });
});
