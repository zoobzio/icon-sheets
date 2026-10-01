import type { Kit } from "@icon-sheets/kit";
import type { Nuxt } from "@nuxt/schema";
import type { NuxtIconSheetsConfig } from "./config";

import { resolve } from "node:path";

import { FILENAME, loadConfig, resolveKit } from "@icon-sheets/kit";

import { defineRequest } from "./request";

/**
 * The resolved documents the module wires into Nuxt: the base contract, the
 * sets, and the symbol id prefix.
 */
export type Icons = Pick<Kit, "contract" | "sets" | "prefix">;

/**
 * Loads the icons the module serves. With a `contract`, they are the documents
 * a kit build elsewhere generated, taken as passed. Without one, the app's own
 * kit config is built here through `@icon-sheets/kit` — nothing is written to
 * disk — and joins Nuxt's watch list, so editing it restarts dev and builds it
 * again.
 *
 * @param options - The module's configuration.
 * @param nuxt - The Nuxt instance, for the project root and the watch list.
 */
export const loadIcons = async (
  options: NuxtIconSheetsConfig,
  nuxt: Nuxt,
): Promise<Icons> => {
  if (options.contract) {
    return {
      contract: options.contract,
      sets: Object.values(options.sets ?? {}),
      prefix: options.prefix ?? "",
    };
  }

  const path = resolve(nuxt.options.rootDir, options.config ?? FILENAME);
  nuxt.options.watch.push(path);
  return resolveKit(await loadConfig(path), {
    cwd: nuxt.options.rootDir,
    req: defineRequest(options),
  });
};
