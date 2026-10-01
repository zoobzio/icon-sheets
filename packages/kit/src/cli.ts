#!/usr/bin/env node
import { parseArgs } from "node:util";

import { build } from "./build";

const HELP = `Usage: icon-sheets build [options]

Generates icons from icon-sheets.config.ts: resolves every icon ref and writes
the modules and sprites to the output directory.

Options:
  -c, --config <file>  Config file (default: icon-sheets.config.ts)
  -r, --root <dir>     Project root (default: current directory)
  -h, --help           Show this help`;

const main = async (argv: string[]): Promise<void> => {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: "string", short: "c" },
      root: { type: "string", short: "r" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }
  if (positionals.length !== 1 || positionals[0] !== "build") {
    console.error(HELP);
    process.exitCode = 1;
    return;
  }

  const output = await build({ config: values.config, root: values.root });
  console.log(
    `@icon-sheets/kit: wrote ${output.files.length} files to ${output.outDir}`,
  );
};

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
