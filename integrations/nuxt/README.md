# @icon-sheets/nuxt

Nuxt module for icon-sheets. Icons are authored as an
[`@icon-sheets/kit`](../../packages/kit) config; the module either builds the
app's own config or takes the output of a kit build elsewhere. At build time it
derives the `Alias` union for autocompletion, and at runtime it inlines the SVG
sprite server-side, registers the `<Icon>` component and the `useIconSheets()`
composable, and serves switchable sets through catalog routes.

## Usage

### A local config

Add an `icon-sheets.config.ts` to the project root. Refs draw from local
`@iconify-json/*` packages first, then the public Iconify API; a `$/host/path`
ref fetches a single icon from a URL, and a `./path.svg` ref reads a local SVG
relative to the project root (editing it restarts dev, like the config):

```ts
// icon-sheets.config.ts
import { defineConfig } from "@icon-sheets/kit";

export default defineConfig({
  id: "app",
  name: "App Icons",
  icons: { home: "lucide:home", save: "lucide:content-save" },
  // Optional switchable sets, served over the catalog. A set's key is its id.
  sets: {
    sharp: { name: "Sharp", icons: { home: "lucide:home" } },
  },
});
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@icon-sheets/nuxt"],
});
```

The module finds the config, builds it through the kit in memory — there is no
separate build step and nothing is written to the project — and rebuilds it
when the file changes in dev. Point `iconSheets.config` at another path if the
file lives elsewhere.

### An icons package

In a monorepo, or with a published icons package, the kit has already run.
Name the package as a preset:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@icon-sheets/nuxt"],
  iconSheets: { preset: "@acme/icons" },
});
```

A preset is any package whose `exports` point at a kit build — `./config`,
`./sets` and the root `prefix` — as the kit README's
[Publishing](../../packages/kit#publishing) shows. Nothing is built here: the
module reads the resolved contract, sets and prefix as the kit wrote them.
The package has to be built before Nuxt loads its config, and a running
`nuxt dev` does not pick up a rebuilt package until it is restarted.

The same documents can be passed by hand instead, imported in `nuxt.config`:

```ts
import { prefix } from "@acme/icons";
import config from "@acme/icons/config";
import sets from "@acme/icons/sets";

export default defineNuxtConfig({
  modules: ["@icon-sheets/nuxt"],
  iconSheets: { ...config, sets, prefix },
});
```

### Across layers

Every Nuxt layer may name a `preset`, and each resolves from its own layer's
directory — a layer's icons package need not be a dependency of the app. The
module reads them farthest layer first and lays each over the last: the
app's aliases join the layer's, an alias the app declares again is rebound,
a set with the same id takes the layer's place, and the `Alias` union the app
compiles against is the whole. A package named by more than one layer is
read once.

```ts
// a design-system layer
export default defineNuxtConfig({
  modules: ["@icon-sheets/nuxt"],
  iconSheets: { preset: "@acme/icons" },
});

// an app extending it
export default defineNuxtConfig({
  extends: ["@acme/nuxt"],
  iconSheets: { preset: "@app/icons" }, // over @acme/icons
});
```

Documents passed as `contract` / `sets` / `prefix` land over the presets the
same way. So does the app's own `icon-sheets.config.ts`: with presets named,
the default file is built only when it exists, and a `config` path is always
built. A local config that sets no prefix inherits the presets'; one that
sets a different prefix is rejected, since every layer shares one sprite.

An icons package can also extend another in its own kit config, so the union
is published once — see the kit's
[Extending a package](../../packages/kit#extending-a-package). Either way
composes the same documents; composing again over a preset the package
already extends changes nothing.

| Option     | Contents                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `preset`   | A package that exports a kit build, resolved from the layer that names it. Composes across layers |
| `config`   | The kit config to build, relative to the root. Default `icon-sheets.config.ts`                    |
| `contract` | A resolved contract — the kit's `config` module. Replaces the local build                         |
| `sets`     | Resolved sets keyed by id — the kit's `sets` module. With `contract` only                         |
| `prefix`   | The symbol id prefix the kit built with. With `contract` only                                     |
| `catalog`  | A remote catalog to proxy to — see below                                                          |

Reference aliases by name — a typo fails to compile:

```vue
<template>
  <Icon name="home" />
</template>
```

## Runtime

`useIconSheets()` returns the icon service — the active contract, the applied set,
and the user override layer:

```ts
const icons = useIconSheets();
icons.resolve("home"); // the resolved icon literal
```

Sets are discovered and retrieved through the catalog the module mounts at
`/api/icon-sheets/sets`; `apply` swaps the active document and the sprite re-renders in
place (the `<use href="#alias">` never changes). Set selection does not yet
persist across reloads.

## Remote catalog & auth

Point the catalog at a remote vendor instead of (or alongside) the configured
`sets`; the server routes proxy to it, so the token stays server-side and the
browser only ever talks to the app's own origin:

```ts
iconSheets: {
  catalog: {
    base: "https://icons.acme.com",     // remote origin (non-secret)
    headers: { "x-tenant": "acme" },     // optional static headers
  },
}
```

Auth is a **single env var**, `NUXT_ICON_SHEETS_TOKEN`, sent as a bearer token. It is
read from `process.env` at build (to resolve a local config's refs from a private
source) and from `runtimeConfig` at runtime (to load sets) — so one variable covers
both phases and no secret lives in `nuxt.config` or the bundle:

```sh
# .env
NUXT_ICON_SHEETS_TOKEN=sk_live_…
```

## How it works

- **Build** — reads each layer's preset, builds the local kit config (or takes
  the documents it was passed) over them, validates the result, writes the
  contract to `#build/icon-sheets.mjs`, and derives
  `Alias` into `#build/types/icon-sheets.d.ts`. Sets are written as JSON, mounted
  as nitro server assets, and served by the catalog routes; payloads never enter
  the app bundle.
- **Server** — a nitro plugin inlines the base contract's sprite into the body so
  icons paint on first load.
- **Client** — a plugin builds the service over a reactive, SSR-serializable
  container and keeps the sprite in sync as sets and overrides change.
