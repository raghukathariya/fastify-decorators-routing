import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Catch, getCaughtExceptionTypes } from './catch.decorator.js';
import { NotFoundException } from './http-exceptions.js';

describe('@Catch', () => {
  it('records a single exception type', () => {
    @Catch(NotFoundException)
    class NotFoundFilter {}

    expect(getCaughtExceptionTypes(NotFoundFilter)).toEqual([NotFoundException]);
  });

  it('records multiple exception types', () => {
    class CustomError extends Error {}

    @Catch(NotFoundException, CustomError)
    class MultiFilter {}

    expect(getCaughtExceptionTypes(MultiFilter)).toEqual([NotFoundException, CustomError]);
  });

  it('returns an empty array for @Catch() with no arguments (catch-all)', () => {
    @Catch()
    class CatchAllFilter {}

    expect(getCaughtExceptionTypes(CatchAllFilter)).toEqual([]);
  });

  it('returns an empty array for a class with no @Catch()', () => {
    class PlainFilter {}
    expect(getCaughtExceptionTypes(PlainFilter)).toEqual([]);
  });

  it('does not consider @Catch inherited by a subclass', () => {
    @Catch(NotFoundException)
    class BaseFilter {}
    class SubFilter extends BaseFilter {}

    expect(getCaughtExceptionTypes(SubFilter)).toEqual([]);
  });
});
