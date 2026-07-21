import { HttpException } from './http-exception.js';

/** `400 Bad Request` — the request is malformed or fails validation. */
export class BadRequestException extends HttpException {
  public constructor(message = 'Bad Request', response?: unknown) {
    super(message, 400, response);
  }
}

/** `401 Unauthorized` — the request has no (or invalid) authentication credentials. */
export class UnauthorizedException extends HttpException {
  public constructor(message = 'Unauthorized', response?: unknown) {
    super(message, 401, response);
  }
}

/** `403 Forbidden` — the request is authenticated but not permitted. */
export class ForbiddenException extends HttpException {
  public constructor(message = 'Forbidden resource', response?: unknown) {
    super(message, 403, response);
  }
}

/** `404 Not Found` — the requested resource does not exist. */
export class NotFoundException extends HttpException {
  public constructor(message = 'Not Found', response?: unknown) {
    super(message, 404, response);
  }
}

/** `405 Method Not Allowed`. */
export class MethodNotAllowedException extends HttpException {
  public constructor(message = 'Method Not Allowed', response?: unknown) {
    super(message, 405, response);
  }
}

/** `409 Conflict` — the request conflicts with the current state of the resource. */
export class ConflictException extends HttpException {
  public constructor(message = 'Conflict', response?: unknown) {
    super(message, 409, response);
  }
}

/** `422 Unprocessable Entity` — well-formed, but semantically invalid (typically validation). */
export class UnprocessableEntityException extends HttpException {
  public constructor(message = 'Unprocessable Entity', response?: unknown) {
    super(message, 422, response);
  }
}

/** `429 Too Many Requests`. */
export class TooManyRequestsException extends HttpException {
  public constructor(message = 'Too Many Requests', response?: unknown) {
    super(message, 429, response);
  }
}

/** `500 Internal Server Error`. */
export class InternalServerErrorException extends HttpException {
  public constructor(message = 'Internal Server Error', response?: unknown) {
    super(message, 500, response);
  }
}

/** `501 Not Implemented`. */
export class NotImplementedException extends HttpException {
  public constructor(message = 'Not Implemented', response?: unknown) {
    super(message, 501, response);
  }
}

/** `503 Service Unavailable`. */
export class ServiceUnavailableException extends HttpException {
  public constructor(message = 'Service Unavailable', response?: unknown) {
    super(message, 503, response);
  }
}
