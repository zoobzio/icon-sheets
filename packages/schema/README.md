# @icon-sheets/schema

Types and runtime validation for the resolved contract: `Identity`, `Contract`
(an identity plus a flat `alias → IconifyIcon` map), `Set`, `Overrides`, and
the `Alias<C>` union that drives autocompletion. `defineSchema(contract)`
returns a `Schema` bundle — `check`, `assert`, `parse`, and `inspect` over
icons, aliases, overrides, sets, and contracts — used wherever data crosses a
boundary at runtime.

This package deliberately does not model Iconify JSON collections (alias
chains, inherited transforms); those exist only at build time, in
[`@icon-sheets/iconify`](../../integrations/iconify).

Internal package — consume it through [`icon-sheets`](../icon-sheets).
