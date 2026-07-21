# fastify-decorators-routing

## 1.0.0

### Major Changes

- First feature-complete release: a decorator-based routing framework for Fastify v5+, covering
  every phase of the original roadmap.

  - **Core**: `@Controller`, `@Prefix`, `@Tag`, `@Group`, `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`/
    `@Head`/`@Options`/`@All`, and `@Body`/`@Query`/`@Param`/`@Headers`/`@Cookies`/`@Session`/`@Req`/
    `@Res`/`@Ip`/`@Hostname` parameter decorators, backed by a dependency injection container
    (`@Injectable`, `@Inject`, singleton/transient/scoped lifecycles) and glob-based controller
    discovery.
  - **Request pipeline**: `@Use` middleware, `@UseGuard` guards, `@UseInterceptor` interceptors
    (plus built-in `LoggingInterceptor`/`TimingInterceptor`/`CachingInterceptor`), and
    `@Catch`/`@UseFilter` exception filters built on an `HttpException` hierarchy.
  - **Data**: automatic request validation (`class-validator`) and response serialization
    (`class-transformer`, `@SerializeWith`).
  - **Auth**: `@Authenticated`, `@Roles`, `@Permissions`, `@UsePolicy` as sugar over `@UseGuard`.
  - **Routing extras**: per-route lifecycle hooks (`@OnRequest`/`@PreParsing`/`@PreValidation`/
    `@PreHandler`(`@Before`)/`@OnSend`(`@After`)), named routes with URL building
    (`RouteRegistry`/`getRouteRegistry`), Swagger/OpenAPI metadata decorators
    (`@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiSecurity`), URI/header/media-type versioning,
    and `@UploadedFile`/`@UploadedFiles` multipart uploads.
  - **Tooling**: `listRoutes`/`printRoutes` route introspection, `createTestApp` for consumer test
    suites, a runnable example app, and a rotated benchmark proving per-request overhead over raw
    Fastify is negligible for a route with no guards/interceptors.

  Every route's guard/interceptor/filter/parameter/schema metadata is resolved once at
  `registerControllers` time, never on the request hot path.

## 0.1.0

### Minor Changes

- Initial project scaffolding: build tooling (tsup, TypeScript, Vitest), linting/formatting
  (ESLint, Prettier), git hooks (Husky, lint-staged, commitlint), versioning (Changesets), and
  CI/CD (GitHub Actions). No public API yet.
