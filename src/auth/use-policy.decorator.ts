import type { GuardFn } from '../guards/guard.types.js';
import { UseGuard } from '../guards/use-guard.decorator.js';
import { ForbiddenException, UnauthorizedException } from '../exceptions/http-exceptions.js';
import type { ExecutionContext } from '../interfaces/execution-context.js';
import { getRequestUser } from './get-request-user.js';

/**
 * An authorization policy: given the authenticated user (already unpacked from `request.user`
 * for convenience) and the full execution context, decides whether the request may proceed.
 * Unlike a plain `@UseGuard` function, a policy never has to re-read/re-check `request.user`
 * itself — `@UsePolicy` already guarantees one exists before calling it.
 */
export type PolicyFn = (user: unknown, context: ExecutionContext) => boolean | Promise<boolean>;

/**
 * Requires `request.user` to exist (`401 Unauthorized` otherwise) and `policy` to approve it
 * (`403 Forbidden` otherwise) — for authorization rules that don't reduce to a simple
 * roles/permissions membership check (see `@Roles`/`@Permissions` for that case), e.g. "the
 * user owns this resource" or "the user's org matches the requested org".
 *
 * Sugar over `@UseGuard`, exactly like `@Authenticated`/`@Roles`/`@Permissions`.
 *
 * ```ts
 * class PostController {
 *   @Delete('/:id')
 *   @UsePolicy((user, ctx) => (user as { id: string }).id === getOwnerId(ctx.request))
 *   deletePost(@Param('id') id: string) { ... }
 * }
 * ```
 */
export function UsePolicy(policy: PolicyFn): ClassDecorator & MethodDecorator {
  const guard: GuardFn = async (context) => {
    const user = getRequestUser(context.request);
    if (user === undefined || user === null) {
      throw new UnauthorizedException();
    }
    const allowed = await policy(user, context);
    if (!allowed) {
      throw new ForbiddenException();
    }
    return true;
  };
  return UseGuard(guard);
}
