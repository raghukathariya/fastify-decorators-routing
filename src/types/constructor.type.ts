/**
 * A concrete, instantiable class constructor.
 *
 * The `any[]` constructor signature (rather than `unknown[]`) is intentional: it is the only
 * signature that concrete classes with typed constructor parameters remain structurally
 * assignable to. `unknown[]` would reject every real class, since a constructor requiring
 * `(id: string)` is not a subtype of one requiring `(id: unknown)`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * An abstract class reference — usable as a token (e.g. for DI) but not directly instantiable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AbstractConstructor<T = unknown> = abstract new (...args: any[]) => T;

/**
 * Either a concrete or abstract class reference.
 */
export type AnyConstructor<T = unknown> = Constructor<T> | AbstractConstructor<T>;

/**
 * A class member key: either a string method/property name or a symbol.
 *
 * Named `MemberKey` rather than `PropertyKey` to avoid shadowing the built-in global
 * `PropertyKey` (`string | number | symbol`) — legacy decorators never receive a numeric key.
 */
export type MemberKey = string | symbol;
