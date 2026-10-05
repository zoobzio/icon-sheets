# icon-sheets

## 0.0.7

### Patch Changes

- Updated dependencies []:
  - @icon-sheets/core@0.0.7
  - @icon-sheets/schema@0.0.7
  - @icon-sheets/utils@0.0.7
  - @icon-sheets/svg@0.0.7
  - @icon-sheets/catalog@0.0.7

## 0.0.6

### Patch Changes

- Updated dependencies []:
  - @icon-sheets/core@0.0.6
  - @icon-sheets/schema@0.0.6
  - @icon-sheets/utils@0.0.6
  - @icon-sheets/svg@0.0.6
  - @icon-sheets/catalog@0.0.6

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
  - @icon-sheets/svg@0.0.5
  - @icon-sheets/core@0.0.5
  - @icon-sheets/schema@0.0.5
  - @icon-sheets/utils@0.0.5
  - @icon-sheets/catalog@0.0.5

## 0.0.4

### Patch Changes

- [`fa835a6`](https://github.com/zoobzio/icon-sheets/commit/fa835a6295d7dfcee4901e2e233c210255fb924b) Thanks [@zoobzio](https://github.com/zoobzio)! - Rewrite package READMEs to match the shipped API (removes stale scaffold
  notices and references to non-existent exports), add the missing
  `@icon-sheets/catalog` README, and add `description` and `license` metadata to
  every package.
- Updated dependencies [[`fa835a6`](https://github.com/zoobzio/icon-sheets/commit/fa835a6295d7dfcee4901e2e233c210255fb924b)]:
  - @icon-sheets/core@0.0.4
  - @icon-sheets/schema@0.0.4
  - @icon-sheets/catalog@0.0.4
  - @icon-sheets/svg@0.0.4
  - @icon-sheets/utils@0.0.4

## 0.0.3

### Patch Changes

- [`40e3ccf`](https://github.com/zoobzio/icon-sheets/commit/40e3ccff01ec9d26a2a942f71b3e6d03fe461be7) Thanks [@zoobzio](https://github.com/zoobzio)! - Add `repository` field to package manifests so npm provenance verification passes

- Updated dependencies [[`40e3ccf`](https://github.com/zoobzio/icon-sheets/commit/40e3ccff01ec9d26a2a942f71b3e6d03fe461be7)]:
  - @icon-sheets/catalog@0.0.3
  - @icon-sheets/core@0.0.3
  - @icon-sheets/schema@0.0.3
  - @icon-sheets/svg@0.0.3
  - @icon-sheets/utils@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies []:
  - @icon-sheets/core@0.0.2
  - @icon-sheets/schema@0.0.2
  - @icon-sheets/utils@0.0.2
  - @icon-sheets/svg@0.0.2
  - @icon-sheets/catalog@0.0.2

## 0.0.1

### Patch Changes

- 058798c: Initial release under the icon-sheets name. Publishes the `icon-sheets` umbrella package and the `@icon-sheets/*` scope: core, schema, utils, svg, catalog, the Nuxt module, and the Iconify build integration.
- Updated dependencies [058798c]
  - @icon-sheets/core@0.0.1
  - @icon-sheets/schema@0.0.1
  - @icon-sheets/utils@0.0.1
  - @icon-sheets/svg@0.0.1
  - @icon-sheets/catalog@0.0.1
