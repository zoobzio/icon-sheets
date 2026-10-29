# @icon-sheets/example-nuxt

A minimal Nuxt app demonstrating [`@icon-sheets/nuxt`](../../integrations/nuxt): a
semantic icon contract from an icons package, rendered as an inline SVG sprite,
with a switcher that applies alternate icon sets at runtime.

- **Preset** — the icons come from [`@icon-sheets/example-icons`](../icons), a
  package built by `@icon-sheets/kit`. `nuxt.config.ts` names it with
  `iconSheets: { preset: "@icon-sheets/example-icons" }`. That is the whole
  wiring: the app has no `icon-sheets.config.ts` and no `@iconify-json/*`
  packages of its own.
- **Base contract** — ten aliases: `logo` and `badge` from local SVG files of
  the icons package, and eight (`home`, `search`, …) from Lucide.
- **Sets** — Material, Tabler, and Phosphor rebind the same aliases; each is
  served over the catalog and applied on demand. The logo stays the same in
  every set, and Material swaps the badge for a flat one.
- **Table** — the alias, its constant `#alias` reference, and the currently
  active icon. Switching a set swaps the symbol bodies in place; the references
  never change.

From the repo root:

```sh
pnpm install
pnpm build
pnpm --filter @icon-sheets/example-nuxt dev
```

Then open the printed URL and use the switcher. The module reads the build of
the icons package, so build the workspace first. After a change to the icons,
rebuild the package with `pnpm --filter @icon-sheets/example-icons build` and
restart dev.
