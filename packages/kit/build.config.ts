import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index", "src/cli"],
  outDir: ".dist",
  declaration: true,
  externals: [
    "@icon-sheets/schema",
    "@icon-sheets/svg",
    "@icon-sheets/utils",
    "@iconify/utils",
    "jiti",
    "objectively",
  ],
  rollup: {
    emitCJS: false,
  },
});
