/**
 * The mount point of the module's catalog endpoints. The wire routes extend
 * this base — listings at `${MOUNT}/sets`, payloads at `${MOUNT}/sets/{id}` —
 * and a catalog client on the app side points its `base` here.
 */
export const MOUNT = "/api/icon-sheets";

/**
 * The server-assets base the module writes the catalog under: the routes read
 * their data from the `assets:${ASSETS}` storage.
 */
export const ASSETS = "icon-sheets";

/**
 * The asset key of the manifest: the entries the listing route filters, orders,
 * and windows.
 */
export const ENTRIES = "entries.json";

/**
 * The asset key of the payload record: the sets the retrieval route answers
 * with, keyed by id.
 */
export const SETS = "sets.json";

/**
 * The id of the DOM element holding the inline sprite sheet: written into the
 * body server-side, kept in sync client-side.
 */
export const CONTAINER = "icon-sheets-sprite";

/**
 * The asset key of the prebuilt base sprite markup: the server plugin reads it
 * and inlines it into the body. Built at module setup — the server runtime cannot
 * import the app's `#build` contract, so the markup is handed over as an asset.
 */
export const SPRITE = "sprite.html";

/**
 * The single env var carrying the remote catalog's bearer token. Read from
 * `process.env` at build (to auth ref resolution against a private source) and,
 * as the override for `runtimeConfig.iconSheets.token`, at runtime (to auth set
 * loading) — so one variable serves both phases.
 */
export const TOKEN_ENV = "NUXT_ICON_SHEETS_TOKEN";
