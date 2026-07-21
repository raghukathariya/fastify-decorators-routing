import { FrameworkError } from './framework.error.js';

/**
 * Thrown by the controller scanner (`src/scanner`) for discovery-time failures: a glob pattern
 * resolved to a file that failed to import, or a class explicitly listed for registration turns
 * out not to be a controller.
 */
export class ScanError extends FrameworkError {
  public readonly code = 'SCAN_ERROR';

  public static notAController(target: unknown): ScanError {
    const name = typeof target === 'function' ? target.name : String(target);
    return new ScanError(
      `'${name}' was explicitly listed as a controller but has no @Controller() decorator. ` +
        'Only decorate and list classes that are actual controllers.',
    );
  }

  public static importFailed(filePath: string, cause: unknown): ScanError {
    return new ScanError(`Failed to import controller module '${filePath}': ${String(cause)}`, {
      cause,
    });
  }
}
