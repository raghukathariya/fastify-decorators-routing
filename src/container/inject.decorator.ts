import { DependencyError } from '../errors/dependency.error.js';
import { createMetadataKey } from '../metadata/metadata-key.js';
import { globalMetadataRegistry } from '../metadata/metadata-registry.js';
import type { AnyConstructor, MemberKey } from '../types/constructor.type.js';
import type { ProviderToken } from './injection-token.js';

/** Class-level: maps constructor parameter index -> explicit token override. */
export const INJECT_PARAMS_METADATA_KEY =
  createMetadataKey<Readonly<Record<number, ProviderToken<unknown>>>>('container:inject-params');

export interface PropertyInjection {
  readonly property: MemberKey;
  readonly token: ProviderToken<unknown>;
}

/**
 * Class-level: the list of `@Inject()`-annotated properties. Deliberately class-level (rather
 * than member-level) and written with `appendClassMetadata`, so `Container` can read the full,
 * inheritance-resolved list for a class in one call via the `'merge-array'` strategy — a subclass
 * automatically inherits its parent's property injections in addition to its own.
 */
export const INJECTED_PROPERTIES_METADATA_KEY = createMetadataKey<PropertyInjection[]>(
  'container:injected-properties',
);

/**
 * Specifies which {@link ProviderToken} to resolve for a constructor parameter or a property.
 *
 * Required whenever the dependency can't be inferred from the parameter/property's own
 * TypeScript type — injecting by an `InjectionToken` (interfaces, primitives, configuration
 * values have no class to key off of), or resolving to a different implementation than the
 * declared type. Optional for a parameter/property typed as a concrete, `@Injectable()`-decorated
 * class, where `Container` can already infer the token from `design:type`/`design:paramtypes`.
 *
 * Usable on constructor parameters and on instance properties; method parameters are not
 * supported (the container only ever constructs instances — it does not intercept method calls).
 */
export function Inject<T>(token: ProviderToken<T>): PropertyDecorator & ParameterDecorator {
  return (target: object, propertyKey: MemberKey | undefined, parameterIndex?: number): void => {
    if (typeof parameterIndex === 'number') {
      if (propertyKey !== undefined) {
        throw DependencyError.invalidInjectUsage(
          '@Inject() cannot be applied to a method parameter; only constructor parameters and ' +
            'instance properties are supported.',
        );
      }
      // For a constructor parameter, `target` is the class itself (not its prototype).
      const ctor = target as AnyConstructor;
      const existing =
        globalMetadataRegistry.reader.getClassMetadata(ctor, INJECT_PARAMS_METADATA_KEY, {
          inherit: false,
        }) ?? {};
      globalMetadataRegistry.writer.setClassMetadata(ctor, INJECT_PARAMS_METADATA_KEY, {
        ...existing,
        [parameterIndex]: token,
      });
      return;
    }

    if (propertyKey === undefined) {
      throw DependencyError.invalidInjectUsage(
        '@Inject() requires either a constructor parameter index or a property key; received ' +
          'neither.',
      );
    }
    // For a property decorator, `target` is the prototype; `.constructor` is the class.
    const ctor = (target as { constructor: AnyConstructor }).constructor;
    globalMetadataRegistry.writer.appendClassMetadata(ctor, INJECTED_PROPERTIES_METADATA_KEY, {
      property: propertyKey,
      token,
    });
  };
}
