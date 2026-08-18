import type { Alias, AliasMap, Contract, Set } from "@icon-sheets/schema";

import { copy } from "./copy";

/**
 * The apply merge: a set resolved against a baseline contract into a fresh
 * active contract. Identity transfers from the set — applying a set *becomes*
 * that document — while `icons` is the baseline's map spread with the set's
 * overrides, so aliases the set does not rebind fall through to the baseline.
 * The set's icons and `tags` are detached through {@link copy}, so the merged
 * contract shares no mutable state with the set it was built from.
 *
 * The return type is left to inference: the spread carries a complete
 * contract-shaped document, which `apply` stores as the active state.
 */
export const merge = <C extends Contract>(contract: C, set: Set<Alias<C>>) => {
  const icons: AliasMap = { ...contract.icons };
  if (set.icons !== undefined) {
    Object.assign(icons, copy(set.icons));
  }
  const result = { ...set, icons };
  if (result.tags !== undefined) {
    result.tags = copy(result.tags);
  }
  return result;
};
