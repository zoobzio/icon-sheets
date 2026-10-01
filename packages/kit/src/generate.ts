import type { GenerateOptions, KitConfig, Output } from "./types";
import { OUT_DIR } from "./constant";
import { emit } from "./emit";
import { normalize } from "./path";
import { resolveKit } from "./resolve";
import { validate } from "./validate";

/**
 * Generates icons from a kit config: checks it, resolves the contract and every
 * set through `@icon-sheets/iconify`, and emits the modules and sprites for
 * `outDir`. An app imports them by relative path; a published package points
 * its `exports` at them. No filesystem writes.
 *
 * @param config - The kit config.
 * @param options - The I/O and resolver hooks passed to `@icon-sheets/iconify`.
 * @throws InvalidConfigError when the config breaks a rule, before resolving.
 */
export const generate = async (
  config: KitConfig,
  options: GenerateOptions = {},
): Promise<Output> => {
  validate(config);
  const { outDir = OUT_DIR, ...authored } = config;
  const kit = await resolveKit(authored, options);
  return { outDir: normalize(outDir), files: emit(kit) };
};
