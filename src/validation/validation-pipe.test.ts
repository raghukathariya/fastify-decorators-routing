import 'reflect-metadata';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { isDtoType, validateAndTransform } from './validation-pipe.js';
import { ValidationException } from './validation.error.js';

class CreateUserDto {
  @IsString()
  public name!: string;

  @IsEmail()
  public email!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  public age?: number;
}

class AddressDto {
  @IsString()
  public zipCode!: string;
}

class CreateUserWithAddressDto {
  @IsString()
  public name!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  public address!: AddressDto;
}

describe('isDtoType', () => {
  it('returns false for undefined and every primitive wrapper type', () => {
    expect(isDtoType(undefined)).toBe(false);
    expect(isDtoType(String)).toBe(false);
    expect(isDtoType(Number)).toBe(false);
    expect(isDtoType(Boolean)).toBe(false);
    expect(isDtoType(Array)).toBe(false);
    expect(isDtoType(Object)).toBe(false);
  });

  it('returns true for a custom class', () => {
    expect(isDtoType(CreateUserDto)).toBe(true);
  });
});

describe('validateAndTransform: non-DTO passthrough', () => {
  it('returns the value unchanged when designType is undefined', async () => {
    await expect(validateAndTransform(undefined, { a: 1 })).resolves.toEqual({ a: 1 });
  });

  it('returns the value unchanged when designType is a primitive wrapper', async () => {
    await expect(validateAndTransform(String, 'hello')).resolves.toBe('hello');
    await expect(validateAndTransform(Number, 42)).resolves.toBe(42);
  });

  it('returns the value unchanged when the extracted value is not a plain object', async () => {
    await expect(validateAndTransform(CreateUserDto, 'not-an-object')).resolves.toBe(
      'not-an-object',
    );
    await expect(validateAndTransform(CreateUserDto, null)).resolves.toBeNull();
  });
});

describe('validateAndTransform: DTO validation', () => {
  it('transforms a valid plain object into a DTO instance', async () => {
    const result = await validateAndTransform(CreateUserDto, {
      name: 'Ada',
      email: 'ada@example.com',
    });

    expect(result).toBeInstanceOf(CreateUserDto);
    expect(result).toMatchObject({ name: 'Ada', email: 'ada@example.com' });
  });

  it('throws ValidationException for a missing required field', async () => {
    await expect(validateAndTransform(CreateUserDto, { email: 'ada@example.com' })).rejects.toThrow(
      ValidationException,
    );
  });

  it('throws ValidationException for a malformed field', async () => {
    await expect(
      validateAndTransform(CreateUserDto, { name: 'Ada', email: 'not-an-email' }),
    ).rejects.toThrow(ValidationException);
  });

  it('reports the failing property in the thrown exception', async () => {
    try {
      await validateAndTransform(CreateUserDto, { name: 'Ada', email: 'not-an-email' });
      expect.fail('expected validateAndTransform to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errors.map((e) => e.property)).toContain('email');
    }
  });

  it('allows an optional field to be omitted', async () => {
    const result = await validateAndTransform(CreateUserDto, {
      name: 'Ada',
      email: 'ada@example.com',
    });
    expect((result as CreateUserDto).age).toBeUndefined();
  });

  it('rejects an optional field that is present but invalid', async () => {
    await expect(
      validateAndTransform(CreateUserDto, { name: 'Ada', email: 'ada@example.com', age: -1 }),
    ).rejects.toThrow(ValidationException);
  });

  it('strips properties with no class-validator decorator by default (whitelist)', async () => {
    const result = (await validateAndTransform(CreateUserDto, {
      name: 'Ada',
      email: 'ada@example.com',
      extraField: 'should be stripped',
    })) as CreateUserDto & { extraField?: unknown };

    expect(result.extraField).toBeUndefined();
  });

  it('respects whitelist: false', async () => {
    const result = (await validateAndTransform(
      CreateUserDto,
      { name: 'Ada', email: 'ada@example.com', extraField: 'kept' },
      { whitelist: false },
    )) as CreateUserDto & { extraField?: unknown };

    expect(result.extraField).toBe('kept');
  });

  it('rejects non-whitelisted properties when forbidNonWhitelisted is true', async () => {
    await expect(
      validateAndTransform(
        CreateUserDto,
        { name: 'Ada', email: 'ada@example.com', extraField: 'not allowed' },
        { forbidNonWhitelisted: true },
      ),
    ).rejects.toThrow(ValidationException);
  });
});

describe('validateAndTransform: nested DTOs', () => {
  it('transforms and validates a nested DTO via @ValidateNested + @Type', async () => {
    const result = await validateAndTransform(CreateUserWithAddressDto, {
      name: 'Ada',
      address: { zipCode: '12345' },
    });

    expect(result).toBeInstanceOf(CreateUserWithAddressDto);
    expect((result as CreateUserWithAddressDto).address).toBeInstanceOf(AddressDto);
  });

  it('reports a nested DTO validation failure with a dot-path property', async () => {
    try {
      await validateAndTransform(CreateUserWithAddressDto, { name: 'Ada', address: {} });
      expect.fail('expected validateAndTransform to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errors.map((e) => e.property)).toContain(
        'address.zipCode',
      );
    }
  });
});
