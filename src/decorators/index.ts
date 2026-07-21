export {
  Controller,
  getControllerOptions,
  isController,
  CONTROLLER_METADATA_KEY,
  type ControllerOptions,
} from './controller.decorator.js';
export { Prefix, getPrefixSegments, PREFIX_METADATA_KEY } from './prefix.decorator.js';
export {
  Version,
  getVersion,
  VERSION_METADATA_KEY,
  type VersionValue,
} from './version.decorator.js';
export { Tag, getTags, TAG_METADATA_KEY } from './tag.decorator.js';
export { Group, getGroup, GROUP_METADATA_KEY } from './group.decorator.js';
export { resolveControllerMetadata, type ControllerMetadata } from './controller-metadata.js';
export {
  All,
  Delete,
  Get,
  Head,
  Options,
  Patch,
  Post,
  Put,
  getRouteDefinition,
  getRouteDefinitions,
  getRouteHandlerNames,
  ROUTE_METADATA_KEY,
  ROUTE_HANDLERS_METADATA_KEY,
} from './http-method.decorator.js';
export type {
  HttpMethod,
  RouteDefinition,
  RouteHooksOption,
  RouteMiddleware,
  RouteOptions,
  RouteResponseOption,
} from './http-method.types.js';
export {
  Body,
  Cookies,
  Headers,
  Hostname,
  Ip,
  Param,
  Query,
  Req,
  Res,
  Session,
  UploadedFile,
  UploadedFiles,
  getParamDefinitions,
  PARAM_DEFINITIONS_METADATA_KEY,
} from './param.decorator.js';
export type {
  KeyedParamOptions,
  ParamDefinition,
  ParamExtractionContext,
  ParamExtractorType,
  ParamOptions,
  ParamTransform,
} from './param.types.js';
export type { UploadedFile as UploadedFileType } from './multipart-file.type.js';
export { coerceToDesignType, extractParamValue } from './param-extraction.js';
