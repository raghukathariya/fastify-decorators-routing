import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { coerceToDesignType, extractParamValue } from './param-extraction.js';
import type { ParamDefinition, ParamExtractionContext } from './param.types.js';

function fakeRequest(overrides: Record<string, unknown> = {}): FastifyRequest {
  return {
    body: { name: 'Ada' },
    query: { page: '2' },
    params: { id: '42' },
    headers: { authorization: 'Bearer token' },
    ip: '127.0.0.1',
    hostname: 'localhost',
    ...overrides,
  } as unknown as FastifyRequest;
}

const fakeReply = {} as unknown as FastifyReply;

describe('coerceToDesignType', () => {
  it('coerces a numeric string to a number when the design type is Number', () => {
    expect(coerceToDesignType('42', Number)).toBe(42);
  });

  it('leaves a non-numeric string unchanged when Number coercion fails', () => {
    expect(coerceToDesignType('not-a-number', Number)).toBe('not-a-number');
  });

  it('coerces "true"/"false" strings to booleans when the design type is Boolean', () => {
    expect(coerceToDesignType('true', Boolean)).toBe(true);
    expect(coerceToDesignType('false', Boolean)).toBe(false);
  });

  it('leaves a non-boolean-like string unchanged when the design type is Boolean', () => {
    expect(coerceToDesignType('maybe', Boolean)).toBe('maybe');
  });

  it('leaves the value unchanged for String, Object, or no design type', () => {
    expect(coerceToDesignType('42', String)).toBe('42');
    expect(coerceToDesignType('42', undefined)).toBe('42');
  });

  it('leaves non-string values unchanged regardless of design type', () => {
    expect(coerceToDesignType(42, Number)).toBe(42);
    expect(coerceToDesignType(null, Number)).toBeNull();
  });
});

describe('extractParamValue: raw extraction per type', () => {
  const param = (type: ParamDefinition['type'], key?: string): ParamDefinition =>
    key !== undefined ? { index: 0, type, key } : { index: 0, type };

  it('extracts the whole body when no key is given', async () => {
    await expect(extractParamValue(param('body'), fakeRequest(), fakeReply)).resolves.toEqual({
      name: 'Ada',
    });
  });

  it('extracts a single body key', async () => {
    await expect(extractParamValue(param('body', 'name'), fakeRequest(), fakeReply)).resolves.toBe(
      'Ada',
    );
  });

  it('extracts the whole query object and a single query key', async () => {
    await expect(extractParamValue(param('query'), fakeRequest(), fakeReply)).resolves.toEqual({
      page: '2',
    });
    await expect(extractParamValue(param('query', 'page'), fakeRequest(), fakeReply)).resolves.toBe(
      '2',
    );
  });

  it('extracts route params by key', async () => {
    await expect(extractParamValue(param('param', 'id'), fakeRequest(), fakeReply)).resolves.toBe(
      '42',
    );
  });

  it('extracts headers by key', async () => {
    await expect(
      extractParamValue(param('headers', 'authorization'), fakeRequest(), fakeReply),
    ).resolves.toBe('Bearer token');
  });

  it('extracts cookies when the cookie plugin has populated request.cookies', async () => {
    const request = fakeRequest({ cookies: { session_id: 'abc' } });
    await expect(
      extractParamValue(param('cookies', 'session_id'), request, fakeReply),
    ).resolves.toBe('abc');
  });

  it('extracts undefined for cookies when no cookie plugin populated request.cookies', async () => {
    await expect(
      extractParamValue(param('cookies', 'session_id'), fakeRequest(), fakeReply),
    ).resolves.toBeUndefined();
  });

  it('extracts session when a session plugin has populated request.session', async () => {
    const request = fakeRequest({ session: { userId: '7' } });
    await expect(extractParamValue(param('session', 'userId'), request, fakeReply)).resolves.toBe(
      '7',
    );
  });

  it('extracts ip and hostname', async () => {
    await expect(extractParamValue(param('ip'), fakeRequest(), fakeReply)).resolves.toBe(
      '127.0.0.1',
    );
    await expect(extractParamValue(param('hostname'), fakeRequest(), fakeReply)).resolves.toBe(
      'localhost',
    );
  });

  it('extracts the request and reply objects themselves', async () => {
    const request = fakeRequest();
    await expect(extractParamValue(param('req'), request, fakeReply)).resolves.toBe(request);
    await expect(extractParamValue(param('res'), request, fakeReply)).resolves.toBe(fakeReply);
  });

  it('returns undefined when plucking a key from a non-object source', async () => {
    const request = fakeRequest({ body: 'raw-text-body' });
    await expect(
      extractParamValue(param('body', 'name'), request, fakeReply),
    ).resolves.toBeUndefined();
  });
});

describe('extractParamValue: design-type coercion applied before extraction is returned', () => {
  it('coerces a query value toward Number', async () => {
    const request = fakeRequest({ query: { page: '2' } });
    await expect(
      extractParamValue({ index: 0, type: 'query', key: 'page' }, request, fakeReply, Number),
    ).resolves.toBe(2);
  });
});

describe('extractParamValue: transform hook', () => {
  it('applies transform after coercion and returns its result', async () => {
    const transform = vi.fn((value: unknown) => `${String(value)}-transformed`);
    const request = fakeRequest({ query: { page: '2' } });

    const result = await extractParamValue(
      { index: 0, type: 'query', key: 'page', transform },
      request,
      fakeReply,
      Number,
    );

    expect(transform).toHaveBeenCalledWith(2, { type: 'query', key: 'page', designType: Number });
    expect(result).toBe('2-transformed');
  });

  it('omits key and designType from the transform context when absent', async () => {
    const transform = vi.fn((value: unknown, context: ParamExtractionContext) => {
      void context;
      return value;
    });
    await extractParamValue({ index: 0, type: 'req', transform }, fakeRequest(), fakeReply);

    const [, context] = transform.mock.calls[0] ?? [undefined, undefined];
    expect(context).toEqual({ type: 'req' });
  });
});

describe('extractParamValue: @UploadedFile / @UploadedFiles', () => {
  function fakeMultipartFile(fieldname: string, filename: string): Record<string, unknown> {
    return {
      fieldname,
      filename,
      encoding: '7bit',
      mimetype: 'text/plain',
      toBuffer: () => Promise.resolve(Buffer.from('')),
    };
  }

  function requestWithFiles(files: readonly Record<string, unknown>[]): FastifyRequest {
    return fakeRequest({
      files: () => ({
        *[Symbol.asyncIterator]() {
          for (const file of files) yield file;
        },
      }),
    });
  }

  it('@UploadedFile resolves to the first file when no field name filter is given', async () => {
    const files = [fakeMultipartFile('avatar', 'a.png'), fakeMultipartFile('banner', 'b.png')];
    const result = await extractParamValue(
      { index: 0, type: 'file' },
      requestWithFiles(files),
      fakeReply,
    );
    expect(result).toBe(files[0]);
  });

  it('@UploadedFile(fieldName) resolves to the first file matching that field', async () => {
    const files = [fakeMultipartFile('avatar', 'a.png'), fakeMultipartFile('banner', 'b.png')];
    const result = await extractParamValue(
      { index: 0, type: 'file', key: 'banner' },
      requestWithFiles(files),
      fakeReply,
    );
    expect(result).toBe(files[1]);
  });

  it('@UploadedFile resolves to undefined when no file matches', async () => {
    const result = await extractParamValue(
      { index: 0, type: 'file', key: 'missing' },
      requestWithFiles([fakeMultipartFile('avatar', 'a.png')]),
      fakeReply,
    );
    expect(result).toBeUndefined();
  });

  it('@UploadedFiles resolves to every file when no field name filter is given', async () => {
    const files = [fakeMultipartFile('a', '1.png'), fakeMultipartFile('a', '2.png')];
    const result = await extractParamValue(
      { index: 0, type: 'files' },
      requestWithFiles(files),
      fakeReply,
    );
    expect(result).toEqual(files);
  });

  it('@UploadedFiles(fieldName) resolves to every file matching that field only', async () => {
    const files = [
      fakeMultipartFile('attachments', '1.png'),
      fakeMultipartFile('avatar', 'a.png'),
      fakeMultipartFile('attachments', '2.png'),
    ];
    const result = await extractParamValue(
      { index: 0, type: 'files', key: 'attachments' },
      requestWithFiles(files),
      fakeReply,
    );
    expect(result).toEqual([files[0], files[2]]);
  });

  it('@UploadedFiles resolves to an empty array when nothing matches', async () => {
    const result = await extractParamValue(
      { index: 0, type: 'files', key: 'missing' },
      requestWithFiles([fakeMultipartFile('avatar', 'a.png')]),
      fakeReply,
    );
    expect(result).toEqual([]);
  });

  it('@UploadedFile resolves to undefined when @fastify/multipart is not registered', async () => {
    const result = await extractParamValue({ index: 0, type: 'file' }, fakeRequest(), fakeReply);
    expect(result).toBeUndefined();
  });

  it('@UploadedFiles resolves to an empty array when @fastify/multipart is not registered', async () => {
    const result = await extractParamValue({ index: 0, type: 'files' }, fakeRequest(), fakeReply);
    expect(result).toEqual([]);
  });

  it('never runs DTO validation against a file value even with a class designType', async () => {
    class SomeDto {}
    const files = [fakeMultipartFile('avatar', 'a.png')];
    const result = await extractParamValue(
      { index: 0, type: 'file' },
      requestWithFiles(files),
      fakeReply,
      SomeDto,
    );
    expect(result).toBe(files[0]);
  });
});
