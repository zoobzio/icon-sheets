// icon-sheets/config — the configuration type and the config helpers.
import type { Contract } from "@icon-sheets/schema";
import type { Config } from "@icon-sheets/core";
import { clone } from "@icon-sheets/utils";

/**
 * An application's icon-sheets configuration: the base contract — identity plus every
 * semantic alias mapped to its resolved icon definition literal. The canonical
 * shape the `@icon-sheets/iconify` build layer emits into an `icon-sheets.config.ts`, and
 * the input {@link useIconSheetsConfig} seeds a runtime container from.
 */
export interface IconSheetsConfig<C extends Contract = Contract> {
  /** The base contract: identity plus the icons map. */
  contract: C;
}

/**
 * Identity helper that types an icon-sheets configuration and infers the alias union
 * from `contract`, so a consumer of the generated `icon-sheets.config.ts` gets the
 * exact contract back without restating it. It does nothing at runtime but carry
 * the inferred types.
 *
 * @param config - The icon-sheets configuration.
 * @returns The same config, narrowed to its inferred types.
 */
export const defineIconSheetsConfig = <const C extends Contract>(
  config: IconSheetsConfig<C>,
): IconSheetsConfig<C> => config;

/**
 * Seeds a fresh runtime state container from an authored configuration: a
 * detached clone of the contract as the active state, and an empty user
 * override. Nothing is held by reference, so every call yields an independent
 * container — containers seeded for concurrent sessions (SSR requests, previews)
 * cannot reach each other's state through the shared config.
 *
 * @param config - The icon-sheets configuration.
 * @returns A fresh {@link Config} container, ready for `makeIconSheets`.
 */
export const useIconSheetsConfig = <C extends Contract>(
  config: IconSheetsConfig<C>,
): Config<C> => {
  return {
    contract: clone(config.contract),
    override: {},
  };
};
