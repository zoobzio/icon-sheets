import { join } from "node:path";

import type { Contract, Schema, Set } from "@icon-sheets/schema";
import { SchemaError, defineSchema } from "@icon-sheets/schema";
import { createJiti } from "jiti";
import { object } from "objectively";

import type { Documents, Preset } from "./types";
import { InvalidConfigError, MalformedPresetError } from "./error";

/** The package name an `extends` entry carries. */
const named = (entry: string | Preset): string =>
  typeof entry === "string" ? entry : entry.package;

/**
 * Loads the kit build a package exports — the contract from `./config`, the
 * sets from `./sets`, and the prefix from the root — resolving the package
 * from `root` as the project itself would import it. Each document is proven
 * against the schema, so a composition only ever layers valid documents.
 *
 * @param name - The package name.
 * @param root - The project root the package resolves from.
 * @throws MalformedPresetError when the package cannot be resolved or does not
 * export a kit build.
 */
export const loadPreset = async (
  name: string,
  root: string,
): Promise<Documents> => {
  const jiti = createJiti(join(root, "package.json"), { moduleCache: false });
  const load = async (subpath: string): Promise<Record<string, unknown>> => {
    const id = subpath === "" ? name : `${name}/${subpath}`;
    try {
      return await jiti.import<Record<string, unknown>>(id);
    } catch (error) {
      throw new MalformedPresetError(
        name,
        `does not export "./${subpath}" — a preset is a package that exports a kit build (from ${root})`,
        { cause: error },
      );
    }
  };

  const config = await load("config");
  if (!object(config.contract) || !object(config.contract.icons)) {
    throw new MalformedPresetError(name, '"/config" must export a contract');
  }
  const sets = (await load("sets")).sets;
  if (!object(sets)) {
    throw new MalformedPresetError(
      name,
      '"/sets" must export sets keyed by id',
    );
  }
  const { prefix } = await load("");
  if (typeof prefix !== "string") {
    throw new MalformedPresetError(name, "must export its prefix");
  }

  try {
    const schema: Schema<Contract> = defineSchema(config.contract as Contract);
    for (const set of Object.values(sets)) {
      schema.assert.set(set);
    }
  } catch (error) {
    if (!(error instanceof SchemaError)) {
      throw error;
    }
    const lines = error.issues.map((issue) => `  ${issue.message}`).join("\n");
    throw new MalformedPresetError(
      name,
      `exports documents that violate the schema —\n${lines}`,
      { cause: error },
    );
  }

  return {
    contract: config.contract as Contract,
    sets: Object.values(sets) as Set[],
    prefix,
  };
};

/**
 * Loads every preset a config extends, in authored order. The entries are
 * checked first, so a malformed `extends` never reaches the filesystem.
 *
 * @param entries - The config's `extends`.
 * @param root - The project root the packages resolve from.
 * @throws InvalidConfigError when an entry is not a package name.
 * @throws MalformedPresetError when a package does not export a kit build.
 */
export const loadPresets = async (
  entries: (string | Preset)[],
  root: string,
): Promise<Documents[]> => {
  const issues = entries
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) =>
        (typeof entry !== "string" &&
          !(object(entry) && typeof entry.package === "string")) ||
        named(entry) === "",
    )
    .map(({ index }) => `extends[${index}] must be a package name`);
  if (issues.length > 0) {
    throw new InvalidConfigError(issues);
  }
  const documents: Documents[] = [];
  for (const entry of entries) {
    documents.push(await loadPreset(named(entry), root));
  }
  return documents;
};
