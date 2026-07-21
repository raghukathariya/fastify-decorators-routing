import type { AnyConstructor } from '../types/constructor.type.js';

export interface ScanOptions {
  /** Already-imported controller classes to register directly — no file I/O involved. */
  controllers?: readonly AnyConstructor[];
  /**
   * Glob pattern(s) resolved to controller module files, each dynamically imported. Point these
   * at your compiled output (e.g. `'dist/**\/*.controller.js'`) unless your runtime can already
   * execute the source files directly (`ts-node`, `tsx`, or similar).
   */
  patterns?: string | readonly string[];
  /** Base directory `patterns` are resolved relative to. Defaults to `process.cwd()`. */
  cwd?: string;
}
