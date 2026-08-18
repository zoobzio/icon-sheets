import type { Alias, Contract, Set } from "@icon-sheets/schema";

/**
 * A catalog's knowledge of one set: the identity and discovery metadata `list`
 * carries, never the payload. What a picker renders and a query filters on; the
 * set's icons stay behind `get` until someone applies it.
 */
export interface Entry {
  /**
   * The set's id — the argument `get` takes to retrieve the payload.
   */
  id: string;

  /**
   * The display name.
   */
  name: string;

  /**
   * A human-readable description, when the source carries one.
   */
  description?: string;

  /**
   * Discovery tags, when the source carries them — the facets a {@link Query}
   * filters on.
   */
  tags?: string[];
}

/**
 * The ordering of a listing: one entry field, ascending or descending.
 */
export interface Sort {
  /**
   * The entry field compared between entries.
   */
  field: "id" | "name";

  /**
   * The comparison direction.
   */
  direction: "asc" | "desc";
}

/**
 * A listing request as pure data: filter, order, and window, every field
 * JSON-serializable, so one query crosses process and network boundaries
 * unchanged. The model is mandatory in full — every catalog answers every
 * field — so a query that works against one source works identically against
 * any other.
 */
export interface Query {
  /**
   * Keep only entries whose name contains the text, case-insensitively.
   */
  search?: string;

  /**
   * Keep only entries carrying every one of these tags.
   */
  tags?: string[];

  /**
   * The ordering of the matches before the window is cut.
   */
  sort?: Sort;

  /**
   * The window size: how many entries one page carries.
   */
  limit?: number;

  /**
   * The window position: how many matches to skip before the page starts.
   */
  offset?: number;
}

/**
 * A query with its gaps filled: the concrete listing a source answers. Catalogs
 * normalize at their front door, so callbacks always receive a complete window
 * and ordering, and a client puts the caller's own defaults on the wire rather
 * than deferring to the remote end's.
 */
export interface Listing {
  /**
   * Keep only entries whose name contains the text, case-insensitively; absent
   * when the listing is unfiltered by name.
   */
  search?: string;

  /**
   * Keep only entries carrying every one of these tags; absent when the listing
   * is unfiltered by tag.
   */
  tags?: string[];

  /**
   * The ordering of the matches before the window is cut.
   */
  sort: Sort;

  /**
   * The window size: how many entries one page carries.
   */
  limit: number;

  /**
   * The window position: how many matches to skip before the page starts.
   */
  offset: number;
}

/**
 * One page of a listing: the entries inside the requested window, and the
 * numbers to page by. `total` counts every match of the query's filters, not
 * the page; `limit` and `offset` echo the window actually applied, defaults
 * included.
 */
export interface Page {
  /**
   * The matching entries inside the window.
   */
  entries: Entry[];

  /**
   * How many entries match the query's filters across all pages.
   */
  total: number;

  /**
   * The window size the page was cut with.
   */
  limit: number;

  /**
   * The window position the page was cut at.
   */
  offset: number;
}

/**
 * A source of sets for an {@link IconSheets} service: discovery through `list`,
 * retrieval through `get`. A catalog is a pure resolver — it holds no state, and
 * every call resolves against the underlying source — so caching lives with the
 * caller, where the environment already provides it.
 *
 * Both constructors produce this shape: a provider fronting storage callbacks,
 * a client fronting a remote endpoint speaking the wire protocol. The shapes
 * matching is what lets catalogs chain — a provider's callbacks can delegate to
 * a client, so an app serves its own sets and falls back to a remote service
 * through one interface.
 */
export interface Catalog<C extends Contract> {
  /**
   * The manifest window a query selects: entry metadata for discovery, never
   * payloads. An omitted query lists the first page under the default window.
   */
  list: (query?: Query) => Promise<Page>;

  /**
   * One set by id, proven against the contract. Resolves `undefined` on a miss;
   * a payload that exists but fails the contract throws rather than passing as a
   * miss.
   */
  get: (id: string) => Promise<Set<Alias<C>> | undefined>;
}

/**
 * The storage callbacks a provider catalog fronts — the seam a host binds to
 * wherever its sets actually live: build-emitted JSON, a database, a key-value
 * store, another catalog. Both callbacks return raw untrusted data; the
 * constructor proves every result against its schema before the catalog
 * surfaces it, so implementations hand back storage reads as-is, without
 * casting.
 */
export interface Provider {
  /**
   * Answers a listing: receives the query already validated and normalized to a
   * concrete window, and returns whatever the source holds for it — directly or
   * behind a promise, awaited either way — proven as a {@link Page} on the way
   * out.
   */
  list: (listing: Listing) => unknown;

  /**
   * Answers a retrieval: returns the stored payload for the id — directly or
   * behind a promise, awaited either way — proven as a set on the way out, with
   * `null` / `undefined` meaning a miss.
   */
  get: (id: string) => unknown;
}

/**
 * The transport a client catalog speaks through: where to make requests, and
 * what to send with them. The client owns the wire protocol; this config only
 * points it somewhere and authenticates it.
 */
export interface Client {
  /**
   * The URL the wire routes extend — an app's own mount point or a remote
   * service's origin.
   */
  base: string;

  /**
   * Headers sent with every request; authentication lives here.
   */
  headers?: Record<string, string>;

  /**
   * The fetch implementation requests go through. Defaults to the global; the
   * injection point for a request-aware fetch during SSR, or one that carries
   * credentials, retries, or caching.
   */
  fetch?: typeof globalThis.fetch;
}
