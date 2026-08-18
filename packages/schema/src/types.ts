import type { IconifyIcon } from "@iconify/types";

// The Iconify spec's single-icon type is re-exported as-is: icon-sheets's contract is
// a flat map of resolved icon definition literals in Iconify format, so this is
// the one spec type the runtime contract is built from. The IconifyJSON
// collection format — the *source* documents — belongs to the build layer
// (`@icon-sheets/iconify`), never the runtime, so it is not re-exported here.
export type { IconifyIcon };

/**
 * The identity and discovery metadata every icon-sheets document carries: a required
 * `id` (the stable key a catalog retrieves by) and `name` (display), plus
 * optional `description` and `tags` a picker renders and a catalog query
 * filters on.
 */
export type Identity = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
};

/** The base alias map — keys are the semantic aliases, values resolved icons. */
export type AliasMap = Record<string, IconifyIcon>;

/**
 * A partial override of the base alias map: a subset of known aliases each
 * rebound to a resolved icon literal. The payload a {@link Set} carries and
 * `apply`/`update` merge in.
 */
export type Overrides<A extends string = string> = Partial<
  Record<A, IconifyIcon>
>;

/**
 * The identified base document: identity plus the complete `icons` map that
 * defines every alias. The single value a schema is derived from and the runtime
 * resolves against — the analog of a theme.
 */
export type Contract = Identity & { icons: AliasMap };

/**
 * A switchable layer over a contract: identity plus an optional `icons` map of
 * known-alias overrides. The catalog payload and the argument to `apply` — it
 * rebinds a subset of the contract's aliases and carries its own identity.
 */
export type Set<A extends string = string> = Identity & {
  icons?: Overrides<A>;
};

/** Any alias name declared by a contract's icons — the one type-bearing union. */
export type Alias<C extends Contract> = keyof C["icons"] & string;

/**
 * The closed set of failure kinds a validation rule can emit. A stable
 * discriminant callers branch on, rather than a free-text string.
 */
export type Code =
  | "not_string"
  | "not_object"
  | "not_array"
  | "not_icon"
  | "unknown_alias"
  | "missing_key";

/**
 * A validation failure. `code` is the stable discriminant, `message` is
 * human-readable, `path` is filled in as composite rules descend, and
 * `received` carries the offending value.
 */
export type Issue = {
  code: Code;
  message: string;
  path?: string[];
  received?: unknown;
};

/**
 * A validation rule: returns an {@link Issue} describing what is wrong, or
 * `undefined` when the value satisfies the rule.
 */
export type Rule = (v: unknown) => Issue | undefined;

/**
 * The validation vocabulary for a contract: each kind mapped to the type a
 * value of that kind narrows to. `icon` is a resolved icon literal, `alias` a
 * known alias name, `overrides` a bare partial map, `set` an identified layer,
 * `contract` the whole base document.
 */
export type Domain<C extends Contract> = {
  icon: IconifyIcon;
  alias: Alias<C>;
  overrides: Overrides<Alias<C>>;
  set: Set<Alias<C>>;
  contract: C;
};

/** The name of a kind — a key of {@link Domain}. */
export type Kind = keyof Domain<Contract>;

/** A list of {@link Rule}s per kind; a value passes a kind when all return no issue. */
export type Rules = { [K in Kind]: Rule[] };

/**
 * The aliases a schema reads off a contract: its declared alias names, read from
 * `contract.icons`. The membership checks draw on these. Held as a read-only set
 * so the layer type {@link Set} can own the bare name without shadowing it.
 */
export type Enum<C extends Contract> = {
  aliases: ReadonlySet<Alias<C>>;
};

/** The outcome of an {@link Inspect}: the narrowed value, or the issues. */
export type Result<V> =
  { success: true; data: V } | { success: false; issues: Issue[] };

/** Boolean type predicates per kind. */
export type Check<C extends Contract> = {
  [K in Kind]: (v: unknown) => v is Domain<C>[K];
};

/**
 * Assertion functions per kind: return when the value satisfies the kind, or
 * throw a {@link SchemaError}. Spelled out per kind since `asserts` predicates
 * cannot be produced by a mapped type.
 */
export type Assert<C extends Contract> = {
  icon: (v: unknown) => asserts v is IconifyIcon;
  alias: (v: unknown) => asserts v is Alias<C>;
  overrides: (v: unknown) => asserts v is Overrides<Alias<C>>;
  set: (v: unknown) => asserts v is Set<Alias<C>>;
  contract: (v: unknown) => asserts v is C;
};

/** Parse functions per kind: assert and return the value narrowed. */
export type Parse<C extends Contract> = {
  [K in Kind]: (v: unknown) => Domain<C>[K];
};

/** Inspect functions per kind: return a {@link Result} rather than throwing. */
export type Inspect<C extends Contract> = {
  [K in Kind]: (v: unknown) => Result<Domain<C>[K]>;
};

/**
 * The bundle {@link defineSchema} returns for a contract: the source contract
 * (the construction-time baseline), the aliases read off it, and the check /
 * assert / parse / inspect families built from the rules.
 */
export type Schema<C extends Contract> = {
  base: C;
  enums: Enum<C>;
  check: Check<C>;
  assert: Assert<C>;
  parse: Parse<C>;
  inspect: Inspect<C>;
};
