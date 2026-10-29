import type { IconifyIcon } from "@icon-sheets/schema";

import type { ParsedRef, RefEntry } from "./refs";

/**
 * Resolves every planned ref into its icon literal and assembles the flat icons
 * map, keyed by each entry's alias. Misses (`resolve` returning `null`) are
 * collected across the whole map and thrown once, listing every failing
 * `alias → ref` — the same all-at-once ethos as the schema's issue list, so a
 * config with several bad refs surfaces them together, not one per run.
 *
 * @param entries - The planned refs.
 * @param resolve - Turns one parsed ref into its icon, or `null` for a miss.
 */
export const assemble = async (
  entries: RefEntry[],
  resolve: (ref: ParsedRef) => Promise<IconifyIcon | null>,
): Promise<Record<string, IconifyIcon>> => {
  const icons: Record<string, IconifyIcon> = {};
  const misses: RefEntry[] = [];

  for (const entry of entries) {
    const icon = await resolve(entry.parsed);
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
      `@icon-sheets/kit: ${misses.length} icon(s) could not be resolved —\n${lines}`,
    );
  }

  return icons;
};
