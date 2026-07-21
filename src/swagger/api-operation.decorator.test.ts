import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ApiOperation, getApiOperation } from './api-operation.decorator.js';

describe('@ApiOperation', () => {
  it('records the given options', () => {
    class Controller {
      @ApiOperation({ summary: 'Get a user', operationId: 'getUser' })
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getApiOperation(Controller.prototype, 'handle')).toEqual({
      summary: 'Get a user',
      operationId: 'getUser',
    });
  });

  it('returns undefined for a method with no @ApiOperation', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getApiOperation(Controller.prototype, 'handle')).toBeUndefined();
  });

  it('a later @ApiOperation on a subclass overrides the inherited one entirely', () => {
    class Base {
      @ApiOperation({ summary: 'Base summary', description: 'Base description' })
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {
      @ApiOperation({ summary: 'Sub summary' })
      public override handle(): void {
        // intentionally empty
      }
    }

    expect(getApiOperation(Sub.prototype, 'handle')).toEqual({ summary: 'Sub summary' });
  });

  it('inherits the config for a method not overridden by a subclass', () => {
    class Base {
      @ApiOperation({ summary: 'Base summary' })
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getApiOperation(Sub.prototype, 'handle')).toEqual({ summary: 'Base summary' });
  });

  it('keeps configs for different methods independent', () => {
    class Controller {
      @ApiOperation({ summary: 'A' })
      public a(): void {
        // intentionally empty
      }
      @ApiOperation({ summary: 'B' })
      public b(): void {
        // intentionally empty
      }
    }

    expect(getApiOperation(Controller.prototype, 'a')).toEqual({ summary: 'A' });
    expect(getApiOperation(Controller.prototype, 'b')).toEqual({ summary: 'B' });
  });
});
