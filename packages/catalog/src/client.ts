import type { Contract, Schema } from "@icon-sheets/schema";
import type { Catalog, Client, Listing } from "./types";

import { ROUTE } from "./constant";
import { FailedRequestError } from "./error";
import { defineCatalog } from "./catalog";

/**
 * Creates a {@link Catalog} from transport config — the consuming angle, for an
 * app reaching a catalog served elsewhere: its own server's mount point, or a
 * remote icon-set service. The config compiles into a {@link Provider} and boots
 * the same machine as the serving angle, so a remote catalog behaves exactly
 * like a local one: same proofs, same miss and failure semantics.
 *
 * @param schema - The contract the catalog's sets are proven against.
 * @param client - Where to make requests, and what to send with them.
 * @returns A {@link Catalog} resolving over the wire.
 */
export const defineClient = <C extends Contract>(
  schema: Schema<C>,
  client: Client,
): Catalog<C> => {
  /**
   * Base URL for the target API.
   */
  const root = `${client.base.replace(/\/+$/, "")}/${ROUTE}`;

  /**
   * Issues one GET through the configured transport. The implementations are
   * method-called — an injected fetch on its config, the default on
   * `globalThis` — so neither runs detached from the `this` it needs.
   */
  const request = async (url: string): Promise<Response> => {
    const init = {
      headers: { accept: "application/json", ...client.headers },
    };
    if (client.fetch) {
      return client.fetch(url, init);
    }
    return globalThis.fetch(url, init);
  };

  /**
   * Answers a listing from the wire. Any failure status is a failure — a catalog
   * with no listing route is misconfigured, not empty.
   */
  const list = async (listing: Listing): Promise<unknown> => {
    const url = `${root}?q=${encodeURIComponent(JSON.stringify(listing))}`;
    const response = await request(url);
    if (!response.ok) {
      throw new FailedRequestError(url, response.status);
    }
    const value: unknown = await response.json();
    return value;
  };

  /**
   * Answers a retrieval from the wire: a 404 is a miss, any other failure status
   * is a failure.
   */
  const get = async (id: string): Promise<unknown> => {
    const url = `${root}/${encodeURIComponent(id)}`;
    const response = await request(url);
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new FailedRequestError(url, response.status);
    }
    const value: unknown = await response.json();
    return value;
  };

  return defineCatalog<C>(schema, { get, list });
};
