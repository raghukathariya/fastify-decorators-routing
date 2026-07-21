import { createMetadataKey, type MetadataKey } from './metadata-key.js';
import { DesignTypeReader } from './design-type-reader.js';
import { MetadataReader, globalMetadataReader } from './metadata-reader.js';
import { MetadataStorage, globalMetadataStorage } from './metadata-storage.js';
import { MetadataWriter, globalMetadataWriter } from './metadata-writer.js';

/**
 * Single entry point into the metadata engine, bundling the read API, the write API, the
 * design-time type reader, and key creation.
 *
 * Decorator implementations (Phases 5–21) depend on `MetadataRegistry` rather than importing
 * `MetadataReader`/`MetadataWriter`/`MetadataStorage` individually — one dependency to inject,
 * one thing to substitute in tests.
 */
export class MetadataRegistry {
  public constructor(
    public readonly storage: MetadataStorage = new MetadataStorage(),
    public readonly reader: MetadataReader = new MetadataReader(storage),
    public readonly writer: MetadataWriter = new MetadataWriter(storage, reader),
    public readonly designTypes: DesignTypeReader = new DesignTypeReader(),
  ) {}

  /** Creates a new, globally unique metadata key. See `createMetadataKey`. */
  public static createKey<T>(description: string): MetadataKey<T> {
    return createMetadataKey<T>(description);
  }
}

/**
 * The process-wide default `MetadataRegistry`, backed by the global storage/reader/writer
 * singletons that every built-in decorator uses.
 */
export const globalMetadataRegistry = new MetadataRegistry(
  globalMetadataStorage,
  globalMetadataReader,
  globalMetadataWriter,
);
