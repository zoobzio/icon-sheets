# @icon-sheets/example-icons

An icons package: one [`@icon-sheets/kit`](../../packages/kit) config, built
into modules and sprites that the package exports. The [Nuxt example](../nuxt)
names it as its preset. It is the shape of a shared icons package for a design
system or a product. Each icon has a name by role, and the artwork behind the
name comes from Iconify collections and from SVG files of the package's own.

## Layout

```
icon-sheets.config.ts   the kit config: the aliases, their refs, and the sets
src/logo.svg            a local icon drawn in currentColor, so it follows the text colour
src/badge.svg           a local icon with a gradient of its own
src/badge-flat.svg      the flat badge, which the Material set binds
```

## The icons

The base contract is **Lucide**: ten aliases, each mapped to a ref.

| Alias                                                                  | Ref               | Source                 |
| ---------------------------------------------------------------------- | ----------------- | ---------------------- |
| `logo`                                                                 | `./src/logo.svg`  | a local SVG            |
| `badge`                                                                | `./src/badge.svg` | a local SVG            |
| `home`, `search`, `settings`, `user`, `heart`, `star`, `trash`, `bell` | `lucide:<name>`   | `@iconify-json/lucide` |

The kit reads a local SVG's `viewBox` as the geometry of the icon. It keeps
the root's `fill` and `stroke` around the body, and gives every `id` a
namespace per file. The gradient of `badge.svg` can't collide with another id
in the sprite.

Three sets rebind the aliases with other collections: **Material Design**
(`mdi`), **Tabler** (`tabler`), and **Phosphor** (`ph`). A set binds only the
aliases it changes, and the rest fall through to the base. No set binds
`logo`, so the logo stays the same in every set. Material binds `badge` to
`src/badge-flat.svg`, so a set can take a local SVG as well as an Iconify
icon.

The `@iconify-json/*` packages are dev dependencies. The kit reads them at
build time, and the build carries the resolved icons, so a consumer needs
none of them.

## Exports

`pnpm build` runs `icon-sheets build`, which writes `.dist/`. The `exports`
of `package.json` point at `.dist/` with the patterns from the kit's
[Publishing](../../packages/kit#publishing), so a new or removed set needs no
change there.

- `@icon-sheets/example-icons`: `type Alias`, `aliases`, `isAlias`,
  `setIds`, `prefix`, and `href`. It holds no icon data.
- `@icon-sheets/example-icons/config`: the resolved contract.
- `@icon-sheets/example-icons/sets`: the resolved sets, keyed by id.
- `@icon-sheets/example-icons/sheet`: the hidden sprite of the base and of
  each set, for inlining.
- `@icon-sheets/example-icons/sprite.svg` and `./sprite.<set>.svg`: standalone
  sprite files.

The `./config` and `./sets` modules and the root `prefix` together make the
package a preset. In Nuxt, the whole setup is
`iconSheets: { preset: "@icon-sheets/example-icons" }`. Another kit config
builds on it with `extends: [preset<Alias>("@icon-sheets/example-icons")]`.

## Scripts

- `pnpm build`: resolves every ref and writes `.dist/`.
- `pnpm typecheck`: checks the config, so a set that rebinds an undeclared
  alias fails.
