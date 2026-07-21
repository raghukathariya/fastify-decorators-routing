import { describe, expect, it } from 'vitest';
import { FrameworkError } from './framework.error.js';
import { MetadataError } from './metadata.error.js';

describe('MetadataError', () => {
  it('is a FrameworkError with a stable error code', () => {
    const error = new MetadataError('generic failure');
    expect(error).toBeInstanceOf(FrameworkError);
    expect(error.code).toBe('METADATA_ERROR');
  });

  it('reflectMetadataNotLoaded produces an actionable message', () => {
    const error = MetadataError.reflectMetadataNotLoaded();
    expect(error).toBeInstanceOf(MetadataError);
    expect(error.message).toContain("import 'reflect-metadata'");
  });

  it('invalidTarget includes the offending value in the message', () => {
    const error = MetadataError.invalidTarget(null);
    expect(error.message).toContain('null');
  });
});
