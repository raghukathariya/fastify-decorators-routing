import { describe, expect, it } from 'vitest';
import { HttpException } from './http-exception.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  MethodNotAllowedException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
  TooManyRequestsException,
  UnauthorizedException,
  UnprocessableEntityException,
} from './http-exceptions.js';

describe('built-in HTTP exceptions', () => {
  const cases: [string, new (message?: string) => HttpException, number][] = [
    ['BadRequestException', BadRequestException, 400],
    ['UnauthorizedException', UnauthorizedException, 401],
    ['ForbiddenException', ForbiddenException, 403],
    ['NotFoundException', NotFoundException, 404],
    ['MethodNotAllowedException', MethodNotAllowedException, 405],
    ['ConflictException', ConflictException, 409],
    ['UnprocessableEntityException', UnprocessableEntityException, 422],
    ['TooManyRequestsException', TooManyRequestsException, 429],
    ['InternalServerErrorException', InternalServerErrorException, 500],
    ['NotImplementedException', NotImplementedException, 501],
    ['ServiceUnavailableException', ServiceUnavailableException, 503],
  ];

  it.each(cases)(
    '%s is an HttpException with statusCode %i and a default message',
    (_label, ExceptionClass, statusCode) => {
      const error = new ExceptionClass();
      expect(error).toBeInstanceOf(HttpException);
      expect(error.statusCode).toBe(statusCode);
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
    },
  );

  it.each(cases)('%s accepts a custom message', (_label, ExceptionClass) => {
    const error = new ExceptionClass('custom message');
    expect(error.message).toBe('custom message');
  });

  it('NotFoundException produces the expected default response body', () => {
    expect(new NotFoundException().getResponseBody()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  });
});
