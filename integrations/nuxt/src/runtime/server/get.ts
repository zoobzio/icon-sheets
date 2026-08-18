import { createError, defineEventHandler, getRouterParam } from "h3";
import { ROUTE } from "icon-sheets/catalog";
import { record } from "objectively";
import { useRuntimeConfig, useStorage } from "#imports";

import { ASSETS, SETS } from "@icon-sheets/nuxt/constant";
import { remoteHeaders } from "./remote";

/**
 * The catalog's retrieval route: answers with the stored set for the id, or 404
 * for a miss. Every payload was proven against the contract when the module wrote
 * it, so it is served as stored; a consuming client re-proves on receipt.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id", { decode: true });
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Set id required",
    });
  }

  /*
   * A remote catalog is configured: proxy the retrieval to it, adding the
   * server-side auth. A 404 stays a miss; the browser never sees the token.
   */
  const remote = useRuntimeConfig().iconSheets;
  if (remote?.base) {
    const url = `${remote.base.replace(/\/+$/, "")}/${ROUTE}/${encodeURIComponent(id)}`;
    const response = await fetch(url, { headers: remoteHeaders(remote) });
    if (response.status === 404) {
      throw createError({ statusCode: 404, statusMessage: "Set not found" });
    }
    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: "Upstream catalog failed",
      });
    }
    return await response.json();
  }

  const stored = await useStorage(`assets:${ASSETS}`).getItem(SETS);
  if (!record(stored)) {
    throw createError({
      statusCode: 500,
      statusMessage: "Catalog payloads unavailable",
    });
  }

  const set = stored[id];
  if (set === undefined || set === null) {
    throw createError({
      statusCode: 404,
      statusMessage: "Set not found",
    });
  }

  return set;
});
