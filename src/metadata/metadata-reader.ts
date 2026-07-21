import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import {
  resolveInheritedClassMetadata,
  resolveInheritedMemberMetadata,
} from './metadata-inheritance.js';
import type { MetadataKey } from './metadata-key.js';
import type { MetadataMergeStrategy } from './metadata-merge-strategy.js';
import { globalMetadataStorage, type MetadataStorage } from './metadata-storage.js';

export interface ReadMetadataOptions {
  /**
   * When `true` (the default), ancestor classes/prototypes are walked and combined with the
   * target's own value via `strategy`. When `false`, only the value declared directly on the
   * target is returned.
   */
  inherit?: boolean;
  /** How to combine ancestor and own values when `inherit` is `true`. Defaults to `'override'`. */
  strategy?: MetadataMergeStrategy;
}

/**
 * Read-side API of the metadata engine.
 *
 * `MetadataReader` adds two things on top of raw `MetadataStorage` access: inheritance
 * resolution (see `metadata-inheritance.ts`) and a resolved-value cache, so that repeatedly
 * reading the same inherited metadata during route registration (which happens once per route,
 * per request-time hot-path lookup avoided by design — see Phase 23) does not repeatedly re-walk
 * the prototype chain.
 *
 * The cache is invalidated per-target via `invalidateClass`/`invalidateMember`. `MetadataWriter`
 * calls these automatically after every write, so callers never need to manage invalidation
 * manually in normal use.
 */
export class MetadataReader {
  private readonly classCache = new WeakMap<object, Map<MetadataKey<unknown>, unknown>>();

  private readonly memberCache = new WeakMap<
    object,
    Map<MemberKey, Map<MetadataKey<unknown>, unknown>>
  >();

  public constructor(private readonly storage: MetadataStorage = globalMetadataStorage) {}

  public getClassMetadata<T>(
    target: AnyConstructor,
    key: MetadataKey<T>,
    options: ReadMetadataOptions = {},
  ): T | undefined {
    const { inherit = true, strategy = 'override' } = options;

    if (!inherit) {
      return this.storage.getClassMetadata(target, key);
    }

    let bucket = this.classCache.get(target);
    if (bucket?.has(key)) {
      return bucket.get(key) as T | undefined;
    }

    const resolved = resolveInheritedClassMetadata(this.storage, target, key, strategy);

    if (!bucket) {
      bucket = new Map();
      this.classCache.set(target, bucket);
    }
    bucket.set(key, resolved);

    return resolved;
  }

  public getMemberMetadata<T>(
    prototype: object,
    member: MemberKey,
    key: MetadataKey<T>,
    options: ReadMetadataOptions = {},
  ): T | undefined {
    const { inherit = true, strategy = 'override' } = options;

    if (!inherit) {
      return this.storage.getMemberMetadata(prototype, member, key);
    }

    let members = this.memberCache.get(prototype);
    let bucket = members?.get(member);
    if (bucket?.has(key)) {
      return bucket.get(key) as T | undefined;
    }

    const resolved = resolveInheritedMemberMetadata(this.storage, prototype, member, key, strategy);

    if (!members) {
      members = new Map();
      this.memberCache.set(prototype, members);
    }
    if (!bucket) {
      bucket = new Map();
      members.set(member, bucket);
    }
    bucket.set(key, resolved);

    return resolved;
  }

  /** All own member keys declared directly on `prototype` (does not include inherited members). */
  public getOwnMembers(prototype: object): readonly MemberKey[] {
    return this.storage.getOwnMembers(prototype);
  }

  public invalidateClass(target: object): void {
    this.classCache.delete(target);
  }

  public invalidateMember(prototype: object, member?: MemberKey): void {
    if (member === undefined) {
      this.memberCache.delete(prototype);
      return;
    }
    this.memberCache.get(prototype)?.delete(member);
  }
}

/**
 * The process-wide default `MetadataReader`, backed by `globalMetadataStorage`.
 */
export const globalMetadataReader = new MetadataReader();
