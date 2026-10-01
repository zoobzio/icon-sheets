import { SchemaError, defineSchema } from "@icon-sheets/schema";
import type { Identity } from "@icon-sheets/schema";

import type { KitConfig } from "./types";
import { OUT_DIR, TOKEN } from "./constant";
import { InvalidConfigError } from "./error";
import { inside, normalize } from "./path";

/** One rule over a config: every issue it finds, none when the config passes. */
type Rule = (config: KitConfig) => string[];

/** How every charset issue describes what {@link TOKEN} allows. */
const ALLOWED = 'may only contain letters, digits, "_", "-" and "."';

/**
 * The schema's own identity rules, run over a document with no icons — the
 * smallest value that carries an identity — so the kit holds `id`, `name`,
 * `description` and `tags` to exactly what resolution would, without a second
 * copy of the rules.
 */
const identified = (document: Identity): string[] => {
  try {
    defineSchema({ ...document, icons: {} });
    return [];
  } catch (error) {
    if (!(error instanceof SchemaError)) {
      throw error;
    }
    return error.issues.map((issue) => issue.message);
  }
};

/** The config carries the contract's identity. */
const identity: Rule = (config) => identified(config);

/** Every alias lands in a symbol `id` and a `#fragment`. */
const aliases: Rule = (config) =>
  Object.keys(config.icons)
    .filter((alias) => !TOKEN.test(alias))
    .map((alias) => `alias ${JSON.stringify(alias)} ${ALLOWED}`);

/** The prefix leads every symbol `id`; unset or empty is no prefix. */
const prefix: Rule = (config) => {
  const { prefix = "" } = config;
  return prefix === "" || TOKEN.test(prefix)
    ? []
    : [`prefix ${JSON.stringify(prefix)} ${ALLOWED}`];
};

/**
 * Each set's id — its key, and nothing else — names a sprite file and keys the
 * emitted sets; its identity holds to the schema; and it may only rebind
 * aliases the config declares. An entry left unset rebinds nothing.
 */
const sets: Rule = (config) =>
  Object.entries(config.sets ?? {}).flatMap(([id, set]) => {
    const at = `set ${JSON.stringify(id)}`;
    return [
      ...(TOKEN.test(id) ? [] : [`${at} ${ALLOWED}`]),
      ...("id" in set ? [`${at} declares an "id" — its key is its id`] : []),
      ...identified({ ...set, id }).map((issue) => `${at}: ${issue}`),
      ...Object.entries(set.icons)
        .filter(
          ([alias, ref]) =>
            ref !== undefined && !Object.hasOwn(config.icons, alias),
        )
        .map(
          ([alias]) =>
            `${at} rebinds ${JSON.stringify(alias)}, an alias the config does not declare`,
        ),
    ];
  });

/** The output directory sits inside the project root. */
const outDir: Rule = (config) => {
  const { outDir = OUT_DIR } = config;
  return inside(normalize(outDir))
    ? []
    : [
        `outDir ${JSON.stringify(outDir)} must be a subdirectory of the project root`,
      ];
};

/**
 * Checks a config against every rule that can be decided without resolving a
 * ref, and reports all of the issues together.
 *
 * @param config - The kit config.
 * @throws InvalidConfigError carrying every issue, when there is any.
 */
export const validate = (config: KitConfig): void => {
  const issues = [identity, aliases, prefix, sets, outDir].flatMap((rule) =>
    rule(config),
  );
  if (issues.length > 0) {
    throw new InvalidConfigError(issues);
  }
};
