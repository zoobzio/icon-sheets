/**
 * The config file the CLI looks for in the project root when `--config` is not
 * given.
 */
export const FILENAME = "icon-sheets.config.ts";

/**
 * The default output directory, relative to the project root.
 */
export const OUT_DIR = "icons";

/**
 * The manifest a write leaves in the output directory: the paths it produced,
 * so the next write can remove the ones it no longer does without touching
 * anything the kit did not write.
 */
export const MANIFEST = ".icon-sheets.json";

/**
 * What an alias, a set id, or a prefix may contain. Each lands unescaped in a
 * symbol `id`, a `#fragment`, and (for set ids) a filename, so the kit holds
 * them to a conservative charset rather than escaping per context.
 */
export const TOKEN = /^[\w.-]+$/;
