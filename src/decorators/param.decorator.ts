import { DecoratorError } from '../errors/decorator.error.js';
import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { MemberKey } from '../types/constructor.type.js';
import { withoutUndefinedValues } from '../utils/object.util.js';
import type {
  KeyedParamOptions,
  ParamDefinition,
  ParamExtractorType,
  ParamOptions,
} from './param.types.js';

/**
 * Member-level: every `@Body`/`@Query`/.../`@Session` parameter declared on one method, keyed by
 * parameter index. Read by the Fastify plugin (Phase 9) to know how to build each handler
 * argument from the incoming request.
 */
export const PARAM_DEFINITIONS_METADATA_KEY = createMetadataKey<Record<number, ParamDefinition>>(
  'decorators:param-definitions',
);

function assertMethodParameter(
  decoratorName: string,
  propertyKey: MemberKey | undefined,
): asserts propertyKey is MemberKey {
  if (propertyKey === undefined) {
    throw DecoratorError.invalidTarget(
      decoratorName,
      'can only be applied to a controller method parameter, not a constructor parameter.',
    );
  }
}

function defineParam(
  target: object,
  propertyKey: MemberKey,
  parameterIndex: number,
  definition: ParamDefinition,
): void {
  const existing =
    globalMetadataRegistry.reader.getMemberMetadata(
      target,
      propertyKey,
      PARAM_DEFINITIONS_METADATA_KEY,
      { inherit: false },
    ) ?? {};
  globalMetadataRegistry.writer.setMemberMetadata(
    target,
    propertyKey,
    PARAM_DEFINITIONS_METADATA_KEY,
    { ...existing, [parameterIndex]: definition },
  );
}

function normalizeKeyedArgs(
  keyOrOptions: string | KeyedParamOptions | undefined,
  maybeOptions: KeyedParamOptions | undefined,
): KeyedParamOptions {
  if (typeof keyOrOptions === 'string') {
    return { ...maybeOptions, key: keyOrOptions };
  }
  return keyOrOptions ?? {};
}

/**
 * Creates a decorator for a parameter that can extract either the whole source object (no
 * argument) or a single key from it (`@Body('email')`).
 */
function createKeyedParamDecorator(type: ParamExtractorType, decoratorName: string) {
  return function keyedParamDecorator(
    keyOrOptions?: string | KeyedParamOptions,
    maybeOptions?: KeyedParamOptions,
  ): ParameterDecorator {
    const options = normalizeKeyedArgs(keyOrOptions, maybeOptions);
    return (target, propertyKey, parameterIndex) => {
      assertMethodParameter(decoratorName, propertyKey);
      const definition: ParamDefinition = {
        index: parameterIndex,
        type,
        ...withoutUndefinedValues({
          key: options.key,
          transform: options.transform,
          validate: options.validate,
        }),
      };
      defineParam(target, propertyKey, parameterIndex, definition);
    };
  };
}

/**
 * Creates a decorator for a parameter that always extracts one specific, whole value (no key
 * concept) — `@Req()`, `@Res()`, `@Ip()`, `@Hostname()`.
 */
function createSimpleParamDecorator(type: ParamExtractorType, decoratorName: string) {
  return function simpleParamDecorator(options: ParamOptions = {}): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
      assertMethodParameter(decoratorName, propertyKey);
      const definition: ParamDefinition = {
        index: parameterIndex,
        type,
        ...withoutUndefinedValues({ transform: options.transform }),
      };
      defineParam(target, propertyKey, parameterIndex, definition);
    };
  };
}

/** Injects the parsed request body, or a single key from it (`@Body('email')`). */
export const Body = createKeyedParamDecorator('body', 'Body');
/** Injects the parsed query string, or a single key from it (`@Query('page')`). */
export const Query = createKeyedParamDecorator('query', 'Query');
/** Injects the route parameters, or a single one (`@Param('id')`). */
export const Param = createKeyedParamDecorator('param', 'Param');
/** Injects the request headers, or a single header (`@Headers('authorization')`). */
export const Headers = createKeyedParamDecorator('headers', 'Headers');
/**
 * Injects the request's cookies, or a single cookie (`@Cookies('session_id')`). Requires
 * `@fastify/cookie` to be registered — without it, `request.cookies` is never populated and this
 * always injects `undefined`.
 */
export const Cookies = createKeyedParamDecorator('cookies', 'Cookies');
/**
 * Injects the request's session, or a single session key (`@Session('userId')`). Requires a
 * session plugin such as `@fastify/session` to be registered — without it, `request.session` is
 * never populated and this always injects `undefined`.
 */
export const Session = createKeyedParamDecorator('session', 'Session');

/** Injects the full Fastify `FastifyRequest` object. */
export const Req = createSimpleParamDecorator('req', 'Req');
/** Injects the full Fastify `FastifyReply` object. */
export const Res = createSimpleParamDecorator('res', 'Res');
/** Injects the client's IP address (`request.ip`). */
export const Ip = createSimpleParamDecorator('ip', 'Ip');
/** Injects the request's hostname (`request.hostname`). */
export const Hostname = createSimpleParamDecorator('hostname', 'Hostname');

/** Every `@Body`/`@Query`/.../`@Session` parameter declared on `(prototype, member)`, ordered by
 *  parameter index, own or inherited. */
export function getParamDefinitions(
  prototype: object,
  member: MemberKey,
): readonly ParamDefinition[] {
  const record =
    globalMetadataRegistry.reader.getMemberMetadata(
      prototype,
      member,
      PARAM_DEFINITIONS_METADATA_KEY,
    ) ?? {};
  return Object.values(record).sort((a, b) => a.index - b.index);
}
