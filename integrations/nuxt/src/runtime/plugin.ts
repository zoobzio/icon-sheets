import { defineNuxtPlugin } from "#app";
import { watchEffect } from "vue";
import { defineSprite } from "@icon-sheets/icon-sheets/svg";
import { makeIconSheets } from "./client";
import { CONTAINER } from "../constant";

/**
 * Nuxt plugin that builds the icon-sheets service over an SSR-serializable, reactive
 * container and provides it as `$iconSheets`.
 *
 * The sprite for the base contract is inlined into the body server-side (see the
 * nitro plugin), so icons paint on first load. On the client the sprite is kept
 * in sync with the reactive service: `sheet()` reads the active contract inside a
 * `watchEffect`, so applying a set or writing an override re-renders the sprite
 * container in place. Because every `<symbol>` id is the bare alias, the
 * `<use href="#alias">` in each `<Icon>` never changes — only the symbol body does.
 */
export default defineNuxtPlugin({
  name: "icon-sheets",
  setup: async (nuxtApp) => {
    const iconSheets = makeIconSheets();
    const sprite = defineSprite(iconSheets);

    if (import.meta.client) {
      let container = document.getElementById(CONTAINER);
      if (!container) {
        container = document.createElement("div");
        container.id = CONTAINER;
        document.body.prepend(container);
      }
      const el = container;
      watchEffect(() => {
        el.innerHTML = sprite.sheet();
      });
    }

    await nuxtApp.callHook("icon-sheets:ready", iconSheets);

    return {
      provide: {
        iconSheets,
      },
    };
  },
});
