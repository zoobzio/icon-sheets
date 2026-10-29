// The icons come from the icons example, a package built by @icon-sheets/kit.
// The module reads its contract, sets and prefix as the kit wrote them; this
// app has no icon-sheets.config.ts of its own.
export default defineNuxtConfig({
  modules: ["@icon-sheets/nuxt"],
  iconSheets: { preset: "@icon-sheets/example-icons" },
});
