# Examples

The icons example is a package: one [`@icon-sheets/kit`](../packages/kit)
config that draws icons from Iconify collections and from SVG files of its own,
built into a preset. The Nuxt example takes it as its preset through
[`@icon-sheets/nuxt`](../integrations/nuxt) and switches its sets at runtime.

| Example          | Directory        | Description                                                                                   |
| ---------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| [icons](./icons) | `examples/icons` | An icons package: Lucide icons and local SVGs as the base, with three sets, built by the kit. |
| [nuxt](./nuxt)   | `examples/nuxt`  | A Nuxt page that renders the icons package and applies its sets at runtime.                   |

Build the workspace before you run an example, since the Nuxt example reads the
build of the icons package:

```sh
pnpm install
pnpm build
pnpm --filter @icon-sheets/example-nuxt dev
```
