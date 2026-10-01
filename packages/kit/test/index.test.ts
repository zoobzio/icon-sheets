import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import type { IconifyJSON } from "@iconify/types";
import type { Req } from "@icon-sheets/iconify";
import { makeIconSheets } from "icon-sheets";
import { useIconSheetsConfig } from "icon-sheets/config";

import { build } from "../src/command";
import { defineConfig } from "../src/config";
import { generate } from "../src/generate";
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
    solid: { id: "solid", name: "Solid", icons: { home: "mock:home-solid" } },
  },
});

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

  it.each([
    [{ icons: { "bad alias": "mock:home" } }, /invalid: bad alias/],
    [{ prefix: 'x"' }, /prefix/],
    [{ outDir: "../elsewhere" }, /outDir/],
    [{ outDir: "." }, /outDir/],
    [{ outDir: "/abs" }, /outDir/],
    [
      {
        sets: {
          a: { id: "solid", name: "A", icons: {} },
          b: { id: "solid", name: "B", icons: {} },
        },
      },
      /declared more than once/,
    ],
    [{ sets: { a: { id: "a/b", name: "A", icons: {} } } }, /set id/],
  ] satisfies [Partial<KitConfig>, RegExp][])(
    "rejects a bad config before resolving (%o)",
    async (patch, message) => {
      const fetching: Req = async () => {
        throw new Error("should not fetch");
      };
      await expect(
        generate({ ...config, ...patch }, { req: fetching }),
      ).rejects.toThrow(message);
    },
  );

  it("rejects a set that rebinds an undeclared alias", async () => {
    const loose: KitConfig = {
      ...config,
      sets: { x: { id: "x", name: "X", icons: { nope: "mock:home" } } },
    };
    await expect(generate(loose, { req })).rejects.toThrow(/nope/);
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

  it("removes a dropped set's sprite but keeps unrelated files", async () => {
    const root = await temp();
    await writeOutput(await generate(config, { req }), root);
    await writeFile(join(root, "icons", "authored.ts"), "export {};\n");
    const bare = { ...config, sets: {} };
    await writeOutput(await generate(bare, { req }), root);
    const names = await readdir(join(root, "icons"));
    expect(names).not.toContain("sprite.solid.svg");
    expect(names).toContain("authored.ts");
    expect(names).toContain("sprite.svg");
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
});

describe("defineConfig", () => {
  it("rejects a set that rebinds an undeclared alias at the type level", () => {
    defineConfig({
      id: "ui",
      name: "UI",
      icons: { home: "mock:home" },
      // @ts-expect-error — "nope" is not a declared alias
      sets: { x: { id: "x", name: "X", icons: { nope: "mock:home" } } },
    });
  });
});
