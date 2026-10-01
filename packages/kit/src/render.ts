import type { AliasMap, Contract, Set } from "@icon-sheets/schema";
import { defineSprite } from "@icon-sheets/svg";
import { merge } from "@icon-sheets/utils";

import type { Kit } from "./types";

/** A full sheet over an alias map, under the kit's id prefix. */
const sheet = (kit: Kit, icons: AliasMap, hidden: boolean): string =>
  defineSprite<Contract>(
    { aliases: () => Object.keys(icons), resolve: (alias) => icons[alias] },
    { prefix: kit.prefix },
  ).sheet({ hidden });

/**
 * Renders the base sheet: one `<symbol>` per alias of the contract.
 *
 * @param kit - The resolved kit.
 * @param hidden - Whether the sheet carries `display:none` — yes when inlined
 * into a page, no as a standalone sprite file.
 */
export const renderBase = (kit: Kit, hidden: boolean): string =>
  sheet(kit, kit.contract.icons, hidden);

/**
 * Renders a set's sheet: the base with the set's rebinds on top — the core
 * merge, so it is exactly what `apply` would make active.
 *
 * @param kit - The resolved kit.
 * @param set - One of the kit's sets.
 * @param hidden - Whether the sheet carries `display:none`.
 */
export const renderSet = (kit: Kit, set: Set, hidden: boolean): string =>
  sheet(kit, merge(kit.contract, set).icons, hidden);
