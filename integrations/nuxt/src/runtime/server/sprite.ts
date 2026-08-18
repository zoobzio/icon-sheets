import { defineNitroPlugin, useStorage } from "#imports";

import { ASSETS, SPRITE } from "@icon-sheets/nuxt/constant";

/**
 * Inlines the prebuilt base sprite into the body so icons paint on first load
 * without waiting for hydration; the client plugin takes the same container over
 * and keeps it in sync as sets apply. The markup is read from the server asset
 * the module wrote at build time — the server runtime cannot import the app's
 * `#build` contract directly.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", async (html) => {
    const markup = await useStorage(`assets:${ASSETS}`).getItem(SPRITE);
    if (typeof markup === "string") {
      html.bodyPrepend.push(markup);
    }
  });
});
