import type {
  onRequestHookHandler,
  onSendHookHandler,
  preHandlerHookHandler,
  preParsingHookHandler,
  preValidationHookHandler,
} from 'fastify';

/**
 * The five Fastify per-route lifecycle hook kinds this package's method decorators (`@OnRequest`,
 * `@PreParsing`, `@PreValidation`, `@PreHandler`/`@Before`, `@OnSend`/`@After`) map directly onto
 * — reusing Fastify's own handler types rather than re-declaring a parallel hook system, the same
 * approach `RouteHooksOption` (the `{ hooks: {...} }` route option) already takes.
 */
export type OnRequestHook = onRequestHookHandler;
export type PreParsingHook = preParsingHookHandler;
export type PreValidationHook = preValidationHookHandler;
export type PreHandlerHook = preHandlerHookHandler;
export type OnSendHook = onSendHookHandler;
