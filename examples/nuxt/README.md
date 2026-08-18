# @icon-sheets/example-nuxt

A minimal Nuxt app demonstrating [`@icon-sheets/nuxt`](../../integrations/nuxt): a
semantic icon contract sourced from Iconify collections, rendered as an inline
SVG sprite, with a switcher that applies alternate icon sets at runtime.

- **Base contract** — eight aliases (`home`, `search`, …) drawn from Lucide,
  authored as refs in `nuxt.config.ts` and resolved at build time.
- **Sets** — Material, Tabler, and Phosphor rebind the same aliases; each is
  served over the catalog and applied on demand.
- **Table** — the alias, its constant `#alias` reference, and the currently
  active icon. Switching a set swaps the symbol bodies in place; the references
  never change.

```sh
pnpm --filter @icon-sheets/example-nuxt dev
```

Then open the printed URL and use the switcher.
