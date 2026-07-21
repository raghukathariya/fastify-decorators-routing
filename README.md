# fastify-decorators-routing

[![CI](https://github.com/raghukathariya/fastify-decorators-routing/actions/workflows/ci.yml/badge.svg)](https://github.com/raghukathariya/fastify-decorators-routing/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/fastify-decorators-routing.svg)](https://www.npmjs.com/package/fastify-decorators-routing)
[![license](https://img.shields.io/npm/l/fastify-decorators-routing.svg)](./LICENSE)

A decorator-based routing framework for [Fastify](https://fastify.dev) v5+, inspired by
[routing-controllers](https://github.com/typestack/routing-controllers) and
[NestJS](https://nestjs.com), designed specifically for Fastify with minimal overhead and
maximum performance.

> **Status:** Under active, phased development. See [Roadmap](#roadmap) below.

## Why

Fastify is one of the fastest Node.js web frameworks, but its route registration API is
plugin/function based rather than class/decorator based. `fastify-decorators-routing` brings a
NestJS-style developer experience — `@Controller`, `@Get`, `@Body`, dependency injection, guards,
interceptors, validation, and Swagger — directly on top of Fastify's native plugin and schema
system, with no runtime overhead beyond metadata resolved once at startup.

## Goals

- **Zero-overhead routing** — all decorator metadata is resolved once at boot; the hot path is
  plain Fastify route handlers.
- **Idiomatic Fastify** — built on Fastify's native hooks, schema validation, and plugin
  encapsulation instead of replacing them.
- **First-class TypeScript** — strict types, full IntelliSense, no `any` leakage into consumer
  code.
- **Dual ESM/CJS** — works in both module systems with zero configuration.

## Installation

```sh
npm install fastify-decorators-routing fastify reflect-metadata
```

> `fastify` and `reflect-metadata` are peer dependencies. `reflect-metadata` must be imported once
> at your application's entry point, before any decorated class is loaded.

## Quick Start

```ts
import 'reflect-metadata';
import Fastify from 'fastify';
import { Controller, Get, Param, registerControllers } from 'fastify-decorators-routing';

@Controller('/users')
class UserController {
  @Get('/:id')
  getUser(@Param('id') id: string) {
    return { id, name: 'Ada Lovelace' };
  }
}

const app = Fastify();

await app.register(registerControllers, {
  controllers: [UserController],
});

await app.listen({ port: 3000 });
```

## Roadmap

This package is built in well-defined, independently shippable phases. Each phase compiles,
is tested, and leaves the project in a working state.

| Phase | Feature                        | Status      |
| ----- | ------------------------------ | ----------- |
| 1     | Project initialization         | ✅ Complete |
| 2     | Project architecture           | ⏳ Planned  |
| 3     | Metadata engine                | ⏳ Planned  |
| 4     | Dependency injection container | ⏳ Planned  |
| 5     | Controller decorators          | ⏳ Planned  |
| 6     | HTTP method decorators         | ⏳ Planned  |
| 7     | Parameter decorators           | ⏳ Planned  |
| 8     | Route discovery                | ⏳ Planned  |
| 9     | Fastify plugin                 | ⏳ Planned  |
| 10    | Middleware system              | ⏳ Planned  |
| 11    | Guards                         | ⏳ Planned  |
| 12    | Interceptors                   | ⏳ Planned  |
| 13    | Exception filters              | ⏳ Planned  |
| 14    | Validation                     | ⏳ Planned  |
| 15    | Serialization                  | ⏳ Planned  |
| 16    | Authentication                 | ⏳ Planned  |
| 17    | Lifecycle hooks                | ⏳ Planned  |
| 18    | Named routes                   | ⏳ Planned  |
| 19    | Swagger integration            | ⏳ Planned  |
| 20    | Versioning                     | ⏳ Planned  |
| 21    | Multipart                      | ⏳ Planned  |
| 22    | Utilities                      | ⏳ Planned  |
| 23    | Performance optimization       | ⏳ Planned  |
| 24    | Examples                       | ⏳ Planned  |
| 25    | Documentation                  | ⏳ Planned  |
| 26    | Testing                        | ⏳ Planned  |
| 27    | Release                        | ⏳ Planned  |

## Development

```sh
npm install       # install dependencies
npm run build     # build ESM + CJS bundles with tsup
npm test          # run the vitest suite
npm run lint      # eslint
npm run typecheck # tsc --noEmit
npm run ci        # lint + typecheck + test:coverage
```

This repository uses [Changesets](https://github.com/changesets/changesets) for versioning:

```sh
npm run changeset         # describe a change
npm run version-packages  # bump versions from pending changesets
npm run release           # build and publish to npm
```

## Requirements

- Fastify v5+
- Node.js 20+
- TypeScript 5+ (if consuming source types)

## License

[MIT](./LICENSE) © Raghu Chaudhari
