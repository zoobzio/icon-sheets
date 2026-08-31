# @icon-sheets/catalog

Set discovery and retrieval. A `Catalog` has two methods: `list(query)` pages
through the available sets (filtered and sorted), and `get(id)` fetches one
set, validated against the contract's schema before it is returned — a
malformed payload throws rather than passing as a miss.

Two constructors produce the same interface:

- `defineCatalog(schema, provider)` — serve sets from anything that can list
  and fetch them: build-emitted JSON, a database, an in-memory map.
- `defineClient(schema, client)` — consume a catalog hosted elsewhere over
  HTTP (`{base}/sets` and `{base}/sets/{id}`).

Because both ends share one wire protocol, an app can serve its own
build-emitted sets today and point at a remote vendor later without changing
call sites.

Internal package — consume it through `icon-sheets/catalog`.
