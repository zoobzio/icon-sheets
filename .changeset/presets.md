---
"@icon-sheets/iconify": patch
"@icon-sheets/kit": patch
"@icon-sheets/nuxt": patch
---

Presets: compose a config over the kit builds of other packages.

- **kit:** `extends` in `icon-sheets.config.ts` names packages that export a
  kit build (`./config`, `./sets`, root `prefix`). Their resolved icons become
  the base, in order, and the config's own icons land on top; a set may rebind
  a preset alias, and a set with a preset set's id takes its place. The prefix
  is inherited when unset and a differing one is rejected. Nothing of a preset
  is resolved again. `preset<Alias>(name)` types a preset's aliases for the
  sets check. New `loadPreset`, `loadPresets`, `compose`, the `Documents` and
  `Layer` types, and `MalformedPresetError`.
- **nuxt:** `iconSheets.preset` names a package that exports a kit build.
  Every layer may name one; each resolves from its own layer's directory and
  they compose farthest layer first. Passed documents and a local config land
  over the presets; with presets, the default config file is built only when
  it exists.
- **iconify:** `resolveAll` takes `aliases`, further names a set may rebind
  beyond the config's own.
