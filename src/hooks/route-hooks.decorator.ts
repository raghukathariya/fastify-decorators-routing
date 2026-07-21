import { createMetadataKey } from '../metadata/metadata-key.js';
import type { MetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { MemberKey } from '../types/constructor.type.js';
import type {
  OnRequestHook,
  OnSendHook,
  PreHandlerHook,
  PreParsingHook,
  PreValidationHook,
} from './hook.types.js';

const ON_REQUEST_HOOKS_METADATA_KEY = createMetadataKey<OnRequestHook[]>('hooks:onRequest');
const PRE_PARSING_HOOKS_METADATA_KEY = createMetadataKey<PreParsingHook[]>('hooks:preParsing');
const PRE_VALIDATION_HOOKS_METADATA_KEY =
  createMetadataKey<PreValidationHook[]>('hooks:preValidation');
const PRE_HANDLER_HOOKS_METADATA_KEY = createMetadataKey<PreHandlerHook[]>('hooks:preHandler');
const ON_SEND_HOOKS_METADATA_KEY = createMetadataKey<OnSendHook[]>('hooks:onSend');

/**
 * Builds a method decorator that appends one or more hooks of type `T` to `metadataKey`,
 * composing across repeated applications and inheritance the same way `@Use`/`@UseGuard` do
 * (`'merge-array'`). Unlike those, these are method-only — a lifecycle hook decorator applying
 * to "every route in a controller" is already what `hooks.preHandler`-style raw Fastify
 * `onRequest`/... hooks registered once on the controller's own encapsulation context are for
 * (see `registerControllerRoutes`), so there's no controller-level form to keep this decorator
 * from having two different ways to do the same thing.
 */
function createHookDecorator<T>(metadataKey: MetadataKey<T[]>) {
  return (...hooks: readonly T[]): MethodDecorator => {
    return (target: object, propertyKey: string | symbol) => {
      for (const hook of hooks) {
        globalMetadataRegistry.writer.appendMemberMetadata(target, propertyKey, metadataKey, hook);
      }
    };
  };
}

function getHooks<T>(
  metadataKey: MetadataKey<T[]>,
  prototype: object,
  member: MemberKey,
): readonly T[] {
  return (
    globalMetadataRegistry.reader.getMemberMetadata(prototype, member, metadataKey, {
      strategy: 'merge-array',
    }) ?? []
  );
}

/** Registers a Fastify `onRequest` hook for this route, in addition to any set via the
 *  `{ hooks: { onRequest } }` route option — see `buildFastifyRouteOptions` for the combined
 *  order. */
export const OnRequest = createHookDecorator<OnRequestHook>(ON_REQUEST_HOOKS_METADATA_KEY);
/** Registers a Fastify `preParsing` hook for this route. */
export const PreParsing = createHookDecorator<PreParsingHook>(PRE_PARSING_HOOKS_METADATA_KEY);
/** Registers a Fastify `preValidation` hook for this route. */
export const PreValidation = createHookDecorator<PreValidationHook>(
  PRE_VALIDATION_HOOKS_METADATA_KEY,
);
/** Registers a Fastify `preHandler` hook for this route — runs after `@UseGuard`/`@Use`
 *  middleware/`{ middleware }`, immediately before the handler itself. `@Before` is an alias. */
export const PreHandler = createHookDecorator<PreHandlerHook>(PRE_HANDLER_HOOKS_METADATA_KEY);
/** Registers a Fastify `onSend` hook for this route, run just before the response is written —
 *  after response serialization (`@SerializeWith`). `@After` is an alias. */
export const OnSend = createHookDecorator<OnSendHook>(ON_SEND_HOOKS_METADATA_KEY);

/** Alias for `@PreHandler` — reads better at a call site like `@Before(logAccess)`. */
export const Before = PreHandler;
/** Alias for `@OnSend` — reads better at a call site like `@After(addResponseTimeHeader)`. */
export const After = OnSend;

/** Every `@OnRequest` hook on `(prototype, member)`, including inherited, root-first. */
export function getRouteOnRequestHooks(
  prototype: object,
  member: MemberKey,
): readonly OnRequestHook[] {
  return getHooks(ON_REQUEST_HOOKS_METADATA_KEY, prototype, member);
}

/** Every `@PreParsing` hook on `(prototype, member)`, including inherited, root-first. */
export function getRoutePreParsingHooks(
  prototype: object,
  member: MemberKey,
): readonly PreParsingHook[] {
  return getHooks(PRE_PARSING_HOOKS_METADATA_KEY, prototype, member);
}

/** Every `@PreValidation` hook on `(prototype, member)`, including inherited, root-first. */
export function getRoutePreValidationHooks(
  prototype: object,
  member: MemberKey,
): readonly PreValidationHook[] {
  return getHooks(PRE_VALIDATION_HOOKS_METADATA_KEY, prototype, member);
}

/** Every `@PreHandler`/`@Before` hook on `(prototype, member)`, including inherited, root-first. */
export function getRoutePreHandlerHooks(
  prototype: object,
  member: MemberKey,
): readonly PreHandlerHook[] {
  return getHooks(PRE_HANDLER_HOOKS_METADATA_KEY, prototype, member);
}

/** Every `@OnSend`/`@After` hook on `(prototype, member)`, including inherited, root-first. */
export function getRouteOnSendHooks(prototype: object, member: MemberKey): readonly OnSendHook[] {
  return getHooks(ON_SEND_HOOKS_METADATA_KEY, prototype, member);
}
