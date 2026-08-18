import { SchemaError, defineSchema } from "@icon-sheets/schema";
import type { Contract, Set } from "@icon-sheets/schema";
import type { IconifyJSON } from "@iconify/types";

import type {
  GenerateOptions,
  GenerateResult,
  GenerateSetOptions,
  RefEntry,
  Req,
  SchemeResolver,
} from "./types";
import { FILENAME } from "./constant";
import { emit } from "./emit";
import { plan } from "./refs";
import { assemble } from "./resolve";
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
 * through icon-sheets's own schema. The object an in-memory consumer (a framework
 * module) wants, before serialization.
 *
 * @param options - The ref config plus I/O and resolver hooks.
 */
export const resolveContract = async (
  options: GenerateOptions,
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
 * The programmatic entry point for a contract: resolves the ref config and
 * returns the emitted `icon-sheets.config.ts`. No filesystem writes — the caller owns
 * I/O both directions.
 *
 * @param options - The ref config plus I/O and resolver hooks.
 */
export const generate = async (
  options: GenerateOptions,
): Promise<GenerateResult> => {
  const contract = await resolveContract(options);
  const contents = emit(contract, "the ref config");
  return { filename: options.filename ?? FILENAME, contents };
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
export const resolveSet = async (options: GenerateSetOptions): Promise<Set> => {
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

/**
 * The programmatic entry point for a set: resolves the ref map and emits the Set
 * as JSON. Defaults the filename to `<id>.set.json`.
 *
 * @param options - The set identity, the contract aliases, the ref map, and hooks.
 */
export const generateSet = async (
  options: GenerateSetOptions,
): Promise<GenerateResult> => {
  const set = await resolveSet(options);
  const contents = `${JSON.stringify(set, null, 2)}\n`;
  const filename = options.filename ?? `${options.identity.id}.set.json`;
  return { filename, contents };
};
