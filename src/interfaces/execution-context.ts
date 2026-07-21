import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';

/**
 * Everything a guard (Phase 11) or interceptor (Phase 12) needs to know about the request it's
 * running for: the raw Fastify request/reply, and which controller method is about to handle
 * it. Shared between both subsystems rather than each defining its own, since it's the same
 * concept in both places — "what is currently being executed."
 */
export interface ExecutionContext {
  readonly request: FastifyRequest;
  readonly reply: FastifyReply;
  readonly controller: AnyConstructor;
  readonly handlerName: MemberKey;
}
