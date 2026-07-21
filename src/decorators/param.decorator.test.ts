import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { DecoratorError } from '../errors/decorator.error.js';
import {
  Body,
  Cookies,
  Headers,
  Hostname,
  Ip,
  Param,
  Query,
  Req,
  Res,
  Session,
  getParamDefinitions,
} from './param.decorator.js';

describe('keyed parameter decorators: @Body, @Query, @Param, @Headers, @Cookies, @Session', () => {
  const cases: [string, typeof Body, string][] = [
    ['@Body', Body, 'body'],
    ['@Query', Query, 'query'],
    ['@Param', Param, 'param'],
    ['@Headers', Headers, 'headers'],
    ['@Cookies', Cookies, 'cookies'],
    ['@Session', Session, 'session'],
  ];

  it.each(cases)('%s with no argument extracts the whole object', (_label, decorator) => {
    class Controller {
      public handle(@decorator() _value: unknown): void {
        // intentionally empty
      }
    }
    const [definition] = getParamDefinitions(Controller.prototype, 'handle');
    expect(definition?.key).toBeUndefined();
  });

  it.each(cases)(
    '%s with a string argument extracts that single key',
    (_label, decorator, type) => {
      class Controller {
        public handle(@decorator('email') _value: unknown): void {
          // intentionally empty
        }
      }
      const [definition] = getParamDefinitions(Controller.prototype, 'handle');
      expect(definition).toEqual({ index: 0, type, key: 'email' });
    },
  );

  it.each(cases)('%s accepts an options object with key and transform', (_label, decorator) => {
    const transform = (value: unknown) => value;
    class Controller {
      public handle(@decorator({ key: 'email', transform }) _value: unknown): void {
        // intentionally empty
      }
    }
    const [definition] = getParamDefinitions(Controller.prototype, 'handle');
    expect(definition?.key).toBe('email');
    expect(definition?.transform).toBe(transform);
  });

  it.each(cases)('%s throws when applied to a constructor parameter', (_label, decorator) => {
    expect(() => {
      class Controller {
        public constructor(@decorator() _value: unknown) {
          // intentionally empty
        }
      }
      return Controller;
    }).toThrow(DecoratorError);
  });
});

describe('simple parameter decorators: @Req, @Res, @Ip, @Hostname', () => {
  const cases: [string, typeof Req, string][] = [
    ['@Req', Req, 'req'],
    ['@Res', Res, 'res'],
    ['@Ip', Ip, 'ip'],
    ['@Hostname', Hostname, 'hostname'],
  ];

  it.each(cases)('%s records its type with no key', (_label, decorator, type) => {
    class Controller {
      public handle(@decorator() _value: unknown): void {
        // intentionally empty
      }
    }
    const [definition] = getParamDefinitions(Controller.prototype, 'handle');
    expect(definition).toEqual({ index: 0, type });
  });

  it.each(cases)('%s accepts a transform option', (_label, decorator) => {
    const transform = (value: unknown) => value;
    class Controller {
      public handle(@decorator({ transform }) _value: unknown): void {
        // intentionally empty
      }
    }
    const [definition] = getParamDefinitions(Controller.prototype, 'handle');
    expect(definition?.transform).toBe(transform);
  });

  it.each(cases)('%s throws when applied to a constructor parameter', (_label, decorator) => {
    expect(() => {
      class Controller {
        public constructor(@decorator() _value: unknown) {
          // intentionally empty
        }
      }
      return Controller;
    }).toThrow(DecoratorError);
  });
});

describe('multiple parameters on one method', () => {
  it('records every decorated parameter, ordered by index regardless of decoration order', () => {
    class Controller {
      public handle(
        @Param('id') _id: string,
        @Body() _body: unknown,
        @Query('page') _page: number,
      ): void {
        // intentionally empty
      }
    }

    const definitions = getParamDefinitions(Controller.prototype, 'handle');
    expect(definitions.map((d) => d.index)).toEqual([0, 1, 2]);
    expect(definitions.map((d) => d.type)).toEqual(['param', 'body', 'query']);
  });

  it('keeps parameter lists for different methods independent', () => {
    class Controller {
      public methodA(@Body() _body: unknown): void {
        // intentionally empty
      }
      public methodB(@Query() _query: unknown): void {
        // intentionally empty
      }
    }

    expect(getParamDefinitions(Controller.prototype, 'methodA')).toEqual([
      { index: 0, type: 'body' },
    ]);
    expect(getParamDefinitions(Controller.prototype, 'methodB')).toEqual([
      { index: 0, type: 'query' },
    ]);
  });
});

describe('getParamDefinitions', () => {
  it('returns an empty array for an undecorated method', () => {
    class Controller {
      public handle(_value: unknown): void {
        // intentionally empty
      }
    }
    expect(getParamDefinitions(Controller.prototype, 'handle')).toEqual([]);
  });

  it('inherits parameter definitions for a method not overridden by a subclass', () => {
    class BaseController {
      public handle(@Body() _body: unknown): void {
        // intentionally empty
      }
    }
    class SubController extends BaseController {}

    expect(getParamDefinitions(SubController.prototype, 'handle')).toEqual([
      { index: 0, type: 'body' },
    ]);
  });
});
