import type {
  Alias,
  Contract,
  IconifyIcon,
  Identity,
  Overrides,
  Schema,
  Set,
} from "@icon-sheets/schema";

/**
 * The caller-owned live state an {@link IconSheets} service reads and writes: the
 * active contract definition and the user override layer that `set` populates.
 * Pass a plain object for inert state, or a reactive proxy to have reads and
 * writes tracked — the hook a framework integration binds runtime swapping to.
 *
 * `contract` reads as the caller's own type but writes accept any
 * contract-satisfying document: `apply` and `update` store merged contracts,
 * which satisfy the contract without being the caller's exact type. A plain
 * `{ contract, override }` object satisfies both sides.
 */
export type Config<C extends Contract> = {
  get contract(): C;
  set contract(value: Contract);
  override: Overrides<Alias<C>>;
};

/**
 * Read/write middleware over the state container. Each slot intercepts the
 * matching `config` field and transforms the value as it passes through — the
 * integration's hook for instrumenting state without the service knowing about
 * it. Omit a slot to pass the value through untouched.
 */
export type Options<C extends Contract> = {
  get?: {
    config?: {
      contract?: (contract: C) => C;
      override?: (override: Overrides<Alias<C>>) => Overrides<Alias<C>>;
    };
  };
  set?: {
    config?: {
      contract?: (contract: Contract) => Contract;
      override?: (override: Overrides<Alias<C>>) => Overrides<Alias<C>>;
    };
  };
};

/**
 * A runtime icon service over a contract. `resolve` reads an alias through the
 * user override then the active contract; `apply` becomes a set resolved
 * against the construction-time baseline (clearing the override); `update`
 * merges overrides into the active definition; `set` writes a single override.
 * The active state is read and written through `config`.
 */
export interface IconSheets<C extends Contract> {
  /**
   * The caller-owned live state, fronted by get/set middleware — the single
   * place state is read or written raw.
   */
  config: Config<C>;

  /** The validation bundle for the contract. */
  schema: Schema<C>;

  /** Every alias in the active contract. */
  aliases(): Alias<C>[];

  /**
   * Resolve an alias to its effective icon literal: the user override if set,
   * else the active contract's icon. A pure lookup. Throws
   * {@link UnknownAliasError} when the alias is not declared.
   */
  resolve(alias: Alias<C>): IconifyIcon;

  /**
   * Becomes the set resolved against the construction-time baseline — identity
   * from the set, icons the baseline overlaid with the set's — and clears the
   * user override. The runtime swap between whole documents. Throws
   * {@link InvalidSetError} when the set steps outside the contract.
   */
  apply(set: Set<Alias<C>>): void;

  /**
   * Merges an overrides map into the active contract's icons; identity and the
   * user override are untouched. A definition-level edit that outlives a later
   * `reset`. Throws {@link InvalidOverridesError} when it steps outside the
   * contract.
   */
  update(overrides: Overrides<Alias<C>>): void;

  /**
   * Writes a single alias into the user override layer — the topmost resolution
   * layer. A write outside the contract (an unknown alias, or a malformed icon)
   * is a silent no-op. The override holds a detached copy. Tracked by `dirty`,
   * cleared by `reset`.
   */
  set(alias: Alias<C>, icon: IconifyIcon): void;

  /** Whether the user override holds any edits. */
  dirty(): boolean;

  /** Clears the user override, discarding the live edits. */
  reset(): void;

  /**
   * The effective drift from the baseline as a re-appliable overrides map: the
   * active icons with the user override on top, diffed against the baseline
   * icons. Aliases matching the baseline drop out. Feeding the result through
   * `update` reproduces the drift.
   */
  delta(): Overrides<Alias<C>>;

  /**
   * Validates a set against the contract and returns it unchanged — the gate
   * for a set that arrives at runtime (fetched from a catalog, authored) before
   * it is handed to `apply` or stored. The active state is not touched.
   */
  create(set: Set<Alias<C>>): Set<Alias<C>>;

  /**
   * Snapshots the effective icons under a new identity as a detached contract;
   * not applied. The build/export path for a live-edited icon set.
   */
  extract(identity: Identity): Contract;
}
