# icon-sheets

The public package. Everything an app or integration consumes is exported
here, so the internal `@icon-sheets/*` packages stay free to change.

| Import                | Provides                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `icon-sheets`         | The runtime service — `makeIconSheets` / `defineIconSheets` — plus the schema types and helpers |
| `icon-sheets/config`  | `defineIconSheetsConfig` for the emitted contract file, `useIconSheetsConfig` to seed a service |
| `icon-sheets/catalog` | Set discovery and retrieval — `defineCatalog` / `defineClient`                                  |
| `icon-sheets/svg`     | The sprite renderer — `defineSprite`                                                            |

See the [repository README](../../README.md) for the full picture.
