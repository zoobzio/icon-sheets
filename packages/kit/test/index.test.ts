import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import type { IconifyJSON } from "@iconify/types";
import type { Req } from "@icon-sheets/iconify";
import { makeIconSheets } from "icon-sheets";
import { useIconSheetsConfig } from "icon-sheets/config";

import { build } from "../src/build";
import { compose } from "../src/compose";
import { defineConfig, preset } from "../src/config";
import { MANIFEST } from "../src/constant";
import {
  InvalidConfigError,
  MalformedConfigError,
  MalformedPresetError,
  MissingConfigError,
} from "../src/error";
import { generate } from "../src/generate";
import { loadPreset } from "../src/preset";
import { resolveKit } from "../src/resolve";
import type { KitConfig, Output } from "../src/types";
import { writeOutput } from "../src/write";

/**
 * A mock collection served over the injected `req` — the Iconify-API path, since
 * the "mock" prefix is not installed as a local `@iconify-json/*` package.
 */
const collection: IconifyJSON = {
  prefix: "mock",
  width: 24,
  height: 24,
  icons: {
    home: { body: '<path d="home"/>' },
    close: { body: '<path d="close"/>' },
    "home-solid": { body: '<path d="home-solid"/>' },
  },
};

const req: Req = async (src) => {
  if (src.hostname === "api.iconify.design") {
    return JSON.stringify(collection);
  }
  throw new Error(`unexpected request: ${src.href}`);
};

const config = defineConfig({
  id: "ui",
  name: "UI Icons",
  icons: { home: "mock:home", close: "mock:close" },
  sets: {
    solid: { name: "Solid", icons: { home: "mock:home-solid" } },
  },
});

/** A loader that fails the test if anything is fetched. */
const offline: Req = async () => {
  throw new Error("should not fetch");
};

const file = (built: Output, path: string): string => {
  const found = built.files.find((entry) => entry.path === path);
  if (!found) {
    throw new Error(`no emitted file ${path}`);
  }
  return found.contents;
};

const dirs: string[] = [];
const temp = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "icon-sheets-kit-"));
  dirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

/**
 * Publishes a kit build as a package under `<root>/node_modules/<name>`, with
 * the `exports` the kit README prescribes, so a config at `root` can extend
 * it as an installed package.
 */
const publish = async (
  root: string,
  name: string,
  config: KitConfig,
): Promise<string> => {
  const dir = join(root, "node_modules", name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({
      name,
      type: "module",
      exports: {
        ".": { import: "./icons/index.mjs" },
        "./*.svg": "./icons/*.svg",
        "./*": { import: "./icons/*.mjs" },
      },
    }),
  );
  await writeOutput(await generate(config, { req }), dir);
  return dir;
};

/** The base contract a dependent config extends in the preset tests. */
const foundation = defineConfig({
  id: "foundation",
  name: "Foundation",
  icons: { home: "mock:home", close: "mock:close" },
  sets: {
    solid: { name: "Solid", icons: { home: "mock:home-solid" } },
  },
});

describe("generate", () => {
  it("emits every module, declaration and sprite", async () => {
    const built = await generate(config, { req });
    expect(built.outDir).toBe("icons");
    expect(built.files.map((entry) => entry.path).sort()).toEqual([
      "config.d.mts",
      "config.mjs",
      "index.d.mts",
      "index.mjs",
      "sets.d.mts",
      "sets.mjs",
      "sheet.d.mts",
      "sheet.mjs",
      "sprite.solid.svg",
      "sprite.svg",
    ]);
  });

  it("declares the alias and set id unions", async () => {
    const dts = file(await generate(config, { req }), "index.d.mts");
    expect(dts).toContain('export type Alias =\n  | "home"\n  | "close";');
    expect(dts).toContain('export type SetId =\n  | "solid";');
    expect(dts).toContain("value is Alias");
  });

  it("emits never for an empty set id union", async () => {
    const bare = { ...config, sets: {} };
    const dts = file(await generate(bare, { req }), "index.d.mts");
    expect(dts).toContain("export type SetId = never;");
  });

  it("hides the inline sheets but not the sprite files", async () => {
    const built = await generate(config, { req });
    expect(file(built, "sheet.mjs")).toContain("display:none");
    expect(file(built, "sprite.svg")).not.toContain("display:none");
    expect(file(built, "sprite.svg")).toContain('<symbol id="home"');
  });

  it("renders each set's sprite as the base with the set applied", async () => {
    const built = await generate(config, { req });
    const sprite = file(built, "sprite.solid.svg");
    expect(sprite).toContain('d="home-solid"');
    expect(sprite).toContain('d="close"');
    expect(sprite).not.toContain('<path d="home"/>');
  });

  it("prefixes every symbol id", async () => {
    const built = await generate({ ...config, prefix: "ui-" }, { req });
    expect(file(built, "sprite.svg")).toContain('<symbol id="ui-home"');
    expect(file(built, "sprite.svg")).not.toContain('id="home"');
    expect(file(built, "index.d.mts")).toContain("`#ui-${A}`");
  });

  it("honours a custom outDir", async () => {
    const built = await generate({ ...config, outDir: "./out/" }, { req });
    expect(built.outDir).toBe("out");
  });

  it("keys each emitted set by its config key", async () => {
    const built = await generate(config, { req });
    expect(file(built, "sets.mjs")).toContain('"id": "solid"');
  });

  it("acquires a collection once for the contract and every set", async () => {
    const requested: string[] = [];
    const counting: Req = (src) => {
      requested.push(src.href);
      return req(src);
    };
    const sets = {
      solid: { name: "Solid", icons: { home: "mock:home-solid" } },
      swapped: { name: "Swapped", icons: { close: "mock:home" } },
    };
    await generate({ ...config, sets }, { req: counting });
    expect(requested).toHaveLength(1);
  });

  it.each([
    [{ icons: { "bad alias": "mock:home" } }, /alias "bad alias" may only/],
    [{ prefix: 'x"' }, /prefix "x\\"" may only/],
    [{ outDir: "../elsewhere" }, /outDir/],
    [{ outDir: "." }, /outDir/],
    [{ outDir: "/abs" }, /outDir/],
    [{ outDir: "C:\\abs" }, /outDir/],
    [{ sets: { "a/b": { name: "A", icons: {} } } }, /set "a\/b" may only/],
    [
      { sets: { x: { name: "X", icons: { nope: "mock:home" } } } },
      /set "x" rebinds "nope"/,
    ],
    [
      { sets: { x: { name: 42, icons: {} } } },
      /set "x": identity "name" must be a string/,
    ],
    [
      { sets: { x: { id: "y", name: "X", icons: {} } } },
      /set "x" declares an "id"/,
    ],
    [{ name: undefined }, /identity "name" must be a string/],
  ] as [object, RegExp][])(
    "rejects a bad config before resolving (%o)",
    async (patch, message) => {
      const bad = { ...config, ...patch } as KitConfig;
      await expect(generate(bad, { req: offline })).rejects.toThrow(message);
    },
  );

  it("ignores a set entry left unset", async () => {
    const sets = { solid: { name: "Solid", icons: { nope: undefined } } };
    const loose = { ...config, sets } as KitConfig;
    const built = await generate(loose, { req });
    expect(file(built, "sets.mjs")).toContain('"icons": {}');
  });

  it("accepts an outDir that only looks like a parent", async () => {
    const built = await generate({ ...config, outDir: "..icons" }, { req });
    expect(built.outDir).toBe("..icons");
  });

  it("reports every issue of a bad config together", async () => {
    const bad: KitConfig = {
      ...config,
      icons: { "bad alias": "mock:home", "worse/alias": "mock:home" },
      prefix: "a b",
      outDir: "..",
      sets: { x: { name: "X", icons: { nope: "mock:home" } } },
    };
    const error = await generate(bad, { req: offline }).catch(
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(InvalidConfigError);
    expect((error as InvalidConfigError).issues).toEqual([
      'alias "bad alias" may only contain letters, digits, "_", "-" and "."',
      'alias "worse/alias" may only contain letters, digits, "_", "-" and "."',
      'prefix "a b" may only contain letters, digits, "_", "-" and "."',
      'set "x" rebinds "nope", an alias the config neither declares nor inherits',
      'outDir ".." must be a subdirectory of the project root',
    ]);
    expect((error as Error).message).toContain(
      "the config is invalid —\n  alias",
    );
  });
});

describe("resolveKit", () => {
  it("resolves a config into its documents without emitting files", async () => {
    const kit = await resolveKit({ ...config, prefix: "ui-" }, { req });
    expect(kit.contract.id).toBe("ui");
    expect(kit.contract.icons.home.body).toBe('<path d="home"/>');
    expect(kit.sets).toEqual([
      {
        id: "solid",
        name: "Solid",
        icons: {
          home: expect.objectContaining({ body: '<path d="home-solid"/>' }),
        },
      },
    ]);
    expect(kit.prefix).toBe("ui-");
    expect(kit.outDir).toBe("icons");
    expect(kit.sources).toEqual([]);
  });

  it("resolves a local SVG relative to cwd and reports it as a source", async () => {
    const cwd = await temp();
    await writeFile(
      join(cwd, "logo.svg"),
      '<svg viewBox="0 0 48 24"><path d="logo"/></svg>',
    );
    const local = { id: "x", name: "X", icons: { logo: "./logo.svg" } };
    const kit = await resolveKit(local, { cwd, req: offline });
    expect(kit.sources).toEqual([join(cwd, "logo.svg")]);

    const built = await generate(local, { cwd, req: offline });
    expect(file(built, "sprite.svg")).toContain(
      '<symbol id="logo" viewBox="0 0 48 24"><path d="logo"/></symbol>',
    );
  });

  it("settles the optional fields", async () => {
    const bare = { id: "x", name: "X", icons: { home: "mock:home" } };
    const kit = await resolveKit(bare, { req });
    expect(kit.sets).toEqual([]);
    expect(kit.prefix).toBe("");
    expect(kit.contract).not.toHaveProperty("outDir");
  });

  it("rejects a bad config before resolving", async () => {
    await expect(
      resolveKit({ ...config, prefix: "a b" }, { req: offline }),
    ).rejects.toBeInstanceOf(InvalidConfigError);
  });
});

describe("compose", () => {
  const icon = (body: string) => ({ body, width: 24, height: 24 });
  const base = {
    contract: { id: "a", name: "A", icons: { home: icon("a-home") } },
    sets: [{ id: "x", name: "X", icons: { home: icon("x-home") } }],
    prefix: "a-",
  };
  const top = {
    contract: {
      id: "b",
      name: "B",
      icons: { home: icon("b-home"), save: icon("b-save") },
    },
    sets: [{ id: "x", name: "X2" }],
  };

  it("lays later icons over earlier ones under the last identity", () => {
    const composed = compose([base, top]);
    expect(composed.contract).toEqual({
      id: "b",
      name: "B",
      icons: { home: icon("b-home"), save: icon("b-save") },
    });
  });

  it("replaces a set by id and keeps the rest", () => {
    const composed = compose([
      base,
      { ...top, sets: [{ id: "y", name: "Y" }] },
    ]);
    expect(composed.sets.map((set) => set.id)).toEqual(["x", "y"]);
    expect(compose([base, top]).sets).toEqual([{ id: "x", name: "X2" }]);
  });

  it("takes the one prefix the layers set, or none", () => {
    expect(compose([base, top]).prefix).toBe("a-");
    expect(compose([{ ...base, prefix: undefined }, top]).prefix).toBe("");
    expect(compose([base, { ...top, prefix: "a-" }]).prefix).toBe("a-");
  });

  it("rejects layers whose prefixes disagree", () => {
    expect(() => compose([base, { ...top, prefix: "b-" }])).toThrow(
      InvalidConfigError,
    );
  });

  it("needs a layer", () => {
    expect(() => compose([])).toThrow(/at least one layer/);
  });
});

describe("loadPreset", () => {
  it("reads the documents a published build exports", async () => {
    const root = await temp();
    await publish(root, "@acme/icons", { ...foundation, prefix: "acme-" });
    const loaded = await loadPreset("@acme/icons", root);
    expect(loaded.contract.id).toBe("foundation");
    expect(Object.keys(loaded.contract.icons)).toEqual(["home", "close"]);
    expect(loaded.sets.map((set) => set.id)).toEqual(["solid"]);
    expect(loaded.prefix).toBe("acme-");
  });

  it("rejects a package that is not installed", async () => {
    const root = await temp();
    const error = await loadPreset("@acme/missing", root).catch((e) => e);
    expect(error).toBeInstanceOf(MalformedPresetError);
    expect((error as MalformedPresetError).package).toBe("@acme/missing");
    expect((error as Error).message).toContain('"./config"');
  });

  it("rejects a package whose build is not contract-shaped", async () => {
    const root = await temp();
    const dir = await publish(root, "@acme/icons", foundation);
    await writeFile(
      join(dir, "icons", "config.mjs"),
      "export const contract = { id: 'x', name: 'X', icons: { home: 1 } };",
    );
    await expect(loadPreset("@acme/icons", root)).rejects.toThrow(
      /violate the schema/,
    );
    const other = await publish(root, "@acme/other", foundation);
    await writeFile(
      join(other, "icons", "config.mjs"),
      "export const nope = 1;",
    );
    await expect(loadPreset("@acme/other", root)).rejects.toThrow(
      /must export a contract/,
    );
  });
});

describe("extends", () => {
  const dependent = defineConfig({
    id: "app",
    name: "App",
    extends: ["@acme/icons"],
    icons: { close: "mock:close", save: "mock:home" },
  });

  const project = async (): Promise<string> => {
    const root = await temp();
    await publish(root, "@acme/icons", foundation);
    return root;
  };

  it("composes the config over the preset's resolved icons", async () => {
    const cwd = await project();
    const kit = await resolveKit(dependent, { cwd, req });
    expect(kit.contract.id).toBe("app");
    expect(Object.keys(kit.contract.icons)).toEqual(["home", "close", "save"]);
    expect(kit.contract.icons.home.body).toBe('<path d="home"/>');
    expect(kit.sets.map((set) => set.id)).toEqual(["solid"]);
  });

  it("fetches nothing for the preset's icons", async () => {
    const cwd = await project();
    const bare = { ...dependent, icons: {} };
    const kit = await resolveKit(bare, { cwd, req: offline });
    expect(Object.keys(kit.contract.icons)).toEqual(["home", "close"]);
  });

  it("lets a set rebind a preset alias, and replaces a preset set by id", async () => {
    const cwd = await project();
    const kit = await resolveKit(
      {
        ...dependent,
        sets: {
          solid: { name: "Mine", icons: { home: "mock:home-solid" } },
          flip: { name: "Flip", icons: { close: "mock:home" } },
        },
      },
      { cwd, req },
    );
    expect(kit.sets.map((set) => set.name)).toEqual(["Mine", "Flip"]);
  });

  it("still rejects a set that rebinds an unknown alias", async () => {
    const cwd = await project();
    await expect(
      resolveKit(
        {
          ...dependent,
          sets: { x: { name: "X", icons: { nope: "mock:home" } } },
        },
        { cwd, req: offline },
      ),
    ).rejects.toThrow(/neither declares nor inherits/);
  });

  it("inherits the preset's prefix and rejects a disagreeing one", async () => {
    const cwd = await temp();
    await publish(cwd, "@acme/icons", { ...foundation, prefix: "acme-" });
    expect((await resolveKit(dependent, { cwd, req })).prefix).toBe("acme-");
    expect(
      (await resolveKit({ ...dependent, prefix: "acme-" }, { cwd, req }))
        .prefix,
    ).toBe("acme-");
    await expect(
      resolveKit({ ...dependent, prefix: "app-" }, { cwd, req }),
    ).rejects.toThrow(/disagree/);
  });

  it("declares the inherited aliases in the emitted union and sprite", async () => {
    const cwd = await project();
    const built = await generate(dependent, { cwd, req });
    expect(file(built, "index.d.mts")).toContain(
      'export type Alias =\n  | "home"\n  | "close"\n  | "save";',
    );
    expect(file(built, "sprite.svg")).toContain('<symbol id="home"');
    expect(file(built, "sprite.solid.svg")).toContain('d="home-solid"');
  });

  it("takes a typed preset entry the same as a name", async () => {
    const cwd = await project();
    const kit = await resolveKit(
      { ...dependent, extends: [preset("@acme/icons")] },
      { cwd, req },
    );
    expect(Object.keys(kit.contract.icons)).toContain("home");
  });

  it("rejects an entry that is not a package name before reading anything", async () => {
    const cwd = await temp();
    const error = await resolveKit(
      { ...dependent, extends: ["", 3 as unknown as string] },
      { cwd, req: offline },
    ).catch((e) => e);
    expect(error).toBeInstanceOf(InvalidConfigError);
    expect((error as InvalidConfigError).issues).toEqual([
      "extends[0] must be a package name",
      "extends[1] must be a package name",
    ]);
  });

  it("surfaces a preset that is not installed", async () => {
    const cwd = await temp();
    await expect(
      resolveKit(dependent, { cwd, req: offline }),
    ).rejects.toBeInstanceOf(MalformedPresetError);
  });
});

describe("the emitted modules", () => {
  const load = async (built: Output) => {
    const root = await temp();
    await writeOutput(built, root);
    const at = (name: string) =>
      import(pathToFileURL(join(root, built.outDir, name)).href);
    return {
      root,
      index: await at("index.mjs"),
      config: await at("config.mjs"),
      sheet: await at("sheet.mjs"),
      sets: await at("sets.mjs"),
    };
  };

  it("guards aliases and builds prefixed hrefs", async () => {
    const { index } = await load(
      await generate({ ...config, prefix: "ui-" }, { req }),
    );
    expect(index.aliases).toEqual(["home", "close"]);
    expect(index.setIds).toEqual(["solid"]);
    expect(index.isAlias("home")).toBe(true);
    expect(index.isAlias("toString")).toBe(false);
    expect(index.isAlias(42)).toBe(false);
    expect(index.href("home")).toBe("#ui-home");
  });

  it("loads into the runtime service and applies its sets", async () => {
    const { config: preset, sets } = await load(
      await generate(config, { req }),
    );
    const icons = makeIconSheets(useIconSheetsConfig(preset.default));
    expect(icons.aliases()).toEqual(["home", "close"]);
    expect(icons.resolve("home").body).toBe('<path d="home"/>');
    icons.apply(sets.default.solid);
    expect(icons.resolve("home").body).toBe('<path d="home-solid"/>');
  });

  it("exports the inline sheets", async () => {
    const { sheet } = await load(await generate(config, { req }));
    expect(sheet.default).toMatch(/^<svg [^>]*display:none/);
    expect(sheet.sheets.solid).toContain('d="home-solid"');
  });

  it("removes a dropped set's sprite but keeps files it did not write", async () => {
    const root = await temp();
    await writeOutput(await generate(config, { req }), root);
    await writeFile(join(root, "icons", "authored.ts"), "export {};\n");
    await writeFile(join(root, "icons", "sprite.authored.svg"), "<svg/>\n");
    const bare = { ...config, sets: {} };
    await writeOutput(await generate(bare, { req }), root);
    const names = await readdir(join(root, "icons"));
    expect(names).not.toContain("sprite.solid.svg");
    expect(names).toContain("authored.ts");
    expect(names).toContain("sprite.authored.svg");
    expect(names).toContain("sprite.svg");
  });

  it("records what it wrote in a manifest", async () => {
    const root = await temp();
    const built = await generate(config, { req });
    await writeOutput(built, root);
    const manifest = JSON.parse(
      await readFile(join(root, "icons", MANIFEST), "utf8"),
    );
    expect(manifest.files).toEqual(built.files.map((entry) => entry.path));
  });

  it("never removes a file outside the output directory", async () => {
    const root = await temp();
    const built = await generate(config, { req });
    await writeOutput(built, root);
    await writeFile(join(root, "keep.txt"), "keep\n");
    await writeFile(
      join(root, "icons", MANIFEST),
      JSON.stringify({ files: ["../keep.txt", join(root, "keep.txt"), 42] }),
    );
    await writeOutput(built, root);
    expect(await readdir(root)).toContain("keep.txt");
  });

  it("removes nothing when the manifest is unreadable", async () => {
    const root = await temp();
    await writeOutput(await generate(config, { req }), root);
    await writeFile(join(root, "icons", MANIFEST), "not json");
    const bare = { ...config, sets: {} };
    await writeOutput(await generate(bare, { req }), root);
    expect(await readdir(join(root, "icons"))).toContain("sprite.solid.svg");
  });
});

describe("build", () => {
  const scaffold = async (authored: KitConfig = config): Promise<string> => {
    const root = await temp();
    await writeFile(
      join(root, "icon-sheets.config.ts"),
      `export default ${JSON.stringify(authored)};\n`,
    );
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({ name: "@acme/icons", version: "1.0.0" }, null, 2)}\n`,
    );
    return root;
  };

  it("loads the config and writes the output", async () => {
    const root = await scaffold({ ...config, outDir: "src/icons" });
    const output = await build({ root, req });
    expect(output.outDir).toBe("src/icons");
    expect(
      await readFile(join(root, "src", "icons", "sprite.svg"), "utf8"),
    ).toContain("<symbol");
  });

  it("never touches package.json", async () => {
    const root = await scaffold();
    const before = await readFile(join(root, "package.json"), "utf8");
    await build({ root, req });
    expect(await readFile(join(root, "package.json"), "utf8")).toBe(before);
  });

  it("rejects a config file without a config default export", async () => {
    const root = await scaffold();
    await writeFile(join(root, "bad.ts"), "export default 42;\n");
    await expect(build({ root, req, config: "bad.ts" })).rejects.toThrow(
      /must default-export a config/,
    );
  });

  it("rejects a config whose icons are not a map", async () => {
    const root = await scaffold();
    await writeFile(join(root, "bad.ts"), "export default { icons: null };\n");
    await expect(build({ root, req, config: "bad.ts" })).rejects.toBeInstanceOf(
      MalformedConfigError,
    );
  });

  it("rejects a config file that does not exist", async () => {
    const root = await scaffold();
    const error = await build({ root, req, config: "nope.ts" }).catch(
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(MissingConfigError);
    expect((error as MissingConfigError).path).toBe(join(root, "nope.ts"));
  });

  it("lets an error thrown by the config file itself through", async () => {
    const root = await scaffold();
    await writeFile(join(root, "bad.ts"), 'throw new Error("boom");\n');
    await expect(build({ root, req, config: "bad.ts" })).rejects.toThrow(
      /boom/,
    );
  });

  it("names the offending file on a MalformedConfigError", async () => {
    const root = await scaffold();
    await writeFile(join(root, "bad.ts"), "export default 42;\n");
    const error = await build({ root, req, config: "bad.ts" }).catch(
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(MalformedConfigError);
    expect((error as MalformedConfigError).path).toBe(join(root, "bad.ts"));
  });
});

describe("defineConfig", () => {
  it("rejects a set that rebinds an undeclared alias at the type level", () => {
    defineConfig({
      id: "ui",
      name: "UI",
      icons: { home: "mock:home" },
      // @ts-expect-error — "nope" is not a declared alias
      sets: { x: { name: "X", icons: { nope: "mock:home" } } },
    });
  });

  it("admits the aliases of a typed preset, and no others", () => {
    defineConfig({
      id: "ui",
      name: "UI",
      extends: [preset<"close" | "menu">("@acme/icons")],
      icons: { home: "mock:home" },
      sets: {
        x: { name: "X", icons: { home: "mock:home", menu: "mock:home" } },
      },
    });
    defineConfig({
      id: "ui",
      name: "UI",
      extends: [preset<"close">("@acme/icons")],
      icons: { home: "mock:home" },
      // @ts-expect-error — "nope" is neither declared nor inherited
      sets: { x: { name: "X", icons: { nope: "mock:home" } } },
    });
    defineConfig({
      id: "ui",
      name: "UI",
      extends: ["@acme/icons"],
      icons: { home: "mock:home" },
      // @ts-expect-error — an untyped preset declares no aliases
      sets: { x: { name: "X", icons: { close: "mock:home" } } },
    });
  });
});
