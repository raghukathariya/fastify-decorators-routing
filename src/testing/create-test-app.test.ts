import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Container } from '../container/container.js';
import { Injectable } from '../container/injectable.decorator.js';
import { Controller } from '../decorators/controller.decorator.js';
import { Get } from '../decorators/http-method.decorator.js';
import { Param } from '../decorators/param.decorator.js';
import { ScanError } from '../errors/scan.error.js';
import { createTestApp } from './create-test-app.js';

describe('createTestApp', () => {
  it('boots a Fastify instance with the given controllers already registered', async () => {
    @Controller('/users')
    class UserController {
      @Get('/:id')
      public getUser(@Param('id') id: string): object {
        return { id };
      }
    }

    const { app } = await createTestApp([UserController]);

    const response = await app.inject({ method: 'GET', url: '/users/42' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: '42' });

    await app.close();
  });

  it('returns the container it registered controllers against', async () => {
    @Controller('/ping')
    class PingController {
      @Get('/')
      public ping(): string {
        return 'pong';
      }
    }

    const { app, container } = await createTestApp([PingController]);

    expect(container).toBeInstanceOf(Container);
    expect(container.has(PingController)).toBe(true);

    await app.close();
  });

  it('uses a caller-supplied container, so a pre-registered fake dependency is honored', async () => {
    @Injectable()
    class PaymentGateway {
      public charge(): string {
        return 'real-charge';
      }
    }

    @Controller('/orders')
    class OrderController {
      public constructor(private readonly gateway: PaymentGateway) {}

      @Get('/')
      public create(): object {
        return { result: this.gateway.charge() };
      }
    }

    const container = new Container();
    container.registerValue(PaymentGateway, { charge: () => 'fake-charge' });

    const { app } = await createTestApp([OrderController], { container });

    const response = await app.inject({ method: 'GET', url: '/orders' });
    expect(response.json()).toEqual({ result: 'fake-charge' });

    await app.close();
  });

  it('creates a fresh container when none is supplied', async () => {
    @Controller('/a')
    class AController {
      @Get('/')
      public handle(): string {
        return 'a';
      }
    }

    const first = await createTestApp([AController]);
    const second = await createTestApp([AController]);

    expect(first.container).not.toBe(second.container);

    await first.app.close();
    await second.app.close();
  });

  it('defaults the Fastify logger to disabled', async () => {
    @Controller('/health')
    class HealthController {
      @Get('/')
      public check(): string {
        return 'ok';
      }
    }

    const { app } = await createTestApp([HealthController]);
    expect(app.log.level).toBeUndefined();

    await app.close();
  });

  it('passes fastifyOptions through to the underlying Fastify instance', async () => {
    @Controller('/health')
    class HealthController {
      @Get('/')
      public check(): string {
        return 'ok';
      }
    }

    const { app } = await createTestApp([HealthController], {
      fastifyOptions: { caseSensitive: false },
    });
    expect(app.initialConfig.caseSensitive).toBe(false);

    await app.close();
  });

  it('forwards every other registerControllers option (e.g. globalPrefix)', async () => {
    @Controller('/users')
    class UserController {
      @Get('/')
      public list(): string {
        return 'ok';
      }
    }

    const { app } = await createTestApp([UserController], { globalPrefix: '/api' });

    expect((await app.inject({ method: 'GET', url: '/api/users' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/users' })).statusCode).toBe(404);

    await app.close();
  });

  it('surfaces a registration failure the same way registerControllers itself would', async () => {
    class NotAController {}

    await expect(createTestApp([NotAController])).rejects.toThrow(ScanError);
  });
});
