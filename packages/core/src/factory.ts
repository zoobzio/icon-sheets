import { equals, keys } from "objectively";
import { defineSchema } from "@icon-sheets/schema";
import type {
  Alias,
  Contract,
  IconifyIcon,
  Identity,
  Overrides,
  Schema,
  Set,
} from "@icon-sheets/schema";
import { clone, copy, merge } from "@icon-sheets/utils";

import type { Config, IconSheets, Options } from "./types";
import {
  InvalidContractError,
  InvalidOverridesError,
  InvalidSetError,
  UnknownAliasError,
  reframe,
} from "./error";

/**
 * Builds the runtime {@link IconSheets} service over a state container, for any
 * complete contract — authored via {@link defineIconSheets}, or machine-built (a
 * `configure`-widened preset, a merged contract) whose icons only the runtime
 * schema can rule on. The contract is validated against its own shape up front
 * either way.
 *
 * Every read and write goes through `proxy`, so the caller decides whether state
 * is plain (tests, node) or a reactive proxy (Vue); `options` can intercept and
 * transform each read and write. `resolve` reads the active contract's icon with
 * the user override on top; `set` writes only the override; `update` and `apply`
 * change the definition. Applying a set clears the override.
 *
 * The baseline — a detached clone of the contract at construction, held as
 * `schema.base` — is what `apply` resolves sets against and `delta` diffs from.
 *
 * @param config - The caller-owned container: active contract and override.
 * @param options - Read/write middleware over `config`.
 */
export const makeIconSheets = <C extends Contract>(
  config: Config<C>,
  options: Options<C> = {},
): IconSheets<C> => {
  /**
   * The active state, fronted by get/set middleware. Reads pull the raw value
   * from the container and pipe it through the matching `options.get`
   * middleware on the way out; writes pipe the incoming value through
   * `options.set` before storing it. The container stays the source of truth;
   * a missing middleware is a passthrough.
   */
  const proxy: Config<C> = {
    get contract() {
      const through = options.get?.config?.contract;
      return through ? through(config.contract) : config.contract;
    },
    set contract(value) {
      const through = options.set?.config?.contract;
      config.contract = through ? through(value) : value;
    },
    get override() {
      const through = options.get?.config?.override;
      return through ? through(config.override) : config.override;
    },
    set override(value) {
      const through = options.set?.config?.override;
      config.override = through ? through(value) : value;
    },
  };

  /**
   * Validation derived from the baseline — a complete contract is itself a valid
   * document. The contract is cloned on the way in, so `schema.base` doubles as
   * the detached baseline snapshot the merge and delta paths work from, never a
   * live reference into a reactive container.
   */
  const schema: Schema<C> = reframe(InvalidContractError, () =>
    defineSchema(clone(proxy.contract)),
  );

  const aliases = (): Alias<C>[] => keys(proxy.contract.icons);

  const resolve = (alias: Alias<C>): IconifyIcon => {
    const override = proxy.override[alias];
    if (override) {
      return override;
    }
    const icon = proxy.contract.icons[alias];
    if (!icon) {
      throw new UnknownAliasError(alias);
    }
    return icon;
  };

  const apply = (set: Set<Alias<C>>): void => {
    reframe(InvalidSetError, () => schema.assert.set(set));
    proxy.contract = merge(schema.base, set);
    proxy.override = {};
  };

  const update = (overrides: Overrides<Alias<C>>): void => {
    reframe(InvalidOverridesError, () => schema.assert.overrides(overrides));
    const active = proxy.contract;
    proxy.contract = {
      ...active,
      icons: { ...active.icons, ...copy(overrides) },
    };
  };

  const set = (alias: Alias<C>, icon: IconifyIcon): void => {
    if (!schema.check.overrides({ [alias]: icon })) {
      return;
    }
    proxy.override = { ...proxy.override, [alias]: copy(icon) };
  };

  const dirty = (): boolean => Object.keys(proxy.override).length > 0;

  const reset = (): void => {
    proxy.override = {};
  };

  // The effective icon for an alias — the user override on top of the active
  // contract — without the missing-alias throw `resolve` carries.
  const effective = (alias: Alias<C>): IconifyIcon =>
    proxy.override[alias] ?? proxy.contract.icons[alias];

  const delta = (): Overrides<Alias<C>> => {
    const baseline = schema.base.icons;
    // Keyed as a plain record: a generic `Overrides<Alias<C>>` cannot be indexed
    // for writing. Every key is a real alias, so it is a valid Overrides on exit.
    const out: Record<string, IconifyIcon> = {};
    for (const alias of keys(proxy.contract.icons)) {
      const current = effective(alias);
      if (!equals(baseline[alias], current)) {
        out[alias] = current;
      }
    }
    // Narrow the plain record back to a typed Overrides through the schema —
    // every key is a known alias, so this always passes, and it avoids a cast.
    return schema.parse.overrides(out);
  };

  const create = (set: Set<Alias<C>>): Set<Alias<C>> => {
    reframe(InvalidSetError, () => schema.assert.set(set));
    return set;
  };

  const extract = (identity: Identity): Contract => {
    const icons: Contract["icons"] = {};
    for (const alias of keys(proxy.contract.icons)) {
      icons[alias] = copy(effective(alias));
    }
    const contract = { ...identity, icons };
    reframe(InvalidContractError, () => schema.assert.contract(contract));
    return contract;
  };

  return {
    config: proxy,
    schema,
    aliases,
    resolve,
    apply,
    update,
    set,
    dirty,
    reset,
    delta,
    create,
    extract,
  };
};
