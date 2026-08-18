import { iconToSVG } from "@iconify/utils";

import type { Alias, Contract } from "@icon-sheets/schema";

import type { Source, Sprite } from "./types";

/**
 * Builds an SVG sprite from an icon-sheets service (or any structural {@link Source}).
 *
 * Every alias becomes one `<symbol id="{alias}">`, its body rendered from the
 * service's resolved icon through Iconify's own `iconToSVG` (defaults applied,
 * transforms baked in). Because ids are the bare alias — no set namespacing —
 * `href` is a constant and `<use href="#{alias}">` never changes as the active
 * set or user overrides change; only the symbol body does. `symbols` renders a
 * chosen subset, the partial batch an integration swaps into the DOM in place
 * after an `apply` / `update`; `sheet` renders every alias, the build-time or
 * SSR artifact.
 *
 * @param source - The service the sprite reads aliases and resolved icons from.
 */
export const defineSprite = <C extends Contract>(
  source: Source<C>,
): Sprite<C> => {
  const symbol = (alias: Alias<C>): string => {
    const { attributes, body } = iconToSVG(source.resolve(alias));
    return `<symbol id="${alias}" viewBox="${attributes.viewBox}">${body}</symbol>`;
  };

  const symbols = (aliases: Alias<C>[]): string =>
    aliases.map((alias) => symbol(alias)).join("");

  const href = (alias: Alias<C>): string => `#${alias}`;

  const sheet = (): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols(
      source.aliases(),
    )}</svg>`;

  return { href, symbol, symbols, sheet };
};
