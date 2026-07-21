import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AnyConstructor } from '../types/constructor.type.js';
import { validateAndTransform } from '../validation/validation-pipe.js';
import type { UploadedFile } from './multipart-file.type.js';
import type { ParamDefinition, ParamExtractorType } from './param.types.js';

function pluckKey(source: unknown, key: string | undefined): unknown {
  if (key === undefined) return source;
  if (typeof source !== 'object' || source === null) return undefined;
  return (source as Record<string, unknown>)[key];
}

/** Reads an optional Fastify-plugin-populated property (`cookies`, `session`) without requiring
 *  that plugin's type augmentation to be present at compile time. */
function readOptionalRequestProperty(request: FastifyRequest, property: string): unknown {
  return (request as unknown as Record<string, unknown>)[property];
}

function extractRawValue(
  definition: ParamDefinition,
  request: FastifyRequest,
  reply: FastifyReply,
): unknown {
  switch (definition.type) {
    case 'body':
      return pluckKey(request.body, definition.key);
    case 'query':
      return pluckKey(request.query, definition.key);
    case 'param':
      return pluckKey(request.params, definition.key);
    case 'headers':
      return pluckKey(request.headers, definition.key);
    case 'cookies':
      return pluckKey(readOptionalRequestProperty(request, 'cookies'), definition.key);
    case 'session':
      return pluckKey(readOptionalRequestProperty(request, 'session'), definition.key);
    case 'ip':
      return request.ip;
    case 'hostname':
      return request.hostname;
    case 'req':
      return request;
    case 'res':
      return reply;
  }
}

/**
 * Reads every uploaded file off `request.files()` — `@fastify/multipart`'s own async-iterable
 * stream API — filtering to `fieldName` when given. Resolves to `[]` (not an error) when
 * `@fastify/multipart` isn't registered at all, the same graceful degradation
 * `readOptionalRequestProperty` gives `@Cookies`/`@Session`; `request.files` simply doesn't exist
 * on the request in that case.
 *
 * Buffers every file it sees (`await file.toBuffer()`), matching field or not, before continuing
 * to the next one — `@fastify/multipart`'s own docs show consuming each part's stream inside the
 * iteration loop for exactly this reason: asking the iterator for the next part before the
 * current one's stream is drained deadlocks waiting for backpressure that never clears. This is
 * safe for a caller's own `file.toBuffer()` call afterward too — `@fastify/multipart` caches the
 * buffer on the file object, so that second call returns instantly rather than reading twice.
 */
async function extractMultipartFiles(
  request: FastifyRequest,
  fieldName: string | undefined,
): Promise<readonly UploadedFile[]> {
  const filesFn = readOptionalRequestProperty(request, 'files');
  if (typeof filesFn !== 'function') return [];

  const iterator = (filesFn as () => AsyncIterable<UploadedFile>).call(request);

  const results: UploadedFile[] = [];
  for await (const file of iterator) {
    await file.toBuffer();
    if (fieldName === undefined || file.fieldname === fieldName) {
      results.push(file);
    }
  }
  return results;
}

/**
 * Coerces a raw, string-valued extraction (query/route params and headers all arrive as strings)
 * toward the parameter's declared TypeScript type, when that coercion is unambiguous:
 * `Number`-typed parameters get `Number(value)` (only if the result isn't `NaN`), `Boolean`-typed
 * parameters recognize `'true'`/`'false'`. Every other case — `String`, `Object`, arrays, custom
 * classes, or a non-string raw value — passes through untouched; deeper transformation is the
 * validation pipe's (below) or an explicit `schema` on the route's job.
 */
export function coerceToDesignType(
  value: unknown,
  designType: AnyConstructor | undefined,
): unknown {
  if (typeof value !== 'string' || designType === undefined) return value;

  if (designType === Number) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  if (designType === Boolean) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }

  return value;
}

/**
 * Extraction types that can plausibly hold a DTO: whole request/response objects (`req`/`res`)
 * and single scalars (`ip`/`hostname`) never are, so automatic validation never runs for them
 * even if a parameter happens to be typed as a class (there is nothing meaningful to validate).
 */
const VALIDATABLE_TYPES: ReadonlySet<ParamExtractorType> = new Set([
  'body',
  'query',
  'param',
  'headers',
  'cookies',
  'session',
]);

/**
 * Resolves the value to inject for one `@Body`/`@Query`/.../`@UploadedFile` parameter:
 *  1. `@UploadedFile`/`@UploadedFiles` take their own path entirely — `extractMultipartFiles`,
 *     skipping steps 2-3 below (there is nothing to coerce or validate on a file).
 *  2. Every other type extracts its raw value from `request`/`reply`.
 *  3. Coerces it toward `designType` when unambiguous (`coerceToDesignType`).
 *  4. If `designType` is a plausible DTO class and the parameter didn't opt out
 *     (`{ validate: false }`), transforms and validates it via `class-transformer`/
 *     `class-validator` (`validateAndTransform`) — throwing `ValidationException` on failure.
 *  5. Applies the parameter's own `transform` (if any), which always sees the fully
 *     validated/transformed value, not the raw one.
 */
export async function extractParamValue(
  definition: ParamDefinition,
  request: FastifyRequest,
  reply: FastifyReply,
  designType?: AnyConstructor,
): Promise<unknown> {
  let value: unknown;

  if (definition.type === 'file' || definition.type === 'files') {
    // Multipart files come from an async stream API, not a plain object `pluckKey` can read a
    // key off — and they're never a validation/coercion target, so this bypasses
    // `extractRawValue`/`coerceToDesignType`/`validateAndTransform` entirely.
    const files = await extractMultipartFiles(request, definition.key);
    value = definition.type === 'file' ? files[0] : files;
  } else {
    const raw = extractRawValue(definition, request, reply);
    value = coerceToDesignType(raw, designType);

    if (definition.validate !== false && VALIDATABLE_TYPES.has(definition.type)) {
      value = await validateAndTransform(designType, value);
    }
  }

  if (definition.transform) {
    return definition.transform(value, {
      type: definition.type,
      ...(definition.key !== undefined ? { key: definition.key } : {}),
      ...(designType !== undefined ? { designType } : {}),
    });
  }

  return value;
}
