import type { KitConfig, Preset } from "./types";

/**
 * Identity helper that types an `icon-sheets.config.ts`. The alias union is
 * inferred from `icons` alone, so a set that rebinds an alias the config does
 * not declare is a type error at authoring time, ahead of the build-time
 * membership check. The aliases of a preset named through {@link preset} join
 * what a set may rebind.
 *
 * @param config - The kit config.
 * @returns The same config.
 */
export const defineConfig = <const A extends string, P extends string = never>(
  config: KitConfig<A, P>,
): KitConfig<A, P> => config;

/**
 * Names a package to extend, typed with the alias union its build declares:
 *
 * ```ts
 * import type { Alias as Foundation } from "@acme/icons";
 * extends: [preset<Foundation>("@acme/icons")],
 * ```
 *
 * At build time this is the package name alone; the type argument lets a set
 * rebind one of the preset's aliases without a type error.
 *
 * @param name - The package name.
 */
export const preset = <P extends string = never>(name: string): Preset<P> => ({
  package: name,
});
