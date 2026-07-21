import type { ExecutionContext } from '../interfaces/execution-context.js';
import type { Interceptor, NextFn } from './interceptor.types.js';

/**
 * Logs a route handler's entry, successful exit, and any thrown error, using the request's own
 * Fastify/Pino logger (`request.log`) rather than a bundled logging dependency.
 */
export class LoggingInterceptor implements Interceptor {
  public async intercept(context: ExecutionContext, next: NextFn): Promise<unknown> {
    const label = `${context.controller.name}.${String(context.handlerName)}`;
    context.request.log.info(`[${label}] →`);

    try {
      const result = await next();
      context.request.log.info(`[${label}] ← ok`);
      return result;
    } catch (error) {
      context.request.log.error(
        `[${label}] ← error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
