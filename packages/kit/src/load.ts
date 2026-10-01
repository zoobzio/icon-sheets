import { createJiti } from "jiti";

import type { KitConfig } from "./types";

/**
 * Loads an `icon-sheets.config.ts` — or any TypeScript / JavaScript config file — through jiti and
 * returns its default export. Only the outer shape is checked here; the build
 * validates the rest.
 *
 * @param path - The absolute path to the config file.
 */
export const loadConfig = async (path: string): Promise<KitConfig> => {
  const jiti = createJiti(import.meta.url, { moduleCache: false });
  const config = await jiti.import<unknown>(path, { default: true });
  if (
    typeof config !== "object" ||
    config === null ||
    !("icons" in config) ||
    typeof config.icons !== "object"
  ) {
    throw new Error(
      `@icon-sheets/kit: ${path} must default-export a config (defineConfig({ id, name, icons }))`,
    );
  }
  return config as KitConfig;
};
