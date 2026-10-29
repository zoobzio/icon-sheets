import { resolve } from "node:path";

import { SchemaError, defineSchema } from "@icon-sheets/schema";
import type { Contract, IconifyIcon, Identity, Set } from "@icon-sheets/schema";

import type { ParsedRef, RefEntry } from "./refs";
import type { GenerateOptions, Kit, KitConfig } from "./types";
import { assemble } from "./assemble";
import { compose } from "./compose";
import { OUT_DIR } from "./constant";
import { normalize } from "./path";
import { loadPresets } from "./preset";
import { plan } from "./refs";
import { acquire, request, resolver } from "./source";
import { validate } from "./validate";

/** Drops the unset entries of a set's partial ref map. */
const defined = (
  icons: Partial<Record<string, string>>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(icons).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );

/**
 * Runs a schema validation and re-frames any failure so each issue points at the
 * alias and the authored ref it came from, rather than a raw path into the
 * assembled document. A failure here means the resolved data is malformed —
 * either a resolution bug or a bad ref config — so the message says so.
 *
 * @param entries - The planned refs, for citing the offending ref.
 * @param run - The validation to guard.
 */
const reframe = <T>(entries: RefEntry[], run: () => T): T => {
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
      `@icon-sheets/kit: the resolved document violates icon-sheets's schema — this is a resolution bug or a bad ref config —\n${lines.join("\n")}`,
      { cause: error },
    );
  }
};

// Resolves one document's planned refs and validates the result. A set carrying
// icons is contract-shaped, so the contract kind validates either document's
// identity and every resolved icon in one pass.
const assembleDocument = async (
  identity: Identity,
  entries: RefEntry[],
  resolveRef: (ref: ParsedRef) => Promise<IconifyIcon | null>,
): Promise<Contract> => {
  const icons = await assemble(entries, resolveRef);
  const document: Contract = { ...identity, icons };
  reframe(entries, () => defineSchema(document));
  return document;
};

// The absolute path of every local file the entries name, each once.
const sources = (entries: RefEntry[], cwd: string): string[] => {
  const paths = entries.flatMap(({ parsed }) =>
    parsed.scheme === "file" ? [resolve(cwd, parsed.path)] : [],
  );
  return [...new Set(paths)];
};

/**
 * Checks a config and resolves it into a {@link Kit}: the contract and every
 * set in one pass, so each Iconify collection is acquired once however many
 * sets draw from it — local `@iconify-json/*` packages first, the Iconify API
 * otherwise. The only step that reads the network, local `@iconify-json/*`
 * packages or local SVG files. The presets the config extends are read from
 * their packages — already resolved, so nothing of theirs is fetched — and the
 * config's own documents are composed over them. No filesystem writes —
 * {@link generate} turns the result into files; a caller that wants the
 * documents themselves stops here.
 *
 * @param config - The kit config.
 * @param options - The I/O hooks ref resolution runs with.
 * @throws InvalidConfigError when the config breaks a rule, before resolving.
 * @throws MalformedPresetError when an extended package has no kit build.
 */
export const resolveKit = async (
  config: KitConfig,
  options: GenerateOptions = {},
): Promise<Kit> => {
  const {
    extends: packages = [],
    sets = {},
    prefix,
    outDir = OUT_DIR,
    icons,
    ...identity
  } = config;
  const cwd = options.cwd ?? process.cwd();
  const req = options.req ?? request;
  const presets = await loadPresets(packages, cwd);
  validate(
    config,
    presets.flatMap((preset) => Object.keys(preset.contract.icons)),
  );

  const base = plan(icons);
  const layers = Object.entries(sets).map(([id, { icons, ...identity }]) => ({
    identity: { id, ...identity },
    entries: plan(defined(icons)),
  }));
  const entries = [...base, ...layers.flatMap((layer) => layer.entries)];
  const collections = await acquire(
    entries.map((entry) => entry.parsed),
    { cwd, req },
  );
  const resolveRef = resolver(collections, req, cwd);

  const contract = await assembleDocument(identity, base, resolveRef);
  const resolved: Set[] = [];
  for (const layer of layers) {
    resolved.push(
      await assembleDocument(layer.identity, layer.entries, resolveRef),
    );
  }

  return {
    ...compose([...presets, { contract, sets: resolved, prefix }]),
    outDir: normalize(outDir),
    sources: sources(entries, cwd),
  };
};
