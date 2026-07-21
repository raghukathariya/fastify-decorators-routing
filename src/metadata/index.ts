export { createMetadataKey, type MetadataKey } from './metadata-key.js';
export { MetadataStorage, globalMetadataStorage } from './metadata-storage.js';
export { mergeMetadataValues, type MetadataMergeStrategy } from './metadata-merge-strategy.js';
export {
  getConstructorChain,
  getPrototypeChain,
  resolveInheritedClassMetadata,
  resolveInheritedMemberMetadata,
} from './metadata-inheritance.js';
export {
  MetadataReader,
  globalMetadataReader,
  type ReadMetadataOptions,
} from './metadata-reader.js';
export { MetadataWriter, globalMetadataWriter } from './metadata-writer.js';
export { DesignTypeReader, globalDesignTypeReader } from './design-type-reader.js';
export { MetadataRegistry, globalMetadataRegistry } from './metadata-registry.js';
