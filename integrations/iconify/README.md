# @icon-sheets/iconify

The build layer. You name the icons an app uses by their Iconify reference;
`generate()` resolves each one into a self-contained icon definition and emits
the `icon-sheets.config.ts` contract the runtime consumes directly.
`generateSet()` does the same for a switchable set, emitting the JSON document
a catalog serves. All Iconify JSON handling — loading collections, flattening
alias chains, merging transforms — happens here, once, so the runtime carries
none of it.

## Ref grammar

- `prefix:name` — an icon from an Iconify collection. Resolved from a local
  `@iconify-json/{prefix}` package when installed, else fetched (batched, one
  request per prefix) from the Iconify API.
- `$/host/path` — a single icon fetched from `https://host/path`, which returns
  one `IconifyIcon` as JSON.

## Programmatic

`generate()` / `generateSet()` do no filesystem writes and own no I/O: a
caller-supplied `req` intercepts every fetch (authentication, offline fixtures),
and the result is the file contents for the caller to write.

```ts
import { writeFile } from "node:fs/promises";
import { generate, generateSet } from "@icon-sheets/iconify";

const contract = await generate({
  config: {
    id: "app",
    name: "App Icons",
    icons: { home: "lucide:home", save: "lucide:content-save" },
  },
});
await writeFile(contract.filename, contract.contents); // icon-sheets.config.ts

const set = await generateSet({
  identity: { id: "solid", name: "Solid" },
  aliases: ["home", "save"],
  icons: { home: "lucide-solid:home" },
});
await writeFile(set.filename, set.contents); // solid.set.json
```

The emitted `icon-sheets.config.ts`:

```ts
import { defineIconSheetsConfig } from "icon-sheets/config";

export default defineIconSheetsConfig({
  contract: {
    id: "app",
    name: "App Icons",
    icons: { home: { body: "…", width: 24, height: 24 } },
  },
});
```

The emitted `solid.set.json` — the catalog payload:

```json
{
  "id": "solid",
  "name": "Solid",
  "icons": { "home": { "body": "…" } }
}
```

## Boundaries

- Resolution is scheme-keyed; `options.resolvers` overrides the built-in
  `iconify` / `url` behaviour (a custom endpoint, an offline fixture).
- Every unresolvable ref is collected and reported together, each as
  `alias → ref`.
- `generateSet` membership-checks each ref key against the contract's `aliases`
  before resolving — a set may only rebind aliases the contract declares.
- The assembled document is validated through `@icon-sheets/schema` before
  emission; a failure there points at the offending ref.
- `$/` responses are trusted, not sanitized — untrusted sources are a separate
  concern.
