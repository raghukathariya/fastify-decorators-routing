import type { Constructor } from '../types/constructor.type.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';

/** Implemented by a class-based guard. Instances are resolved through the DI container, so a
 *  guard can have its own injected dependencies the same way a controller can. */
export interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/** A guard expressed as a plain function, run directly with no DI involved. */
export type GuardFn = (context: ExecutionContext) => boolean | Promise<boolean>;

/** A guard class — resolved via the DI container at request time (auto-registered if needed). */
export type GuardClass = Constructor<CanActivate>;

/**
 * Anything `@UseGuard()` accepts: a plain function, an already-constructed `CanActivate`
 * instance, or a `CanActivate` class to be DI-resolved.
 */
export type Guard = GuardFn | CanActivate | GuardClass;
