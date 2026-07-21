import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import type { MetadataKey } from './metadata-key.js';
import { globalMetadataReader, type MetadataReader } from './metadata-reader.js';
import { globalMetadataStorage, type MetadataStorage } from './metadata-storage.js';

/**
 * Write-side API of the metadata engine.
 *
 * Every decorator in this framework goes through `MetadataWriter` rather than touching
 * `MetadataStorage` directly, for one reason: writes must invalidate the corresponding
 * `MetadataReader` cache entry, or a decorator applied after a metadata read (e.g. `@Get` on a
 * subclass evaluated after a base class's routes were already inspected) could observe stale
 * cached data. Routing all writes through one class makes that invariant impossible to forget.
 */
export class MetadataWriter {
  public constructor(
    private readonly storage: MetadataStorage = globalMetadataStorage,
    private readonly reader: MetadataReader = globalMetadataReader,
  ) {}

  public setClassMetadata<T>(target: AnyConstructor, key: MetadataKey<T>, value: T): void {
    this.storage.setClassMetadata(target, key, value);
    this.reader.invalidateClass(target);
  }

  /**
   * Appends `value` to the array stored under `key` on `target`, creating the array on first
   * use. Intended for decorators that may be applied more than once and should accumulate
   * (e.g. multiple `@Use(middleware)` calls on the same controller).
   */
  public appendClassMetadata<T>(target: AnyConstructor, key: MetadataKey<T[]>, value: T): void {
    const existing = this.storage.getClassMetadata(target, key) ?? [];
    this.storage.setClassMetadata(target, key, [...existing, value]);
    this.reader.invalidateClass(target);
  }

  public setMemberMetadata<T>(
    prototype: object,
    member: MemberKey,
    key: MetadataKey<T>,
    value: T,
  ): void {
    this.storage.setMemberMetadata(prototype, member, key, value);
    this.reader.invalidateMember(prototype, member);
  }

  public appendMemberMetadata<T>(
    prototype: object,
    member: MemberKey,
    key: MetadataKey<T[]>,
    value: T,
  ): void {
    const existing = this.storage.getMemberMetadata(prototype, member, key) ?? [];
    this.storage.setMemberMetadata(prototype, member, key, [...existing, value]);
    this.reader.invalidateMember(prototype, member);
  }
}

/**
 * The process-wide default `MetadataWriter`, backed by `globalMetadataStorage` and
 * `globalMetadataReader`.
 */
export const globalMetadataWriter = new MetadataWriter();
