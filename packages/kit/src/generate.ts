import { posix } from "node:path";

import { resolveContract, resolveSet } from "@icon-sheets/iconify";
import type { AliasMap, Contract, Set } from "@icon-sheets/schema";
import { defineSprite } from "@icon-sheets/svg";
import { merge } from "@icon-sheets/utils";

import type {
  GenerateOptions,
  KitConfig,
  KitSet,
  Output,
  OutputFile,
} from "./types";
import { OUT_DIR, TOKEN } from "./constant";
import { emitConfig, emitIndex, emitSets, emitSheet } from "./emit";

const fail = (message: string): never => {
  throw new Error(`@icon-sheets/kit: ${message}`);
};

/**
 * Checks everything that lands in an id, a fragment, a filename or a path
 * before any resolution runs, so a bad config fails without touching the
 * network. Returns the normalized output directory.
 */
const validate = (
  icons: Record<string, string>,
  sets: Record<string, KitSet>,
  prefix: string,
  outDir: string,
): string => {
  const bad = Object.keys(icons).filter((alias) => !TOKEN.test(alias));
  if (bad.length > 0) {
    fail(
      `aliases may only contain letters, digits, "_", "-" and "." — invalid: ${bad.join(", ")}`,
    );
  }
  if (prefix !== "" && !TOKEN.test(prefix)) {
    fail(
      `prefix ${JSON.stringify(prefix)} may only contain letters, digits, "_", "-" and "."`,
    );
  }
  const seen = new globalThis.Set<string>();
  for (const set of Object.values(sets)) {
    if (!TOKEN.test(set.id)) {
      fail(
        `set id ${JSON.stringify(set.id)} may only contain letters, digits, "_", "-" and "."`,
      );
    }
    if (seen.has(set.id)) {
      fail(`set id "${set.id}" is declared more than once`);
    }
    seen.add(set.id);
  }
  const dir = posix.normalize(outDir.replaceAll("\\", "/")).replace(/\/$/, "");
  if (posix.isAbsolute(dir) || dir === "." || dir.startsWith("..")) {
    fail(
      `outDir ${JSON.stringify(outDir)} must be a subdirectory of the project root`,
    );
  }
  return dir;
};

/** Drops the unset entries of a partial ref map. */
const defined = (icons: Partial<Record<string, string>>) =>
  Object.fromEntries(
    Object.entries(icons).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );

/**
 * Generates icons from a kit config: resolves the contract and every set
 * through `@icon-sheets/iconify`, then emits the modules and sprites —
 *
 * - `index` — `Alias` / `SetId` types, `aliases`, `isAlias`, `setIds`, `href`
 * - `config` — the contract, and `{ contract }` for `useIconSheetsConfig`
 * - `sheet` — the hidden base sheet (default) and each set's sheet
 * - `sets` — the Set documents for `apply`
 * - `sprite.svg`, `sprite.{set}.svg` — standalone sprite files
 *
 * into `outDir`. An app imports them by relative path; a published package
 * points its `exports` at them. No filesystem writes.
 *
 * @param config - The kit config.
 * @param options - The I/O and resolver hooks passed to `@icon-sheets/iconify`.
 */
export const generate = async (
  config: KitConfig,
  options: GenerateOptions = {},
): Promise<Output> => {
  const {
    sets = {},
    prefix = "",
    outDir = OUT_DIR,
    icons,
    ...identity
  } = config;
  const dir = validate(icons, sets, prefix, outDir);

  const contract = await resolveContract({
    ...options,
    config: { ...identity, icons },
  });
  const aliases = Object.keys(contract.icons);

  const resolved: Set[] = [];
  for (const set of Object.values(sets)) {
    const { icons: refs, ...setIdentity } = set;
    resolved.push(
      await resolveSet({
        ...options,
        identity: setIdentity,
        aliases,
        icons: defined(refs),
      }),
    );
  }

  const render = (map: AliasMap, hidden: boolean): string => {
    const sprite = defineSprite<Contract>(
      { aliases: () => Object.keys(map), resolve: (alias) => map[alias] },
      { prefix },
    );
    return sprite.sheet({ hidden });
  };
  // A set's sheet is exactly what `apply` would make active: the core merge.
  const layered = (set: Set): AliasMap => merge(contract, set).icons;

  const sheets = Object.fromEntries(
    resolved.map((set) => [set.id, render(layered(set), true)]),
  );

  const files: OutputFile[] = [
    ...emitIndex(
      contract.id,
      aliases,
      resolved.map((set) => set.id),
      prefix,
    ),
    ...emitConfig(contract),
    ...emitSheet(contract.id, render(contract.icons, true), sheets),
    ...emitSets(contract.id, resolved),
    { path: "sprite.svg", contents: `${render(contract.icons, false)}\n` },
    ...resolved.map((set) => ({
      path: `sprite.${set.id}.svg`,
      contents: `${render(layered(set), false)}\n`,
    })),
  ];

  return { outDir: dir, files };
};
