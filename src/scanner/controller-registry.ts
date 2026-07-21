import {
  resolveControllerMetadata,
  type ControllerMetadata,
} from '../decorators/controller-metadata.js';
import { ScanError } from '../errors/scan.error.js';
import type { AnyConstructor } from '../types/constructor.type.js';

/**
 * Holds the final, de-duplicated set of controllers discovered for an application, alongside
 * each one's resolved `ControllerMetadata` — so the Fastify plugin (Phase 9) reads metadata once
 * per controller rather than re-resolving it at every use site.
 */
export class ControllerRegistry {
  private readonly controllers = new Map<AnyConstructor, ControllerMetadata>();

  /**
   * Registers `controller`. A no-op if it's already registered (by identity) — registering the
   * same class twice, e.g. because it appeared in both an explicit list and a glob match, is not
   * an error. Registering a class with no `@Controller()` decorator is.
   */
  public register(controller: AnyConstructor): void {
    if (this.controllers.has(controller)) return;

    const metadata = resolveControllerMetadata(controller);
    if (!metadata) {
      throw ScanError.notAController(controller);
    }
    this.controllers.set(controller, metadata);
  }

  public registerAll(controllers: Iterable<AnyConstructor>): void {
    for (const controller of controllers) {
      this.register(controller);
    }
  }

  public has(controller: AnyConstructor): boolean {
    return this.controllers.has(controller);
  }

  public get(controller: AnyConstructor): ControllerMetadata | undefined {
    return this.controllers.get(controller);
  }

  /** Every registered controller and its resolved metadata, in registration order. */
  public getAll(): ReadonlyMap<AnyConstructor, ControllerMetadata> {
    return this.controllers;
  }

  public get size(): number {
    return this.controllers.size;
  }

  public clear(): void {
    this.controllers.clear();
  }
}
