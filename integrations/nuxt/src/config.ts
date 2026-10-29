import type { Set } from "icon-sheets";
import type { IconSheetsConfig } from "icon-sheets/config";

/**
 * The module's configuration. Icons are always authored as an
 * `@icon-sheets/kit` config; the module takes them three ways, and composes
 * them when more than one applies —
 *
 * - **A preset.** Name a package that exports a kit build:
 *
 *   ```ts
 *   export default defineNuxtConfig({
 *     iconSheets: { preset: "@acme/icons" },
 *   });
 *   ```
 *
 *   Every Nuxt layer may name one. The module reads them farthest layer
 *   first and lays each over the last, so an app's preset adds to a layer's
 *   and rebinds what it declares again.
 * - **Built locally.** With no `contract`, the module loads the app's own
 *   `icon-sheets.config.ts` and resolves it through the kit at build time,
 *   over any presets. With presets, the default file is built only when it
 *   exists; a `config` path is always built.
 * - **From a package.** Pass the documents the kit already generated — an
 *   icons package in a monorepo, or a published one — and they land over any
 *   presets:
 *
 *   ```ts
 *   import { prefix } from "@acme/icons";
 *   import config from "@acme/icons/config";
 *   import sets from "@acme/icons/sets";
 *
 *   export default defineNuxtConfig({
 *     iconSheets: { ...config, sets, prefix },
 *   });
 *   ```
 */
export interface NuxtIconSheetsConfig extends Partial<IconSheetsConfig> {
  /**
   * A package that exports a kit build — `./config`, `./sets` and a root
   * `prefix` — resolved from the directory of the Nuxt layer that names it,
   * so a layer's preset need not be a dependency of the app. Presets named
   * across layers compose, farthest layer first.
   */
  preset?: string;

  /**
   * The kit config to build from, relative to the project root. Defaults to
   * `icon-sheets.config.ts`. Ignored when a `contract` is passed. Built over
   * the presets when any are named.
   */
  config?: string;

  /**
   * The set catalog, when a `contract` is passed: the kit's `sets` module. Each
   * set is served under its own `id` over the catalog wire protocol; payloads
   * are never bundled with the app. A locally built config brings its own sets.
   */
  sets?: Record<string, Set>;

  /**
   * The symbol id prefix, when a `contract` is passed — the prefix the kit
   * built with, so the sprite's ids and each `<Icon>`'s `href` agree with it.
   * Defaults to no prefix. A locally built config brings its own prefix.
   */
  prefix?: string;

  /**
   * A remote catalog the app draws sets from instead of (or alongside) its own
   * sets. When `base` is set, the server routes proxy to it — the browser only
   * ever talks to the app's own origin, so the token never reaches the client.
   *
   * Auth is a single env var, `NUXT_ICON_SHEETS_TOKEN`, sent as a bearer token.
   * The same variable is read from `process.env` at build (to resolve a local
   * config's refs from a private icon source) and from `runtimeConfig` at
   * runtime (to load sets) — so the consumer sets one env var and it works for
   * both. `headers` carries any additional non-secret headers.
   */
  catalog?: {
    /** The remote catalog's origin — the `base` a client's wire routes extend. */
    base: string;

    /** Additional non-secret headers sent with every catalog request. */
    headers?: Record<string, string>;
  };
}

/**
 * Identity helper that types a Nuxt icon-sheets configuration.
 *
 * @param config - The Nuxt icon-sheets configuration.
 * @returns The same config.
 */
export const defineNuxtIconSheetsConfig = (
  config: NuxtIconSheetsConfig,
): NuxtIconSheetsConfig => config;

declare module "@nuxt/schema" {
  interface NuxtConfig {
    iconSheets?: NuxtIconSheetsConfig;
  }

  interface NuxtOptions {
    iconSheets?: NuxtIconSheetsConfig;
  }
}
