import type { Alias, Contract, Schema, Set } from "@icon-sheets/schema";
import type { Catalog, Listing, Page, Provider, Query } from "./types";

import { LIMIT, SORT } from "./constant";
import {
  MalformedPageError,
  MalformedQueryError,
  MalformedSetError,
} from "./error";
import { isPage, isQuery } from "./util";

/**
 * Creates a {@link Catalog} from storage callbacks — the serving angle, and the
 * machine behind the consuming one: {@link defineClient} compiles its transport
 * config into a {@link Provider} and boots this same factory, so every behavior
 * the two angles share lives here. `list` validates the query, normalizes it to
 * a concrete listing, hands it to the source, and proves the answer is a
 * {@link Page}. `get` hands the id to the source, treats `null` / `undefined` as
 * a miss, and proves any other answer against the contract before it surfaces.
 * The schema is the only carrier of `C`: the catalog's type is earned through
 * those proofs, never asserted.
 *
 * @param schema - The contract the catalog's sets are proven against.
 * @param provider - The source callbacks answering listings and retrievals.
 * @returns A {@link Catalog} resolving through the callbacks.
 */
export const defineCatalog = <C extends Contract>(
  schema: Schema<C>,
  provider: Provider,
): Catalog<C> => {
  /**
   * The manifest window a query selects. Throws {@link MalformedQueryError} when
   * the value is not a query, and {@link MalformedPageError} when the source's
   * answer is not a page.
   */
  const list = async (query: Query = {}): Promise<Page> => {
    if (!isQuery(query)) {
      throw new MalformedQueryError(query);
    }

    const listing: Listing = {
      sort: query.sort ?? SORT,
      limit: query.limit ?? LIMIT,
      offset: query.offset ?? 0,
    };
    if (query.search !== undefined) {
      listing.search = query.search;
    }
    if (query.tags !== undefined) {
      listing.tags = query.tags;
    }

    const value = await provider.list(listing);
    if (!isPage(value)) {
      throw new MalformedPageError(value);
    }

    return value;
  };

  /**
   * One set by id. A `null` / `undefined` answer is a miss and resolves
   * `undefined`; any other answer is proven against the contract, throwing
   * {@link MalformedSetError} with the contract's issues when it fails.
   */
  const get = async (id: string): Promise<Set<Alias<C>> | undefined> => {
    const value = await provider.get(id);
    if (value === null || value === undefined) {
      return undefined;
    }

    const result = schema.inspect.set(value);
    if (!result.success) {
      throw new MalformedSetError(id, result.issues);
    }

    return result.data;
  };

  return { list, get };
};
