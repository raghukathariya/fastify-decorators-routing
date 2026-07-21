import type { ExceptionFilter, ExecutionContext } from 'fastify-decorators-routing';
import { Catch, HttpException } from 'fastify-decorators-routing';

/**
 * A global exception filter (registered via `registerControllers({ filters: [...] })` in
 * `main.ts`) — every `HttpException` (`NotFoundException`, the automatic `ValidationException`
 * from a failed `@Body()` DTO check, ...) gets the same `{ error, message, statusCode }` response
 * shape, instead of each route/controller needing its own filter for that. `@Catch(HttpException)`
 * rather than a catch-all `@Catch()`: an unexpected non-`HttpException` error should still fall
 * through to the framework's own default `500` handling, not be reshaped as if it were one.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  public catch(exception: HttpException, context: ExecutionContext): void {
    const body = exception.getResponseBody();
    context.reply.status(exception.statusCode).send({
      statusCode: exception.statusCode,
      error: typeof body === 'object' && body !== null ? body : { message: exception.message },
    });
  }
}
