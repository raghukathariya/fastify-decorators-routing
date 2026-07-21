/**
 * Implemented by a class-provided or factory-provided instance that needs to run setup logic
 * immediately after construction and property injection, but before it is handed back from
 * `Container.resolve`.
 *
 * Not called for `useValue` providers — a value provider's instance is already fully constructed
 * by the caller before registration, so there is no post-construction moment for the container to
 * hook into.
 *
 * Kept synchronous deliberately: `Container.resolve` is synchronous end-to-end (see
 * `container.ts` for why), so an async `onInit` could never be awaited by it. Perform
 * asynchronous setup before registration and hand the container an already-initialized value via
 * `registerValue`/`useValue` instead.
 */
export interface OnInit {
  onInit(): void;
}

/**
 * Implemented by a class-provided or factory-provided instance that needs to run teardown logic
 * when the `Container` (or `Container` scope) that created it is disposed via `Container.dispose`.
 *
 * Only called for instances the disposed container itself created and cached — i.e. singletons
 * (disposed only when the root container is disposed) and scoped instances (disposed when their
 * owning scope is disposed). Transient instances are never cached, so the container has no
 * reference to call `onDestroy` on and cannot invoke it — a transient-scoped resource that needs
 * teardown must manage its own lifecycle.
 */
export interface OnDestroy {
  onDestroy(): void;
}

export function hasOnInit(value: unknown): value is OnInit {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<OnInit>).onInit === 'function'
  );
}

export function hasOnDestroy(value: unknown): value is OnDestroy {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<OnDestroy>).onDestroy === 'function'
  );
}
