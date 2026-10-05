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

// The kit's own tests exercise loading and resolution; here both are stubbed so
// the module's local build runs offline. `resolveKit` answers with the fixture
// documents under a prefix, so a test can tell a local build from passed ones.
vi.mock("@icon-sheets/kit", () => ({
  FILENAME: "icon-sheets.config.ts",
  loadConfig: vi.fn(async () => authored),
  resolveKit: vi.fn(async () => ({
    contract: structuredClone(contract),
    sets: Object.values(sets),
    prefix: "kit-",
    outDir: "icons",
    sources: ["/app/assets/logo.svg"],
  })),
}));

import { loadConfig, resolveKit } from "@icon-sheets/kit";
import module from "../../src/module";

/** The kit config the stubbed loader answers with. */
const authored = {
  id: "app",
  name: "App Icons",
  icons: { home: "lucide:home" },
};

interface FakeNuxt {
  options: {
    rootDir: string;
    watch: string[];
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

const options: NuxtIconSheetsConfig = { contract, sets };

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
        rootDir: "/app",
        watch: [],
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

  describe("given resolved documents", () => {
    it("uses them without building anything", async () => {
      await mod.setup(options, nuxt);
      expect(loadConfig).not.toHaveBeenCalled();
      expect(resolveKit).not.toHaveBeenCalled();
      expect(nuxt.options.watch).toEqual([]);
      expect(template("icon-sheets.mjs")!.getContents()).toContain(
        'export const prefix = "";',
      );
    });
  });

  describe("given no documents", () => {
    it("builds the kit config in the project root", async () => {
      await mod.setup({}, nuxt);
      expect(loadConfig).toHaveBeenCalledWith("/app/icon-sheets.config.ts");
      expect(resolveKit).toHaveBeenCalledWith(authored, {
        cwd: "/app",
        req: undefined,
      });
    });

    it("builds the kit config it is pointed at", async () => {
      await mod.setup({ config: "config/icons.ts" }, nuxt);
      expect(loadConfig).toHaveBeenCalledWith("/app/config/icons.ts");
    });

    it("serves the built contract, sets and prefix", async () => {
      await mod.setup({}, nuxt);
      await build();
      const dir = join(nuxt.options.buildDir, "icon-sheets");
      const payloads = JSON.parse(
        await readFile(join(dir, "sets.json"), "utf8"),
      );
      expect(Object.keys(payloads)).toEqual(["sharp", "round"]);
      expect(await readFile(join(dir, "sprite.html"), "utf8")).toContain(
        '<symbol id="kit-home"',
      );
      expect(template("icon-sheets.mjs")!.getContents()).toContain(
        'export const prefix = "kit-";',
      );
    });

    it("watches the kit config and its local SVGs so an edit restarts dev", async () => {
      await mod.setup({}, nuxt);
      expect(nuxt.options.watch).toEqual([
        "/app/icon-sheets.config.ts",
        "/app/assets/logo.svg",
      ]);
    });

    it("lets a load failure through", async () => {
      vi.mocked(loadConfig).mockRejectedValueOnce(new Error("boom"));
      await expect(mod.setup({}, nuxt)).rejects.toThrow(/boom/);
    });

    it("threads a bearer request loader to the kit only when the token env is set", async () => {
      await mod.setup({}, nuxt);
      expect(vi.mocked(resolveKit).mock.calls[0][1]?.req).toBeUndefined();

      vi.clearAllMocks();
      process.env.NUXT_ICON_SHEETS_TOKEN = "secret";
      try {
        await mod.setup({}, nuxt);
        expect(typeof vi.mocked(resolveKit).mock.calls[0][1]?.req).toBe(
          "function",
        );
      } finally {
        delete process.env.NUXT_ICON_SHEETS_TOKEN;
      }
    });
  });

  it("rejects a contract that violates the schema", async () => {
    const broken = {
      ...options,
      contract: { ...contract, icons: { home: { body: 42 } } },
    } as unknown as NuxtIconSheetsConfig;
    await expect(mod.setup(broken, nuxt)).rejects.toThrow(/body/);
  });

  it("rejects a set that rebinds an alias the contract does not declare", async () => {
    const stray = {
      ...options,
      sets: {
        stray: { id: "stray", name: "Stray", icons: { ghost: { body: "" } } },
      },
    };
    await expect(mod.setup(stray, nuxt)).rejects.toThrow(/ghost/);
  });

  it("serves each set under its own id, whatever key it was passed under", async () => {
    await mod.setup({ ...options, sets: { other: sets.sharp } }, nuxt);
    await build();
    const payloads = JSON.parse(
      await readFile(
        join(nuxt.options.buildDir, "icon-sheets", "sets.json"),
        "utf8",
      ),
    );
    expect(Object.keys(payloads)).toEqual(["sharp"]);
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

  it("stores the set payloads as given", async () => {
    await mod.setup(options, nuxt);
    await build();
    const payloads = JSON.parse(
      await readFile(
        join(nuxt.options.buildDir, "icon-sheets", "sets.json"),
        "utf8",
      ),
    );
    expect(payloads).toEqual(sets);
  });

  it("renders the sprite and the build module under the configured prefix", async () => {
    await mod.setup({ ...options, prefix: "ui-" }, nuxt);
    await build();
    const markup = await readFile(
      join(nuxt.options.buildDir, "icon-sheets", "sprite.html"),
      "utf8",
    );
    expect(markup).toContain('<symbol id="ui-home"');
    expect(markup).not.toContain('<symbol id="home"');
    expect(template("icon-sheets.mjs")!.getContents()).toContain(
      'export const prefix = "ui-";',
    );
  });

  it("defaults the prefix to none", async () => {
    await mod.setup(options, nuxt);
    expect(template("icon-sheets.mjs")!.getContents()).toContain(
      'export const prefix = "";',
    );
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
