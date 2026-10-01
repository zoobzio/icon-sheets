---
"@icon-sheets/nuxt": patch
---

**Breaking:** a set's key under `iconSheets.sets` is now its id. Remove the
`id` field from each set — `sets: { sharp: { name: "Sharp", icons } }` — and
make sure the key is the id the set should be listed and retrieved under. A set
that still declares an `id` fails the build with a message naming it.

The module now resolves the contract and every set in one pass through
`resolveAll()`, so each Iconify collection is fetched once instead of once per
set.
