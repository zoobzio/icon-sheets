import type { AliasMap, Identity, Set } from "@icon-sheets/schema";

import type { Documents, Layer } from "./types";
import { InvalidConfigError } from "./error";

/**
 * Lays documents over each other: the icons of a later layer land on an
 * earlier layer's, so an alias declared again is rebound and one left alone is
 * kept; a later set takes the place of an earlier one with the same id; the
 * identity is the last layer's; and the prefix is the one every layer that
 * sets one agrees on — no prefix when none does. Plain data in, plain data
 * out: nothing is resolved, so a preset's icon sources are never needed.
 *
 * @param layers - The documents, base first; at least one.
 * @throws InvalidConfigError when two layers set different prefixes.
 */
export const compose = (layers: Layer[]): Documents => {
  const last = layers.at(-1);
  if (last === undefined) {
    throw new Error("@icon-sheets/kit: compose needs at least one layer");
  }
  const icons: AliasMap = {};
  const sets = new Map<string, Set>();
  const prefixes = new Set<string>();
  for (const layer of layers) {
    Object.assign(icons, layer.contract.icons);
    for (const set of layer.sets) {
      sets.set(set.id, set);
    }
    if (layer.prefix !== undefined) {
      prefixes.add(layer.prefix);
    }
  }
  if (prefixes.size > 1) {
    throw new InvalidConfigError([
      `the prefixes ${[...prefixes].map((prefix) => JSON.stringify(prefix)).join(" and ")} disagree — every layer of a composition shares one sprite`,
    ]);
  }
  const identity: Identity = { id: last.contract.id, name: last.contract.name };
  if (last.contract.description !== undefined) {
    identity.description = last.contract.description;
  }
  if (last.contract.tags !== undefined) {
    identity.tags = last.contract.tags;
  }
  return {
    contract: { ...identity, icons },
    sets: [...sets.values()],
    prefix: prefixes.values().next().value ?? "",
  };
};
