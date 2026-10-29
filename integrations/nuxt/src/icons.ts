import type { Documents } from "@icon-sheets/kit";
import type { Nuxt } from "@nuxt/schema";
import type { NuxtIconSheetsConfig } from "./config";

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  FILENAME,
  compose,
  loadConfig,
  loadPreset,
  resolveKit,
} from "@icon-sheets/kit";

import { defineRequest } from "./request";

/**
 * The resolved documents the module wires into Nuxt: the base contract, the
 * sets, and the symbol id prefix.
 */
export type Icons = Documents;

/** A preset a layer names, and the directory it resolves from. */
type Named = { name: string; cwd: string };

/**
 * The presets the Nuxt layers name, farthest layer first, each paired with
 * its own layer's directory — the one place its package is sure to resolve
 * from. A package named twice is read once. Without layer information (a
 * bare `nuxt.options`), the merged `preset` resolves from the root.
 */
const presets = (options: NuxtIconSheetsConfig, nuxt: Nuxt): Named[] => {
  const layers = nuxt.options._layers ?? [];
  if (layers.length === 0) {
    return options.preset
      ? [{ name: options.preset, cwd: nuxt.options.rootDir }]
      : [];
  }
  const seen = new Set<string>();
  const named: Named[] = [];
  for (const layer of [...layers].reverse()) {
    const name = (layer.config as { iconSheets?: NuxtIconSheetsConfig } | null)
      ?.iconSheets?.preset;
    if (typeof name === "string" && name !== "" && !seen.has(name)) {
      seen.add(name);
      named.push({ name, cwd: layer.cwd });
    }
  }
  return named;
};

/**
 * Loads the icons the module serves. The presets the layers name come first,
 * each read from its package as the kit built it. Over them lands either the
 * documents passed as `contract` / `sets` / `prefix`, taken as given, or the
 * app's own kit config, built here through `@icon-sheets/kit` — nothing is
 * written to disk — and joined to Nuxt's watch list along with every local
 * SVG it names, so editing any of them restarts dev and builds it again. With
 * presets, the default config file is built only when it exists; a `config`
 * path is always built.
 *
 * @param options - The module's configuration.
 * @param nuxt - The Nuxt instance, for the layers, the project root and the
 * watch list.
 */
export const loadIcons = async (
  options: NuxtIconSheetsConfig,
  nuxt: Nuxt,
): Promise<Icons> => {
  const base: Documents[] = [];
  for (const { name, cwd } of presets(options, nuxt)) {
    base.push(await loadPreset(name, cwd));
  }

  if (options.contract) {
    return compose([
      ...base,
      {
        contract: options.contract,
        sets: Object.values(options.sets ?? {}),
        prefix: options.prefix,
      },
    ]);
  }

  const root = nuxt.options.rootDir;
  const path = resolve(root, options.config ?? FILENAME);
  if (base.length > 0 && options.config === undefined && !existsSync(path)) {
    return compose(base);
  }

  nuxt.options.watch.push(path);
  const authored = await loadConfig(path);
  const kit = await resolveKit(authored, {
    cwd: root,
    req: defineRequest(options),
  });
  nuxt.options.watch.push(...kit.sources);

  /*
   * The kit settles an unset prefix to none, but over a preset it should
   * inherit instead: pass the prefix as the config authored it, unless the
   * config composed presets of its own, whose prefix the kit already settled.
   */
  const own =
    authored.prefix !== undefined || (authored.extends ?? []).length > 0;
  return compose([...base, { ...kit, prefix: own ? kit.prefix : undefined }]);
};
