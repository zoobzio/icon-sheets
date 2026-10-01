# @icon-sheets/kit

## 0.0.6

### Patch Changes

- [#2](https://github.com/zoobzio/icon-sheets/pull/2) [`5769532`](https://github.com/zoobzio/icon-sheets/commit/5769532127b3de5bb2814f1673ca41b687209a94) Thanks [@zoobzio](https://github.com/zoobzio)! - **Breaking:** the Nuxt module's icons are now an `@icon-sheets/kit` config,
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

- Updated dependencies []:
  - @icon-sheets/schema@0.0.6
  - @icon-sheets/utils@0.0.6
  - @icon-sheets/svg@0.0.6
  - @icon-sheets/iconify@0.0.6

## 0.0.5

### Patch Changes

- [#1](https://github.com/zoobzio/icon-sheets/pull/1) [`40cd6b0`](https://github.com/zoobzio/icon-sheets/commit/40cd6b0c4f25f3131143ada7c78d3b36b31bd56f) Thanks [@zoobzio](https://github.com/zoobzio)! - Add `@icon-sheets/kit`, the generator: `icon-sheets build` turns an authored
  `icon-sheets.config.ts` into modules exporting the `Alias` union, an `isAlias`
  guard, the contract for the runtime service, Set documents, inline sheets and
  standalone `sprite.svg` files. The same output is imported by relative path in
  an app, or published by pointing a static `exports` map at it.

  `@icon-sheets/iconify` gains `resolveAll()`, which resolves a contract and its
  sets in one pass and acquires each collection once.

  **Breaking:** `@icon-sheets/iconify` no longer generates files. `generate()` and
  `generateSet()` are removed — use `@icon-sheets/kit`, or call
  `resolveContract()` / `resolveSet()` for the resolved objects. The option types
  are renamed `ResolveOptions` / `ResolveSetOptions`, and `GenerateResult` is
  gone. `icon-sheets.config.ts` now names the authored kit config rather than a
  generated contract file.

  `defineSprite` gains a `prefix` option for namespaced symbol ids, and
  `sheet({ hidden: false })` renders a standalone sprite without `display:none`.

- Updated dependencies [[`40cd6b0`](https://github.com/zoobzio/icon-sheets/commit/40cd6b0c4f25f3131143ada7c78d3b36b31bd56f)]:
  - @icon-sheets/iconify@0.0.5
  - @icon-sheets/svg@0.0.5
  - @icon-sheets/schema@0.0.5
  - @icon-sheets/utils@0.0.5
