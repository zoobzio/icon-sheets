import type { Alias, Contract, IconifyIcon } from "@icon-sheets/schema";

/**
 * The subset of the core service a sprite reads: pass the service itself —
 * `defineSprite(icons)` — or any structurally matching container. `resolve`
 * reads through the service, so user overrides and an applied set are already in
 * effect — the sprite never sees sets or overrides directly. Reads stay lazy: a
 * reactive container tracks every read and re-runs the scope on change.
 */
export type Source<C extends Contract> = {
  /* Every alias in the active contract. */
  aliases(): Alias<C>[];

  /* An alias resolved to its effective icon literal. */
  resolve(alias: Alias<C>): IconifyIcon;
};

/**
 * An SVG sprite service over a contract. Every symbol is keyed by its alias
 * (`id="home"`) with no namespacing: applying a set or writing an override
 * changes what an alias *resolves to*, not its id, so a `<use href="#home">`
 * never has to change — only the `<symbol>` body behind it. That is what
 * `symbols` exists for: the partial batch an integration patches into the DOM in
 * place after `apply` / `update`.
 *
 * Rendering is cheap — `iconToSVG` plus symbol-string assembly measures about
 * 1.6µs per icon (a 2000-icon sheet ≈ 3.3ms), so there is no caching layer here.
 */
export type Sprite<C extends Contract> = {
  /* The constant `#id` an alias resolves to — never changes as state changes. */
  href(alias: Alias<C>): string;

  /* The `<symbol>` markup for an alias's effective icon. */
  symbol(alias: Alias<C>): string;

  /* The `<symbol>` markup for a batch of aliases — a partial re-render surface. */
  symbols(aliases: Alias<C>[]): string;

  /* The full sprite: one `<symbol>` per alias — the build-time / SSR artifact. */
  sheet(): string;
};
