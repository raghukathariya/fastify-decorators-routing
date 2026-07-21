import type { GuardFn } from '../guards/guard.types.js';
import { UseGuard } from '../guards/use-guard.decorator.js';
import { UnauthorizedException } from '../exceptions/http-exceptions.js';
import { getRequestUser } from './get-request-user.js';

const requireAuthenticatedUser: GuardFn = (context) => {
  const user = getRequestUser(context.request);
  if (user === undefined || user === null) {
    throw new UnauthorizedException();
  }
  return true;
};

/**
 * Requires `request.user` to be set — throwing `401 Unauthorized` otherwise — before the route
 * (or every route in a controller) runs. Populate `request.user` with an authentication plugin
 * (e.g. `@fastify/jwt`'s `request.jwtVerify()` in an `onRequest` hook); this decorator only
 * checks that it happened, not how.
 *
 * Pure sugar over `@UseGuard`: it registers a guard function through the exact same mechanism,
 * so it composes with other guards, inherits the same controller/route dual-decorator behavior,
 * and a rejection flows through the same exception-filter pipeline as any other guard failure.
 *
 * ```ts
 * @Controller('/profile')
 * @Authenticated()
 * class ProfileController {
 *   @Get('/')
 *   getProfile(@Req() request: FastifyRequest) {
 *     return getRequestUser(request);
 *   }
 * }
 * ```
 */
export function Authenticated(): ClassDecorator & MethodDecorator {
  return UseGuard(requireAuthenticatedUser);
}
