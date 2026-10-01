import type { Contract, Schema, Set } from "icon-sheets";
import type { Entry } from "icon-sheets/catalog";
import type { NuxtIconSheetsConfig } from "./config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { defineSchema, makeIconSheets } from "icon-sheets";
import { ROUTE } from "icon-sheets/catalog";
import { defineSprite } from "icon-sheets/svg";

import {
  defineNuxtModule,
  addTemplate,
  addTypeTemplate,
  addPlugin,
  addComponent,
  addImports,
  addServerHandler,
  addServerPlugin,
  createResolver,
} from "@nuxt/kit";

import { loadIcons } from "./icons";
import { ASSETS, CONTAINER, ENTRIES, MOUNT, SETS, SPRITE } from "./constant";

/**
 * Nuxt module for icon-sheets.
 *
 * Its icons are always an `@icon-sheets/kit` config: either the app's own,
 * built here through the kit, or the documents a kit build elsewhere already
 * generated, passed in. At build time it writes the contract to the
 * `icon-sheets.mjs` build template, derives the `Alias` union into
 * `types/icon-sheets.d.ts`, and registers the runtime plugin, the `<Icon>`
 * component, and the `useIconSheets` auto-import. Set payloads are never
 * bundled with the app: they are written as JSON, mounted as nitro server
 * assets, and served over the catalog wire protocol — listings at
 * `${MOUNT}/sets`, payloads at `${MOUNT}/sets/:id`.
 */
export default defineNuxtModule<NuxtIconSheetsConfig>({
  meta: {
    name: "icon-sheets",
    configKey: "iconSheets",
  },
  setup: async (options, nuxt) => {
    const resolver = createResolver(import.meta.url);

    const { contract, sets, prefix } = await loadIcons(options, nuxt);

    const schema: Schema<Contract> = defineSchema(contract);

    /*
     * The catalog, keyed by each set's own id — the identity the wire protocol
     * lists and retrieves by. Every set is proven against the contract here, so
     * the routes serve stored payloads without re-proving.
     */
    const catalog: Record<string, Set> = {};
    for (const set of sets) {
      schema.assert.set(set);
      catalog[set.id] = set;
    }

    const entries = Object.values(catalog).map((set) => {
      const entry: Entry = { id: set.id, name: set.name };
      if (set.description !== undefined) entry.description = set.description;
      if (set.tags !== undefined) entry.tags = set.tags;
      return entry;
    });

    /*
     * The base contract's sprite, rendered here where the contract is in hand.
     * The server runtime cannot import the app's `#build` contract, so the markup
     * is written as an asset the nitro plugin reads and inlines.
     */
    const sprite = defineSprite(makeIconSheets({ contract, override: {} }), {
      prefix,
    });
    const markup = `<div id="${CONTAINER}">${sprite.sheet()}</div>`;

    /*
     * Set payloads stay off the app bundle: plain JSON files in the build
     * directory, mounted as nitro server assets. The write waits for
     * `build:before`, which fires after nuxt has cleared the build directory; a
     * write during setup would be wiped.
     */
    const assets = join(nuxt.options.buildDir, ASSETS);

    nuxt.hook("build:before", async () => {
      await mkdir(assets, { recursive: true });
      await writeFile(join(assets, ENTRIES), JSON.stringify(entries));
      await writeFile(join(assets, SETS), JSON.stringify(catalog));
      await writeFile(join(assets, SPRITE), markup);
    });

    nuxt.options.nitro.serverAssets ||= [];
    nuxt.options.nitro.serverAssets.push({ baseName: ASSETS, dir: assets });

    /*
     * The remote catalog, exposed to the server routes through runtimeConfig so
     * the base and headers are env-overridable and the token stays server-side.
     * `token` defaults empty and is filled at runtime by
     * `NUXT_ICON_SHEETS_TOKEN` — the same variable a local build reads from
     * `process.env` — so one env var serves both the build-time resolution and
     * the runtime set loading.
     */
    nuxt.options.runtimeConfig.iconSheets = {
      base: options.catalog?.base ?? "",
      headers: options.catalog?.headers ?? {},
      token: "",
    };

    addServerHandler({
      route: `${MOUNT}/${ROUTE}`,
      method: "get",
      handler: resolver.resolve("./runtime/server/list"),
    });

    addServerHandler({
      route: `${MOUNT}/${ROUTE}/:id`,
      method: "get",
      handler: resolver.resolve("./runtime/server/get"),
    });

    addTypeTemplate({
      filename: "types/icon-sheets.d.ts",
      write: true,
      getContents: () => {
        const union = Array.from(schema.enums.aliases)
          .map((alias) => JSON.stringify(alias))
          .join(" | ");
        return [
          `import type { IconifyIcon } from "icon-sheets";`,
          `export type Alias = ${union || "never"};`,
          `export type Overrides = Partial<Record<Alias, IconifyIcon>>;`,
        ].join("\n");
      },
    });

    addTemplate({
      filename: "icon-sheets.mjs",
      write: true,
      getContents: () =>
        [
          `export const contract = ${JSON.stringify(contract)};`,
          `export const prefix = ${JSON.stringify(prefix)};`,
        ].join("\n"),
    });

    addTemplate({
      filename: "icon-sheets.d.mts",
      write: true,
      getContents: () =>
        [
          `import type { Identity, IconifyIcon } from "icon-sheets";`,
          `import type { Alias } from "./types/icon-sheets";`,
          `export const contract: Identity & { icons: Record<Alias, IconifyIcon> };`,
          `export const prefix: string;`,
        ].join("\n"),
    });

    addPlugin({
      src: resolver.resolve("./runtime/plugin"),
    });

    addServerPlugin(resolver.resolve("./runtime/server/sprite"));

    addComponent({
      name: "Icon",
      filePath: resolver.resolve("./runtime/component/Icon"),
    });

    addImports([
      {
        from: resolver.resolve("./runtime/composable"),
        name: "useIconSheets",
      },
      {
        from: resolver.resolve("./runtime/store"),
        name: "accessIconSheets",
      },
      ...[
        "AppIconSheetsContract",
        "AppIconSheetsSet",
        "AppIconSheetsOverrides",
        "AppIconSheetsConfig",
        "AppIconSheets",
      ].map((name) => ({
        from: resolver.resolve("./runtime/types"),
        name,
        type: true,
      })),
    ]);
  },
});
