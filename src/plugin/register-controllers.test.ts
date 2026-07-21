import 'reflect-metadata';
import { fileURLToPath } from 'node:url';
import { Expose } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container } from '../container/container.js';
import { Inject } from '../container/inject.decorator.js';
import { Injectable } from '../container/injectable.decorator.js';
import { createInjectionToken } from '../container/injection-token.js';
import { Controller } from '../decorators/controller.decorator.js';
import { Get, Post } from '../decorators/http-method.decorator.js';
import type { RouteMiddleware } from '../decorators/http-method.types.js';
import { Body, Param } from '../decorators/param.decorator.js';
import { Prefix } from '../decorators/prefix.decorator.js';
import { PluginError } from '../errors/plugin.error.js';
import { ScanError } from '../errors/scan.error.js';
import { Catch } from '../exceptions/catch.decorator.js';
import type { ExceptionFilter, ExceptionFilterLike } from '../exceptions/exception-filter.types.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '../exceptions/http-exceptions.js';
import { UseFilter } from '../exceptions/use-filter.decorator.js';
import { UseGuard } from '../guards/use-guard.decorator.js';
import type { CanActivate } from '../guards/guard.types.js';
import { Authenticated } from '../auth/authenticated.decorator.js';
import { Permissions } from '../auth/permissions.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { UsePolicy } from '../auth/use-policy.decorator.js';
import {
  CachingInterceptor,
  LoggingInterceptor,
  TimingInterceptor,
  UseInterceptor,
} from '../interceptors/index.js';
import { SerializeWith } from '../serialization/serialize-with.decorator.js';
import type { Interceptor, InterceptorLike, NextFn } from '../interceptors/interceptor.types.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { Use } from '../middlewares/use.decorator.js';
import { getRouteRegistry } from '../router/get-route-registry.js';
import { ApiOperation } from '../swagger/api-operation.decorator.js';
import { ApiResponse } from '../swagger/api-response.decorator.js';
import { ApiSecurity } from '../swagger/api-security.decorator.js';
import { ApiTags } from '../swagger/api-tags.decorator.js';
import { Version } from '../decorators/version.decorator.js';
import { UploadedFile, UploadedFiles } from '../decorators/param.decorator.js';
import type { UploadedFile as UploadedFileType } from '../decorators/multipart-file.type.js';
import { clearGlobCache } from '../scanner/glob-resolver.js';
import { clearImportCache } from '../scanner/module-importer.js';
import { registerControllers } from './register-controllers.js';

const fixturesDir = fileURLToPath(new URL('../scanner/__fixtures__', import.meta.url));

afterEach(() => {
  clearGlobCache();
  clearImportCache();
});

describe('registerControllers: explicit controllers', () => {
  it('registers a controller and serves a request through it', async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id')
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({ method: 'GET', url: '/users/7' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: '7' });
  });

  it('registers multiple controllers independently', async () => {
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): string {
        return 'users';
      }
    }
    @Controller('/orders')
    class OrderController {
      @Get('/')
      public list(): string {
        return 'orders';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController, OrderController] });

    expect((await app.inject({ method: 'GET', url: '/users' })).body).toBe('users');
    expect((await app.inject({ method: 'GET', url: '/orders' })).body).toBe('orders');
  });

  it('applies a globalPrefix to every registered controller', async () => {
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      globalPrefix: '/api',
    });

    expect((await app.inject({ method: 'GET', url: '/api/users' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/users' })).statusCode).toBe(404);
  });

  it('combines a globalPrefix with @Prefix and the controller path', async () => {
    @Prefix('/v1')
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      globalPrefix: '/api',
    });

    expect((await app.inject({ method: 'GET', url: '/api/v1/users' })).statusCode).toBe(200);
  });
});

describe('registerControllers: dependency injection', () => {
  it('injects a service registered on a user-supplied container', async () => {
    @Injectable()
    class GreetingService {
      public greet(name: string): string {
        return `Hello, ${name}!`;
      }
    }

    @Controller('/greetings')
    class GreetingController {
      public constructor(private readonly greetingService: GreetingService) {}

      @Get('/:name')
      public greet(@Param('name') name: string): string {
        return this.greetingService.greet(name);
      }
    }

    const container = new Container();
    container.registerClass(GreetingService);

    const app = Fastify();
    await app.register(registerControllers, { controllers: [GreetingController], container });

    const response = await app.inject({ method: 'GET', url: '/greetings/Ada' });
    expect(response.body).toBe('Hello, Ada!');
  });

  it('injects a value provider registered by injection token', async () => {
    const CONFIG = createInjectionToken<{ appName: string }>('test:app-config');

    @Controller('/info')
    class InfoController {
      public constructor(@Inject(CONFIG) private readonly config: { appName: string }) {}

      @Get('/')
      public getInfo(): object {
        return { appName: this.config.appName };
      }
    }

    const container = new Container();
    container.registerValue(CONFIG, { appName: 'TestApp' });

    const app = Fastify();
    await app.register(registerControllers, { controllers: [InfoController], container });

    const response = await app.inject({ method: 'GET', url: '/info' });
    expect(response.json()).toEqual({ appName: 'TestApp' });
  });

  it('auto-registers a controller class the caller did not register themselves', async () => {
    @Controller('/ping')
    class PingController {
      @Get('/')
      public ping(): string {
        return 'pong';
      }
    }

    const container = new Container();
    const app = Fastify();
    await app.register(registerControllers, { controllers: [PingController], container });

    expect(container.has(PingController)).toBe(true);
    expect((await app.inject({ method: 'GET', url: '/ping' })).body).toBe('pong');
  });

  it('does not clobber a controller registration the caller made explicitly', async () => {
    let instanceCount = 0;
    @Controller('/counter')
    class CounterController {
      public readonly id = ++instanceCount;
      @Get('/')
      public get(): number {
        return this.id;
      }
    }

    const container = new Container();
    container.registerClass(CounterController, { scope: 'singleton' });
    // Force a resolve before registerControllers runs, so a clobbering re-registration would be
    // observable as a *different* singleton instance created afterward.
    const before = container.resolve(CounterController);

    const app = Fastify();
    await app.register(registerControllers, { controllers: [CounterController], container });

    const response = await app.inject({ method: 'GET', url: '/counter' });
    expect(response.json()).toBe(before.id);
  });

  it('creates one request-scoped instance shared by everything resolving it during that request', async () => {
    @Injectable({ scope: 'scoped' })
    class RequestId {
      public readonly value = Math.random();
    }

    @Controller('/scoped', { scope: 'scoped' })
    class ScopedController {
      public constructor(public requestId: RequestId) {}

      @Get('/')
      public handle(): { value: number } {
        return { value: this.requestId.value };
      }
    }

    const container = new Container();
    container.registerClass(RequestId);

    const app = Fastify();
    await app.register(registerControllers, { controllers: [ScopedController], container });

    const first = await app.inject({ method: 'GET', url: '/scoped' });
    const second = await app.inject({ method: 'GET', url: '/scoped' });

    const firstBody = first.json<{ value: number }>();
    const secondBody = second.json<{ value: number }>();
    expect(firstBody.value).not.toBe(secondBody.value);
  });

  it('disposes a request scope after the response is sent', async () => {
    const onDestroy = vi.fn();

    @Injectable({ scope: 'scoped' })
    class ScopedService {
      public onDestroy(): void {
        onDestroy();
      }
    }

    @Controller('/scoped', { scope: 'scoped' })
    class ScopedController {
      public constructor(public service: ScopedService) {}
      @Get('/')
      public handle(): string {
        return 'ok';
      }
    }

    const container = new Container();
    container.registerClass(ScopedService);

    const app = Fastify();
    await app.register(registerControllers, { controllers: [ScopedController], container });
    await app.inject({ method: 'GET', url: '/scoped' });

    expect(onDestroy).toHaveBeenCalledOnce();
  });

  it('throws a PluginError when a controller dependency is not registered', async () => {
    @Injectable()
    class UnregisteredService {}

    @Controller('/broken')
    class BrokenController {
      public constructor(public service: UnregisteredService) {}
      @Get('/')
      public handle(): string {
        return 'unreachable';
      }
    }

    const app = Fastify();
    await expect(
      app.register(registerControllers, { controllers: [BrokenController] }),
    ).rejects.toThrow(PluginError);
  });
});

describe('registerControllers: glob-based discovery', () => {
  it('discovers a controller via glob and registers it on the DI container', async () => {
    const { UserController } = (await import('../scanner/__fixtures__/user.controller.js')) as {
      UserController: new () => unknown;
    };

    const container = new Container();
    const app = Fastify();
    await app.register(registerControllers, {
      patterns: 'user.controller.ts',
      cwd: fixturesDir,
      container,
    });

    // The fixture's UserController has no route methods, so there's nothing to inject() against
    // — this proves discovery + registration completed by checking the DI side effect instead.
    expect(container.has(UserController)).toBe(true);
  });

  it('rejects a class explicitly listed that is not a controller', async () => {
    class NotAController {}
    const app = Fastify();

    await expect(
      app.register(registerControllers, { controllers: [NotAController] }),
    ).rejects.toThrow(ScanError);
  });
});

describe('registerControllers: body parsing', () => {
  it('registers a POST route and extracts the request body', async () => {
    @Controller('/echo')
    class EchoController {
      @Post('/')
      public echo(@Body() body: unknown): unknown {
        return body;
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [EchoController] });

    const response = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { hello: 'world' },
    });
    expect(response.json()).toEqual({ hello: 'world' });
  });
});

describe('registerControllers: middleware', () => {
  it('runs global middleware before controller @Use middleware, before the handler', async () => {
    const calls: string[] = [];

    @Use((_req, _reply, done) => {
      calls.push('controller');
      done();
    })
    @Controller('/greet')
    class GreetController {
      @Get('/')
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const app = Fastify();
    const globalMiddleware: RouteMiddleware = (_req, _reply, done) => {
      calls.push('global');
      done();
    };
    await app.register(registerControllers, {
      controllers: [GreetController],
      middleware: [globalMiddleware],
    });

    await app.inject({ method: 'GET', url: '/greet' });
    expect(calls).toEqual(['global', 'controller', 'handler']);
  });

  it('applies global middleware to every controller registered by the same call', async () => {
    const calls: string[] = [];

    @Controller('/a')
    class ControllerA {
      @Get('/')
      public handle(): string {
        return 'a';
      }
    }
    @Controller('/b')
    class ControllerB {
      @Get('/')
      public handle(): string {
        return 'b';
      }
    }

    const app = Fastify();
    const globalMiddleware: RouteMiddleware = (_req, _reply, done) => {
      calls.push('global');
      done();
    };
    await app.register(registerControllers, {
      controllers: [ControllerA, ControllerB],
      middleware: [globalMiddleware],
    });

    await app.inject({ method: 'GET', url: '/a' });
    await app.inject({ method: 'GET', url: '/b' });
    expect(calls).toEqual(['global', 'global']);
  });
});

describe('registerControllers: guards', () => {
  it('returns 403 for a request a controller-level guard denies', async () => {
    @UseGuard(() => false)
    @Controller('/admin')
    class AdminController {
      @Get('/')
      public handle(): string {
        return 'secret';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [AdminController] });

    const response = await app.inject({ method: 'GET', url: '/admin' });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ statusCode: 403, error: 'Forbidden' });
  });

  it('allows a request every guard accepts through to the handler', async () => {
    @UseGuard(() => true)
    @Controller('/admin')
    class AdminController {
      @Get('/')
      public handle(): string {
        return 'secret';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [AdminController] });

    const response = await app.inject({ method: 'GET', url: '/admin' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('secret');
  });

  it('resolves a guard class through DI, including its own injected dependencies', async () => {
    @Injectable()
    class AuthService {
      public isAuthorized(token: string | undefined): boolean {
        return token === 'valid-token';
      }
    }

    @Injectable()
    class AuthGuard implements CanActivate {
      public constructor(private readonly authService: AuthService) {}
      public canActivate(context: ExecutionContext): boolean {
        return this.authService.isAuthorized(context.request.headers.authorization);
      }
    }

    @UseGuard(AuthGuard)
    @Controller('/secure')
    class SecureController {
      @Get('/')
      public handle(): string {
        return 'granted';
      }
    }

    const container = new Container();
    container.registerClass(AuthService);

    const app = Fastify();
    await app.register(registerControllers, { controllers: [SecureController], container });

    const denied = await app.inject({ method: 'GET', url: '/secure' });
    expect(denied.statusCode).toBe(403);

    const granted = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: 'valid-token' },
    });
    expect(granted.statusCode).toBe(200);
    expect(granted.body).toBe('granted');
  });

  it('runs a route-level guard only for that route, not sibling routes on the same controller', async () => {
    @Controller('/mixed')
    class MixedController {
      @UseGuard(() => false)
      @Get('/protected')
      public protected_(): string {
        return 'secret';
      }

      @Get('/open')
      public open(): string {
        return 'public';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [MixedController] });

    expect((await app.inject({ method: 'GET', url: '/mixed/protected' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/mixed/open' })).statusCode).toBe(200);
  });

  it('supports an async guard', async () => {
    @UseGuard(async () => Promise.resolve(false))
    @Controller('/async-guard')
    class AsyncGuardController {
      @Get('/')
      public handle(): string {
        return 'secret';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [AsyncGuardController] });

    expect((await app.inject({ method: 'GET', url: '/async-guard' })).statusCode).toBe(403);
  });
});

describe('registerControllers: interceptors', () => {
  it('transforms the response through a controller-level interceptor', async () => {
    const wrapInterceptor: InterceptorLike = async (_context, next) => ({
      data: await next(),
    });

    @UseInterceptor(wrapInterceptor)
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): string[] {
        return ['ada', 'grace'];
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({ method: 'GET', url: '/users' });
    expect(response.json()).toEqual({ data: ['ada', 'grace'] });
  });

  it('runs controller and route interceptors together, outer to inner', async () => {
    const calls: string[] = [];
    const outer: InterceptorLike = async (_c, next) => {
      calls.push('outer-before');
      const r = await next();
      calls.push('outer-after');
      return r;
    };
    const inner: InterceptorLike = async (_c, next) => {
      calls.push('inner-before');
      const r = await next();
      calls.push('inner-after');
      return r;
    };

    @UseInterceptor(outer)
    @Controller('/nested')
    class NestedController {
      @UseInterceptor(inner)
      @Get('/')
      public handle(): string {
        calls.push('handler');
        return 'ok';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [NestedController] });
    await app.inject({ method: 'GET', url: '/nested' });

    expect(calls).toEqual([
      'outer-before',
      'inner-before',
      'handler',
      'inner-after',
      'outer-after',
    ]);
  });

  it('recovers from a handler error via error-interception, avoiding a 500', async () => {
    const recoveringInterceptor: InterceptorLike = async (_context, next) => {
      try {
        return await next();
      } catch {
        return { recovered: true };
      }
    };

    @UseInterceptor(recoveringInterceptor)
    @Controller('/flaky')
    class FlakyController {
      @Get('/')
      public handle(): never {
        throw new Error('downstream failure');
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [FlakyController] });

    const response = await app.inject({ method: 'GET', url: '/flaky' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ recovered: true });
  });

  it('resolves an interceptor class through DI, including its own injected dependencies', async () => {
    @Injectable()
    class MetricsService {
      public count = 0;
      public record(): void {
        this.count += 1;
      }
    }

    @Injectable()
    class MetricsInterceptor implements Interceptor {
      public constructor(private readonly metrics: MetricsService) {}
      public intercept(_context: ExecutionContext, next: NextFn): unknown {
        this.metrics.record();
        return next();
      }
    }

    @UseInterceptor(MetricsInterceptor)
    @Controller('/metrics')
    class MetricsController {
      @Get('/')
      public handle(): string {
        return 'ok';
      }
    }

    const container = new Container();
    container.registerClass(MetricsService);

    const app = Fastify();
    await app.register(registerControllers, { controllers: [MetricsController], container });

    await app.inject({ method: 'GET', url: '/metrics' });
    await app.inject({ method: 'GET', url: '/metrics' });

    expect(container.resolve(MetricsService).count).toBe(2);
  });

  it('applies the built-in TimingInterceptor as a response header', async () => {
    @UseInterceptor(new TimingInterceptor())
    @Controller('/timed')
    class TimedController {
      @Get('/')
      public handle(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [TimedController] });

    const response = await app.inject({ method: 'GET', url: '/timed' });
    expect(response.headers['x-response-time-ms']).toMatch(/^\d+\.\d{2}$/);
  });

  it('applies the built-in LoggingInterceptor without breaking the response', async () => {
    @UseInterceptor(new LoggingInterceptor())
    @Controller('/logged')
    class LoggedController {
      @Get('/')
      public handle(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [LoggedController] });

    const response = await app.inject({ method: 'GET', url: '/logged' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('ok');
  });

  it('applies the built-in CachingInterceptor, skipping the handler on a cache hit', async () => {
    let calls = 0;
    const cache = new CachingInterceptor({ ttlMs: 60_000 });

    @UseInterceptor(cache)
    @Controller('/cached')
    class CachedController {
      @Get('/')
      public handle(): { count: number } {
        calls += 1;
        return { count: calls };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [CachedController] });

    const first = await app.inject({ method: 'GET', url: '/cached' });
    const second = await app.inject({ method: 'GET', url: '/cached' });

    expect(first.json()).toEqual({ count: 1 });
    expect(second.json()).toEqual({ count: 1 });
    expect(calls).toBe(1);
  });
});

describe('registerControllers: exception filters', () => {
  it('maps a thrown HttpException to the correct status and body with no filters registered', async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id')
      public getUser(): never {
        throw new NotFoundException('User not found');
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({ method: 'GET', url: '/users/42' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'User not found',
    });
  });

  it('maps an unexpected plain Error to a generic 500', async () => {
    @Controller('/broken')
    class BrokenController {
      @Get('/')
      public handle(): never {
        throw new Error('unexpected failure');
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [BrokenController] });

    const response = await app.inject({ method: 'GET', url: '/broken' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ statusCode: 500, error: 'Internal Server Error' });
  });

  it('a route-level @UseFilter customizes the response for its declared exception type', async () => {
    @Catch(NotFoundException)
    class NotFoundFilter implements ExceptionFilter {
      public catch(exception: NotFoundException): unknown {
        return { customNotFound: exception.message };
      }
    }

    @Controller('/users')
    class UserController {
      @UseFilter(NotFoundFilter)
      @Get('/:id')
      public getUser(): never {
        throw new NotFoundException('User 42 not found');
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({ method: 'GET', url: '/users/42' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ customNotFound: 'User 42 not found' });
  });

  it('a controller-level @UseFilter applies to every route on it', async () => {
    const filter: ExceptionFilterLike = () => ({ handledByControllerFilter: true });

    @UseFilter(filter)
    @Controller('/users')
    class UserController {
      @Get('/a')
      public a(): never {
        throw new Error('boom-a');
      }
      @Get('/b')
      public b(): never {
        throw new Error('boom-b');
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const a = await app.inject({ method: 'GET', url: '/users/a' });
    const b = await app.inject({ method: 'GET', url: '/users/b' });
    expect(a.json()).toEqual({ handledByControllerFilter: true });
    expect(b.json()).toEqual({ handledByControllerFilter: true });
  });

  it('a global filter (registerControllers({ filters })) applies across all controllers', async () => {
    const filter: ExceptionFilterLike = (exception) => ({
      global: true,
      message: (exception as Error).message,
    });

    @Controller('/a')
    class ControllerA {
      @Get('/')
      public handle(): never {
        throw new Error('from-a');
      }
    }
    @Controller('/b')
    class ControllerB {
      @Get('/')
      public handle(): never {
        throw new Error('from-b');
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [ControllerA, ControllerB],
      filters: [filter],
    });

    const a = await app.inject({ method: 'GET', url: '/a' });
    const b = await app.inject({ method: 'GET', url: '/b' });
    expect(a.json()).toEqual({ global: true, message: 'from-a' });
    expect(b.json()).toEqual({ global: true, message: 'from-b' });
  });

  it('prefers a route-level filter over a controller-level one for the same exception', async () => {
    const controllerFilter: ExceptionFilterLike = () => ({ from: 'controller' });
    const routeFilter: ExceptionFilterLike = () => ({ from: 'route' });

    @UseFilter(controllerFilter)
    @Controller('/x')
    class XController {
      @UseFilter(routeFilter)
      @Get('/')
      public handle(): never {
        throw new Error('boom');
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [XController] });

    const response = await app.inject({ method: 'GET', url: '/x' });
    expect(response.json()).toEqual({ from: 'route' });
  });

  it('a custom filter can intercept a ForbiddenException thrown by a rejected guard', async () => {
    @Catch(ForbiddenException)
    class ForbiddenFilter implements ExceptionFilter {
      public catch(): unknown {
        return { customForbidden: true };
      }
    }

    @UseFilter(ForbiddenFilter)
    @UseGuard(() => false)
    @Controller('/secure')
    class SecureController {
      @Get('/')
      public handle(): string {
        return 'unreachable';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [SecureController] });

    const response = await app.inject({ method: 'GET', url: '/secure' });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ customForbidden: true });
  });

  it('a filter that does not match the exception type falls through to default handling', async () => {
    @Catch(BadRequestException)
    class WrongTypeFilter implements ExceptionFilter {
      public catch(): unknown {
        return { shouldNotBeUsed: true };
      }
    }

    @UseFilter(WrongTypeFilter)
    @Controller('/mismatched')
    class MismatchedController {
      @Get('/')
      public handle(): never {
        throw new NotFoundException('not found here');
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [MismatchedController] });

    const response = await app.inject({ method: 'GET', url: '/mismatched' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ statusCode: 404, error: 'Not Found' });
  });
});

describe('registerControllers: automatic DTO validation', () => {
  class CreateUserDto {
    @IsString()
    public name!: string;

    @IsEmail()
    public email!: string;
  }

  it('accepts a valid request body, injecting a transformed DTO instance', async () => {
    @Controller('/users')
    class UserController {
      @Post('/')
      public create(@Body() body: CreateUserDto): object {
        return { isDto: body instanceof CreateUserDto, name: body.name };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'Ada', email: 'ada@example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ isDto: true, name: 'Ada' });
  });

  it('rejects an invalid request body with a 400 and validation details', async () => {
    @Controller('/users')
    class UserController {
      @Post('/')
      public create(@Body() body: CreateUserDto): object {
        return { name: body.name };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'Ada', email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<{ statusCode: number; message: string[] }>();
    expect(body.statusCode).toBe(400);
    expect(body.message.some((m) => m.toLowerCase().includes('email'))).toBe(true);
  });

  it('opts out of automatic validation with { validate: false }', async () => {
    @Controller('/users')
    class UserController {
      @Post('/')
      public create(@Body({ validate: false }) body: CreateUserDto): object {
        return { isDto: body instanceof CreateUserDto, raw: body };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    // Deliberately invalid per CreateUserDto's decorators — would 400 if validation ran.
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ isDto: false, raw: { email: 'not-an-email' } });
  });

  it('does not attempt to validate a primitive-typed @Param even though it is object-extraction', async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id')
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({ method: 'GET', url: '/users/42' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: '42' });
  });
});

describe('registerControllers: response serialization', () => {
  class UserResponseDto {
    @Expose()
    public id!: string;

    @Expose()
    public name!: string;

    // Never @Expose()d — must never reach the response.
    public passwordHash?: string;
  }

  it('strips non-@Expose()d fields from the response via @SerializeWith', async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id')
      @SerializeWith(UserResponseDto)
      public getUser(): object {
        return { id: '1', name: 'Ada', passwordHash: 'super-secret' };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({ method: 'GET', url: '/users/1' });
    expect(response.json()).toEqual({ id: '1', name: 'Ada' });
  });

  it('serializes every element of an array response', async () => {
    @Controller('/users')
    class UserController {
      @Get('/')
      @SerializeWith(UserResponseDto)
      public list(): object[] {
        return [
          { id: '1', name: 'Ada', passwordHash: 'secret-1' },
          { id: '2', name: 'Grace', passwordHash: 'secret-2' },
        ];
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const response = await app.inject({ method: 'GET', url: '/users' });
    expect(response.json()).toEqual([
      { id: '1', name: 'Ada' },
      { id: '2', name: 'Grace' },
    ]);
  });

  it('leaves the response untouched for a route with no @SerializeWith', async () => {
    @Controller('/raw')
    class RawController {
      @Get('/')
      public handle(): object {
        return { id: '1', name: 'Ada', passwordHash: 'super-secret' };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [RawController] });

    const response = await app.inject({ method: 'GET', url: '/raw' });
    expect(response.json()).toEqual({ id: '1', name: 'Ada', passwordHash: 'super-secret' });
  });

  it("serializes the interceptor chain's final result, not the raw handler return value", async () => {
    @Controller('/wrapped')
    class WrappedController {
      @Get('/')
      @SerializeWith(UserResponseDto)
      @UseInterceptor(async (_context, next) => {
        const result = (await next()) as { id: string; name: string };
        return { ...result, name: result.name.toUpperCase(), passwordHash: 'leaked-if-broken' };
      })
      public handle(): object {
        return { id: '1', name: 'ada' };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [WrappedController] });

    const response = await app.inject({ method: 'GET', url: '/wrapped' });
    expect(response.json()).toEqual({ id: '1', name: 'ADA' });
  });
});

describe('registerControllers: authentication', () => {
  function applyFakeAuth(app: FastifyInstance, user: unknown): void {
    app.addHook('onRequest', (request, _reply, done) => {
      (request as unknown as Record<string, unknown>).user = user;
      done();
    });
  }

  it('rejects with 401 when @Authenticated and there is no request.user', async () => {
    @Controller('/profile')
    class ProfileController {
      @Get('/')
      @Authenticated()
      public getProfile(): object {
        return { ok: true };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [ProfileController] });

    const response = await app.inject({ method: 'GET', url: '/profile' });
    expect(response.statusCode).toBe(401);
  });

  it('allows the request through @Authenticated when request.user is set', async () => {
    @Controller('/profile')
    class ProfileController {
      @Get('/')
      @Authenticated()
      public getProfile(): object {
        return { ok: true };
      }
    }

    const app = Fastify();
    applyFakeAuth(app, { id: 'user-1' });
    await app.register(registerControllers, { controllers: [ProfileController] });

    const response = await app.inject({ method: 'GET', url: '/profile' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('rejects with 403 via @Roles when the user lacks every required role', async () => {
    @Controller('/admin')
    class AdminController {
      @Get('/')
      @Roles('admin')
      public getSecrets(): object {
        return { secret: true };
      }
    }

    const app = Fastify();
    applyFakeAuth(app, { id: 'user-1', roles: ['viewer'] });
    await app.register(registerControllers, { controllers: [AdminController] });

    const response = await app.inject({ method: 'GET', url: '/admin' });
    expect(response.statusCode).toBe(403);
  });

  it('allows the request through @Roles when the user has a matching role', async () => {
    @Controller('/admin')
    class AdminController {
      @Get('/')
      @Roles('admin', 'moderator')
      public getSecrets(): object {
        return { secret: true };
      }
    }

    const app = Fastify();
    applyFakeAuth(app, { id: 'user-1', roles: ['moderator'] });
    await app.register(registerControllers, { controllers: [AdminController] });

    const response = await app.inject({ method: 'GET', url: '/admin' });
    expect(response.statusCode).toBe(200);
  });

  it('rejects with 401 via @Roles when there is no authenticated user at all', async () => {
    @Controller('/admin')
    class AdminController {
      @Get('/')
      @Roles('admin')
      public getSecrets(): object {
        return { secret: true };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [AdminController] });

    const response = await app.inject({ method: 'GET', url: '/admin' });
    expect(response.statusCode).toBe(401);
  });

  it('applies @Roles at the controller level to every route in it', async () => {
    @Controller('/billing')
    @Roles('billing-admin')
    class BillingController {
      @Get('/invoices')
      public listInvoices(): object {
        return { invoices: [] };
      }

      @Get('/reports')
      public listReports(): object {
        return { reports: [] };
      }
    }

    const app = Fastify();
    applyFakeAuth(app, { roles: ['someone-else'] });
    await app.register(registerControllers, { controllers: [BillingController] });

    expect((await app.inject({ method: 'GET', url: '/billing/invoices' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/billing/reports' })).statusCode).toBe(403);
  });

  it('rejects with 403 via @Permissions when the user lacks every required permission', async () => {
    @Controller('/billing')
    class BillingController {
      @Post('/refund')
      @Permissions('billing:refund')
      public refund(): object {
        return { refunded: true };
      }
    }

    const app = Fastify();
    applyFakeAuth(app, { permissions: ['billing:read'] });
    await app.register(registerControllers, { controllers: [BillingController] });

    const response = await app.inject({ method: 'POST', url: '/billing/refund' });
    expect(response.statusCode).toBe(403);
  });

  it('allows the request through @Permissions when the user has a matching permission', async () => {
    @Controller('/billing')
    class BillingController {
      @Post('/refund')
      @Permissions('billing:refund')
      public refund(): object {
        return { refunded: true };
      }
    }

    const app = Fastify();
    applyFakeAuth(app, { permissions: ['billing:refund'] });
    await app.register(registerControllers, { controllers: [BillingController] });

    const response = await app.inject({ method: 'POST', url: '/billing/refund' });
    expect(response.statusCode).toBe(200);
  });

  it('enforces an ownership rule via @UsePolicy', async () => {
    @Controller('/posts')
    class PostController {
      @Get('/:id')
      @UsePolicy((user, ctx) => (user as { id: string }).id === ctx.request.headers['x-owner-id'])
      public getPost(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    applyFakeAuth(app, { id: 'owner-1' });
    await app.register(registerControllers, { controllers: [PostController] });

    const allowed = await app.inject({
      method: 'GET',
      url: '/posts/42',
      headers: { 'x-owner-id': 'owner-1' },
    });
    expect(allowed.statusCode).toBe(200);

    const denied = await app.inject({
      method: 'GET',
      url: '/posts/42',
      headers: { 'x-owner-id': 'someone-else' },
    });
    expect(denied.statusCode).toBe(403);
  });

  it('a @UseFilter can customize the response for an @Authenticated rejection', async () => {
    @Catch(UnauthorizedException)
    class AuthFilter implements ExceptionFilter<UnauthorizedException> {
      public catch(_exception: UnauthorizedException, context: ExecutionContext): void {
        context.reply.status(401).send({ error: 'please log in' });
      }
    }

    @Controller('/profile')
    class ProfileController {
      @Get('/')
      @Authenticated()
      @UseFilter(AuthFilter)
      public getProfile(): object {
        return { ok: true };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [ProfileController] });

    const response = await app.inject({ method: 'GET', url: '/profile' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'please log in' });
  });
});

describe('registerControllers: named routes', () => {
  it('registers a RouteRegistry resolvable via getRouteRegistry, populated from route names', async () => {
    @Controller('/users')
    class UserController {
      @Get('/', { name: 'user.list' })
      public list(): string {
        return 'users';
      }

      @Get('/:id', { name: 'user.detail' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }

      @Get('/unnamed')
      public unnamed(): string {
        return 'no name here';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UserController] });

    const registry = getRouteRegistry(app);
    expect(registry.url('user.list')).toBe('/users');
    expect(registry.url('user.detail', { id: '42' })).toBe('/users/42');
    expect(registry.has('unnamed')).toBe(false);
  });

  it('includes the resolved globalPrefix in the registered path', async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { name: 'user.detail' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      globalPrefix: '/api',
    });

    expect(getRouteRegistry(app).url('user.detail', { id: '7' })).toBe('/api/users/7');
  });

  it('resolves a name registered by a different controller than the one currently handling a request', async () => {
    @Controller('/orders')
    class OrderController {
      @Get('/:id', { name: 'order.detail' })
      public getOrder(@Param('id') id: string): object {
        return { id };
      }
    }

    @Controller('/users')
    class UserController {
      @Get('/:id')
      public getUser(@Param('id') id: string): object {
        const registry = getRouteRegistry(this.fastify);
        return { id, orderUrl: registry.url('order.detail', { id: '99' }) };
      }

      public constructor(private readonly fastify: FastifyInstance) {}
    }

    const app = Fastify();
    const container = new Container();
    container.registerValue(UserController, new UserController(app));
    await app.register(registerControllers, {
      controllers: [OrderController, UserController],
      container,
    });

    const response = await app.inject({ method: 'GET', url: '/users/1' });
    expect(response.json()).toEqual({ id: '1', orderUrl: '/orders/99' });
  });

  it('throws PluginError when two routes are registered with the same name for different paths', async () => {
    @Controller('/things')
    class ThingController {
      @Get('/a', { name: 'thing.detail' })
      public a(): string {
        return 'a';
      }

      @Get('/b', { name: 'thing.detail' })
      public b(): string {
        return 'b';
      }
    }

    const app = Fastify();
    await expect(
      app.register(registerControllers, { controllers: [ThingController] }),
    ).rejects.toThrow(PluginError);
  });
});

describe('registerControllers: Swagger integration', () => {
  it('is auto-discovered by @fastify/swagger from tags/summary/response/security', async () => {
    const fastifySwagger = (await import('@fastify/swagger')).default;

    @ApiSecurity('bearerAuth')
    @Controller('/users')
    class UserController {
      @Get('/:id', {
        name: 'user.detail',
        deprecated: true,
        response: { status: 404, description: 'User not found' },
      })
      @ApiTags('detail')
      @ApiOperation({ summary: 'Get a user by id', operationId: 'getUser' })
      @ApiResponse({ status: 200, description: 'The user' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(fastifySwagger, {
      openapi: {
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer' },
          },
        },
      },
    });
    await app.register(registerControllers, { controllers: [UserController] });
    await app.ready();

    const document = app.swagger();
    const operation = document.paths?.['/users/{id}']?.get;
    expect(operation).toBeDefined();
    expect(operation?.tags).toEqual(['detail']);
    expect(operation?.summary).toBe('Get a user by id');
    expect(operation?.operationId).toBe('getUser');
    expect(operation?.deprecated).toBe(true);
    expect(operation?.security).toEqual([{ bearerAuth: [] }]);
    expect(operation?.responses?.['200']).toMatchObject({ description: 'The user' });
    expect(operation?.responses?.['404']).toMatchObject({ description: 'User not found' });
  });
});

describe('registerControllers: versioning', () => {
  it("'uri': prepends /v{version} to a route with a single version", async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { version: '1' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      versioning: { type: 'uri' },
    });

    expect((await app.inject({ method: 'GET', url: '/v1/users/42' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/users/42' })).statusCode).toBe(404);
  });

  it("'uri': registers a route once per declared version", async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { version: ['1', '2'] })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      versioning: { type: 'uri' },
    });

    expect((await app.inject({ method: 'GET', url: '/v1/users/42' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/v2/users/42' })).statusCode).toBe(200);
  });

  it("'uri': leaves an unversioned route's path untouched", async () => {
    @Controller('/health')
    class HealthController {
      @Get('/')
      public check(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [HealthController],
      versioning: { type: 'uri' },
    });

    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
  });

  it("'uri': a route's own @Get version overrides the controller's @Version", async () => {
    @Version('1')
    @Controller('/users')
    class UserController {
      @Get('/:id', { version: '2' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      versioning: { type: 'uri' },
    });

    expect((await app.inject({ method: 'GET', url: '/v2/users/42' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/v1/users/42' })).statusCode).toBe(404);
  });

  it("'header': matches via the Accept-Version header, using Fastify's own built-in constraint", async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { version: '1.0.0' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      versioning: { type: 'header' },
    });

    const versioned = await app.inject({
      method: 'GET',
      url: '/users/42',
      headers: { 'accept-version': '1.0.0' },
    });
    expect(versioned.statusCode).toBe(200);

    const wrongVersion = await app.inject({
      method: 'GET',
      url: '/users/42',
      headers: { 'accept-version': '2.0.0' },
    });
    expect(wrongVersion.statusCode).toBe(404);
  });

  it("'header': a request with no Accept-Version header still reaches an unversioned route", async () => {
    @Controller('/health')
    class HealthController {
      @Get('/')
      public check(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [HealthController],
      versioning: { type: 'header' },
    });

    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
  });

  it("'media-type': matches via an Accept header version parameter", async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { version: '2' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      versioning: { type: 'media-type' },
    });

    const versioned = await app.inject({
      method: 'GET',
      url: '/users/42',
      headers: { accept: 'application/json;version=2' },
    });
    expect(versioned.statusCode).toBe(200);

    const wrongVersion = await app.inject({
      method: 'GET',
      url: '/users/42',
      headers: { accept: 'application/json;version=3' },
    });
    expect(wrongVersion.statusCode).toBe(404);
  });

  it("'media-type': respects a custom mediaTypeParam", async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { version: '2' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      versioning: { type: 'media-type', mediaTypeParam: 'v' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/users/42',
      headers: { accept: 'application/json;v=2' },
    });
    expect(response.statusCode).toBe(200);
  });

  it("'media-type': a request with no Accept header still reaches an unversioned route", async () => {
    @Controller('/health')
    class HealthController {
      @Get('/')
      public check(): string {
        return 'ok';
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [HealthController],
      versioning: { type: 'media-type' },
    });

    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
  });

  it('a named, single-version route is resolvable via getRouteRegistry with its versioned URL', async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id', { name: 'user.detail', version: '1' })
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, {
      controllers: [UserController],
      versioning: { type: 'uri' },
    });

    expect(getRouteRegistry(app).url('user.detail', { id: '42' })).toBe('/v1/users/42');
  });

  it('registering a second registerControllers call with media-type versioning on the same instance does not throw', async () => {
    @Controller('/a')
    class AController {
      @Get('/', { version: '1' })
      public handle(): string {
        return 'a';
      }
    }
    @Controller('/b')
    class BController {
      @Get('/', { version: '1' })
      public handle(): string {
        return 'b';
      }
    }

    const app = Fastify();
    await app.register(
      async (instance) => {
        await instance.register(registerControllers, {
          controllers: [AController],
          versioning: { type: 'media-type' },
        });
      },
      { prefix: '/one' },
    );

    await expect(
      app.register(
        async (instance) => {
          await instance.register(registerControllers, {
            controllers: [BController],
            versioning: { type: 'media-type' },
          });
        },
        { prefix: '/two' },
      ),
    ).resolves.not.toThrow();
  });
});

describe('registerControllers: multipart uploads', () => {
  const boundary = '----registerControllersTestBoundary';

  interface MultipartPart {
    name: string;
    filename?: string;
    contentType?: string;
    value: string;
  }

  function buildMultipartBody(parts: readonly MultipartPart[]): string {
    const segments = parts.map((part) => {
      const disposition =
        part.filename !== undefined
          ? `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"`
          : `Content-Disposition: form-data; name="${part.name}"`;
      const contentType =
        part.contentType !== undefined ? `\r\nContent-Type: ${part.contentType}` : '';
      return `--${boundary}\r\n${disposition}${contentType}\r\n\r\n${part.value}\r\n`;
    });
    return `${segments.join('')}--${boundary}--\r\n`;
  }

  function multipartHeaders(): Record<string, string> {
    return { 'content-type': `multipart/form-data; boundary=${boundary}` };
  }

  it('@UploadedFile injects a single uploaded file, readable via toBuffer', async () => {
    const fastifyMultipart = (await import('@fastify/multipart')).default;

    @Controller('/upload')
    class UploadController {
      @Post('/')
      public async handle(@UploadedFile() file: UploadedFileType | undefined): Promise<object> {
        const content = file ? (await file.toBuffer()).toString('utf8') : null;
        return { filename: file?.filename, mimetype: file?.mimetype, content };
      }
    }

    const app = Fastify();
    await app.register(fastifyMultipart);
    await app.register(registerControllers, { controllers: [UploadController] });

    const response = await app.inject({
      method: 'POST',
      url: '/upload',
      headers: multipartHeaders(),
      payload: buildMultipartBody([
        { name: 'avatar', filename: 'avatar.txt', contentType: 'text/plain', value: 'hello' },
      ]),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      filename: 'avatar.txt',
      mimetype: 'text/plain',
      content: 'hello',
    });
  });

  it('@UploadedFile(fieldName) selects only the matching field among several files', async () => {
    const fastifyMultipart = (await import('@fastify/multipart')).default;

    @Controller('/upload')
    class UploadController {
      @Post('/')
      public handle(@UploadedFile('banner') file: UploadedFileType | undefined): object {
        return { filename: file?.filename };
      }
    }

    const app = Fastify();
    await app.register(fastifyMultipart);
    await app.register(registerControllers, { controllers: [UploadController] });

    const response = await app.inject({
      method: 'POST',
      url: '/upload',
      headers: multipartHeaders(),
      payload: buildMultipartBody([
        { name: 'avatar', filename: 'avatar.txt', contentType: 'text/plain', value: 'a' },
        { name: 'banner', filename: 'banner.txt', contentType: 'text/plain', value: 'b' },
      ]),
    });

    expect(response.json()).toEqual({ filename: 'banner.txt' });
  });

  it('@UploadedFiles injects every uploaded file as an array', async () => {
    const fastifyMultipart = (await import('@fastify/multipart')).default;

    @Controller('/upload')
    class UploadController {
      @Post('/')
      public handle(@UploadedFiles() files: readonly UploadedFileType[]): object {
        return { filenames: files.map((file) => file.filename) };
      }
    }

    const app = Fastify();
    await app.register(fastifyMultipart);
    await app.register(registerControllers, { controllers: [UploadController] });

    const response = await app.inject({
      method: 'POST',
      url: '/upload',
      headers: multipartHeaders(),
      payload: buildMultipartBody([
        { name: 'files', filename: 'one.txt', contentType: 'text/plain', value: '1' },
        { name: 'files', filename: 'two.txt', contentType: 'text/plain', value: '2' },
      ]),
    });

    expect(response.json()).toEqual({ filenames: ['one.txt', 'two.txt'] });
  });

  it('@UploadedFile resolves to undefined for a normal JSON request with no @fastify/multipart registered', async () => {
    @Controller('/upload')
    class UploadController {
      @Post('/')
      public handle(@UploadedFile() file: UploadedFileType | undefined): object {
        return { hasFile: file !== undefined };
      }
    }

    const app = Fastify();
    await app.register(registerControllers, { controllers: [UploadController] });

    const response = await app.inject({ method: 'POST', url: '/upload', payload: {} });
    expect(response.json()).toEqual({ hasFile: false });
  });
});
