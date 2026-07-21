import type { GuardFn } from '../guards/guard.types.js';
import { UseGuard } from '../guards/use-guard.decorator.js';
import { ForbiddenException, UnauthorizedException } from '../exceptions/http-exceptions.js';
import { getRequestUser } from './get-request-user.js';
import { getUserPermissions } from './user-claims.js';

/**
 * Requires `request.user` to hold at least one of `permissions` (an OR check, matching
 * `@Roles`'s semantics). Throws `401 Unauthorized` with no authenticated user, or `403
 * Forbidden` when none of `user.permissions` match.
 *
 * Sugar over `@UseGuard`, exactly like `@Authenticated`/`@Roles`.
 *
 * ```ts
 * class BillingController {
 *   @Post('/refund')
 *   @Permissions('billing:refund')
 *   refund(@Body() dto: RefundDto) { ... }
 * }
 * ```
 */
export function Permissions(...permissions: readonly string[]): ClassDecorator & MethodDecorator {
  const guard: GuardFn = (context) => {
    const user = getRequestUser(context.request);
    if (user === undefined || user === null) {
      throw new UnauthorizedException();
    }
    const userPermissions = getUserPermissions(user);
    if (!permissions.some((permission) => userPermissions.includes(permission))) {
      throw new ForbiddenException();
    }
    return true;
  };
  return UseGuard(guard);
}
