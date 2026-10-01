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
 * What an alias, a set id, or a prefix may contain. Each lands unescaped in a
 * symbol `id`, a `#fragment`, and (for set ids) a filename, so the kit holds
 * them to a conservative charset rather than escaping per context.
 */
export const TOKEN = /^[\w.-]+$/;

/**
 * A per-set sprite file name. Their set varies between runs, so a write
 * removes any matching file the current output does not produce.
 */
export const SET_SPRITE = /^sprite\.[\w.-]+\.svg$/;
