import type { Contract } from "@icon-sheets/schema";

import type { IconSheets, Options } from "./types";
import { makeIconSheets } from "./factory";

/**
 * Creates a runtime {@link IconSheets} service from an authored contract — the front
 * door for defining an icon set inline. `C` is inferred with `const` from the
 * contract literal, so `resolve` autocompletes the contract's aliases and a typo
 * fails to compile. Seeds a fresh state container (`{ contract, override: {} }`)
 * around the contract and boots {@link makeIconSheets}.
 *
 * @param contract - The identified base document: identity plus the icons map.
 * @param options - Read/write middleware over the seeded container.
 * @returns An {@link IconSheets} service over the contract.
 * @throws InvalidContractError when the contract violates its own shape.
 */
export const defineIconSheets = <const C extends Contract>(
  contract: C,
  options: Options<C> = {},
): IconSheets<C> => makeIconSheets({ contract, override: {} }, options);
