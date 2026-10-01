# icon-sheets

Type-safe SVG sprite icons: resolved from [Iconify](https://iconify.design) at
build time, swappable as whole sets at runtime.

An app names its icons by role — `home`, `save`, `search` — and each name is
resolved to real artwork once, at build time. At runtime the whole set can be
swapped (Lucide to Material, a theme, a tenant's brand) without touching any
markup: every `<use href="#home">` stays constant while the symbol behind it
changes. Icon names autocomplete, and a typo fails to compile.

## Quick start (Nuxt)

```sh
pnpm add @icon-sheets/nuxt
pnpm add -D @icon-sheets/kit
```

Name the icons by Iconify reference:

```ts
// icon-sheets.config.ts
import { defineConfig } from "@icon-sheets/kit";

export default defineConfig({
  id: "app",
  name: "App Icons",
  icons: { home: "lucide:home", save: "lucide:content-save" },
});
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@icon-sheets/nuxt"],
});
```

```vue
<template>
  <Icon name="home" />
</template>
```

The module builds the config through the kit at build time, inlines the sprite
server-side so icons paint on first load, and registers the `<Icon>` component
and the `useIconSheets()` composable. Any of the
[200k+ open-source icons](https://icon-sets.iconify.design) published as
`@iconify-json/*` packages are a valid source: references resolve from locally
installed packages first, then fall back to the public Iconify API. See
[`@icon-sheets/nuxt`](./integrations/nuxt) for switchable sets, consuming a
shared icons package, remote catalogs, and auth.

## Outside a framework

```sh
pnpm add icon-sheets
pnpm add -D @icon-sheets/kit
```

Author an `icon-sheets.config.ts` — an identity plus the icons an app uses,
named by Iconify reference — and let the kit generate the modules into `icons/`:

```ts
// icon-sheets.config.ts
import { defineConfig } from "@icon-sheets/kit";

export default defineConfig({
  id: "app",
  name: "App Icons",
  icons: { home: "lucide:home", save: "lucide:content-save" },
});
```

```sh
icon-sheets build
```

Use the sheet directly — a typed alias union, a guard, and the sprite:

```ts
import sheet from "./icons/sheet.mjs";
import { href, isAlias } from "./icons/index.mjs";

document.body.insertAdjacentHTML("afterbegin", sheet);
`<svg><use href="${href("home")}"/></svg>`;
isAlias(input); // narrows any string to the Alias union
```

Or seed the runtime service from the resolved contract and swap sets live:

```ts
import { makeIconSheets } from "icon-sheets";
import { useIconSheetsConfig } from "icon-sheets/config";
import { defineSprite } from "icon-sheets/svg";
import config from "./icons/config.mjs";

const icons = makeIconSheets(useIconSheetsConfig(config));
icons.resolve("home"); // { body, width, height }

const sprite = defineSprite(icons);
sprite.sheet(); // the full <svg> sprite, for build-time or SSR
sprite.href("home"); // "#home" — constant, whatever set is active
```

The same output publishes as an icon package by pointing `exports` at it — see
[`@icon-sheets/kit`](./packages/kit).

## How it works

icon-sheets separates the **source** — Iconify JSON collections, with their
alias chains and inherited transforms — from the **contract** the runtime
carries. The build layer ([`@icon-sheets/iconify`](./integrations/iconify))
resolves each authored reference through the Iconify spec once — flattening
alias chains, merging transforms, baking in collection defaults — into a flat
`alias → icon definition` map, which [`@icon-sheets/kit`](./packages/kit)
writes out (or the Nuxt module carries in memory). The runtime never holds a collection and
does no alias resolution: it looks a name up and returns the stored icon.

The contract is carried in the types, so icon names autocomplete and typos
fail to compile — and it is validated again at runtime by a schema wherever
data crosses a boundary (a fetched set, a user edit).

### Switching sets

The service holds one active contract and a construction-time baseline. A
**set** rebinds a subset of the aliases; `apply` resolves the set against the
baseline and makes it the active contract, clearing any user edits:

```ts
icons.apply(sharpSet); // aliases the set doesn't bind fall through to the baseline
icons.resolve("home"); // the sharp icon
```

Because the sprite gives one `<symbol id="{alias}">` per alias with no set
namespacing, a swap changes symbol bodies, never references. `symbols(aliases)`
renders the partial batch an integration patches into the DOM after an
`apply`.

### Catalogs

Sets are discovered and retrieved through a **catalog**: `list` for discovery
(filtered and paged), `get` for retrieval, with each fetched set validated
against the contract before use. `defineCatalog` serves sets from
build-emitted JSON, a database, or any store; `defineClient` consumes a
catalog hosted elsewhere over the same wire protocol, so call sites don't
change when the source does:

```ts
import { defineCatalog } from "icon-sheets/catalog";

const catalog = defineCatalog(icons.schema, provider);
const set = await catalog.get("sharp");
if (set) icons.apply(set);
```

### User overrides

On top of the active contract sits a user override layer: `set` writes a
single alias, `update` edits the active definition, `dirty` / `reset` /
`delta` track and reconcile the edits, and `extract` snapshots the live result
as a new contract.

## Workspace

| Directory                        | Contents                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`packages`](./packages)         | The library: the public [`icon-sheets`](./packages/icon-sheets) package and the internals behind it |
| [`integrations`](./integrations) | Build and framework bridges — `@icon-sheets/iconify` ref resolution and the Nuxt module             |
| [`examples`](./examples)         | Consuming apps — a [Nuxt demo](./examples/nuxt) with runtime set switching                          |

The internal packages: [`@icon-sheets/schema`](./packages/schema) (contract
types and validation), [`@icon-sheets/core`](./packages/core) (runtime
service), [`@icon-sheets/catalog`](./packages/catalog) (set
discovery/retrieval), [`@icon-sheets/svg`](./packages/svg) (sprite renderer),
[`@icon-sheets/utils`](./packages/utils) (data helpers), and
[`@icon-sheets/kit`](./packages/kit) (the `icon-sheets build` generator). Shared type
guards and object helpers come from the standalone
[`objectively`](https://www.npmjs.com/package/objectively) package.

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

## License

[MIT](./LICENSE)
