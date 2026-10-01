---
"@icon-sheets/kit": patch
"@icon-sheets/iconify": patch
"@icon-sheets/svg": patch
"icon-sheets": patch
---

Add `@icon-sheets/kit`, the generator: `icon-sheets build` turns an authored
`icon-sheets.config.ts` into modules exporting the `Alias` union, an `isAlias`
guard, the contract for the runtime service, Set documents, inline sheets and
standalone `sprite.svg` files. The same output is imported by relative path in
an app, or published by pointing a static `exports` map at it.

**Breaking:** `@icon-sheets/iconify` no longer generates files. `generate()` and
`generateSet()` are removed — use `@icon-sheets/kit`, or call
`resolveContract()` / `resolveSet()` for the resolved objects. The option types
are renamed `ResolveOptions` / `ResolveSetOptions`, and `GenerateResult` is
gone. `icon-sheets.config.ts` now names the authored kit config rather than a
generated contract file.

`defineSprite` gains a `prefix` option for namespaced symbol ids, and
`sheet({ hidden: false })` renders a standalone sprite without `display:none`.
