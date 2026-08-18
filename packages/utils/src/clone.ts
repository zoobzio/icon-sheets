import { equals } from "objectively";

import type { Contract } from "@icon-sheets/schema";

import { copy } from "./copy";

/**
 * Deep copy of a contract, facet by facet: identity is rebuilt field by field
 * (including a fresh `tags` array), and the `icons` map is rebuilt through
 * {@link copy}, so no definition object or metadata array is shared with the
 * source. Mutating the clone at any depth never reaches the original — the
 * runtime holds a clone as its construction-time baseline, detached from the
 * config it was seeded from.
 *
 * Optional identity fields are copied only when present, so the rebuild stays
 * key-for-key equal to the source; that equality proof also narrows the result
 * back to the source type without a cast. Cloning a reactive proxy this way
 * yields an inert, plain snapshot.
 */
export const clone = <C extends Contract>(contract: C): C => {
  const result: Contract = {
    id: contract.id,
    name: contract.name,
    icons: copy(contract.icons),
  };
  if (contract.description !== undefined) {
    result.description = contract.description;
  }
  if (contract.tags !== undefined) {
    result.tags = copy(contract.tags);
  }

  if (!equals(contract, result)) {
    throw new TypeError("unable to clone a contract");
  }

  return result;
};
