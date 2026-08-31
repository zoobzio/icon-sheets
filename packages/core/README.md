# @icon-sheets/core

The runtime icon service. `makeIconSheets` (or the inline variant
`defineIconSheets`) builds an `IconSheets` service over a resolved contract:
`resolve(alias)` returns the effective icon literal, `apply(set)` swaps the
active set, and a user override layer sits on top (`set`, `update`, `dirty`,
`reset`, `delta`, `extract`).

Core never reads Iconify JSON collections and does no alias or transform
resolution — that happens once, at build time, in
[`@icon-sheets/iconify`](../../integrations/iconify). At runtime, resolving an
alias is a plain lookup.

Internal package — consume it through [`icon-sheets`](../icon-sheets), which
re-exports it at the root.
