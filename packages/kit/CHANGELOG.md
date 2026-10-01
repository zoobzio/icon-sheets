# @icon-sheets/kit

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
