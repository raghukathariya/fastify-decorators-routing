import { describe, expect, it } from 'vitest';
import { MetadataRegistry, globalMetadataRegistry } from './metadata-registry.js';

describe('MetadataRegistry', () => {
  it('creates a unique metadata key via the static factory', () => {
    const keyA = MetadataRegistry.createKey<string>('test:a');
    const keyB = MetadataRegistry.createKey<string>('test:a');

    expect(keyA).not.toBe(keyB);
    expect(typeof keyA).toBe('symbol');
  });

  it('wires its own reader/writer to its own storage when constructed standalone', () => {
    const registry = new MetadataRegistry();
    const key = MetadataRegistry.createKey<string>('test:value');
    class Foo {}

    registry.writer.setClassMetadata(Foo, key, 'value');
    expect(registry.reader.getClassMetadata(Foo, key)).toBe('value');
  });

  it("keeps two independent registries from seeing each other's metadata", () => {
    const registryA = new MetadataRegistry();
    const registryB = new MetadataRegistry();
    const key = MetadataRegistry.createKey<string>('test:value');
    class Foo {}

    registryA.writer.setClassMetadata(Foo, key, 'only-in-a');
    expect(registryB.reader.getClassMetadata(Foo, key)).toBeUndefined();
  });

  it('exposes a process-wide default instance', () => {
    expect(globalMetadataRegistry).toBeInstanceOf(MetadataRegistry);
  });
});
