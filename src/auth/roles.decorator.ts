import type { GuardFn } from '../guards/guard.types.js';
import { UseGuard } from '../guards/use-guard.decorator.js';
import { ForbiddenException, UnauthorizedException } from '../exceptions/http-exceptions.js';
import { getRequestUser } from './get-request-user.js';
import { getUserRoles } from './user-claims.js';

/**
 * Requires `request.user` to hold at least one of `roles` (an OR check — "must have any of
 * these roles", the usual RBAC decorator semantics). Throws `401 Unauthorized` if there is no
 * authenticated user at all, or `403 Forbidden` if there is one but none of its `user.roles`
 * match.
 *
 * Sugar over `@UseGuard`, exactly like `@Authenticated`; composes the same way and implies
 * authentication, so there's no need to also add `@Authenticated()` alongside it.
 *
 * ```ts
 * class AdminController {
 *   @Delete('/:id')
 *   @Roles('admin', 'moderator')
 *   deleteUser(@Param('id') id: string) { ... }
 * }
 * ```
 */
export function Roles(...roles: readonly string[]): ClassDecorator & MethodDecorator {
  const guard: GuardFn = (context) => {
    const user = getRequestUser(context.request);
    if (user === undefined || user === null) {
      throw new UnauthorizedException();
    }
    const userRoles = getUserRoles(user);
    if (!roles.some((role) => userRoles.includes(role))) {
      throw new ForbiddenException();
    }
    return true;
  };
  return UseGuard(guard);
}
