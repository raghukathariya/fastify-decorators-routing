# fastify-decorators-routing example

A small, runnable Todo API demonstrating `fastify-decorators-routing` end to end:
controllers, dependency injection, parameter decorators, automatic DTO validation
(`class-validator`), response serialization (`class-transformer`), a fake auth plugin plus
`@Authenticated()`, a built-in `LoggingInterceptor`, a global exception filter, a named route,
and Swagger/OpenAPI documentation.

## Running it

This example depends on the framework via `"fastify-decorators-routing": "file:.."` — a local
link to the repository root, not a published npm version — so the root package must be built
first:

```sh
# from the repository root
npm install
npm run build

# then, from this directory
cd examples
npm install
npm start
```

The server listens on `http://localhost:3000` (override with `PORT=...`). Every `/todos` route
requires an `Authorization: Bearer <any-string>` header — the example's `registerFakeAuth` treats
the token as a user id directly (see `src/auth/fake-auth-plugin.ts`); it is **not** real
authentication, just enough to demonstrate `@Authenticated()`/`getRequestUser()`.

```sh
# list your todos (starts empty)
curl -H "Authorization: Bearer demo-user" http://localhost:3000/todos

# create one
curl -X POST -H "Authorization: Bearer demo-user" -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}' http://localhost:3000/todos

# validation failure (title too short)
curl -X POST -H "Authorization: Bearer demo-user" -H "Content-Type: application/json" \
  -d '{"title":"a"}' http://localhost:3000/todos

# a different bearer token can't see the first user's todos
curl -H "Authorization: Bearer someone-else" http://localhost:3000/todos
```

Interactive API docs (via `@fastify/swagger` + `@fastify/swagger-ui`, reading the same route
metadata `@ApiOperation`/`@Tag` declare) are served at `http://localhost:3000/documentation`.

## What to look at

| File                                  | Demonstrates                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/todos/todo.controller.ts`        | Controllers, params, guards via `@Authenticated`, built-in interceptors, serialization, named routes, Swagger decorators |
| `src/todos/todo.service.ts`           | `@Injectable()` dependency injection                                                                                     |
| `src/todos/todo.dto.ts`               | Automatic request validation                                                                                             |
| `src/todos/todo-response.dto.ts`      | Response serialization — `ownerId` never leaks to a client                                                               |
| `src/common/http-exception.filter.ts` | A global exception filter, applied via `registerControllers({ filters })`                                                |
| `src/auth/fake-auth-plugin.ts`        | What a real auth plugin needs to do for `@Authenticated()` to work                                                       |
| `src/main.ts`                         | Wiring everything together                                                                                               |
