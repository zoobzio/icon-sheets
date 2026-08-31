# Integrations

Bridges between icon-sheets and the outside world: the build-time generator
that resolves Iconify references, and framework modules.

| Integration                         | Directory              | Description                                                               |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| [`@icon-sheets/iconify`](./iconify) | `integrations/iconify` | Build-time codegen — resolves Iconify refs into contracts and sets        |
| [`@icon-sheets/nuxt`](./nuxt)       | `integrations/nuxt`    | Nuxt module — build-time resolution, SSR sprite, `<Icon>`, catalog routes |
