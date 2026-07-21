/**
 * Base class for all internal framework errors thrown by `fastify-decorators-routing`.
 *
 * This is distinct from `src/exceptions`, which models HTTP-facing exceptions raised inside
 * route handlers. `FrameworkError` and its subclasses represent programmer/configuration
 * mistakes discovered while building the route table (bad decorator usage, missing metadata,
 * misconfigured providers, etc.) — they are thrown at boot time, not during request handling.
 */
export abstract class FrameworkError extends Error {
  /**
   * A stable, machine-readable identifier for this error class (e.g. `'METADATA_NOT_FOUND'`).
   * Useful for programmatic handling and for grouping errors in logs/telemetry.
   */
  public abstract readonly code: string;

  public constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
