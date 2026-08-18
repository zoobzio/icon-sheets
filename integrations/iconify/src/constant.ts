/**
 * The default name of the emitted configuration file.
 */
export const FILENAME = "icon-sheets.config.ts";

/**
 * The public Iconify API — the fallback when a collection is not installed
 * locally. A batched request per prefix returns a trimmed IconifyJSON whose
 * alias dependencies are already resolved, so `getIconData` works on it
 * directly.
 */
export const API_BASE = "https://api.iconify.design";

/**
 * A key that may appear unquoted in an object literal.
 */
export const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
