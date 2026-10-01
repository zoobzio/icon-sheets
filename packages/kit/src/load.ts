import { existsSync } from "node:fs";

import { createJiti } from "jiti";

import type { KitConfig } from "./types";
import { MalformedConfigError, MissingConfigError } from "./error";

/** Whether a value is a non-null object. */
const object = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

/**
 * Loads an `icon-sheets.config.ts` — or any TypeScript / JavaScript config
 * file — through jiti and returns its default export. Only the outer shape is
 * checked here; {@link generate} validates the rest. An error thrown while the
 * file itself runs propagates untouched.
 *
 * @param path - The absolute path to the config file.
 * @throws MissingConfigError when there is no file at `path`.
 * @throws MalformedConfigError when the default export is not config-shaped.
 */
export const loadConfig = async (path: string): Promise<KitConfig> => {
  if (!existsSync(path)) {
    throw new MissingConfigError(path);
  }
  const jiti = createJiti(import.meta.url, { moduleCache: false });
  const config = await jiti.import<unknown>(path, { default: true });
  if (!object(config) || !("icons" in config) || !object(config.icons)) {
    throw new MalformedConfigError(path);
  }
  return config as KitConfig;
};
