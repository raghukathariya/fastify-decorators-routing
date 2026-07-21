import { describe, expect, it } from 'vitest';
import { createMetadataKey } from './metadata-key.js';
import { MetadataReader } from './metadata-reader.js';
import { MetadataStorage } from './metadata-storage.js';

class Parent {}
class Child extends Parent {}

describe('MetadataReader', () => {
  const key = createMetadataKey<string>('test:value');

  it('reads own class metadata when inherit is false', () => {
    const storage = new MetadataStorage();
    const reader = new MetadataReader(storage);
    storage.setClassMetadata(Parent, key, 'parent-value');

    expect(reader.getClassMetadata(Child, key, { inherit: false })).toBeUndefined();
    expect(reader.getClassMetadata(Parent, key, { inherit: false })).toBe('parent-value');
  });

  it('resolves inherited class metadata by default', () => {
    const storage = new MetadataStorage();
    const reader = new MetadataReader(storage);
    storage.setClassMetadata(Parent, key, 'parent-value');

    expect(reader.getClassMetadata(Child, key)).toBe('parent-value');
  });

  it('caches the resolved inherited value across repeated reads', () => {
    const storage = new MetadataStorage();
    const reader = new MetadataReader(storage);
    storage.setClassMetadata(Parent, key, 'first-read');

    expect(reader.getClassMetadata(Child, key)).toBe('first-read');

    // Mutate storage directly (bypassing the writer, which would invalidate the cache) to prove
    // the reader is serving a cached value rather than re-resolving from storage.
    storage.setClassMetadata(Parent, key, 'second-read');
    expect(reader.getClassMetadata(Child, key)).toBe('first-read');
  });

  it('re-resolves after invalidateClass is called', () => {
    const storage = new MetadataStorage();
    const reader = new MetadataReader(storage);
    storage.setClassMetadata(Parent, key, 'first-read');
    expect(reader.getClassMetadata(Child, key)).toBe('first-read');

    storage.setClassMetadata(Parent, key, 'second-read');
    reader.invalidateClass(Child);

    expect(reader.getClassMetadata(Child, key)).toBe('second-read');
  });

  it('resolves and caches inherited member metadata', () => {
    const storage = new MetadataStorage();
    const reader = new MetadataReader(storage);
    storage.setMemberMetadata(Parent.prototype, 'handle', key, 'member-value');

    expect(reader.getMemberMetadata(Child.prototype, 'handle', key)).toBe('member-value');

    storage.setMemberMetadata(Parent.prototype, 'handle', key, 'changed');
    expect(reader.getMemberMetadata(Child.prototype, 'handle', key)).toBe('member-value');

    reader.invalidateMember(Child.prototype, 'handle');
    expect(reader.getMemberMetadata(Child.prototype, 'handle', key)).toBe('changed');
  });

  it('invalidateMember without a member key clears every cached member for that prototype', () => {
    const storage = new MetadataStorage();
    const reader = new MetadataReader(storage);
    storage.setMemberMetadata(Child.prototype, 'handle', key, 'value-1');
    reader.getMemberMetadata(Child.prototype, 'handle', key);

    storage.setMemberMetadata(Child.prototype, 'handle', key, 'value-2');
    reader.invalidateMember(Child.prototype);

    expect(reader.getMemberMetadata(Child.prototype, 'handle', key)).toBe('value-2');
  });

  it('lists own members via getOwnMembers', () => {
    const storage = new MetadataStorage();
    const reader = new MetadataReader(storage);
    storage.setMemberMetadata(Child.prototype, 'handle', key, 'value');

    expect(reader.getOwnMembers(Child.prototype)).toEqual(['handle']);
  });
});
