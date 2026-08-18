import type { Entry, Listing } from "@icon-sheets/icon-sheets/catalog";

import { createError, defineEventHandler, getQuery } from "h3";
import { isQuery, LIMIT, ROUTE, SORT } from "@icon-sheets/icon-sheets/catalog";
import { record } from "objectively";
import { useRuntimeConfig, useStorage } from "#imports";

import { ASSETS, ENTRIES } from "@icon-sheets/nuxt/constant";
import { remoteHeaders } from "./remote";

/**
 * Whether a stored value carries the entry shape the module's manifest was
 * written with: a non-empty id and name.
 */
const isEntry = (value: unknown): value is Entry => {
  if (!record(value)) {
    return false;
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    return false;
  }
  return typeof value.name === "string" && value.name.length > 0;
};

/**
 * The catalog's listing route. The `q` search param carries a JSON-encoded query
 * — an absent param lists the first page under the default window — validated and
 * normalized to a concrete listing before the manifest is filtered, ordered, and
 * cut. The manifest comes from the server assets the module wrote at build time.
 */
export default defineEventHandler(async (event) => {
  const { q } = getQuery(event);

  /*
   * A remote catalog is configured: proxy the listing to it, adding the
   * server-side auth. The browser never sees the token.
   */
  const remote = useRuntimeConfig().iconSheets;
  if (remote?.base) {
    const query = typeof q === "string" ? `?q=${encodeURIComponent(q)}` : "";
    const url = `${remote.base.replace(/\/+$/, "")}/${ROUTE}${query}`;
    const response = await fetch(url, { headers: remoteHeaders(remote) });
    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: "Upstream catalog failed",
      });
    }
    return await response.json();
  }

  let value: unknown = {};
  if (typeof q === "string") {
    try {
      value = JSON.parse(q);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: "Malformed catalog query",
      });
    }
  }
  if (!isQuery(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Malformed catalog query",
    });
  }

  const listing: Listing = {
    sort: value.sort ?? SORT,
    limit: value.limit ?? LIMIT,
    offset: value.offset ?? 0,
  };
  if (value.search !== undefined) {
    listing.search = value.search;
  }
  if (value.tags !== undefined) {
    listing.tags = value.tags;
  }

  const stored = await useStorage(`assets:${ASSETS}`).getItem(ENTRIES);
  if (!Array.isArray(stored)) {
    throw createError({
      statusCode: 500,
      statusMessage: "Catalog manifest unavailable",
    });
  }
  const entries = stored.filter(isEntry);
  if (entries.length !== stored.length) {
    throw createError({
      statusCode: 500,
      statusMessage: "Catalog manifest unavailable",
    });
  }

  let matches = entries;
  if (listing.search !== undefined) {
    const needle = listing.search.toLowerCase();
    matches = matches.filter((entry) =>
      entry.name.toLowerCase().includes(needle),
    );
  }
  if (listing.tags !== undefined) {
    const required = listing.tags;
    matches = matches.filter((entry) =>
      required.every((tag) => entry.tags?.includes(tag)),
    );
  }

  const { field, direction } = listing.sort;
  const sorted = [...matches].sort((a, b) => {
    if (direction === "asc") {
      return a[field].localeCompare(b[field]);
    }
    return b[field].localeCompare(a[field]);
  });

  return {
    entries: sorted.slice(listing.offset, listing.offset + listing.limit),
    total: sorted.length,
    limit: listing.limit,
    offset: listing.offset,
  };
});
