import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index"],
  outDir: ".dist",
  declaration: true,
  externals: ["@iconify/utils", "@iconify/types", "@icon-sheets/schema"],
  rollup: {
    emitCJS: false,
  },
});
