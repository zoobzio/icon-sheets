import { SchemaError, defineSchema } from "@icon-sheets/schema";
import type { Contract, Identity, Set } from "@icon-sheets/schema";

import type {
  RefEntry,
  ResolveAllOptions,
  ResolveOptions,
  ResolveSetOptions,
  Resolved,
  SchemeResolver,
  SharedOptions,
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

// Acquires every collection the entries draw from — one batched request per
// prefix, however many documents the entries span — and builds the run's
// scheme-resolver map: the built-in iconify (over those collections) and url
// resolvers, with any caller override merged on.
const prepare = async (
  entries: RefEntry[],
  options: SharedOptions,
): Promise<Record<string, SchemeResolver>> => {
  const cwd = options.cwd ?? process.cwd();
  const req = options.req ?? request;
  const collections = await acquire(
    entries.map((entry) => entry.parsed),
    { cwd, req },
  );
  return {
    iconify: iconifyResolver(collections),
    url: urlResolver(req),
    ...options.resolvers,
  };
};

// A set may only rebind aliases the contract declares.
const membership = (aliases: string[], icons: Record<string, string>): void => {
  const known = new Set(aliases);
  const unknown = Object.keys(icons).filter((alias) => !known.has(alias));
  if (unknown.length > 0) {
    throw new Error(
      `@icon-sheets/iconify: the set rebinds aliases the contract does not declare: ${unknown.join(", ")}`,
    );
  }
};

// Resolves one document's planned refs and validates the result. A set carrying
// icons is contract-shaped, so the contract kind validates either document's
// identity and every resolved icon in one pass.
const assembleDocument = async (
  identity: Identity,
  entries: RefEntry[],
  resolvers: Record<string, SchemeResolver>,
): Promise<Contract> => {
  const icons = await assemble(entries, resolvers);
  const document: Contract = { ...identity, icons };
  reframe(entries, () => defineSchema(document));
  return document;
};

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
  const { icons, ...identity } = options.config;
  const entries = plan(icons);
  const resolvers = await prepare(entries, options);
  return assembleDocument(identity, entries, resolvers);
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
  membership(options.aliases, options.icons);
  const entries = plan(options.icons);
  const resolvers = await prepare(entries, options);
  return assembleDocument(options.identity, entries, resolvers);
};

/**
 * Resolves a ref config and its sets in one pass — the same documents
 * {@link resolveContract} and {@link resolveSet} return, but with every ref
 * planned up front and the collections acquired once, so a prefix the contract
 * and several sets draw from costs one request rather than one per document.
 * Each set is membership-checked against the config's aliases.
 *
 * @param options - The ref config, the ref sets, and the I/O and resolver hooks.
 */
export const resolveAll = async (
  options: ResolveAllOptions,
): Promise<Resolved> => {
  const { icons, ...identity } = options.config;
  const aliases = Object.keys(icons);
  const base = plan(icons);
  const layers = options.sets.map(({ icons, ...identity }) => {
    membership(aliases, icons);
    return { identity, entries: plan(icons) };
  });

  const resolvers = await prepare(
    [...base, ...layers.flatMap((layer) => layer.entries)],
    options,
  );

  const contract = await assembleDocument(identity, base, resolvers);
  const sets: Set[] = [];
  for (const layer of layers) {
    sets.push(await assembleDocument(layer.identity, layer.entries, resolvers));
  }
  return { contract, sets };
};
