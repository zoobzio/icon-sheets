# @icon-sheets/kit

## 0.0.8

### Patch Changes

- [`2d2b36e`](https://github.com/zoobzio/icon-sheets/commit/2d2b36edfe1870ddc9bdfd71da401414eb3133a4) Thanks [@zoobzio](https://github.com/zoobzio)! - Iconify ref resolution moves into the kit, and `@icon-sheets/iconify` is
  retired: a package no longer depends on an integration.

  - **kit:** resolves `prefix:name`, `$/host/path` and `./path.svg` refs itself,
    with the same batching, collected misses, file handling and schema checks.
    `Req` is now exported from `@icon-sheets/kit`. The `resolvers` option of
    `generate`, `resolveKit` and `build` is removed; `req` remains the seam for
    authenticated or offline sources.
  - **iconify:** removed. `resolveContract`, `resolveSet` and `resolveAll` have
    no replacement outside `resolveKit`.

- [`a56b822`](https://github.com/zoobzio/icon-sheets/commit/a56b822d143a34a0024db20d7dd97ab59081267b) Thanks [@zoobzio](https://github.com/zoobzio)! - Presets: compose a config over the kit builds of other packages.

  - **kit:** `extends` in `icon-sheets.config.ts` names packages that export a
    kit build (`./config`, `./sets`, root `prefix`). Their resolved icons become
    the base, in order, and the config's own icons land on top; a set may rebind
    a preset alias, and a set with a preset set's id takes its place. The prefix
    is inherited when unset and a differing one is rejected. Nothing of a preset
    is resolved again. `preset<Alias>(name)` types a preset's aliases for the
    sets check. New `loadPreset`, `loadPresets`, `compose`, the `Documents` and
    `Layer` types, and `MalformedPresetError`.
  - **nuxt:** `iconSheets.preset` names a package that exports a kit build.
    Every layer may name one; each resolves from its own layer's directory and
    they compose farthest layer first. Passed documents and a local config land
    over the presets; with presets, the default config file is built only when
    it exists.

- Updated dependencies []:
  - @icon-sheets/schema@0.0.8
  - @icon-sheets/utils@0.0.8
  - @icon-sheets/svg@0.0.8

## 0.0.7

### Patch Changes

- [`007fbca`](https://github.com/zoobzio/icon-sheets/commit/007fbca3c57e9bc2d3ac929e900eba3184eb12c9) Thanks [@zoobzio](https://github.com/zoobzio)! - Local SVG files as icon refs.

  A ref starting with `./` or `../` now names a local SVG file, relative to the
  project root (`cwd`), alongside `prefix:name` and `$/host/path`:

  ```ts
  icons: { home: "lucide:house", logo: "./assets/logo.svg" },
  ```

  - **iconify:** a new `file` scheme. The SVG's `viewBox` becomes the icon's
    geometry, root presentation attributes are kept, and ids are namespaced per
    file so they cannot collide in a sprite. A file with no `viewBox` or with an
    undeclared namespace (`xlink:href`, `inkscape:*`) is rejected; a missing file
    is reported with the other unresolvable refs. `resolveAll` returns `sources`,
    the absolute paths of the files read.
  - **kit:** `resolveKit` returns those paths as `Kit.sources`.
  - **nuxt:** a locally built config's SVG files join the watch list, so editing
    one restarts dev.

- Updated dependencies [[`007fbca`](https://github.com/zoobzio/icon-sheets/commit/007fbca3c57e9bc2d3ac929e900eba3184eb12c9)]:
  - @icon-sheets/iconify@0.0.7
  - @icon-sheets/schema@0.0.7
  - @icon-sheets/utils@0.0.7
  - @icon-sheets/svg@0.0.7

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
