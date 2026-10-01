import { resolve } from "node:path";

import type { GenerateOptions, Output } from "./types";
import { FILENAME } from "./constant";
import { generate } from "./generate";
import { loadConfig } from "./load";
import { writeOutput } from "./write";

/** Options for {@link build}. */
export type BuildOptions = Omit<GenerateOptions, "cwd"> & {
  /** The project root; defaults to `process.cwd()`. */
  root?: string;

  /** The config file, relative to `root`; defaults to `icon-sheets.config.ts`. */
  config?: string;
};

/**
 * The whole build, end to end: load the config, resolve and emit, and write the
 * output directory. What the CLI runs.
 *
 * @param options - The root, config path, and resolver hooks.
 */
export const build = async (options: BuildOptions = {}): Promise<Output> => {
  const { root: rootOption, config: configOption, ...hooks } = options;
  const root = resolve(rootOption ?? process.cwd());
  const config = await loadConfig(resolve(root, configOption ?? FILENAME));
  const output = await generate(config, { ...hooks, cwd: root });
  await writeOutput(output, root);
  return output;
};
