import type { Identity } from "icon-sheets";

/**
 * An alias map authored as icon *refs* — `home: "lucide:home"`, or
 * `home: "$/host/path"` — the build-layer input `@icon-sheets/iconify` resolves into
 * icon literals.
 */
export type RefIcons = Record<string, string>;

/**
 * A switchable set authored as refs: identity plus a partial ref map rebinding a
 * subset of the contract's aliases. The module resolves and serves these over
 * the catalog wire protocol.
 */
export type RefSet = Identity & { icons: RefIcons };

/**
 * The module's configuration. Icons are authored as refs; the module resolves
 * them against the Iconify collections at build time and emits the flat contract
 * the runtime carries. `id` / `name` default when omitted.
 */
export interface NuxtIconSheetsConfig {
  /** The contract's identity id. Defaults to `"app"`. */
  id?: string;

  /** The contract's display name. Defaults to `"App Icons"`. */
  name?: string;

  /** Each semantic alias mapped to its icon ref. */
  icons: RefIcons;

  /**
   * The set catalog: switchable layers the app's server serves over the catalog
   * wire protocol. Keys are authoring convenience only — each set's own `id` is
   * the identity it is listed and retrieved under. Payloads are never bundled
   * with the app: the module loads them into nitro's server assets.
   */
  sets?: Record<string, RefSet>;

  /**
   * A remote catalog the app draws sets from instead of (or alongside) the
   * build-emitted `sets`. When `base` is set, the server routes proxy to it —
   * the browser only ever talks to the app's own origin, so the token never
   * reaches the client.
   *
   * Auth is a single env var, `NUXT_ICON_SHEETS_TOKEN`, sent as a bearer token. The
   * same variable is read from `process.env` at build (to resolve refs from a
   * private icon source) and from `runtimeConfig` at runtime (to load sets) — so
   * the consumer sets one env var and it works for both. `headers` carries any
   * additional non-secret headers.
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
