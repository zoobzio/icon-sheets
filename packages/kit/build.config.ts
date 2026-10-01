import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index", "src/cli"],
  outDir: ".dist",
  declaration: true,
  externals: [
    "@icon-sheets/iconify",
    "@icon-sheets/schema",
    "@icon-sheets/svg",
    "@icon-sheets/utils",
    "jiti",
  ],
  rollup: {
    emitCJS: false,
  },
});
