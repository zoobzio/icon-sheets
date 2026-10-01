import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { Output } from "./types";
import { SET_SPRITE } from "./constant";

/**
 * Writes an output's files under `<root>/<outDir>`. The directory may be shared
 * with authored source (`src/icons`), so it is never cleared:
 * the kit's own files are overwritten in place, and only per-set sprites the
 * output no longer produces — a removed or renamed set — are deleted.
 * `outDir` was checked to be a subdirectory of the root at generation.
 *
 * @param output - The output to write.
 * @param root - The project root.
 */
export const writeOutput = async (
  output: Output,
  root: string,
): Promise<void> => {
  const dir = resolve(root, output.outDir);
  await mkdir(dir, { recursive: true });
  const produced = new Set(output.files.map((file) => file.path));
  for (const name of await readdir(dir)) {
    if (SET_SPRITE.test(name) && !produced.has(name)) {
      await rm(join(dir, name));
    }
  }
  for (const file of output.files) {
    const target = join(dir, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.contents);
  }
};
