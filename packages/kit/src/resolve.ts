import { resolveAll } from "@icon-sheets/iconify";

import type { GenerateOptions, Kit, KitConfig } from "./types";
import { OUT_DIR } from "./constant";
import { normalize } from "./path";
import { validate } from "./validate";

/** Drops the unset entries of a set's partial ref map. */
const defined = (
  icons: Partial<Record<string, string>>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(icons).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );

/**
 * Checks a config and resolves it into a {@link Kit} through
 * `@icon-sheets/iconify`: the contract and every set in one pass, so each
 * collection is acquired once however many sets draw from it. The only step
 * that reads the network or local `@iconify-json/*` packages. No filesystem
 * writes — {@link generate} turns the result into files; a caller that wants
 * the documents themselves stops here.
 *
 * @param config - The kit config.
 * @param options - The I/O and resolver hooks passed to `@icon-sheets/iconify`.
 * @throws InvalidConfigError when the config breaks a rule, before resolving.
 */
export const resolveKit = async (
  config: KitConfig,
  options: GenerateOptions = {},
): Promise<Kit> => {
  validate(config);
  const { sets = {}, prefix = "", outDir = OUT_DIR, ...refs } = config;

  const resolved = await resolveAll({
    ...options,
    config: refs,
    sets: Object.entries(sets).map(([id, { icons, ...identity }]) => ({
      id,
      ...identity,
      icons: defined(icons),
    })),
  });

  return { ...resolved, prefix, outDir: normalize(outDir) };
};
