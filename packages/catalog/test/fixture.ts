import type { Contract, IconifyIcon, Set } from "@icon-sheets/schema";
import type { Entry, Listing, Page } from "../src/types";

import { defineSchema } from "@icon-sheets/schema";

/* Icon literals named once so assertions can compare against them. */
export const path: IconifyIcon = { body: '<path d="M0 0"/>', width: 24 };
export const rect: IconifyIcon = { body: "<rect/>", width: 24 };

/**
 * A minimal contract: two aliases, enough for the schema to prove sets against.
 */
export const contract = {
  id: "demo",
  name: "Demo",
  icons: {
    home: path,
    star: path,
  },
} satisfies Contract;

export type T = typeof contract;

/**
 * The validation bundle every catalog under test is constructed with.
 */
export const schema = defineSchema(contract);

/**
 * A valid set of the contract, retrievable from the fixture sources.
 */
export const sharp: Set<"home" | "star"> = {
  id: "sharp",
  name: "Sharp",
  icons: { home: rect },
};

/**
 * A payload that exists but steps outside the contract — an unknown alias — for
 * exercising the corruption path.
 */
export const corrupt = {
  id: "corrupt",
  name: "Corrupt",
  icons: { ghost: rect },
};

/**
 * An unsorted manifest exercising filtering, ordering, and windowing. Ids and
 * names deliberately order differently — the id `abyss` sorts first while its
 * name `The Abyss` sorts last — so sort-field tests can tell the fields apart.
 * Tags drive the tag-filter path.
 */
export const entries: Entry[] = [
  { id: "nord", name: "Nord", tags: ["dark", "cool"] },
  { id: "aurora", name: "Aurora", tags: ["light"] },
  { id: "midnight", name: "Midnight", tags: ["dark"] },
  { id: "abyss", name: "The Abyss", tags: ["dark", "deep"] },
];

/**
 * A minimal listing implementation over {@link entries} — name filter, tag
 * filter, and window, honest counts — standing in for whatever real lookup a
 * source binds its `list` callback to.
 */
export const answer = (listing: Listing): Page => {
  let matches = entries;
  if (listing.search !== undefined) {
    const needle = listing.search.toLowerCase();
    matches = matches.filter((entry) =>
      entry.name.toLowerCase().includes(needle),
    );
  }
  if (listing.tags !== undefined) {
    const wanted = listing.tags;
    matches = matches.filter((entry) =>
      wanted.every((tag) => entry.tags?.includes(tag)),
    );
  }
  return {
    entries: matches.slice(listing.offset, listing.offset + listing.limit),
    total: matches.length,
    limit: listing.limit,
    offset: listing.offset,
  };
};

/**
 * A well-formed page of the whole manifest, for transports that only need a
 * valid body.
 */
export const page: Page = {
  entries,
  total: entries.length,
  limit: 20,
  offset: 0,
};
