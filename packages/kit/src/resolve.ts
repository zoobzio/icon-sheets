import { resolveAll } from "@icon-sheets/iconify";

import type { GenerateOptions, Kit, KitConfig } from "./types";
import { compose } from "./compose";
import { OUT_DIR } from "./constant";
import { normalize } from "./path";
import { loadPresets } from "./preset";
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
 * that reads the network, local `@iconify-json/*` packages or local SVG files.
 * The presets the config extends are read from their packages — already
 * resolved, so nothing of theirs is fetched — and the config's own documents
 * are composed over them. No filesystem writes — {@link generate} turns the
 * result into files; a caller that wants the documents themselves stops here.
 *
 * @param config - The kit config.
 * @param options - The I/O and resolver hooks passed to `@icon-sheets/iconify`.
 * @throws InvalidConfigError when the config breaks a rule, before resolving.
 * @throws MalformedPresetError when an extended package has no kit build.
 */
export const resolveKit = async (
  config: KitConfig,
  options: GenerateOptions = {},
): Promise<Kit> => {
  const {
    extends: packages = [],
    sets = {},
    prefix,
    outDir = OUT_DIR,
    ...refs
  } = config;
  const presets = await loadPresets(packages, options.cwd ?? process.cwd());
  const inherited = presets.flatMap((preset) =>
    Object.keys(preset.contract.icons),
  );
  validate(config, inherited);

  const resolved = await resolveAll({
    ...options,
    config: refs,
    aliases: inherited,
    sets: Object.entries(sets).map(([id, { icons, ...identity }]) => ({
      id,
      ...identity,
      icons: defined(icons),
    })),
  });

  return {
    ...compose([...presets, { ...resolved, prefix }]),
    outDir: normalize(outDir),
    sources: resolved.sources,
  };
};
