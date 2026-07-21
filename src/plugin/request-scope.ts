import type { FastifyRequest } from 'fastify';
import type { Container } from '../container/container.js';

/**
 * Creates and disposes one DI `Container` scope per HTTP request, for controllers whose
 * `@Injectable`/`@Controller` scope is `'scoped'`.
 *
 * Deliberately shared across every controller registered by one `registerControllers` call
 * (rather than one `RequestScopeManager` per controller): "scoped" means one instance per
 * request *shared across everything that resolves it during that request* — two controllers
 * depending on the same scoped service must get the same instance, which only holds if they
 * resolve from the same per-request scope.
 */
export class RequestScopeManager {
  private readonly scopes = new WeakMap<FastifyRequest, Container>();

  public constructor(private readonly root: Container) {}

  /** Returns this request's scope, creating it on first use. */
  public getOrCreate(request: FastifyRequest): Container {
    let scope = this.scopes.get(request);
    if (!scope) {
      scope = this.root.createScope();
      this.scopes.set(request, scope);
    }
    return scope;
  }

  /** Disposes this request's scope (calling `onDestroy` on everything it created), if one exists. */
  public dispose(request: FastifyRequest): void {
    const scope = this.scopes.get(request);
    if (scope) {
      scope.dispose();
      this.scopes.delete(request);
    }
  }
}
