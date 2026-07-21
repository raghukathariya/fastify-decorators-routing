import 'reflect-metadata';
import { Exclude, Expose, Transform } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { serializeResponse } from './serialize-response.js';
import type { SerializationConfig } from './serialization.types.js';

class UserResponseDto {
  @Expose()
  public id!: string;

  @Expose()
  public name!: string;

  // Not @Expose()d — excluded by default (excludeExtraneousValues: true).
  public passwordHash?: string;
}

class UserWithExcludeDto {
  public id!: string;
  public name!: string;

  @Exclude()
  public passwordHash?: string;
}

class UserWithGroupsDto {
  @Expose()
  public id!: string;

  @Expose({ groups: ['admin'] })
  public email!: string;
}

class UserWithTransformDto {
  @Expose()
  public id!: string;

  @Expose()
  @Transform(({ value }) => String(value).toUpperCase())
  public name!: string;
}

function config(
  dtoClass: SerializationConfig['dtoClass'],
  options: SerializationConfig['options'] = {},
): SerializationConfig {
  return { dtoClass, options };
}

describe('serializeResponse: passthrough', () => {
  it('returns the value unchanged when there is no config', () => {
    const value = { id: '1', passwordHash: 'secret' };
    expect(serializeResponse(value, undefined)).toBe(value);
  });

  it('returns null/undefined unchanged even with a config', () => {
    expect(serializeResponse(null, config(UserResponseDto))).toBeNull();
    expect(serializeResponse(undefined, config(UserResponseDto))).toBeUndefined();
  });
});

describe('serializeResponse: @Expose / excludeExtraneousValues', () => {
  it('drops properties not marked @Expose() by default', () => {
    const result = serializeResponse(
      { id: '1', name: 'Ada', passwordHash: 'secret' },
      config(UserResponseDto),
    );

    expect(result).toEqual({ id: '1', name: 'Ada' });
  });

  it('keeps every property when excludeExtraneousValues is false', () => {
    const result = serializeResponse(
      { id: '1', name: 'Ada', passwordHash: 'secret' },
      config(UserResponseDto, { excludeExtraneousValues: false }),
    );

    expect(result).toMatchObject({ id: '1', name: 'Ada', passwordHash: 'secret' });
  });

  it('an explicit @Exclude() still drops a property even with excludeExtraneousValues: false', () => {
    const result = serializeResponse(
      { id: '1', name: 'Ada', passwordHash: 'secret' },
      config(UserWithExcludeDto, { excludeExtraneousValues: false }),
    );

    expect(result).toEqual({ id: '1', name: 'Ada' });
  });

  it('serializes every element of an array the same way', () => {
    const result = serializeResponse(
      [
        { id: '1', name: 'Ada', passwordHash: 'secret-1' },
        { id: '2', name: 'Grace', passwordHash: 'secret-2' },
      ],
      config(UserResponseDto),
    );

    expect(result).toEqual([
      { id: '1', name: 'Ada' },
      { id: '2', name: 'Grace' },
    ]);
  });
});

describe('serializeResponse: groups', () => {
  it('excludes a group-restricted property when the group is not requested', () => {
    const result = serializeResponse(
      { id: '1', email: 'ada@example.com' },
      config(UserWithGroupsDto),
    );
    expect(result).toEqual({ id: '1' });
  });

  it('includes a group-restricted property when its group is requested', () => {
    const result = serializeResponse(
      { id: '1', email: 'ada@example.com' },
      config(UserWithGroupsDto, { groups: ['admin'] }),
    );

    expect(result).toEqual({ id: '1', email: 'ada@example.com' });
  });
});

describe('serializeResponse: @Transform', () => {
  it('applies a @Transform decorator to the serialized value', () => {
    const result = serializeResponse({ id: '1', name: 'ada' }, config(UserWithTransformDto));
    expect(result).toEqual({ id: '1', name: 'ADA' });
  });
});
