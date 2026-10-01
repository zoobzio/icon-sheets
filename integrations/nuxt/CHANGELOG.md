# @icon-sheets/nuxt

## 0.0.5

### Patch Changes

- [#1](https://github.com/zoobzio/icon-sheets/pull/1) [`44bfc0b`](https://github.com/zoobzio/icon-sheets/commit/44bfc0b53b1efa4edaabde757ead2189a96ddb98) Thanks [@zoobzio](https://github.com/zoobzio)! - **Breaking:** a set's key under `iconSheets.sets` is now its id. Remove the
  `id` field from each set — `sets: { sharp: { name: "Sharp", icons } }` — and
  make sure the key is the id the set should be listed and retrieved under. A set
  that still declares an `id` fails the build with a message naming it.

  The module now resolves the contract and every set in one pass through
  `resolveAll()`, so each Iconify collection is fetched once instead of once per
  set.

- Updated dependencies [[`40cd6b0`](https://github.com/zoobzio/icon-sheets/commit/40cd6b0c4f25f3131143ada7c78d3b36b31bd56f)]:
  - @icon-sheets/iconify@0.0.5
  - icon-sheets@0.0.5

## 0.0.4

### Patch Changes

- [`fa835a6`](https://github.com/zoobzio/icon-sheets/commit/fa835a6295d7dfcee4901e2e233c210255fb924b) Thanks [@zoobzio](https://github.com/zoobzio)! - Rewrite package READMEs to match the shipped API (removes stale scaffold
  notices and references to non-existent exports), add the missing
  `@icon-sheets/catalog` README, and add `description` and `license` metadata to
  every package.
- Updated dependencies [[`fa835a6`](https://github.com/zoobzio/icon-sheets/commit/fa835a6295d7dfcee4901e2e233c210255fb924b)]:
  - icon-sheets@0.0.4
  - @icon-sheets/iconify@0.0.4

## 0.0.3

### Patch Changes

- [`40e3ccf`](https://github.com/zoobzio/icon-sheets/commit/40e3ccff01ec9d26a2a942f71b3e6d03fe461be7) Thanks [@zoobzio](https://github.com/zoobzio)! - Add `repository` field to package manifests so npm provenance verification passes

- Updated dependencies [[`40e3ccf`](https://github.com/zoobzio/icon-sheets/commit/40e3ccff01ec9d26a2a942f71b3e6d03fe461be7)]:
  - icon-sheets@0.0.3
  - @icon-sheets/iconify@0.0.3

## 0.0.2

### Patch Changes

- [`1fd6ee5`](https://github.com/zoobzio/icon-sheets/commit/1fd6ee5aba59775c53069ac4abd8091e67bb0452) Thanks [@zoobzio](https://github.com/zoobzio)! - Rename auto-imported `App*` types to `AppIconSheets*` (`AppIconSheetsContract`, `AppIconSheetsSet`, `AppIconSheetsOverrides`, `AppIconSheetsConfig`) to avoid clashing with generic app-level names.

- Updated dependencies []:
  - icon-sheets@0.0.2
  - @icon-sheets/iconify@0.0.2

## 0.0.1

### Patch Changes

- 058798c: Initial release under the icon-sheets name. Publishes the `icon-sheets` umbrella package and the `@icon-sheets/*` scope: core, schema, utils, svg, catalog, the Nuxt module, and the Iconify build integration.
- Updated dependencies [058798c]
  - icon-sheets@0.0.1
  - @icon-sheets/iconify@0.0.1
