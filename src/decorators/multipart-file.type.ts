/**
 * The shape `@UploadedFile`/`@UploadedFiles` inject — a minimal structural subset of
 * `@fastify/multipart`'s own `MultipartFile`, covering exactly what's commonly needed. Declared
 * independently rather than imported from `@fastify/multipart` because this package has no
 * runtime dependency on it (a consumer who never uploads files shouldn't have to install it);
 * `@fastify/multipart`'s real `MultipartFile` is structurally compatible with this type, so
 * nothing is lost by using it directly wherever `@UploadedFile`'s value flows.
 */
export interface UploadedFile {
  readonly fieldname: string;
  readonly filename: string;
  readonly encoding: string;
  readonly mimetype: string;
  readonly file: NodeJS.ReadableStream;
  toBuffer(): Promise<Buffer>;
}
