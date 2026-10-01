import { SchemaError, defineSchema } from "@icon-sheets/schema";
import type { Contract, Set } from "@icon-sheets/schema";
import type { IconifyJSON } from "@iconify/types";

import type {
  RefEntry,
  Req,
  ResolveOptions,
  ResolveSetOptions,
  SchemeResolver,
} from "./types";
import { assemble } from "./assemble";
import { plan } from "./refs";
import { acquire, iconifyResolver, request, urlResolver } from "./source";

/**
 * Runs a schema validation and re-frames any failure so each issue points at the
 * alias and the authored ref it came from, rather than a raw path into the
 * assembled document. A failure here means the resolved data is malformed —
 * either a resolution bug or a bad ref config — so the message says so.
 *
 * @param entries - The planned refs, for citing the offending ref.
 * @param run - The validation to guard.
 */
export const reframe = <T>(entries: RefEntry[], run: () => T): T => {
  try {
    return run();
  } catch (error) {
    if (!(error instanceof SchemaError)) {
      throw error;
    }
    const byAlias = new Map(entries.map((entry) => [entry.alias, entry.raw]));
    const lines = error.issues.map((issue) => {
      const path = issue.path ?? [];
      const at = path.join(".");
      const alias = path.find((segment) => byAlias.has(segment));
      const cite = alias ? ` (from ${byAlias.get(alias)})` : "";
      return `  ${at}: ${issue.message}${cite}`;
    });
    throw new Error(
      `@icon-sheets/iconify: the resolved document violates icon-sheets's schema — this is a resolution bug or a bad ref config —\n${lines.join("\n")}`,
      { cause: error },
    );
  }
};

// Builds the scheme-resolver map for a run: the built-in iconify (over the
// acquired collections) and url resolvers, with any caller override merged on.
const resolversFor = (
  collections: Map<string, IconifyJSON>,
  req: Req,
  overrides: Record<string, SchemeResolver> | undefined,
): Record<string, SchemeResolver> => ({
  iconify: iconifyResolver(collections),
  url: urlResolver(req),
  ...overrides,
});

/**
 * Resolves a ref config into a validated {@link Contract}: parses the refs,
 * acquires the Iconify collections (batched, local-first with API fallback),
 * resolves each ref into an icon literal, and validates the assembled contract
 * through icon-sheets's own schema. Returns the object — writing it anywhere is
 * the caller's concern (`@icon-sheets/kit`, a framework module).
 *
 * @param options - The ref config plus I/O and resolver hooks.
 */
export const resolveContract = async (
  options: ResolveOptions,
): Promise<Contract> => {
  const cwd = options.cwd ?? process.cwd();
  const req = options.req ?? request;

  const { icons: refs, ...identity } = options.config;
  const entries = plan(refs);
  const collections = await acquire(
    entries.map((entry) => entry.parsed),
    { cwd, req },
  );
  const resolvers = resolversFor(collections, req, options.resolvers);

  const icons = await assemble(entries, resolvers);
  const contract: Contract = { ...identity, icons };
  reframe(entries, () => defineSchema(contract));
  return contract;
};

/**
 * Resolves a ref map into a validated {@link Set} document — the catalog payload
 * an `apply` consumes. Every ref key is membership-checked against the contract's
 * `aliases` first (a set may only rebind known aliases), the refs resolve through
 * the same acquire/resolve pipeline, and the assembled set is validated through
 * icon-sheets's own schema.
 *
 * @param options - The set identity, the contract aliases, the ref map, and hooks.
 */
export const resolveSet = async (options: ResolveSetOptions): Promise<Set> => {
  const cwd = options.cwd ?? process.cwd();
  const req = options.req ?? request;

  const known = new Set(options.aliases);
  const unknown = Object.keys(options.icons).filter(
    (alias) => !known.has(alias),
  );
  if (unknown.length > 0) {
    throw new Error(
      `@icon-sheets/iconify: the set rebinds aliases the contract does not declare: ${unknown.join(", ")}`,
    );
  }

  const entries = plan(options.icons);
  const collections = await acquire(
    entries.map((entry) => entry.parsed),
    { cwd, req },
  );
  const resolvers = resolversFor(collections, req, options.resolvers);

  const icons = await assemble(entries, resolvers);
  const set: Set = { ...options.identity, icons };
  // A set carrying icons is contract-shaped, so the contract kind validates its
  // identity and every resolved icon in one pass.
  reframe(entries, () => defineSchema({ ...options.identity, icons }));
  return set;
};
