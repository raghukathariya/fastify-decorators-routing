// Measures the per-request CPU overhead this framework's decorator/DI/guard/interceptor
// machinery adds on top of raw Fastify, by running the same route through `fastify.inject()`
// (in-process, no real socket/network involved) many times for each and comparing elapsed time.
//
// Runs several rounds in *rotating* order (raw/plain/full, then plain/full/raw, then
// full/raw/plain, ...) rather than always benchmarking in the same sequence: a single
// same-process, same-order run is biased by whichever scenario happens to run first getting the
// least JIT warmup, and whichever runs last benefiting from everything the earlier ones already
// warmed up. Rotating cancels that out; treat the resulting percentages as indicative, not lab-
// grade precise — machine load and Node/V8 version shift the exact numbers.
//
// Run against the compiled `dist` output: `npm run build && npm run benchmark`.
import 'reflect-metadata';
import Fastify from 'fastify';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuard,
  UseInterceptor,
  registerControllers,
} from '../dist/index.js';

const ITERATIONS = Number(process.argv[2] ?? 20000);
const ROUNDS = Number(process.argv[3] ?? 3);
const WARMUP = Math.min(1000, Math.floor(ITERATIONS / 10));

async function timeInjections(app, request, iterations) {
  for (let i = 0; i < WARMUP; i++) {
    await app.inject(request);
  }
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    await app.inject(request);
  }
  return Number(process.hrtime.bigint() - start) / 1e6;
}

async function benchRawFastify() {
  const app = Fastify({ logger: false });
  app.get('/users/:id', async (request) => ({ id: request.params.id }));
  await app.ready();
  const elapsedMs = await timeInjections(app, { method: 'GET', url: '/users/42' }, ITERATIONS);
  await app.close();
  return elapsedMs;
}

async function benchFrameworkPlain() {
  class UserController {
    getUser(id) {
      return { id };
    }
  }
  Controller('/users')(UserController);
  Get('/:id')(
    UserController.prototype,
    'getUser',
    Object.getOwnPropertyDescriptor(UserController.prototype, 'getUser'),
  );
  Param('id')(UserController.prototype, 'getUser', 0);

  const app = Fastify({ logger: false });
  await app.register(registerControllers, { controllers: [UserController] });
  await app.ready();
  const elapsedMs = await timeInjections(app, { method: 'GET', url: '/users/42' }, ITERATIONS);
  await app.close();
  return elapsedMs;
}

async function benchFrameworkFull() {
  class UserController {
    createUser(body) {
      return { created: body };
    }
  }
  Controller('/users')(UserController);
  Post('/')(
    UserController.prototype,
    'createUser',
    Object.getOwnPropertyDescriptor(UserController.prototype, 'createUser'),
  );
  Body()(UserController.prototype, 'createUser', 0);
  UseGuard(() => true)(UserController.prototype, 'createUser', undefined);
  UseInterceptor(async (_ctx, next) => next())(UserController.prototype, 'createUser', undefined);

  const app = Fastify({ logger: false });
  await app.register(registerControllers, { controllers: [UserController] });
  await app.ready();
  const elapsedMs = await timeInjections(
    app,
    { method: 'POST', url: '/users', payload: { name: 'Ada' } },
    ITERATIONS,
  );
  await app.close();
  return elapsedMs;
}

const SCENARIOS = [
  { key: 'raw', label: 'Raw Fastify', run: benchRawFastify },
  { key: 'plain', label: 'Framework (plain)', run: benchFrameworkPlain },
  { key: 'full', label: 'Framework (guard+interceptor)', run: benchFrameworkFull },
];

const samples = { raw: [], plain: [], full: [] };

console.log(
  `Running ${ROUNDS} rotated round(s) of ${ITERATIONS} in-process requests per scenario (${WARMUP} warmup each)...\n`,
);

for (let round = 0; round < ROUNDS; round++) {
  const order = [
    ...SCENARIOS.slice(round % SCENARIOS.length),
    ...SCENARIOS.slice(0, round % SCENARIOS.length),
  ];
  for (const scenario of order) {
    const elapsedMs = await scenario.run();
    samples[scenario.key].push(elapsedMs / ITERATIONS);
  }
}

function summarize(key) {
  const values = samples[key];
  const avgUs = (values.reduce((sum, v) => sum + v, 0) / values.length) * 1000;
  const minUs = Math.min(...values) * 1000;
  const maxUs = Math.max(...values) * 1000;
  return { avgUs, minUs, maxUs };
}

console.log(
  `${'Scenario'.padEnd(30)} ${'avg µs/req'.padStart(10)}  ${'min-max µs/req'.padStart(15)}  ${'avg req/s'.padStart(9)}`,
);
for (const scenario of SCENARIOS) {
  const { avgUs, minUs, maxUs } = summarize(scenario.key);
  const range = `${minUs.toFixed(1)}-${maxUs.toFixed(1)}`;
  const reqPerSec = (1e6 / avgUs).toFixed(0);
  console.log(
    `${scenario.label.padEnd(30)} ${avgUs.toFixed(1).padStart(10)}  ${range.padStart(15)}  ${reqPerSec.padStart(9)}`,
  );
}

const rawAvg = summarize('raw').avgUs;
const plainAvg = summarize('plain').avgUs;
const fullAvg = summarize('full').avgUs;

console.log('');
console.log(
  `Framework (plain) overhead vs raw Fastify:              ${(((plainAvg - rawAvg) / rawAvg) * 100).toFixed(1)}%`,
);
console.log(
  `Framework (guard+interceptor) overhead vs raw Fastify:  ${(((fullAvg - rawAvg) / rawAvg) * 100).toFixed(1)}%`,
);
