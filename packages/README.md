# Packages

| Package                             | Directory              | Description                                                                         |
| ----------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| [`icon-sheets`](./icon-sheets)      | `packages/icon-sheets` | The public package — the runtime service at the root, `/config`, `/catalog`, `/svg` |
| [`@icon-sheets/core`](./core)       | `packages/core`        | The runtime icon service (`makeIconSheets`) — resolve, apply, override              |
| [`@icon-sheets/schema`](./schema)   | `packages/schema`      | Contract types and runtime validation (`defineSchema`)                              |
| [`@icon-sheets/catalog`](./catalog) | `packages/catalog`     | Set discovery and retrieval (`defineCatalog` / `defineClient`)                      |
| [`@icon-sheets/svg`](./svg)         | `packages/svg`         | SVG sprite renderer (`defineSprite`)                                                |
| [`@icon-sheets/utils`](./utils)     | `packages/utils`       | Data helpers (`copy` / `clone` / `merge`)                                           |

Apps and integrations depend on the public `icon-sheets` package; the
`@icon-sheets/*` packages are internals behind it.

Build and framework integrations live in [`../integrations`](../integrations).
