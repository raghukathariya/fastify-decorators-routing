import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { DesignTypeReader } from './design-type-reader.js';

function Decorate(): ClassDecorator {
  return () => undefined;
}
function DecorateMember(): MethodDecorator {
  return () => undefined;
}
function DecorateProperty(): PropertyDecorator {
  return () => undefined;
}

class Dependency {}

@Decorate()
class Service {
  public constructor(
    public dep: Dependency,
    public label: string,
  ) {}

  @DecorateMember()
  public handle(_input: number): boolean {
    return true;
  }
}

describe('DesignTypeReader', () => {
  const reader = new DesignTypeReader();

  it('reads constructor parameter types emitted for a decorated class', () => {
    const types = reader.getConstructorParamTypes(Service);
    expect(types).toEqual([Dependency, String]);
  });

  it('returns undefined constructor param types for a class with no decorator', () => {
    class Undecorated {
      public constructor(public x: string) {}
    }
    expect(reader.getConstructorParamTypes(Undecorated)).toBeUndefined();
  });

  it('reads method parameter types emitted for a decorated method', () => {
    const types = reader.getMethodParamTypes(Service.prototype, 'handle');
    expect(types).toEqual([Number]);
  });

  it('reads the declared return type of a decorated method', () => {
    expect(reader.getMethodReturnType(Service.prototype, 'handle')).toBe(Boolean);
  });

  it('reads the declared type of a decorated property', () => {
    class WithProperty {
      // The explicit `: string` annotation below is required, not stylistic: SWC's decorator
      // metadata emission (see vitest.config.ts) reads the syntactic type annotation directly
      // rather than performing type inference, so an inferred-only type would emit no
      // `design:type` metadata at all.
      // eslint-disable-next-line @typescript-eslint/no-inferrable-types
      @DecorateProperty()
      public value: string = '';
    }
    expect(reader.getPropertyType(WithProperty.prototype, 'value')).toBe(String);
  });
});
