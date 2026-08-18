# icon-sheets

A type-safe icon system that resolves [Iconify](https://iconify.design) icons
into a flat contract of definition literals, switches between icon sets at
runtime through a catalog, and renders them as optimized **SVG sprite sheets**,
with framework integrations.

icon-sheets separates the **source** — the Iconify JSON collections icons are drawn
from, with their aliases and inherited transforms — from the **contract** the
runtime carries. The build layer resolves each authored reference through the
Iconify spec once, at build time, and emits a flat `alias → icon definition
literal` map under an identity. The runtime never holds a collection and does no
alias-tree resolution: it looks an alias up, returns the stored literal, and
renders it. The contract is carried in the types — icon names autocomplete and
typos fail to compile — and re-proved at runtime by a schema over the Iconify
icon shape.

## Anatomy

You author a **ref config** — an identity plus the icons an app uses, named by
their Iconify reference:

```ts
// icons authored as references (build-layer input)
{
  id: "app",
  name: "App Icons",
  icons: { home: "lucide:home", save: "lucide:content-save" },
}
```

The `@icon-sheets/iconify` build layer resolves every reference against the Iconify
collections — flattening alias chains, merging transforms, baking in
collection-root defaults — and emits a **contract**: a plain `icon-sheets.config.ts`
of resolved icon data, no collections retained.

```ts
import { defineIconSheetsConfig } from "@icon-sheets/icon-sheets/config";

export default defineIconSheetsConfig({
  contract: {
    id: "app",
    name: "App Icons",
    icons: { home: { body: "…", width: 24, height: 24 } },
  },
});
```

The runtime engine seeds a fresh state container from that config and resolves
an alias to its effective icon — the user override, else the active contract:

```ts
import { makeIconSheets } from "@icon-sheets/icon-sheets";
import { useIconSheetsConfig } from "@icon-sheets/icon-sheets/config";
import config from "./icon-sheets.config";

const icons = makeIconSheets(useIconSheetsConfig(config));

icons.resolve("home"); // the stored { body, width, height } literal
```

## Switching sets

Core holds one active contract and a construction-time baseline. A **set** is an
identified layer that rebinds a subset of the aliases; `apply` becomes the set
resolved against the baseline, and clears any user edits:

```ts
icons.apply(sharpSet); // becomes the "sharp" document; unbound aliases fall through
icons.resolve("home"); // the sharp icon
```

Sets are discovered and retrieved through a **catalog** — a pure resolver with
two duals over one wire protocol. `defineCatalog` serves sets from build-emitted
JSON, a database, or any store; `defineClient` reaches a catalog hosted
elsewhere. Both `list` (discovery, filtered/paged, tag-aware) and `get`
(retrieval, proven against the contract) behave identically:

```ts
import { defineCatalog } from "@icon-sheets/icon-sheets/catalog";

const catalog = defineCatalog(icons.schema, provider);
const set = await catalog.get("sharp");
if (set) icons.apply(set);
```

## User overrides

On top of the active contract sits a user override layer: `set` writes a single
alias, `update` edits the active definition, `dirty` / `reset` / `delta` track
and reconcile the edits, and `extract` snapshots the live result as a new
contract.

## Rendering

A sprite gives one `<symbol id="{alias}">` per alias — no set namespacing, so a
`<use href="#home">` never changes as the active set does; only the symbol body
behind it does. `symbols(aliases)` renders the partial batch an integration
patches into the DOM in place after an `apply`; `sheet()` renders the whole
sprite for build-time or SSR.

```ts
import { defineSprite } from "@icon-sheets/icon-sheets/svg";

const sprite = defineSprite(icons);
sprite.href("home"); // "#home" — constant
sprite.sheet(); // the full <svg> sprite
```

## From Iconify JSON

icon-sheets draws from the Iconify JSON format directly, so any of the
[200k+ open-source icons](https://icon-sets.iconify.design) published as
`@iconify-json/*` packages are a valid source. The `@icon-sheets/iconify` generation
package resolves references from those local packages, with an Iconify-API
fallback, and can also fetch a single icon from a URL.

## Workspace

| Directory                        | Contents                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`packages`](./packages)         | The library: the public [`icon-sheets`](./packages/icon-sheets) package and the internals behind it |
| [`integrations`](./integrations) | Build and framework bridges — the `@icon-sheets/iconify` generator and the Nuxt module              |
| `examples`                       | Consuming apps demonstrating the pipeline (none yet — the bucket is reserved)                       |

The internal packages: `@icon-sheets/schema` (validation), `@icon-sheets/core` (runtime
service), `@icon-sheets/catalog` (set discovery/retrieval), `@icon-sheets/svg` (sprite),
and `@icon-sheets/utils` (helpers). Shared type guards and object helpers come from
the standalone [`objectively`](https://www.npmjs.com/package/objectively) package.

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

## License

MIT
