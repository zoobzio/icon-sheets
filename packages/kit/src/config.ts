import type { KitConfig } from "./types";

/**
 * Identity helper that types an `icon-sheets.config.ts`. The alias union is
 * inferred from `icons` alone, so a set that rebinds an alias the config does
 * not declare is a type error at authoring time, ahead of the build-time
 * membership check.
 *
 * @param config - The kit config.
 * @returns The same config.
 */
export const defineConfig = <const A extends string>(
  config: KitConfig<A>,
): KitConfig<A> => config;
