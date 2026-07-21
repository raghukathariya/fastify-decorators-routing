/** Standard HTTP reason phrases, used as the default `error` field on an `HttpException`'s response. */
export const HTTP_STATUS_TEXTS: Readonly<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  409: 'Conflict',
  410: 'Gone',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

/**
 * Base class for every HTTP-facing exception (`BadRequestException`, `NotFoundException`, ...).
 * Thrown from anywhere in the request pipeline — a guard, an interceptor, a route handler — and
 * turned into the corresponding HTTP response by the default exception handling (Phase 13's
 * `handleException`), or by a custom `@Catch`/`@UseFilter` filter that chooses to handle it.
 */
export class HttpException extends Error {
  public constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * The response body to send when no filter handles this exception: `response` verbatim if one
   * was given, otherwise `{ statusCode, error, message }` in the same shape Fastify's own
   * default error responses use.
   */
  public getResponseBody(): unknown {
    if (this.response !== undefined) return this.response;
    return {
      statusCode: this.statusCode,
      error: HTTP_STATUS_TEXTS[this.statusCode] ?? 'Error',
      message: this.message,
    };
  }
}
