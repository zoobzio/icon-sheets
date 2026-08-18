import type { IconifyIcon } from "@icon-sheets/schema";

import type { RefEntry, SchemeResolver } from "./types";

/**
 * Resolves every planned ref into its icon literal and assembles the flat icons
 * map. Each entry's parsed scheme selects its resolver; the resolved icon is
 * keyed by the entry's alias. Misses (a resolver returning `null`) are collected
 * across the whole map and thrown once, listing every failing `alias → ref` —
 * the same all-at-once ethos as the schema's issue list, so a config with
 * several bad refs surfaces them together, not one per run.
 *
 * @param entries - The planned refs.
 * @param resolvers - Scheme-keyed resolvers (`iconify`, `url`, and overrides).
 */
export const assemble = async (
  entries: RefEntry[],
  resolvers: Record<string, SchemeResolver>,
): Promise<Record<string, IconifyIcon>> => {
  const icons: Record<string, IconifyIcon> = {};
  const misses: RefEntry[] = [];

  for (const entry of entries) {
    const resolver = resolvers[entry.parsed.scheme];
    if (!resolver) {
      throw new Error(
        `@icon-sheets/iconify: no resolver for scheme "${entry.parsed.scheme}" (alias "${entry.alias}")`,
      );
    }
    const icon = await resolver(entry.parsed);
    if (!icon) {
      misses.push(entry);
      continue;
    }
    icons[entry.alias] = icon;
  }

  if (misses.length > 0) {
    const lines = misses
      .map((miss) => `  ${miss.alias} → ${miss.raw}`)
      .join("\n");
    throw new Error(
      `@icon-sheets/iconify: ${misses.length} icon(s) could not be resolved —\n${lines}`,
    );
  }

  return icons;
};
