import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { Container } from '../container/container.js';
import { registerControllers } from '../plugin/register-controllers.js';
import type { RegisterControllersOptions } from '../plugin/plugin.types.js';
import type { AnyConstructor } from '../types/constructor.type.js';

/** `createTestApp`'s options — every `registerControllers` option except `controllers` (passed
 *  as `createTestApp`'s own first argument instead), plus Fastify's own constructor options for
 *  the handful of test-relevant ones (a custom logger, a custom AJV instance, ...). */
export type TestAppOptions = Omit<RegisterControllersOptions, 'controllers'> & {
  readonly fastifyOptions?: FastifyServerOptions;
};

/** What `createTestApp` hands back: the ready-to-`.inject()` Fastify instance, and the
 *  `Container` it registered controllers against — for asserting on a singleton's state, or for
 *  registering a fake provider *after* the fact via `container.registerValue(...)` when a test
 *  needs to reach into an already-running app (registering it beforehand, before `createTestApp`
 *  is called, is usually simpler — see the doc comment on `createTestApp` itself). */
export interface TestApp {
  readonly app: FastifyInstance;
  readonly container: Container;
}

/**
 * Boots a Fastify instance with `controllers` already registered, ready for
 * `app.inject({ method, url, ... })` — the one-line replacement for the
 * `Fastify() + await app.register(registerControllers, {...})` boilerplate every test file
 * needs, matching the pattern this package's own test suite uses throughout.
 *
 * Defaults the Fastify logger to silent (`logger: false`) — a test run's output shouldn't be
 * drowned in access logs — override via `fastifyOptions`.
 *
 * To fake a dependency for a test, register it on a `Container` *before* calling this, then pass
 * that container in:
 *
 * ```ts
 * const container = new Container();
 * container.registerValue(PaymentGateway, fakePaymentGateway);
 * const { app } = await createTestApp([OrderController], { container });
 *
 * const response = await app.inject({ method: 'POST', url: '/orders', payload: {...} });
 * expect(response.statusCode).toBe(201);
 *
 * await app.close();
 * ```
 *
 * Remember to `await app.close()` when a test is done — `registerControllers` adds a
 * `Container`-disposing `onResponse` hook and (for request-scoped providers) other per-request
 * bookkeeping that a leaked, never-closed `FastifyInstance` would otherwise accumulate across a
 * whole test run.
 */
export async function createTestApp(
  controllers: readonly AnyConstructor[],
  options: TestAppOptions = {},
): Promise<TestApp> {
  const { fastifyOptions, container = new Container(), ...registerOptions } = options;

  const app = Fastify({ logger: false, ...fastifyOptions });
  await app.register(registerControllers, { ...registerOptions, controllers, container });

  return { app, container };
}
