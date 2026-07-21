/// <reference types="reflect-metadata" />
import { MetadataError } from '../errors/metadata.error.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';

const DESIGN_TYPE = 'design:type';
const DESIGN_PARAM_TYPES = 'design:paramtypes';
const DESIGN_RETURN_TYPE = 'design:returntype';

/**
 * Reads TypeScript's compiler-emitted design-time type metadata (`design:type`,
 * `design:paramtypes`, `design:returntype`) via the `reflect-metadata` polyfill.
 *
 * This metadata is what lets the dependency injection container (Phase 4) infer a class's
 * constructor parameter types without the caller repeating them in an `@Inject(SomeType)` call,
 * and is emitted by `tsc`/`swc` only for declarations that carry at least one decorator — see
 * `tsup.config.ts` and `vitest.config.ts` for how this project ensures that emission actually
 * happens under both the production build and the test suite (esbuild alone does not support
 * `emitDecoratorMetadata`).
 *
 * Every read is guarded by {@link assertAvailable}: if the consuming application never executed
 * `import 'reflect-metadata'`, `Reflect.getMetadata` does not exist, and every decorator relying
 * on design-time types would otherwise fail silently (returning `undefined` and quietly
 * degrading to "no dependencies"). Failing loudly here, with an actionable message, is
 * deliberate.
 */
export class DesignTypeReader {
  /**
   * The constructor parameter types of `target`, in declaration order. `undefined` if `target`
   * carries no decorator at all (TypeScript only emits this metadata for decorated classes).
   */
  public getConstructorParamTypes(target: AnyConstructor): AnyConstructor[] | undefined {
    this.assertAvailable();
    return Reflect.getMetadata(DESIGN_PARAM_TYPES, target) as AnyConstructor[] | undefined;
  }

  /** The parameter types of method `member` on `prototype`, in declaration order. */
  public getMethodParamTypes(prototype: object, member: MemberKey): AnyConstructor[] | undefined {
    this.assertAvailable();
    return Reflect.getMetadata(DESIGN_PARAM_TYPES, prototype, member) as
      AnyConstructor[] | undefined;
  }

  /** The declared type of property/parameter `member` on `prototype`. */
  public getPropertyType(prototype: object, member: MemberKey): AnyConstructor | undefined {
    this.assertAvailable();
    return Reflect.getMetadata(DESIGN_TYPE, prototype, member) as AnyConstructor | undefined;
  }

  /** The declared return type of method `member` on `prototype`. */
  public getMethodReturnType(prototype: object, member: MemberKey): AnyConstructor | undefined {
    this.assertAvailable();
    return Reflect.getMetadata(DESIGN_RETURN_TYPE, prototype, member) as AnyConstructor | undefined;
  }

  private assertAvailable(): void {
    if (typeof Reflect === 'undefined' || typeof Reflect.getMetadata !== 'function') {
      throw MetadataError.reflectMetadataNotLoaded();
    }
  }
}

/**
 * The process-wide default `DesignTypeReader`.
 */
export const globalDesignTypeReader = new DesignTypeReader();
