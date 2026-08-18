import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index", "src/config", "src/catalog", "src/svg"],
  outDir: ".dist",
  declaration: true,
  rollup: {
    emitCJS: false,
  },
});
