# @icon-sheets/kit

The generator. One authored `icon-sheets.config.ts` — your aliases mapped to
Iconify refs, plus any switchable sets — becomes modules that work both ways:

- **Statically:** inline the sheet (or serve `sprite.svg`) and write
  `<svg><use href="#home"/></svg>`, with a typed `Alias` union and an `isAlias`
  guard.
- **At runtime:** load the contract into the icon-sheets service and `apply`
  the sets.

Resolution goes through [`@icon-sheets/iconify`](../../integrations/iconify):
refs come from local `@iconify-json/*` packages when installed, else from the
Iconify API.

## Config

`icon-sheets.config.ts` at the project root:

```ts
import { defineConfig } from "@icon-sheets/kit";

export default defineConfig({
  id: "acme-ui",
  name: "Acme UI",
  icons: { home: "lucide:house", close: "lucide:x", search: "mdi:magnify" },
  sets: {
    solid: { id: "solid", name: "Solid", icons: { home: "mdi:home" } },
  },
  prefix: "acme-", // optional: symbol ids become "acme-home"
  outDir: "icons", // optional: the default
});
```

The alias union is inferred from `icons`, so a set rebinding an alias the
config does not declare is a type error. Aliases, set ids and the prefix may
only contain letters, digits, `_`, `-` and `.`.

## Build

```sh
icon-sheets build [--config <file>] [--root <dir>]
```

Resolves every ref and writes the modules and sprites to `outDir`. That is
all it does — it never touches `package.json`. The output directory is never
cleared, so it can sit beside authored source: the kit overwrites its own files
and removes only sprites of sets that no longer exist.

In an app, import the modules by relative path (`./icons/config.mjs`).

## Publishing

To publish the icons as a package, point `exports` at the output directory
once. The patterns cover every module and every set's sprite, so adding or
removing sets never changes `package.json`:

```json
{
  "type": "module",
  "files": ["icons"],
  "sideEffects": false,
  "exports": {
    ".": { "types": "./icons/index.d.mts", "import": "./icons/index.mjs" },
    "./*.svg": "./icons/*.svg",
    "./*": { "types": "./icons/*.d.mts", "import": "./icons/*.mjs" }
  },
  "peerDependencies": { "icon-sheets": "*" },
  "peerDependenciesMeta": { "icon-sheets": { "optional": true } }
}
```

`icon-sheets` is an optional peer: the `config` and `sets` declarations import
its types, while a consumer using only the sheet never needs it.

## What it emits

| File / package entry             | Contents                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `index.mjs` / `.`                | `type Alias`, `type SetId`, `aliases`, `isAlias`, `setIds`, `prefix`, `href`     |
| `config.mjs` / `./config`        | `contract`, and `{ contract }` as the default — what `useIconSheetsConfig` takes |
| `sheet.mjs` / `./sheet`          | the hidden base sheet (default) and `sheets[setId]`, for inlining                |
| `sets.mjs` / `./sets`            | the Set documents keyed by id, for `apply`                                       |
| `sprite.svg`, `sprite.{set}.svg` | standalone sprite files, for `<use href="/sprite.svg#home">`                     |

Each module ships with a `.d.mts` beside it. The root entry carries no icon
data, so importing the guard never pulls a contract or sheet into a bundle.
Each set's sheet is the base with that set applied, exactly as `apply` would
resolve it.

```ts
// static
import sheet from "@acme/icons/sheet"; // "./icons/sheet.mjs" in an app
import { href, isAlias } from "@acme/icons";
document.body.insertAdjacentHTML("afterbegin", sheet);
`<svg><use href="${href("home")}"/></svg>`; // "#acme-home"

// runtime
import { makeIconSheets } from "icon-sheets";
import { useIconSheetsConfig } from "icon-sheets/config";
import { defineSprite } from "icon-sheets/svg";
import config from "@acme/icons/config";
import sets from "@acme/icons/sets";

const icons = makeIconSheets(useIconSheetsConfig(config));
const sprite = defineSprite(icons, { prefix: "acme-" });
icons.apply(sets.solid);
```

## Programmatic

`generate(config, { cwd, req, resolvers })` resolves and returns
`{ outDir, files }` without writing anything; `writeOutput` writes them, and
`build()` runs the whole CLI pipeline.
