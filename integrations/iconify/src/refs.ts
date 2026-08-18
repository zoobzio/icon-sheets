import { stringToIcon } from "@iconify/utils";

import type { ParsedRef, RefEntry } from "./types";

/** The URL scheme sigil: `$/host/path` fetches a single icon from a URL. */
const URL_SIGIL = "$/";

/**
 * Parses one authored ref string into a {@link ParsedRef}. Two schemes:
 * `$/host/path` targets `https://host/path` (a single-icon JSON endpoint), and
 * `prefix:name` parses through Iconify's own `stringToIcon` into a collection
 * reference. An unparseable string throws, naming the alias and the ref, so a
 * typo in the config points at exactly where.
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
        `@icon-sheets/iconify: alias "${alias}" has an unparseable URL ref "${raw}"`,
      );
    }
  }
  const parsed = stringToIcon(raw);
  if (!parsed || !parsed.prefix || !parsed.name) {
    throw new Error(
      `@icon-sheets/iconify: alias "${alias}" has an unparseable ref "${raw}" — expected "prefix:name" or "$/host/path"`,
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
 * parsing every ref up front so a bad ref fails before any acquisition. Shared
 * by {@link generate} (the contract's icons) and {@link generateSet} (the set's
 * icons).
 */
export const plan = (icons: Record<string, string>): RefEntry[] => {
  return Object.entries(icons).map(([alias, raw]) => ({
    alias,
    raw,
    parsed: parseRef(alias, raw),
  }));
};
