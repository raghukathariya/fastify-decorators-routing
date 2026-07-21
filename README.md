# fastify-decorators-routing

[![CI](https://github.com/raghukathariya/fastify-decorators-routing/actions/workflows/ci.yml/badge.svg)](https://github.com/raghukathariya/fastify-decorators-routing/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/fastify-decorators-routing.svg)](https://www.npmjs.com/package/fastify-decorators-routing)
[![license](https://img.shields.io/npm/l/fastify-decorators-routing.svg)](./LICENSE)

A decorator-based routing framework for [Fastify](https://fastify.dev) v5+, designed specifically for Fastify with minimal overhead and
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

For a complete, runnable app — controllers, DI, validation, serialization, auth, guards,
interceptors, exception filters, named routes, and Swagger docs, all wired together — see
[`examples/`](./examples).

## Features

- [Controllers & routing](#controllers--routing)
- [Dependency injection](#dependency-injection)
- [Parameter decorators](#parameter-decorators)
- [Middleware & guards](#middleware--guards)
- [Interceptors](#interceptors)
- [Exception filters](#exception-filters)
- [Validation](#validation)
- [Serialization](#serialization)
- [Authentication](#authentication)
- [Lifecycle hooks](#lifecycle-hooks)
- [Named routes](#named-routes)
- [Swagger / OpenAPI](#swagger--openapi)
- [Versioning](#versioning)
- [File uploads](#file-uploads)
- [Utilities](#utilities)
- [Testing](#testing)

Every example below assumes `import 'reflect-metadata'` has already run once, at the
application's entry point, before any decorated class is imported.

### Controllers & routing

`@Controller(path)` groups routes under a base path; `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`/
`@Head`/`@Options`/`@All` declare one route each, with an options object for the less common
cases:

```ts
@Controller('/users')
class UserController {
  @Get('/:id', {
    name: 'user.detail', // resolvable via the named-route registry, see below
    summary: 'Get a user by id', // documentation only, also settable via @ApiOperation
    schema: { response: { 200: { type: 'object' } } }, // Fastify's own JSON Schema validation
  })
  getUser(@Param('id') id: string) {
    return { id };
  }
}
```

`@Prefix(path)` adds a path segment ahead of `@Controller`'s own (composable, including across
inheritance); `@Tag(...names)` and `@Group(name)` attach documentation/organizational metadata
consumed by the [route printer](#utilities) and [Swagger integration](#swagger--openapi).

### Dependency injection

`@Injectable({ scope })` (`'singleton'` by default, or `'transient'`/`'scoped'`) marks a class as
constructor-injectable; a controller's own constructor parameters are resolved the same way,
against a `Container` you control:

```ts
@Injectable()
class UserService {
  findById(id: string) {
    /* ... */
  }
}

@Controller('/users')
class UserController {
  constructor(private readonly users: UserService) {}

  @Get('/:id')
  getUser(@Param('id') id: string) {
    return this.users.findById(id);
  }
}

const container = new Container();
container.registerClass(UserService);
await app.register(registerControllers, { controllers: [UserController], container });
```

`registerControllers` auto-registers each _controller_ class for you if it isn't already
registered — but has no way to know a controller's own dependencies ahead of time, so those need
registering yourself, as above. `@Inject(token)` injects by `createInjectionToken<T>(name)` for
non-class dependencies (config values, interfaces). Implement `OnInit`/`OnDestroy` for
setup/teardown hooks around `Container.resolve`/`Container.dispose`.

### Parameter decorators

```ts
@Post('/:id/comments')
create(
  @Param('id') postId: string,
  @Body() body: CreateCommentDto, // validated automatically — see Validation
  @Query('notify') notify?: boolean,
  @Headers('x-request-id') requestId?: string,
  @Req() request: FastifyRequest,
) {
  /* ... */
}
```

`@Body`/`@Query`/`@Param`/`@Headers` extract the whole object or a single key (`@Query('page')`);
`@Cookies`/`@Session` do the same but need `@fastify/cookie`/a session plugin registered first
(injecting `undefined` otherwise); `@Req`/`@Res`/`@Ip`/`@Hostname` inject the raw Fastify objects
or a single derived value. Every decorator accepts a `transform` function for ad-hoc
coercion/validation beyond what [automatic DTO validation](#validation) already does.

### Middleware & guards

```ts
@UseGuard(AuthGuard) // a class, an instance, or a plain (context) => boolean | Promise<boolean>
@Controller('/admin')
class AdminController {
  @Use(rateLimit()) // Fastify-preHandler-shaped middleware
  @Get('/stats')
  stats() {
    /* ... */
  }
}
```

Both are usable on a controller (every route) or a single route method, and compose across
inheritance. Execution order: global middleware (`registerControllers({ middleware })`) →
controller `@Use` → route `hooks.preHandler` → `@PreHandler`/`@Before` → route `@Use` → route
`{ middleware }` option → guards → interceptors → the handler. A guard returning `false` throws
`ForbiddenException`, which flows through the same [exception filter](#exception-filters)
pipeline as everything else.

### Interceptors

```ts
@UseInterceptor(LoggingInterceptor, TimingInterceptor)
@Controller('/users')
class UserController {
  @Get('/:id')
  @UseInterceptor(async (context, next) => {
    const result = await next();
    return { data: result };
  })
  getUser(@Param('id') id: string) {
    /* ... */
  }
}
```

An interceptor wraps the call to the handler (or the next interceptor in the chain) — run logic
before/after, transform the result, short-circuit without calling `next()`, or catch an error from
it. Ships with `LoggingInterceptor`, `TimingInterceptor` (adds an `X-Response-Time` header), and
`CachingInterceptor`.

### Exception filters

```ts
class NotFoundFilter implements ExceptionFilter<NotFoundException> {
  catch(exception: NotFoundException, context: ExecutionContext) {
    context.reply.status(404).send({ error: exception.message });
  }
}

@Get('/:id')
@UseFilter(NotFoundFilter)
getUser(@Param('id') id: string) {
  if (!exists(id)) throw new NotFoundException(`User '${id}' not found`);
}
```

`HttpException` and its subclasses (`BadRequestException`, `UnauthorizedException`,
`ForbiddenException`, `NotFoundException`, `ConflictException`, ... one per common status code)
map to the right status automatically even with no filter registered. `@Catch(...types)` scopes a
filter to specific exception types (or every type, if omitted); `@UseFilter` applies one to a
controller or route; `registerControllers({ filters })` applies one globally. Resolution order:
route-level → controller-level → global → the built-in default.

### Validation

```ts
class CreateUserDto {
  @IsString() @MinLength(1) name!: string;
  @IsEmail() email!: string;
}

@Post('/')
create(@Body() body: CreateUserDto) {
  // body is already validated and transformed into a real CreateUserDto instance —
  // an invalid request never reaches this line, rejected with 400 + validation details instead.
}
```

Whenever a `@Body`/`@Query`/`@Param`/`@Headers`/`@Cookies`/`@Session` parameter's TypeScript type
is a class (not `String`/`Number`/`Boolean`/`Array`/`Object`), it's run through
`class-transformer` + `class-validator` automatically. Opt out per-parameter with
`{ validate: false }`.

### Serialization

```ts
class UserResponseDto {
  @Expose() id!: string;
  @Expose() name!: string;
  // passwordHash is not @Expose()d, so it can never reach the response.
}

@Get('/:id')
@SerializeWith(UserResponseDto)
getUser(@Param('id') id: string) {
  return this.users.findById(id); // a full User entity, passwordHash and all
}
```

`@Expose`/`@Exclude`/`@Transform`/`@Type` are `class-transformer`'s own decorators, re-exported
directly. `@SerializeWith` applies after interceptors run, to the interceptor chain's final
result.

### Authentication

```ts
@Authenticated() // 401 if request.user is unset
@Roles('admin', 'moderator') // 403 if the user has neither role (OR semantics)
@Delete('/:id')
deleteUser(@Param('id') id: string) {
  /* ... */
}
```

Pure sugar over `@UseGuard` — it only reads `request.user`, however an auth plugin (`@fastify/jwt`,
a session cookie, ...) populated it; see `getRequestUser`. `@Permissions(...)` mirrors `@Roles`
for a `permissions` claim; `@UsePolicy((user, context) => boolean)` covers authorization rules
that don't reduce to a role/permission membership check (e.g. resource ownership).

### Lifecycle hooks

```ts
@Get('/')
@OnRequest(logRequest)
@PreValidation(checkRateLimit)
@Before(auditAccess) // alias for @PreHandler
@After(addCacheHeader) // alias for @OnSend
list() {
  /* ... */
}
```

Each maps directly onto Fastify's native per-route lifecycle hooks, composing with the equivalent
`{ hooks: { onRequest, preParsing, preValidation, preHandler, onSend } }` route option (option
first, decorator second).

### Named routes

```ts
@Get('/:id', { name: 'user.detail' })
getUser(@Param('id') id: string) {
  /* ... */
}

// elsewhere, after registerControllers has run:
const registry = getRouteRegistry(app);
registry.url('user.detail', { id: '42' }); // '/users/42'
registry.url('user.list', undefined, { page: 2 }); // '/users?page=2'
```

Every named route is registered automatically; `RouteRegistry.url()` builds a real URL from a
name, substituting `:param` placeholders and appending a query string — so a redirect or a link
in a response body never hardcodes a path that can drift out of sync with the route that defines
it.

### Swagger / OpenAPI

```ts
@ApiSecurity('bearerAuth')
@Controller('/users')
class UserController {
  @Get('/:id')
  @ApiTags('users')
  @ApiOperation({ summary: 'Get a user by id', operationId: 'getUser' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Param('id') id: string) {
    /* ... */
  }
}
```

`@fastify/swagger` reads its documentation straight from each route's Fastify `schema` object;
these decorators (plus `@Tag`, and the inline `summary`/`description`/`deprecated`/`response`
route options) just populate it — there's no independent OpenAPI generator to configure. Register
`@fastify/swagger` (and `@fastify/swagger-ui`, for the interactive docs page) the normal way; this
package has nothing more to set up.

### Versioning

```ts
@Version('1') // or @Get(path, { version: '2' }) to override per-route
@Controller('/users')
class UserController {
  /* ... */
}

await app.register(registerControllers, {
  controllers: [UserController],
  versioning: { type: 'uri' }, // or 'header' (Accept-Version) or 'media-type' (Accept;version=)
});
```

`'uri'` prepends `/v{version}` to the path; `'header'` uses Fastify's own built-in `Accept-Version`
constraint; `'media-type'` matches a version parameter embedded in the `Accept` header's media
type, via a constraint strategy this package registers for you. A route/controller with no
`@Version` is unaffected by whichever `type` is configured.

### File uploads

```ts
import { UploadedFile, UploadedFiles, type UploadedFileType } from 'fastify-decorators-routing';

@Post('/avatar')
upload(@UploadedFile() file: UploadedFileType | undefined) {
  return file?.toBuffer();
}

@Post('/attachments')
uploadMany(@UploadedFiles('attachments') files: readonly UploadedFileType[]) {
  /* ... */
}
```

Requires `@fastify/multipart` to be registered — without it, `@UploadedFile`/`@UploadedFiles`
inject `undefined`/`[]`. Both accept an optional field-name filter. (`UploadedFileType` is the
file's shape; `UploadedFile` is the decorator — two different exports that happen to share a
root name.)

### Utilities

```ts
console.log(printRoutes([UserController, OrderController]));
// users:
//   GET  /users/:id  UserController.getUser (user.detail)
//
// Ungrouped:
//   GET  /orders     OrderController.list
```

`listRoutes`/`printRoutes` resolve every route's method, path, name, group, and tags straight
from decorator metadata — no Fastify instance or `registerControllers` call needed — useful for a
startup log line or a CLI introspection command.

### Testing

```ts
import { createTestApp } from 'fastify-decorators-routing';

const container = new Container();
container.registerValue(PaymentGateway, fakePaymentGateway); // fake a dependency, if needed

const { app } = await createTestApp([OrderController], { container });

const response = await app.inject({ method: 'POST', url: '/orders', payload: { ... } });
expect(response.statusCode).toBe(201);

await app.close();
```

`createTestApp` is the one-line replacement for the `Fastify() + await app.register(
registerControllers, {...})` boilerplate every test file otherwise needs — it accepts the same
options `registerControllers` does (plus `fastifyOptions` for Fastify's own constructor options)
and hands back both the ready-to-`inject()` app and the `Container` it registered against.

## Roadmap

This package is built in well-defined, independently shippable phases. Each phase compiles,
is tested, and leaves the project in a working state.

| Phase | Feature                        | Status      |
| ----- | ------------------------------ | ----------- |
| 1     | Project initialization         | ✅ Complete |
| 2     | Project architecture           | ✅ Complete |
| 3     | Metadata engine                | ✅ Complete |
| 4     | Dependency injection container | ✅ Complete |
| 5     | Controller decorators          | ✅ Complete |
| 6     | HTTP method decorators         | ✅ Complete |
| 7     | Parameter decorators           | ✅ Complete |
| 8     | Route discovery                | ✅ Complete |
| 9     | Fastify plugin                 | ✅ Complete |
| 10    | Middleware system              | ✅ Complete |
| 11    | Guards                         | ✅ Complete |
| 12    | Interceptors                   | ✅ Complete |
| 13    | Exception filters              | ✅ Complete |
| 14    | Validation                     | ✅ Complete |
| 15    | Serialization                  | ✅ Complete |
| 16    | Authentication                 | ✅ Complete |
| 17    | Lifecycle hooks                | ✅ Complete |
| 18    | Named routes                   | ✅ Complete |
| 19    | Swagger integration            | ✅ Complete |
| 20    | Versioning                     | ✅ Complete |
| 21    | Multipart                      | ✅ Complete |
| 22    | Utilities                      | ✅ Complete |
| 23    | Performance optimization       | ✅ Complete |
| 24    | Examples                       | ✅ Complete |
| 25    | Documentation                  | ✅ Complete |
| 26    | Testing                        | ✅ Complete |
| 27    | Release                        | ⏳ Planned  |

## Development

```sh
npm install       # install dependencies
npm run build     # build ESM + CJS bundles with tsup
npm test          # run the vitest suite
npm run lint      # eslint
npm run typecheck # tsc --noEmit
npm run ci        # lint + typecheck + test:coverage
npm run benchmark # compare per-request overhead against raw Fastify (see benchmark/)
```

`npm run benchmark` measures in-process `fastify.inject()` throughput for a plain route, a raw
Fastify route, and a route with a guard and an interceptor, rotating run order across several
rounds to cancel out JIT-warmup bias. Numbers are indicative of relative overhead, not a formal
benchmark suite — every route's guard/interceptor/filter/parameter metadata is resolved once at
`registerControllers` time, never on the request hot path, so a plain route's overhead over raw
Fastify is expected to be negligible.

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
