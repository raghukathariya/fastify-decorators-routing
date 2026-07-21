import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import { mergeMetadataValues, type MetadataMergeStrategy } from './metadata-merge-strategy.js';
import type { MetadataKey } from './metadata-key.js';
import type { MetadataStorage } from './metadata-storage.js';

/**
 * Returns `target` followed by each of its ancestor constructors, closest ancestor first
 * (`[target, parent, grandparent, ...]`), stopping before `Function.prototype`.
 */
export function getConstructorChain(target: AnyConstructor): AnyConstructor[] {
  const chain: AnyConstructor[] = [];
  let current: unknown = target;
  while (typeof current === 'function' && current !== Function.prototype) {
    chain.push(current as AnyConstructor);
    current = Object.getPrototypeOf(current);
  }
  return chain;
}

/**
 * Returns `prototype` followed by each ancestor prototype, closest first
 * (`[prototype, parentPrototype, ...]`), stopping before `Object.prototype`.
 */
export function getPrototypeChain(prototype: object): object[] {
  const chain: object[] = [];
  let current: object | null = prototype;
  while (current !== null && current !== Object.prototype) {
    chain.push(current);
    current = Object.getPrototypeOf(current) as object | null;
  }
  return chain;
}

/**
 * Resolves class-level metadata for `target`, combining its own value with every ancestor's
 * value (root ancestor first, `target` itself last) according to `strategy`.
 */
export function resolveInheritedClassMetadata<T>(
  storage: MetadataStorage,
  target: AnyConstructor,
  key: MetadataKey<T>,
  strategy: MetadataMergeStrategy = 'override',
): T | undefined {
  const rootFirst = [...getConstructorChain(target)].reverse();
  let result: T | undefined;
  for (const ancestor of rootFirst) {
    result = mergeMetadataValues(
      strategy,
      result,
      storage.getClassMetadata(ancestor as object, key),
    );
  }
  return result;
}

/**
 * Resolves member-level metadata for `(prototype, member)`, combining its own value with every
 * ancestor prototype's value for the same member (root ancestor first) according to `strategy`.
 */
export function resolveInheritedMemberMetadata<T>(
  storage: MetadataStorage,
  prototype: object,
  member: MemberKey,
  key: MetadataKey<T>,
  strategy: MetadataMergeStrategy = 'override',
): T | undefined {
  const rootFirst = [...getPrototypeChain(prototype)].reverse();
  let result: T | undefined;
  for (const ancestor of rootFirst) {
    result = mergeMetadataValues(
      strategy,
      result,
      storage.getMemberMetadata(ancestor, member, key),
    );
  }
  return result;
}
