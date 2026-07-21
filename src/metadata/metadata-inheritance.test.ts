import { describe, expect, it } from 'vitest';
import { createMetadataKey } from './metadata-key.js';
import {
  getConstructorChain,
  getPrototypeChain,
  resolveInheritedClassMetadata,
  resolveInheritedMemberMetadata,
} from './metadata-inheritance.js';
import { MetadataStorage } from './metadata-storage.js';

class GrandParent {}
class Parent extends GrandParent {}
class Child extends Parent {}

describe('getConstructorChain', () => {
  it('returns the target followed by each ancestor, closest first', () => {
    expect(getConstructorChain(Child)).toEqual([Child, Parent, GrandParent]);
  });

  it('returns a single-element chain for a class with no explicit ancestor', () => {
    class Standalone {}
    expect(getConstructorChain(Standalone)).toEqual([Standalone]);
  });
});

describe('getPrototypeChain', () => {
  it('returns the prototype followed by each ancestor prototype, closest first', () => {
    expect(getPrototypeChain(Child.prototype)).toEqual([
      Child.prototype,
      Parent.prototype,
      GrandParent.prototype,
    ]);
  });
});

describe('resolveInheritedClassMetadata', () => {
  const key = createMetadataKey<string>('test:value');
  const arrayKey = createMetadataKey<string[]>('test:array');

  it("returns the closest ancestor's value under the 'override' strategy", () => {
    const storage = new MetadataStorage();
    storage.setClassMetadata(GrandParent, key, 'grandparent-value');
    storage.setClassMetadata(Parent, key, 'parent-value');

    expect(resolveInheritedClassMetadata(storage, Child, key, 'override')).toBe('parent-value');
  });

  it("prefers the target's own value over any ancestor's under 'override'", () => {
    const storage = new MetadataStorage();
    storage.setClassMetadata(GrandParent, key, 'grandparent-value');
    storage.setClassMetadata(Child, key, 'child-value');

    expect(resolveInheritedClassMetadata(storage, Child, key, 'override')).toBe('child-value');
  });

  it('returns undefined when no class in the chain declares the key', () => {
    const storage = new MetadataStorage();
    expect(resolveInheritedClassMetadata(storage, Child, key)).toBeUndefined();
  });

  it("concatenates ancestor arrays root-first under 'merge-array'", () => {
    const storage = new MetadataStorage();
    storage.setClassMetadata(GrandParent, arrayKey, ['grandparent-mw']);
    storage.setClassMetadata(Parent, arrayKey, ['parent-mw']);
    storage.setClassMetadata(Child, arrayKey, ['child-mw']);

    expect(resolveInheritedClassMetadata(storage, Child, arrayKey, 'merge-array')).toEqual([
      'grandparent-mw',
      'parent-mw',
      'child-mw',
    ]);
  });
});

describe('resolveInheritedMemberMetadata', () => {
  const key = createMetadataKey<string>('test:value');

  it('resolves member metadata declared on an ancestor prototype', () => {
    const storage = new MetadataStorage();
    storage.setMemberMetadata(Parent.prototype, 'handle', key, 'parent-handler-meta');

    expect(
      resolveInheritedMemberMetadata(storage, Child.prototype, 'handle', key, 'override'),
    ).toBe('parent-handler-meta');
  });

  it("prefers the closest prototype's own value under 'override'", () => {
    const storage = new MetadataStorage();
    storage.setMemberMetadata(Parent.prototype, 'handle', key, 'parent-value');
    storage.setMemberMetadata(Child.prototype, 'handle', key, 'child-value');

    expect(
      resolveInheritedMemberMetadata(storage, Child.prototype, 'handle', key, 'override'),
    ).toBe('child-value');
  });

  it('does not confuse metadata declared under a different member name', () => {
    const storage = new MetadataStorage();
    storage.setMemberMetadata(Child.prototype, 'other', key, 'unrelated');

    expect(resolveInheritedMemberMetadata(storage, Child.prototype, 'handle', key)).toBeUndefined();
  });
});
