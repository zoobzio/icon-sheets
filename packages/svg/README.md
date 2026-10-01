# @icon-sheets/svg

The SVG sprite renderer. `defineSprite(source)` accepts anything with
`aliases()` and `resolve()` — a core service qualifies as-is — and renders:

- `href(alias)` — the constant `#alias` reference for `<use>`
- `symbol(alias)` — one `<symbol id="{alias}">`
- `symbols(aliases)` — a partial batch, for patching the DOM in place after a
  set swap
- `sheet()` — the full hidden `<svg>` sprite, for build-time or SSR inlining;
  `sheet({ hidden: false })` drops the `display:none` for a standalone
  `sprite.svg` file

Symbol ids carry no set namespace, so a `<use href="#home">` keeps working when
the active set changes; only the symbol body behind it does. When several
sprites share a document, `defineSprite(source, { prefix: "ui-" })` namespaces
every id and `href` (`#ui-home`).

Internal package — consume it through `icon-sheets/svg`.
