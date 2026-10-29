import { stringToIcon } from "@iconify/utils";

/**
 * A ref parsed into a resolvable shape, discriminated by scheme. `iconify` is a
 * `prefix:name` reference into an Iconify collection; `url` is a single icon
 * fetched from `https://host/path`; `file` is a local SVG, its `path` relative
 * to the project root.
 */
export type ParsedRef =
  | { scheme: "iconify"; provider: string; prefix: string; name: string }
  | { scheme: "url"; url: URL }
  | { scheme: "file"; path: string };

/**
 * One planned ref: the alias it binds, the authored string, and the parsed form.
 * The unit of work acquisition and resolution both walk.
 */
export type RefEntry = {
  alias: string;
  raw: string;
  parsed: ParsedRef;
};

/** The URL scheme sigil: `$/host/path` fetches a single icon from a URL. */
const URL_SIGIL = "$/";

/** The file scheme sigils: `./path` or `../path` reads a local SVG file. */
const FILE_SIGILS = ["./", "../"];

/**
 * Parses one authored ref string into a {@link ParsedRef}. Three schemes:
 * `$/host/path` targets `https://host/path` (a single-icon JSON endpoint),
 * `./path` or `../path` names a local SVG file relative to the project root,
 * and `prefix:name` parses through Iconify's own `stringToIcon` into a
 * collection reference. An unparseable string throws, naming the alias and the
 * ref, so a typo in the config points at exactly where.
 *
 * @param alias - The alias the ref binds, for error attribution.
 * @param raw - The authored ref string.
 */
export const parseRef = (alias: string, raw: string): ParsedRef => {
  if (raw.startsWith(URL_SIGIL)) {
    const rest = raw.slice(URL_SIGIL.length);
    try {
      return { scheme: "url", url: new URL(`https://${rest}`) };
    } catch {
      throw new Error(
        `@icon-sheets/kit: alias "${alias}" has an unparseable URL ref "${raw}"`,
      );
    }
  }
  if (FILE_SIGILS.some((sigil) => raw.startsWith(sigil))) {
    return { scheme: "file", path: raw };
  }
  const parsed = stringToIcon(raw);
  if (!parsed || !parsed.prefix || !parsed.name) {
    throw new Error(
      `@icon-sheets/kit: alias "${alias}" has an unparseable ref "${raw}" — expected "prefix:name", "$/host/path" or "./path.svg"`,
    );
  }
  return {
    scheme: "iconify",
    provider: parsed.provider,
    prefix: parsed.prefix,
    name: parsed.name,
  };
};

/**
 * Parses an `icons` ref map into the list of {@link RefEntry} work items,
 * parsing every ref up front so a bad ref fails before any acquisition.
 *
 * @param icons - Each alias mapped to its authored ref string.
 */
export const plan = (icons: Record<string, string>): RefEntry[] => {
  return Object.entries(icons).map(([alias, raw]) => ({
    alias,
    raw,
    parsed: parseRef(alias, raw),
  }));
};
