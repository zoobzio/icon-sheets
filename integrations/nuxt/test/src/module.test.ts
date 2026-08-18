import type { NuxtIconSheetsConfig } from "../../src/config";

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { contract, sets } from "../fixtures";

const kit = vi.hoisted(() => ({
  addTemplate: vi.fn(),
  addTypeTemplate: vi.fn(),
  addPlugin: vi.fn(),
  addServerPlugin: vi.fn(),
  addComponent: vi.fn(),
  addImports: vi.fn(),
  addServerHandler: vi.fn(),
  createResolver: vi.fn(() => ({ resolve: (p: string) => `/resolved${p}` })),
}));

vi.mock("@nuxt/kit", () => ({
  defineNuxtModule: (def: unknown) => def,
  ...kit,
}));

// Resolution is exercised by @icon-sheets/iconify's own tests; here it is stubbed so
// the module runs offline. `resolveSet` echoes the identity with a single
// resolved icon, so any authored set id flows through to the catalog.
vi.mock("@icon-sheets/iconify", () => ({
  resolveContract: vi.fn(async () => structuredClone(contract)),
  resolveSet: vi.fn(
    async ({ identity }: { identity: { id: string; name: string } }) => ({
      ...identity,
      icons: { home: { body: "<path/>", width: 24, height: 24 } },
    }),
  ),
}));

import { resolveContract, resolveSet } from "@icon-sheets/iconify";
import module from "../../src/module";

interface FakeNuxt {
  options: {
    buildDir: string;
    nitro: { serverAssets?: { baseName: string; dir: string }[] };
    runtimeConfig: Record<string, unknown>;
  };
  hook: ReturnType<typeof vi.fn>;
}

interface ModuleDef {
  meta: { name: string; configKey: string };
  setup: (options: NuxtIconSheetsConfig, nuxt: FakeNuxt) => Promise<void>;
}
const mod = module as unknown as ModuleDef;

const options: NuxtIconSheetsConfig = { icons: { home: "lucide:home" }, sets };

const template = (filename: string) =>
  kit.addTemplate.mock.calls
    .map((call): { filename: string; getContents: () => string } => call[0])
    .find((entry) => entry.filename === filename);

let nuxt: FakeNuxt;

const build = async () => {
  for (const [name, callback] of nuxt.hook.mock.calls) {
    if (name === "build:before") {
      await callback();
    }
  }
};

describe("icon-sheets module", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    nuxt = {
      options: {
        buildDir: await mkdtemp(join(tmpdir(), "icon-sheets-module-")),
        nitro: {},
        runtimeConfig: {},
      },
      hook: vi.fn(),
    };
  });

  afterEach(async () => {
    await rm(nuxt.options.buildDir, { recursive: true, force: true });
  });

  it("has the expected meta", () => {
    expect(mod.meta).toEqual({ name: "icon-sheets", configKey: "iconSheets" });
  });

  it("fails plainly when no icons are configured", async () => {
    const missing = { ...options };
    Reflect.deleteProperty(missing, "icons");
    await expect(mod.setup(missing, nuxt)).rejects.toThrow(/no icons/);
  });

  it("rejects duplicate set ids in the catalog", async () => {
    const dupes = {
      ...options,
      sets: {
        one: { id: "dup", name: "One", icons: { home: "lucide:home" } },
        two: { id: "dup", name: "Two", icons: { home: "lucide:home" } },
      },
    };
    await expect(mod.setup(dupes, nuxt)).rejects.toThrow(/duplicate set id/);
  });

  it("writes the catalog manifest and payloads on build:before", async () => {
    await mod.setup(options, nuxt);
    await build();
    const dir = join(nuxt.options.buildDir, "icon-sheets");

    const entries: unknown = JSON.parse(
      await readFile(join(dir, "entries.json"), "utf8"),
    );
    expect(entries).toEqual([
      { id: "sharp", name: "Sharp" },
      { id: "round", name: "Round", tags: ["soft"] },
    ]);

    const payloads = JSON.parse(await readFile(join(dir, "sets.json"), "utf8"));
    expect(Object.keys(payloads)).toEqual(["sharp", "round"]);

    const markup = await readFile(join(dir, "sprite.html"), "utf8");
    expect(markup).toContain('id="icon-sheets-sprite"');
    expect(markup).toContain('<symbol id="home"');
  });

  it("writes an empty catalog when no sets are configured", async () => {
    const bare = { ...options };
    Reflect.deleteProperty(bare, "sets");
    await mod.setup(bare, nuxt);
    await build();

    const entries: unknown = JSON.parse(
      await readFile(
        join(nuxt.options.buildDir, "icon-sheets", "entries.json"),
        "utf8",
      ),
    );
    expect(entries).toEqual([]);
  });

  it("mounts the catalog directory as a nitro server asset", async () => {
    await mod.setup(options, nuxt);
    expect(nuxt.options.nitro.serverAssets).toEqual([
      {
        baseName: "icon-sheets",
        dir: join(nuxt.options.buildDir, "icon-sheets"),
      },
    ]);
  });

  it("registers the catalog's listing and retrieval routes", async () => {
    await mod.setup(options, nuxt);
    const handlers = kit.addServerHandler.mock.calls.map((call) => call[0]);
    expect(handlers).toEqual([
      {
        route: "/api/icon-sheets/sets",
        method: "get",
        handler: "/resolved./runtime/server/list",
      },
      {
        route: "/api/icon-sheets/sets/:id",
        method: "get",
        handler: "/resolved./runtime/server/get",
      },
    ]);
  });

  it("registers a type template with the alias union", async () => {
    await mod.setup(options, nuxt);
    const types = kit.addTypeTemplate.mock.calls[0][0];
    expect(types.filename).toBe("types/icon-sheets.d.ts");
    expect(types.getContents()).toContain(
      'export type Alias = "home" | "save";',
    );
  });

  it("registers a build template exporting the contract", async () => {
    await mod.setup(options, nuxt);
    const build = template("icon-sheets.mjs");
    expect(build).toBeDefined();
    expect(build!.getContents()).toContain("export const contract =");
  });

  it("registers the runtime plugin and the sprite server plugin", async () => {
    await mod.setup(options, nuxt);
    expect(kit.addPlugin.mock.calls[0][0].src).toContain("runtime/plugin");
    expect(kit.addServerPlugin.mock.calls[0][0]).toContain(
      "runtime/server/sprite",
    );
  });

  it("registers the Icon component", async () => {
    await mod.setup(options, nuxt);
    expect(kit.addComponent.mock.calls[0][0]).toMatchObject({ name: "Icon" });
  });

  it("auto-imports useIconSheets", async () => {
    await mod.setup(options, nuxt);
    const names = kit.addImports.mock.calls[0][0].map(
      (entry: { name: string }) => entry.name,
    );
    expect(names).toContain("useIconSheets");
  });

  it("threads a bearer request loader to the resolvers only when the token env is set", async () => {
    await mod.setup(options, nuxt);
    expect(vi.mocked(resolveContract).mock.calls[0][0].req).toBeUndefined();
    expect(vi.mocked(resolveSet).mock.calls[0][0].req).toBeUndefined();

    vi.clearAllMocks();
    process.env.NUXT_ICON_SHEETS_TOKEN = "secret";
    try {
      await mod.setup(options, nuxt);
      expect(typeof vi.mocked(resolveContract).mock.calls[0][0].req).toBe(
        "function",
      );
      expect(typeof vi.mocked(resolveSet).mock.calls[0][0].req).toBe(
        "function",
      );
    } finally {
      delete process.env.NUXT_ICON_SHEETS_TOKEN;
    }
  });

  it("registers the remote catalog on runtimeConfig with an empty token default", async () => {
    await mod.setup(
      {
        ...options,
        catalog: {
          base: "https://vendor.test",
          headers: { "x-tenant": "acme" },
        },
      },
      nuxt,
    );
    expect(nuxt.options.runtimeConfig.iconSheets).toEqual({
      base: "https://vendor.test",
      headers: { "x-tenant": "acme" },
      token: "",
    });
  });
});
