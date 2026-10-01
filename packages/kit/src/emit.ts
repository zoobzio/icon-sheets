import type { Kit, OutputFile } from "./types";
import { renderBase, renderSet } from "./render";
import { banner, json, pair, union } from "./source";

/**
 * The root entry: the alias list and its guard, the set ids, and the `href`
 * helper that applies the id prefix. Carries no icon data, so importing the
 * guard never pulls the contract or a sheet into a bundle.
 */
const index = (kit: Kit): OutputFile[] => {
  const { contract, prefix } = kit;
  const aliases = Object.keys(contract.icons);
  const setIds = kit.sets.map((set) => set.id);
  return pair(
    "index",
    [
      banner(contract.id),
      `export const prefix = ${JSON.stringify(prefix)};`,
      `export const aliases = Object.freeze(${json(aliases)});`,
      `export const setIds = Object.freeze(${json(setIds)});`,
      "const known = new Set(aliases);",
      `export const isAlias = (value) => typeof value === "string" && known.has(value);`,
      "export const href = (alias) => `#${prefix}${alias}`;",
    ],
    [
      banner(contract.id),
      `export type Alias =${union(aliases)};`,
      `export type SetId =${union(setIds)};`,
      `export declare const prefix: ${JSON.stringify(prefix)};`,
      "export declare const aliases: readonly Alias[];",
      "export declare const setIds: readonly SetId[];",
      "export declare const isAlias: (value: unknown) => value is Alias;",
      `export declare const href: <A extends Alias>(alias: A) => \`#${prefix}\${A}\`;`,
    ],
  );
};

/**
 * The `./config` entry: the resolved contract, and the `{ contract }` config
 * `useIconSheetsConfig` seeds a runtime container from. Plain data — no runtime
 * import of icon-sheets — typed against the exact alias union.
 */
const config = (kit: Kit): OutputFile[] =>
  pair(
    "config",
    [
      banner(kit.contract.id),
      `export const contract = ${json(kit.contract)};`,
      "export default { contract };",
    ],
    [
      banner(kit.contract.id),
      'import type { IconifyIcon, Identity } from "icon-sheets";',
      'import type { IconSheetsConfig } from "icon-sheets/config";',
      'import type { Alias } from "./index.mjs";',
      "export type Contract = Identity & { icons: Record<Alias, IconifyIcon> };",
      "export declare const contract: Contract;",
      "declare const config: IconSheetsConfig<Contract>;",
      "export default config;",
    ],
  );

/**
 * The `./sheet` entry: the base sheet markup as the default export, and each
 * set's sheet keyed by set id. Hidden sprites, ready to inline into a page.
 */
const sheet = (kit: Kit): OutputFile[] => {
  const sheets = Object.fromEntries(
    kit.sets.map((set) => [set.id, renderSet(kit, set, true)]),
  );
  return pair(
    "sheet",
    [
      banner(kit.contract.id),
      `export const sheets = Object.freeze(${json(sheets)});`,
      `export default ${JSON.stringify(renderBase(kit, true))};`,
    ],
    [
      banner(kit.contract.id),
      'import type { SetId } from "./index.mjs";',
      "export declare const sheets: { readonly [K in SetId]: string };",
      "declare const sheet: string;",
      "export default sheet;",
    ],
  );
};

/**
 * The `./sets` entry: each resolved Set document keyed by its id, ready for a
 * runtime service's `apply`.
 */
const sets = (kit: Kit): OutputFile[] => {
  const keyed = Object.fromEntries(kit.sets.map((set) => [set.id, set]));
  return pair(
    "sets",
    [
      banner(kit.contract.id),
      `export const sets = Object.freeze(${json(keyed)});`,
      "export default sets;",
    ],
    [
      banner(kit.contract.id),
      'import type { Set as IconSet } from "icon-sheets";',
      'import type { Alias, SetId } from "./index.mjs";',
      "export declare const sets: { readonly [K in SetId]: IconSet<Alias> };",
      "export default sets;",
    ],
  );
};

/**
 * The standalone sprite files: `sprite.svg` for the base and `sprite.{set}.svg`
 * for each set, visible so `<use href="/sprite.svg#home">` can reference them.
 */
const sprites = (kit: Kit): OutputFile[] => [
  { path: "sprite.svg", contents: `${renderBase(kit, false)}\n` },
  ...kit.sets.map((set) => ({
    path: `sprite.${set.id}.svg`,
    contents: `${renderSet(kit, set, false)}\n`,
  })),
];

/**
 * Emits every file a kit produces —
 *
 * - `index` — `Alias` / `SetId` types, `aliases`, `isAlias`, `setIds`, `href`
 * - `config` — the contract, and `{ contract }` for `useIconSheetsConfig`
 * - `sheet` — the hidden base sheet (default) and each set's sheet
 * - `sets` — the Set documents for `apply`
 * - `sprite.svg`, `sprite.{set}.svg` — standalone sprite files
 *
 * each module as an `.mjs` with its `.d.mts` beside it.
 *
 * @param kit - The resolved kit.
 */
export const emit = (kit: Kit): OutputFile[] => [
  ...index(kit),
  ...config(kit),
  ...sheet(kit),
  ...sets(kit),
  ...sprites(kit),
];
