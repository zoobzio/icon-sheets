# @icon-sheets/iconify

The resolution layer. You name an icon by its Iconify reference;
`resolveContract()` turns each one into a self-contained icon definition and
returns the validated contract, and `resolveSet()` does the same for a
switchable set. All Iconify JSON handling — loading collections, flattening
alias chains, merging transforms — happens here, once, so the runtime carries
none of it.

This package resolves; it does not write files. Generating a project's or a
preset's modules and sprites is [`@icon-sheets/kit`](../../packages/kit)'s job,
and the Nuxt module resolves in memory at build time — both call into here.

## Ref grammar

- `prefix:name` — an icon from an Iconify collection. Resolved from a local
  `@iconify-json/{prefix}` package when installed, else fetched (batched, one
  request per prefix) from the Iconify API.
- `$/host/path` — a single icon fetched from `https://host/path`, which returns
  one `IconifyIcon` as JSON.

## Programmatic

Both entry points own no I/O: a caller-supplied `req` intercepts every fetch
(authentication, offline fixtures), and the result is a plain object.

```ts
import { resolveContract, resolveSet } from "@icon-sheets/iconify";

const contract = await resolveContract({
  config: {
    id: "app",
    name: "App Icons",
    icons: { home: "lucide:home", save: "lucide:content-save" },
  },
});
// { id: "app", name: "App Icons", icons: { home: { body: "…", width: 24, height: 24 }, … } }

const set = await resolveSet({
  identity: { id: "solid", name: "Solid" },
  aliases: Object.keys(contract.icons),
  icons: { home: "lucide-solid:home" },
});
// { id: "solid", name: "Solid", icons: { home: { body: "…" } } }
```

## Boundaries

- Resolution is scheme-keyed; `options.resolvers` overrides the built-in
  `iconify` / `url` behaviour (a custom endpoint, an offline fixture).
- Every unresolvable ref is collected and reported together, each as
  `alias → ref`.
- `resolveSet` membership-checks each ref key against the contract's `aliases`
  before resolving — a set may only rebind aliases the contract declares.
- The assembled document is validated through `@icon-sheets/schema` before it
  is returned; a failure there points at the offending ref.
- `$/` responses are trusted, not sanitized — untrusted sources are a separate
  concern.
