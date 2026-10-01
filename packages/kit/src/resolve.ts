import { resolveAll } from "@icon-sheets/iconify";

import type { GenerateOptions, Kit, KitConfig } from "./types";

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
 * Resolves a config into a {@link Kit} through `@icon-sheets/iconify`: the
 * contract and every set in one pass, so each collection is acquired once
 * however many sets draw from it. The only step that reads the network or local
 * `@iconify-json/*` packages.
 *
 * @param config - The kit config, less its `outDir` — where the files land is
 * the output's concern, not the kit's.
 * @param options - The I/O and resolver hooks passed to `@icon-sheets/iconify`.
 */
export const resolveKit = async (
  config: Omit<KitConfig, "outDir">,
  options: GenerateOptions,
): Promise<Kit> => {
  const { sets = {}, prefix = "", ...refs } = config;

  const resolved = await resolveAll({
    ...options,
    config: refs,
    sets: Object.entries(sets).map(([id, { icons, ...identity }]) => ({
      id,
      ...identity,
      icons: defined(icons),
    })),
  });

  return { ...resolved, prefix };
};
