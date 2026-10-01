import type { GenerateOptions, KitConfig, Output } from "./types";
import { emit } from "./emit";
import { resolveKit } from "./resolve";

/**
 * Generates icons from a kit config: checks and resolves it through
 * {@link resolveKit}, and emits the modules and sprites for `outDir`. An app
 * imports them by relative path; a published package points its `exports` at
 * them. No filesystem writes.
 *
 * @param config - The kit config.
 * @param options - The I/O and resolver hooks passed to `@icon-sheets/iconify`.
 * @throws InvalidConfigError when the config breaks a rule, before resolving.
 */
export const generate = async (
  config: KitConfig,
  options: GenerateOptions = {},
): Promise<Output> => {
  const kit = await resolveKit(config, options);
  return { outDir: kit.outDir, files: emit(kit) };
};
