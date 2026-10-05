---
"@icon-sheets/iconify": patch
"@icon-sheets/kit": patch
"@icon-sheets/nuxt": patch
---

Local SVG files as icon refs.

A ref starting with `./` or `../` now names a local SVG file, relative to the
project root (`cwd`), alongside `prefix:name` and `$/host/path`:

```ts
icons: { home: "lucide:house", logo: "./assets/logo.svg" },
```

- **iconify:** a new `file` scheme. The SVG's `viewBox` becomes the icon's
  geometry, root presentation attributes are kept, and ids are namespaced per
  file so they cannot collide in a sprite. A file with no `viewBox` or with an
  undeclared namespace (`xlink:href`, `inkscape:*`) is rejected; a missing file
  is reported with the other unresolvable refs. `resolveAll` returns `sources`,
  the absolute paths of the files read.
- **kit:** `resolveKit` returns those paths as `Kit.sources`.
- **nuxt:** a locally built config's SVG files join the watch list, so editing
  one restarts dev.
