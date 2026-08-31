# @icon-sheets/nuxt

Nuxt module for icon-sheets. At build time it resolves the icon refs in
`nuxt.config` into a flat contract and derives the `Alias` union for
autocompletion. At runtime it inlines the SVG sprite server-side, registers
the `<Icon>` component and the `useIconSheets()` composable, and serves
switchable sets through catalog routes.

## Usage

Author icons as refs — the module resolves them with
[`@icon-sheets/iconify`](../iconify) at build time. Refs draw from local
`@iconify-json/*` packages first, then the public Iconify API; a
`$/host/path` ref fetches a single icon from a URL:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@icon-sheets/nuxt"],
  iconSheets: {
    icons: {
      home: "lucide:home",
      save: "lucide:content-save",
    },
    // Optional switchable sets, served over the catalog.
    sets: {
      sharp: { id: "sharp", name: "Sharp", icons: { home: "lucide:home" } },
    },
  },
});
```

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

Point the catalog at a remote vendor instead of (or alongside) build-emitted
`sets`; the server routes proxy to it, so the token stays server-side and the
browser only ever talks to the app's own origin:

```ts
iconSheets: {
  icons: { home: "acme:home" },
  catalog: {
    base: "https://icons.acme.com",     // remote origin (non-secret)
    headers: { "x-tenant": "acme" },     // optional static headers
  },
}
```

Auth is a **single env var**, `NUXT_ICON_SHEETS_TOKEN`, sent as a bearer token. It is
read from `process.env` at build (to resolve refs from a private source) and from
`runtimeConfig` at runtime (to load sets) — so one variable covers both phases and
no secret lives in `nuxt.config` or the bundle:

```sh
# .env
NUXT_ICON_SHEETS_TOKEN=sk_live_…
```

## How it works

- **Build** — resolves `icons` into a contract, writes it to `#build/icon-sheets.mjs`,
  and derives `Alias` into `#build/types/icon-sheets.d.ts`. Sets are resolved to JSON,
  mounted as nitro server assets, and served by the catalog routes; payloads
  never enter the app bundle.
- **Server** — a nitro plugin inlines the base contract's sprite into the body so
  icons paint on first load.
- **Client** — a plugin builds the service over a reactive, SSR-serializable
  container and keeps the sprite in sync as sets and overrides change.
