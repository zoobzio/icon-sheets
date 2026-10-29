import type { Contract, Identity, Set } from "@icon-sheets/schema";

/**
 * A switchable set authored as refs: a name, optional discovery metadata, and a
 * partial ref map rebinding a subset of the config's aliases. Its id is the key
 * it is declared under in {@link KitConfig.sets}. Emitted as a Set document for
 * `apply`, and as its own sprite (the base sheet with the set's rebinds on top).
 */
export type KitSet<A extends string = string> = Omit<Identity, "id"> & {
  icons: Partial<Record<A, string>>;
};

/**
 * A package the config extends, named with the alias union its build declares,
 * so a set may rebind one of its aliases without a type error. Made by
 * {@link preset}; a plain package name in {@link KitConfig.extends} is the same
 * at build time, with no aliases known at authoring time.
 */
export type Preset<P extends string = never> = {
  /** The package name — one that exports a kit build. */
  readonly package: string;

  /** Never set; carries the preset's alias union in the type alone. */
  readonly aliases?: P;
};

/**
 * The authored `icon-sheets.config.ts`: the contract's identity, every alias
 * mapped to its icon ref, and the optional presets, sets, id prefix and output
 * directory.
 */
export type KitConfig<
  A extends string = string,
  P extends string = never,
> = Identity & {
  /**
   * Packages whose kit builds this config composes over — a package exporting
   * `./config`, `./sets` and a root `prefix`, resolved from the project root.
   * Their resolved icons become the base, in order, and `icons` lands on top:
   * a preset alias left alone is kept, and one declared again is rebound. A
   * set may rebind a preset's alias. Name a preset through {@link preset} to
   * type its aliases.
   */
  extends?: (string | Preset<P>)[];

  /**
   * Each semantic alias mapped to its icon ref: `prefix:name`, `$/host/path`,
   * or `./path.svg` for a local SVG relative to the project root.
   */
  icons: Record<A, string>;

  /**
   * Switchable sets, keyed by set id — the id each Set document carries, and
   * the name of its sprite file. Not an inference site for the alias union, so
   * a set that rebinds an undeclared alias is a type error rather than a
   * widening. A set may rebind the aliases of a typed preset.
   */
  sets?: Record<string, KitSet<NoInfer<A | P>>>;

  /**
   * Prepended to every symbol id in the emitted sprites (`"ui-"` →
   * `<symbol id="ui-home">`), so several sheets can share one page. The
   * emitted `href` helper applies it. Defaults to the prefix of the presets,
   * or to no prefix.
   */
  prefix?: string;

  /** The output directory, relative to the project root. Defaults to `icons`. */
  outDir?: string;
};

/**
 * The document loader every fetch passes through — the seam for authenticated
 * or offline sources. Receives the URL, returns the raw response text. Defaults
 * to plain `fetch` (throwing on a non-OK status).
 */
export type Req = (src: URL) => Promise<string>;

/**
 * The I/O hooks ref resolution runs with.
 */
export type GenerateOptions = {
  /**
   * Where local `@iconify-json/*` packages resolve from, and what `./` file
   * refs are relative to; defaults to `process.cwd()`.
   */
  cwd?: string;

  /** The document loader every fetch passes through; defaults to plain `fetch`. */
  req?: Req;
};

/** Options for {@link build}: the I/O hooks plus where the project lives. */
export type BuildOptions = Omit<GenerateOptions, "cwd"> & {
  /** The project root; defaults to `process.cwd()`. */
  root?: string;

  /** The config file, relative to `root`; defaults to `icon-sheets.config.ts`. */
  config?: string;
};

/**
 * A config resolved: every ref turned into its icon literal, and every optional
 * field settled. What {@link resolveKit} returns — the one value the emitters
 * read, and the in-memory form a consumer that wants documents rather than
 * files (a framework module) works from. Nothing downstream of it sees a ref or
 * touches the network.
 */
export type Kit = {
  /** The resolved base contract: the config's identity plus every alias's icon. */
  contract: Contract;

  /** The resolved Set documents, in authored order. */
  sets: Set[];

  /** The symbol id prefix; empty when the config sets none. */
  prefix: string;

  /** The output directory, normalized and relative to the project root. */
  outDir: string;

  /**
   * The absolute path of every local SVG the config's `./` refs name — what a
   * consumer watches to rebuild when one is edited.
   */
  sources: string[];
};

/**
 * The documents a kit build carries: the resolved contract, the resolved sets
 * and the symbol id prefix. What a package exports, what {@link loadPreset}
 * reads back, and what {@link compose} layers.
 */
export type Documents = Pick<Kit, "contract" | "sets" | "prefix">;

/**
 * One layer of a composition: documents whose prefix may be unset, to take
 * the prefix of the layers under it.
 */
export type Layer = Omit<Documents, "prefix"> & { prefix?: string };

/** One emitted file, its path relative to the output directory. */
export type OutputFile = {
  path: string;
  contents: string;
};

/**
 * What {@link generate} returns: the files to write under `outDir`. No
 * filesystem writes — the caller owns I/O.
 */
export type Output = {
  outDir: string;
  files: OutputFile[];
};
