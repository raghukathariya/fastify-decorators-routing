import type { Container } from '../container/container.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import type { CanActivate, Guard, GuardClass } from './guard.types.js';

function isGuardClass(guard: Guard): guard is GuardClass {
  return (
    typeof guard === 'function' &&
    typeof (guard.prototype as Partial<CanActivate> | undefined)?.canActivate === 'function'
  );
}

function isCanActivateInstance(guard: Guard): guard is CanActivate {
  return (
    typeof guard === 'object' &&
    guard !== null &&
    typeof (guard as Partial<CanActivate>).canActivate === 'function'
  );
}

/**
 * Runs one guard and returns whether it allows the request through. A guard class is resolved
 * from `container` (auto-registered first if the caller never registered it themselves) —
 * resolved fresh through `Container.resolve` every call, so a `'singleton'`-scoped guard is
 * cheaply reused across requests and a `'transient'`/`'scoped'` one gets correct per-request
 * semantics, exactly like controller resolution.
 */
export async function executeGuard(
  guard: Guard,
  context: ExecutionContext,
  container: Container,
): Promise<boolean> {
  if (isGuardClass(guard)) {
    container.ensureRegistered(guard);
    const instance = container.resolve(guard);
    return instance.canActivate(context);
  }
  if (isCanActivateInstance(guard)) {
    return guard.canActivate(context);
  }
  return guard(context);
}

/**
 * Runs every guard in order, short-circuiting on the first rejection — matching the "all guards
 * must pass" (AND) semantics `@UseGuard`'s "multiple guards" support implies. A guard that
 * throws propagates immediately (uncaught, the same as a handler error) rather than being
 * treated as a rejection; only an explicit `false` return rejects the request.
 */
export async function runGuards(
  guards: readonly Guard[],
  context: ExecutionContext,
  container: Container,
): Promise<boolean> {
  for (const guard of guards) {
    const allowed = await executeGuard(guard, context, container);
    if (!allowed) return false;
  }
  return true;
}
