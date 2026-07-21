import { describe, expect, it } from 'vitest';
import { FrameworkError } from './framework.error.js';
import { ScanError } from './scan.error.js';

describe('ScanError', () => {
  it('is a FrameworkError with a stable error code', () => {
    const error = new ScanError('generic failure');
    expect(error).toBeInstanceOf(FrameworkError);
    expect(error.code).toBe('SCAN_ERROR');
  });

  it('notAController names the offending class', () => {
    class MyService {}
    expect(ScanError.notAController(MyService).message).toContain('MyService');
  });

  it('importFailed includes the file path and preserves the cause', () => {
    const cause = new Error('boom');
    const error = ScanError.importFailed('/tmp/broken.js', cause);
    expect(error.message).toContain('/tmp/broken.js');
    expect(error.cause).toBe(cause);
  });
});
