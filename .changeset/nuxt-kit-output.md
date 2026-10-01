---
"@icon-sheets/nuxt": patch
"@icon-sheets/kit": patch
---

**Breaking:** the Nuxt module's icons are now an `@icon-sheets/kit` config,
taken one of two ways.

- **A local config.** Move the refs out of `nuxt.config` into an
  `icon-sheets.config.ts` in the project root (`defineConfig` from
  `@icon-sheets/kit`). The module finds it, builds it through the kit in
  memory, and rebuilds it when it changes in dev. `iconSheets.config` names
  another path.
- **An icons package.** Pass the output of a kit build —
  `iconSheets: { ...config, sets, prefix }`, imported from the package's
  `config`, `sets` and root modules.

`iconSheets.icons`, `id` and `name` are gone. The new `prefix` namespaces the
sprite's symbol ids and each `<Icon>`'s `href`; a local config brings its own.
The module depends on `@icon-sheets/kit` instead of `@icon-sheets/iconify`.

`@icon-sheets/kit` exports `resolveKit()`, which checks and resolves a config
into its documents — `{ contract, sets, prefix, outDir }` — without emitting
files.
