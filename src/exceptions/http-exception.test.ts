import { describe, expect, it } from 'vitest';
import { HttpException } from './http-exception.js';

describe('HttpException', () => {
  it('is a real Error subclass carrying a statusCode', () => {
    const error = new HttpException('boom', 418);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(418);
    expect(error.message).toBe('boom');
    expect(error.name).toBe('HttpException');
  });

  it('a subclass reports its own name', () => {
    class TeapotException extends HttpException {
      public constructor() {
        super("I'm a teapot", 418);
      }
    }
    expect(new TeapotException().name).toBe('TeapotException');
  });

  it('getResponseBody defaults to { statusCode, error, message } using the standard reason phrase', () => {
    const error = new HttpException('Name is required', 400);
    expect(error.getResponseBody()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Name is required',
    });
  });

  it('getResponseBody falls back to "Error" for a status with no known reason phrase', () => {
    const error = new HttpException('mystery', 499);
    expect(error.getResponseBody()).toEqual({
      statusCode: 499,
      error: 'Error',
      message: 'mystery',
    });
  });

  it('getResponseBody returns the explicit response verbatim when one was given', () => {
    const custom = { statusCode: 400, message: ['field is required'], customField: true };
    const error = new HttpException('validation failed', 400, custom);
    expect(error.getResponseBody()).toBe(custom);
  });
});
