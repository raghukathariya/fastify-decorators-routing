import { describe, expect, it } from 'vitest';
import { createMetadataKey } from './metadata-key.js';
import { MetadataReader } from './metadata-reader.js';
import { MetadataStorage } from './metadata-storage.js';
import { MetadataWriter } from './metadata-writer.js';

describe('MetadataWriter', () => {
  const key = createMetadataKey<string>('test:value');
  const arrayKey = createMetadataKey<string[]>('test:array');

  function createHarness() {
    const storage = new MetadataStorage();
    const reader = new MetadataReader(storage);
    const writer = new MetadataWriter(storage, reader);
    return { storage, reader, writer };
  }

  it('writes class-level metadata visible through the storage', () => {
    const { storage, writer } = createHarness();
    class Foo {}

    writer.setClassMetadata(Foo, key, 'value');
    expect(storage.getClassMetadata(Foo, key)).toBe('value');
  });

  it("invalidates the reader's cache on write, so subsequent reads see the new value", () => {
    const { reader, writer } = createHarness();
    class Foo {}

    writer.setClassMetadata(Foo, key, 'first');
    expect(reader.getClassMetadata(Foo, key)).toBe('first');

    writer.setClassMetadata(Foo, key, 'second');
    expect(reader.getClassMetadata(Foo, key)).toBe('second');
  });

  it('appendClassMetadata accumulates onto an array, creating it on first use', () => {
    const { storage, writer } = createHarness();
    class Foo {}

    writer.appendClassMetadata(Foo, arrayKey, 'first');
    writer.appendClassMetadata(Foo, arrayKey, 'second');

    expect(storage.getClassMetadata(Foo, arrayKey)).toEqual(['first', 'second']);
  });

  it('writes and invalidates member-level metadata', () => {
    const { reader, writer } = createHarness();
    const prototype = {};

    writer.setMemberMetadata(prototype, 'handle', key, 'first');
    expect(reader.getMemberMetadata(prototype, 'handle', key)).toBe('first');

    writer.setMemberMetadata(prototype, 'handle', key, 'second');
    expect(reader.getMemberMetadata(prototype, 'handle', key)).toBe('second');
  });

  it('appendMemberMetadata accumulates onto an array per member', () => {
    const { storage, writer } = createHarness();
    const prototype = {};

    writer.appendMemberMetadata(prototype, 'handle', arrayKey, 'a');
    writer.appendMemberMetadata(prototype, 'handle', arrayKey, 'b');

    expect(storage.getMemberMetadata(prototype, 'handle', arrayKey)).toEqual(['a', 'b']);
  });
});
