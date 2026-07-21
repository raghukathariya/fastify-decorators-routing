import type { MemberKey } from '../types/constructor.type.js';
import type { MetadataKey } from './metadata-key.js';

/**
 * Low-level, WeakMap-backed metadata store.
 *
 * This is the storage-optimized substrate underneath the rest of the metadata engine: lookups
 * are O(1) `Map`/`WeakMap` operations (no string concatenation, no linear scans), and because
 * every layer is a `WeakMap` keyed by the class (or prototype), metadata for classes that are
 * garbage collected is automatically reclaimed rather than leaking for the lifetime of the
 * process — a real concern for long-lived servers that hot-reload route modules.
 *
 * Two independent layers are kept:
 *  - **Class-level** metadata, keyed by the constructor itself (e.g. `@Controller('/users')`).
 *  - **Member-level** metadata, keyed by `(prototype, memberKey)` (e.g. `@Get('/:id')` on a
 *    method, or `@Param('id')` on a parameter of that method).
 *
 * `MetadataStorage` deliberately knows nothing about inheritance, merging, or caching — those
 * are higher-level concerns layered on top by `MetadataReader`/`MetadataWriter`
 * (see `metadata-inheritance.ts` and `metadata-merge-strategy.ts`). Keeping this class primitive
 * keeps it fast, predictable, and easy to reason about in isolation.
 */
export class MetadataStorage {
  private readonly classMetadata = new WeakMap<object, Map<MetadataKey<unknown>, unknown>>();

  private readonly memberMetadata = new WeakMap<
    object,
    Map<MemberKey, Map<MetadataKey<unknown>, unknown>>
  >();

  // ---------------------------------------------------------------------------------------------
  // Class-level metadata
  // ---------------------------------------------------------------------------------------------

  public setClassMetadata<T>(target: object, key: MetadataKey<T>, value: T): void {
    let bucket = this.classMetadata.get(target);
    if (!bucket) {
      bucket = new Map();
      this.classMetadata.set(target, bucket);
    }
    bucket.set(key, value);
  }

  public getClassMetadata<T>(target: object, key: MetadataKey<T>): T | undefined {
    return this.classMetadata.get(target)?.get(key) as T | undefined;
  }

  public hasClassMetadata(target: object, key: MetadataKey<unknown>): boolean {
    return this.classMetadata.get(target)?.has(key) ?? false;
  }

  public deleteClassMetadata(target: object, key: MetadataKey<unknown>): boolean {
    return this.classMetadata.get(target)?.delete(key) ?? false;
  }

  /** All metadata keys set directly on `target` (does not walk the prototype chain). */
  public getOwnClassMetadataKeys(target: object): readonly MetadataKey<unknown>[] {
    const bucket = this.classMetadata.get(target);
    return bucket ? Array.from(bucket.keys()) : [];
  }

  // ---------------------------------------------------------------------------------------------
  // Member-level metadata
  // ---------------------------------------------------------------------------------------------

  public setMemberMetadata<T>(
    target: object,
    member: MemberKey,
    key: MetadataKey<T>,
    value: T,
  ): void {
    let members = this.memberMetadata.get(target);
    if (!members) {
      members = new Map();
      this.memberMetadata.set(target, members);
    }
    let bucket = members.get(member);
    if (!bucket) {
      bucket = new Map();
      members.set(member, bucket);
    }
    bucket.set(key, value);
  }

  public getMemberMetadata<T>(
    target: object,
    member: MemberKey,
    key: MetadataKey<T>,
  ): T | undefined {
    return this.memberMetadata.get(target)?.get(member)?.get(key) as T | undefined;
  }

  public hasMemberMetadata(target: object, member: MemberKey, key: MetadataKey<unknown>): boolean {
    return this.memberMetadata.get(target)?.get(member)?.has(key) ?? false;
  }

  public deleteMemberMetadata(
    target: object,
    member: MemberKey,
    key: MetadataKey<unknown>,
  ): boolean {
    return this.memberMetadata.get(target)?.get(member)?.delete(key) ?? false;
  }

  /** All metadata keys set directly on `(target, member)`. */
  public getOwnMemberMetadataKeys(
    target: object,
    member: MemberKey,
  ): readonly MetadataKey<unknown>[] {
    const bucket = this.memberMetadata.get(target)?.get(member);
    return bucket ? Array.from(bucket.keys()) : [];
  }

  /** All member keys (method/property names) that have at least one metadata entry on `target`. */
  public getOwnMembers(target: object): readonly MemberKey[] {
    const members = this.memberMetadata.get(target);
    return members ? Array.from(members.keys()) : [];
  }

  // ---------------------------------------------------------------------------------------------
  // Bulk operations
  // ---------------------------------------------------------------------------------------------

  /** Removes every entry (class- and member-level) for `target`. Intended for test isolation. */
  public clearTarget(target: object): void {
    this.classMetadata.delete(target);
    this.memberMetadata.delete(target);
  }
}

/**
 * The process-wide default `MetadataStorage` instance used by `MetadataReader`/`MetadataWriter`
 * unless a different instance is explicitly supplied (e.g. in tests, to avoid cross-test leakage
 * through shared global state).
 */
export const globalMetadataStorage = new MetadataStorage();
