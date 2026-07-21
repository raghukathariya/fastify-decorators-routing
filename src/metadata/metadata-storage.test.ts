import { describe, expect, it } from 'vitest';
import { createMetadataKey } from './metadata-key.js';
import { MetadataStorage } from './metadata-storage.js';

describe('MetadataStorage', () => {
  const key = createMetadataKey<string>('test:value');

  it('stores and retrieves class-level metadata', () => {
    const storage = new MetadataStorage();
    class Foo {}

    expect(storage.getClassMetadata(Foo, key)).toBeUndefined();
    storage.setClassMetadata(Foo, key, 'hello');
    expect(storage.getClassMetadata(Foo, key)).toBe('hello');
  });

  it('overwrites an existing class-level value', () => {
    const storage = new MetadataStorage();
    class Foo {}

    storage.setClassMetadata(Foo, key, 'first');
    storage.setClassMetadata(Foo, key, 'second');
    expect(storage.getClassMetadata(Foo, key)).toBe('second');
  });

  it('isolates metadata between distinct targets', () => {
    const storage = new MetadataStorage();
    class Foo {}
    class Bar {}

    storage.setClassMetadata(Foo, key, 'foo-value');
    expect(storage.getClassMetadata(Bar, key)).toBeUndefined();
  });

  it('isolates metadata between distinct keys on the same target', () => {
    const storage = new MetadataStorage();
    class Foo {}
    const otherKey = createMetadataKey<number>('test:other');

    storage.setClassMetadata(Foo, key, 'string-value');
    storage.setClassMetadata(Foo, otherKey, 42);

    expect(storage.getClassMetadata(Foo, key)).toBe('string-value');
    expect(storage.getClassMetadata(Foo, otherKey)).toBe(42);
  });

  it('reports has/delete correctly for class-level metadata', () => {
    const storage = new MetadataStorage();
    class Foo {}

    expect(storage.hasClassMetadata(Foo, key)).toBe(false);
    storage.setClassMetadata(Foo, key, 'value');
    expect(storage.hasClassMetadata(Foo, key)).toBe(true);
    expect(storage.deleteClassMetadata(Foo, key)).toBe(true);
    expect(storage.hasClassMetadata(Foo, key)).toBe(false);
    expect(storage.deleteClassMetadata(Foo, key)).toBe(false);
  });

  it('lists own class metadata keys', () => {
    const storage = new MetadataStorage();
    class Foo {}
    const otherKey = createMetadataKey<number>('test:other');

    storage.setClassMetadata(Foo, key, 'value');
    storage.setClassMetadata(Foo, otherKey, 1);

    expect(storage.getOwnClassMetadataKeys(Foo)).toEqual([key, otherKey]);
  });

  it('stores and retrieves member-level metadata independently per member', () => {
    const storage = new MetadataStorage();
    const prototype = {};

    storage.setMemberMetadata(prototype, 'methodA', key, 'a-value');
    storage.setMemberMetadata(prototype, 'methodB', key, 'b-value');

    expect(storage.getMemberMetadata(prototype, 'methodA', key)).toBe('a-value');
    expect(storage.getMemberMetadata(prototype, 'methodB', key)).toBe('b-value');
  });

  it('supports symbol member keys', () => {
    const storage = new MetadataStorage();
    const prototype = {};
    const member = Symbol('member');

    storage.setMemberMetadata(prototype, member, key, 'symbol-value');
    expect(storage.getMemberMetadata(prototype, member, key)).toBe('symbol-value');
  });

  it('reports has/delete correctly for member-level metadata', () => {
    const storage = new MetadataStorage();
    const prototype = {};

    expect(storage.hasMemberMetadata(prototype, 'method', key)).toBe(false);
    storage.setMemberMetadata(prototype, 'method', key, 'value');
    expect(storage.hasMemberMetadata(prototype, 'method', key)).toBe(true);
    expect(storage.deleteMemberMetadata(prototype, 'method', key)).toBe(true);
    expect(storage.hasMemberMetadata(prototype, 'method', key)).toBe(false);
  });

  it('lists own members and their own metadata keys', () => {
    const storage = new MetadataStorage();
    const prototype = {};
    const otherKey = createMetadataKey<number>('test:other');

    storage.setMemberMetadata(prototype, 'methodA', key, 'value');
    storage.setMemberMetadata(prototype, 'methodB', otherKey, 1);

    expect(storage.getOwnMembers(prototype)).toEqual(['methodA', 'methodB']);
    expect(storage.getOwnMemberMetadataKeys(prototype, 'methodA')).toEqual([key]);
    expect(storage.getOwnMemberMetadataKeys(prototype, 'methodB')).toEqual([otherKey]);
  });

  it('clearTarget removes both class- and member-level metadata for a target', () => {
    const storage = new MetadataStorage();
    class Foo {}

    storage.setClassMetadata(Foo, key, 'value');
    storage.setMemberMetadata(Foo, 'method', key, 'member-value');

    storage.clearTarget(Foo);

    expect(storage.hasClassMetadata(Foo, key)).toBe(false);
    expect(storage.getOwnMembers(Foo)).toEqual([]);
  });

  it('does not leak metadata across unrelated MetadataStorage instances', () => {
    const storageA = new MetadataStorage();
    const storageB = new MetadataStorage();
    class Foo {}

    storageA.setClassMetadata(Foo, key, 'only-in-a');
    expect(storageB.getClassMetadata(Foo, key)).toBeUndefined();
  });
});
