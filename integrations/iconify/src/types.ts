import type { Contract, IconifyIcon, Identity, Set } from "@icon-sheets/schema";

/**
 * The authored ref config: the input to {@link resolveContract}. Identity plus an
 * `icons` map whose values are ref *strings* rather than icon literals —
 * `prefix:name` to draw from an Iconify collection, or `$/host/path` to fetch a
 * single icon from a URL. The build layer resolves every ref into an icon
 * literal; the contract it returns is the resolved form under the same identity.
 */
export type RefConfig = Identity & {
  /** Each semantic alias mapped to its icon ref string. */
  icons: Record<string, string>;
};

/**
 * A ref parsed into a resolvable shape, discriminated by scheme. `iconify` is a
 * `prefix:name` reference into an Iconify collection; `url` is a single icon
 * fetched from `https://host/path`. The scheme keys the resolver that turns it
 * into an icon literal.
 */
export type ParsedRef =
  | { scheme: "iconify"; provider: string; prefix: string; name: string }
  | { scheme: "url"; url: URL };

/**
 * Resolves one parsed ref into an icon literal, or `null` when the ref names
 * nothing the resolver can supply (a collected miss). A resolver may throw for a
 * hard failure — a malformed response, an unreachable endpoint — which aborts
 * generation rather than being collected. Keyed by scheme in
 * {@link SharedOptions.resolvers}, so a caller can override the built-in
 * `iconify` / `url` behaviour.
 */
export type SchemeResolver = (ref: ParsedRef) => Promise<IconifyIcon | null>;

/**
 * The document loader every fetch passes through — the seam for authenticated
 * or offline sources. Receives the URL, returns the raw response text. Defaults
 * to plain `fetch` (throwing on a non-OK status).
 */
export type Req = (src: URL) => Promise<string>;

/**
 * The I/O and resolver hooks shared by {@link resolveContract},
 * {@link resolveSet} and {@link resolveAll}. `req` intercepts every network fetch; nothing is ever
 * written to disk here.
 */
export type SharedOptions = {
  /**
   * The working directory local `@iconify-json/*` package resolution runs from;
   * defaults to the process working directory.
   */
  cwd?: string;

  /** The document loader; defaults to plain `fetch`. */
  req?: Req;

  /**
   * Scheme resolvers merged over the built-ins, so a caller can override the
   * `iconify` or `url` resolution (a custom endpoint, an offline fixture).
   */
  resolvers?: Record<string, SchemeResolver>;
};

/**
 * Options for {@link resolveContract}: the authored ref config plus the shared
 * I/O hooks.
 */
export type ResolveOptions = SharedOptions & {
  config: RefConfig;
};

/**
 * Options for {@link resolveSet}: the set's identity, the contract's alias list
 * the refs are membership-checked against, and the ref map to resolve.
 */
export type ResolveSetOptions = SharedOptions & {
  /** The identity the resolved set carries. */
  identity: Identity;

  /** The contract's aliases — every ref key must name one of these. */
  aliases: string[];

  /** Each alias the set rebinds mapped to its icon ref string. */
  icons: Record<string, string>;
};

/**
 * A switchable set authored as refs: identity plus a ref map rebinding a subset
 * of a {@link RefConfig}'s aliases. The input form of a {@link Set} document.
 */
export type RefSet = Identity & {
  /** Each alias the set rebinds mapped to its icon ref string. */
  icons: Record<string, string>;
};

/**
 * Options for {@link resolveAll}: the authored ref config and the sets layered
 * over it, plus the shared I/O hooks.
 */
export type ResolveAllOptions = SharedOptions & {
  config: RefConfig;

  /** The sets to resolve — every ref key must name one of the config's aliases. */
  sets: RefSet[];
};

/**
 * What {@link resolveAll} returns: the resolved contract, and the resolved Set
 * documents in the order their refs were given.
 */
export type Resolved = {
  contract: Contract;
  sets: Set[];
};

/**
 * One planned ref: the alias it binds, the authored string, and the parsed form.
 * The unit of work acquisition and resolution both walk.
 */
export type RefEntry = {
  alias: string;
  raw: string;
  parsed: ParsedRef;
};
