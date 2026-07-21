import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getSerializationConfig, SerializeWith } from './serialize-with.decorator.js';

class UserResponseDto {}

describe('@SerializeWith', () => {
  it('records the dtoClass with default options', () => {
    class Controller {
      @SerializeWith(UserResponseDto)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getSerializationConfig(Controller.prototype, 'handle')).toEqual({
      dtoClass: UserResponseDto,
      options: {},
    });
  });

  it('records explicit options', () => {
    class Controller {
      @SerializeWith(UserResponseDto, { groups: ['admin'], excludeExtraneousValues: false })
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getSerializationConfig(Controller.prototype, 'handle')).toEqual({
      dtoClass: UserResponseDto,
      options: { groups: ['admin'], excludeExtraneousValues: false },
    });
  });

  it('returns undefined for a method with no @SerializeWith', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getSerializationConfig(Controller.prototype, 'handle')).toBeUndefined();
  });

  it('keeps configs for different methods independent', () => {
    class OtherDto {}
    class Controller {
      @SerializeWith(UserResponseDto)
      public a(): void {
        // intentionally empty
      }
      @SerializeWith(OtherDto)
      public b(): void {
        // intentionally empty
      }
    }

    expect(getSerializationConfig(Controller.prototype, 'a')?.dtoClass).toBe(UserResponseDto);
    expect(getSerializationConfig(Controller.prototype, 'b')?.dtoClass).toBe(OtherDto);
  });

  it('inherits a config for a method not overridden by a subclass', () => {
    class Base {
      @SerializeWith(UserResponseDto)
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getSerializationConfig(Sub.prototype, 'handle')?.dtoClass).toBe(UserResponseDto);
  });
});
