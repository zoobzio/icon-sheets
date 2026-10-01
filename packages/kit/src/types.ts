import type { Contract, Identity, Set } from "@icon-sheets/schema";
import type { Req, SchemeResolver } from "@icon-sheets/iconify";

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
 * The authored `icon-sheets.config.ts`: the contract's identity, every alias
 * mapped to its icon ref, and the optional sets, id prefix and output
 * directory.
 */
export type KitConfig<A extends string = string> = Identity & {
  /** Each semantic alias mapped to its icon ref (`prefix:name` or `$/host/path`). */
  icons: Record<A, string>;

  /**
   * Switchable sets, keyed by set id — the id each Set document carries, and
   * the name of its sprite file. Not an inference site for the alias union, so
   * a set that rebinds an undeclared alias is a type error rather than a
   * widening.
   */
  sets?: Record<string, KitSet<NoInfer<A>>>;

  /**
   * Prepended to every symbol id in the emitted sprites (`"ui-"` →
   * `<symbol id="ui-home">`), so several sheets can share one page. The
   * emitted `href` helper applies it. Defaults to no prefix.
   */
  prefix?: string;

  /** The output directory, relative to the project root. Defaults to `icons`. */
  outDir?: string;
};

/**
 * The I/O and resolver hooks passed through to `@icon-sheets/iconify`.
 */
export type GenerateOptions = {
  /** Where local `@iconify-json/*` packages resolve from; defaults to `process.cwd()`. */
  cwd?: string;

  /** The document loader every fetch passes through; defaults to plain `fetch`. */
  req?: Req;

  /** Scheme resolvers merged over the built-in `iconify` / `url` ones. */
  resolvers?: Record<string, SchemeResolver>;
};

/** Options for {@link build}: the resolver hooks plus where the project lives. */
export type BuildOptions = Omit<GenerateOptions, "cwd"> & {
  /** The project root; defaults to `process.cwd()`. */
  root?: string;

  /** The config file, relative to `root`; defaults to `icon-sheets.config.ts`. */
  config?: string;
};

/**
 * A config resolved: every ref turned into its icon literal. The one value the
 * emitters read — each takes a kit and returns the files it is responsible for,
 * so nothing downstream of resolution sees a ref or touches the network.
 */
export type Kit = {
  /** The resolved base contract: the config's identity plus every alias's icon. */
  contract: Contract;

  /** The resolved Set documents, in authored order. */
  sets: Set[];

  /** The symbol id prefix; empty when the config sets none. */
  prefix: string;
};

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
