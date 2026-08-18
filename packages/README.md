# Packages

| Package                           | Directory              | Description                                                         |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| [`icon-sheets`](./icon-sheets)    | `packages/icon-sheets` | Umbrella package — core API at the root, `svg` subpath              |
| [`@icon-sheets/core`](./core)     | `packages/core`        | The icon engine (`defineIconSheets`) — load, resolve, subset        |
| [`@icon-sheets/svg`](./svg)       | `packages/svg`         | SVG sprite-sheet renderer (`defineSprite`)                          |
| [`@icon-sheets/schema`](./schema) | `packages/schema`      | Iconify JSON contract types and runtime validation (`defineSchema`) |
| [`@icon-sheets/utils`](./utils)   | `packages/utils`       | Structural icon-set operations (`merge`/`subset`/`prune`/`diff`)    |

Framework integrations (e.g. the Nuxt module) live in [`../integrations`](../integrations).
