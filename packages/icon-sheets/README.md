# icon-sheets

The public umbrella package. Re-exports the core engine (`defineIconSheets`) at the
root and the rest of the library behind subpaths, so integrations depend on
this one package rather than the internal `@icon-sheets/*` set.

| Import               | Provides                                   |
| -------------------- | ------------------------------------------ |
| `icon-sheets`        | The icon engine — `defineIconSheets`       |
| `icon-sheets/svg`    | The SVG sprite renderer — `defineSprite`   |
| `icon-sheets/config` | Config types and the `defineConfig` helper |

> Scaffold — implementation pending.
