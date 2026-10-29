---
"@icon-sheets/kit": patch
---

Iconify ref resolution moves into the kit, and `@icon-sheets/iconify` is
retired: a package no longer depends on an integration.

- **kit:** resolves `prefix:name`, `$/host/path` and `./path.svg` refs itself,
  with the same batching, collected misses, file handling and schema checks.
  `Req` is now exported from `@icon-sheets/kit`. The `resolvers` option of
  `generate`, `resolveKit` and `build` is removed; `req` remains the seam for
  authenticated or offline sources.
- **iconify:** removed. `resolveContract`, `resolveSet` and `resolveAll` have
  no replacement outside `resolveKit`.
