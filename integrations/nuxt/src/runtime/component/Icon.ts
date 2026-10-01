import type { Alias } from "#build/types/icon-sheets.d.ts";

import { defineComponent, h } from "vue";
import { prefix } from "#build/icon-sheets.mjs";

/**
 * Renders an aliased icon as `<svg><use href="#alias"/></svg>` — the alias
 * under the configured prefix — referencing the sprite the plugin keeps in the
 * document. `name` is typed to the build-derived alias union, so a typo fails
 * to compile. The `href` is constant per alias, so the element never changes as
 * the active set or an override does — only the referenced `<symbol>` body does.
 */
export default defineComponent(
  (props: { name: Alias }) => {
    return () =>
      h(
        "svg",
        {
          width: "1em",
          height: "1em",
          "aria-hidden": "true",
          focusable: "false",
        },
        [h("use", { href: `#${prefix}${props.name}` })],
      );
  },
  { name: "Icon", props: ["name"] },
);
