import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "src/module",
    "src/config",
    "src/constant",
    // The runtime is shipped unbundled: Nuxt resolves these files by path and
    // compiles them in the app, where the #app/#imports/#build virtuals exist.
    { input: "src/runtime/", outDir: ".dist/runtime", builder: "mkdist" },
  ],
  outDir: ".dist",
  declaration: true,
  externals: [
    "#app",
    "#imports",
    "#build/icon-sheets.mjs",
    "#build/types/icon-sheets.d.ts",
    "@nuxt/kit",
    "@nuxt/schema",
    "nuxt",
    "vue",
    "h3",
  ],
  rollup: {
    emitCJS: false,
  },
});
