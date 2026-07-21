import { FrameworkError } from './framework.error.js';

/**
 * Thrown when the metadata engine encounters a configuration or usage error: a required
 * `reflect-metadata` polyfill is missing, a metadata key is used against an invalid target, or
 * decorator metadata is otherwise malformed.
 */
export class MetadataError extends FrameworkError {
  public readonly code = 'METADATA_ERROR';

  public static reflectMetadataNotLoaded(): MetadataError {
    return new MetadataError(
      "Reflect.getMetadata is not available. 'fastify-decorators-routing' relies on the " +
        "'reflect-metadata' polyfill to read TypeScript's compiler-emitted type metadata. " +
        "Add `import 'reflect-metadata';` once, at the very top of your application's entry " +
        'point, before importing any decorated class.',
    );
  }

  public static invalidTarget(target: unknown): MetadataError {
    return new MetadataError(
      `Expected a class constructor or prototype as a metadata target, received: ${String(target)}`,
    );
  }
}
